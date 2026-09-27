import type { SupabaseClient } from '@supabase/supabase-js'

import { sendTransactionalEmail } from '@/lib/send-transactional-email'
import { COMMUNITY_PRICE_KR, TIER_PRICES_KR } from '@/lib/subscription-tiers'

const ZONE = 'Europe/Copenhagen'

type DueProfile = {
  id: string
  email: string | null
  subscription_tier: string | null
  community_access: boolean | null
  trial_ends_at: string
}

export type TrialReminderResult = {
  ok: boolean
  due: number
  sent: number
  failed: number
  errors: string[]
}

function ymdInCopenhagen(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return utc.toISOString().slice(0, 10)
}

/** UTC-tidspunkt hvor uret i København er 00:00 på den dato. */
function copenhagenMidnightUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(guess))
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  const shown = Date.UTC(pick('year'), pick('month') - 1, pick('day'), pick('hour'), pick('minute'))
  return new Date(guess - (shown - guess))
}

function planCopy(row: DueProfile): { name: string; priceKr: number } {
  if (row.subscription_tier === 'premium') return { name: 'Premium', priceKr: TIER_PRICES_KR.premium }
  if (row.community_access) return { name: 'Community', priceKr: COMMUNITY_PRICE_KR }
  return { name: 'Madbudget', priceKr: TIER_PRICES_KR.plus }
}

function whenLabel(trialEndsAt: string, endOfToday: Date): string {
  return new Date(trialEndsAt).getTime() <= endOfToday.getTime() ? 'i dag' : 'i morgen'
}

export async function runTrialReminders(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<TrialReminderResult> {
  const today = ymdInCopenhagen(now)
  const endOfToday = copenhagenMidnightUtc(addDays(today, 1))
  const endOfTomorrow = copenhagenMidnightUtc(addDays(today, 2))

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, subscription_tier, community_access, trial_ends_at')
    .eq('subscription_source', 'stripe')
    .not('stripe_subscription_id', 'is', null)
    .not('email', 'is', null)
    .is('trial_reminder_sent_at', null)
    .gt('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', endOfTomorrow.toISOString())

  if (error) {
    return { ok: false, due: 0, sent: 0, failed: 0, errors: [error.message] }
  }

  const rows = (data ?? []) as DueProfile[]
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    if (!row.email) continue
    const plan = planCopy(row)
    const when = whenLabel(row.trial_ends_at, endOfToday)
    const result = await sendTransactionalEmail({
      to: row.email,
      subject: `Din prøve slutter ${when}`,
      text: [
        'Hej',
        '',
        `Din prøve på ${plan.name} slutter ${when}. Derefter er det ${plan.priceKr} kr om måneden.`,
        '',
        'Hvis det ikke er noget for dig, så opsig den i dag, så der ikke trækkes. Det gør du under Min profil.',
        'https://www.functionalfoods.dk/profil',
        '',
        'Venlig hilsen',
        'Functional Foods',
      ].join('\n'),
    })
    if (!result.ok) {
      failed += 1
      errors.push(`${row.email}: ${result.error}`)
      continue
    }
    const { error: markError } = await supabase
      .from('user_profiles')
      .update({ trial_reminder_sent_at: now.toISOString() })
      .eq('id', row.id)
    if (markError) {
      failed += 1
      errors.push(`${row.email}: sendt, men ikke markeret (${markError.message})`)
      continue
    }
    sent += 1
  }

  return { ok: failed === 0, due: rows.length, sent, failed, errors }
}
