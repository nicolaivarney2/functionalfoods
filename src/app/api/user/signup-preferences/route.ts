import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Gemmer samtykke m.m. lige efter signup (kræver aktiv session).
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const user = await getAuthenticatedUser(request)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const productUpdatesConsent = Boolean(body?.productUpdatesConsent)

  const supabase = createClient(supabaseUrl, serviceKey)
  const now = new Date().toISOString()

  const { data: existing } = await supabase.from('user_profiles').select('id').eq('id', user.id).maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        email: user.email ?? undefined,
        product_updates_consent: productUpdatesConsent,
        product_updates_consent_at: productUpdatesConsent ? now : null,
        updated_at: now,
      })
      .eq('id', user.id)

    if (error) {
      console.error('signup-preferences update', error)
      return NextResponse.json({ error: 'Kunne ikke gemme indstillinger' }, { status: 500 })
    }
  } else {
    const { error } = await supabase.from('user_profiles').insert({
      id: user.id,
      role: 'user',
      email: user.email ?? null,
      product_updates_consent: productUpdatesConsent,
      product_updates_consent_at: productUpdatesConsent ? now : null,
    })

    if (error) {
      console.error('signup-preferences insert', error)
      return NextResponse.json({ error: 'Kunne ikke gemme indstillinger' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
