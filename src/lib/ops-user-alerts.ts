import type { SupabaseClient } from '@supabase/supabase-js'

import { sendDagligvarerOpsEmail } from '@/lib/dagligvarer-ops-email'
import {
  inferSubscriptionSource,
  SUBSCRIPTION_SOURCE_LABELS,
} from '@/lib/subscription-source'
import { normalizeSubscriptionTier } from '@/lib/subscription-tiers'

function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://functionalfoods.dk'
  return raw.replace(/\/$/, '')
}

function providerLabel(provider: string | undefined, providers: string[]): string {
  const p = (provider || providers[0] || '').toLowerCase()
  if (p === 'apple') return 'Apple'
  if (p === 'google') return 'Google'
  if (p === 'email' || p === 'email_and_password') return 'E-mail og adgangskode'
  if (providers.length) return providers.join(', ')
  return 'Ukendt (ingen provider i auth)'
}

export async function notifyOpsSignup(
  supabase: SupabaseClient,
  userId: string,
  extras?: { clientHint?: string },
): Promise<void> {
  const { data: claimed } = await supabase
    .from('user_profiles')
    .update({ ops_signup_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId)
    .is('ops_signup_notified_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id, ops_signup_notified_at')
      .eq('id', userId)
      .maybeSingle()
    if (existing?.ops_signup_notified_at) return
  }

  const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(userId)
  if (authErr || !authData.user) {
    console.error('ops signup: getUserById', authErr)
    return
  }
  const authUser = authData.user
  const providers = (authUser.identities ?? []).map((i) => i.provider).filter(Boolean)
  const appMeta = authUser.app_metadata as { provider?: string; providers?: string[] } | undefined
  const method = providerLabel(appMeta?.provider, appMeta?.providers ?? providers)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select(
      'email, first_name, last_name, subscription_tier, subscription_source, stripe_subscription_id, created_at',
    )
    .eq('id', userId)
    .maybeSingle()

  if (!profile && !claimed) {
    await supabase.from('user_profiles').upsert(
      {
        id: userId,
        role: 'user',
        email: authUser.email ?? null,
        ops_signup_notified_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  }

  const tier = normalizeSubscriptionTier(profile?.subscription_tier)
  const source = inferSubscriptionSource(profile ?? {})
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  const metaName =
    typeof authUser.user_metadata?.name === 'string' ? authUser.user_metadata.name.trim() : ''
  const created = authUser.created_at
    ? new Date(authUser.created_at).toLocaleString('da-DK', { timeZone: 'Europe/Copenhagen' })
    : 'ukendt'

  const result = await sendDagligvarerOpsEmail({
    subject: `[FF] Ny bruger — ${method}${tier !== 'free' ? ` / ${tier}` : ''}`,
    text: [
      'Ny brugeroprettelse.',
      '',
      `Navn: ${name || metaName || 'ikke angivet'}`,
      `E-mail: ${authUser.email ?? profile?.email ?? 'ingen'}`,
      `Oprettet: ${created}`,
      `Metode: ${method}`,
      extras?.clientHint ? `Klient: ${extras.clientHint}` : null,
      `Abonnement nu: ${tier === 'free' ? 'Gratis (endnu intet køb)' : tier}`,
      `Betaling: ${SUBSCRIPTION_SOURCE_LABELS[source]}`,
      `Bruger-id: ${userId}`,
      `Admin: ${siteOrigin()}/admin/users?q=${encodeURIComponent(authUser.email || userId)}`,
      '',
      'Abonnement ved oprettelse er ofte gratis. Du får en ny mail hvis de køber Plus/Premium.',
    ]
      .filter((line) => line !== null)
      .join('\n'),
  })

  if (!result.ok) console.error('ops signup email:', result.error)
}

export async function notifyOpsPaid(
  supabase: SupabaseClient,
  userId: string,
  opts: { tier: string; source: string },
): Promise<void> {
  const { data: claimed } = await supabase
    .from('user_profiles')
    .update({ ops_paid_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId)
    .is('ops_paid_notified_at', null)
    .select('id')
    .maybeSingle()

  if (!claimed) {
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('ops_paid_notified_at')
      .eq('id', userId)
      .maybeSingle()
    if (existing?.ops_paid_notified_at) return
  }

  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = authData.user?.email ?? 'ukendt'
  const result = await sendDagligvarerOpsEmail({
    subject: `[FF] Abonnement ${opts.tier} — ${email}`,
    text: [
      'En bruger har tegnet eller synkroniseret betalt abonnement.',
      '',
      `E-mail: ${email}`,
      `Niveau: ${opts.tier}`,
      `Kilde: ${opts.source}`,
      `Bruger-id: ${userId}`,
      `Admin: ${siteOrigin()}/admin/users?q=${encodeURIComponent(email)}`,
    ].join('\n'),
  })
  if (!result.ok) console.error('ops paid email:', result.error)
}
