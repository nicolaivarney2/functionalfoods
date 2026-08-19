import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAdmin } from '@/lib/admin-route-auth'
import {
  mapMember,
  mapStripeLive,
  MEMBER_PROFILE_SELECT,
  MEMBER_PROFILE_SELECT_LEGACY,
  type MemberProfileRow,
} from '@/lib/admin-members'
import { getStripe } from '@/lib/stripe-server'
import { cannotCancelReason, inferSubscriptionSource } from '@/lib/subscription-source'
import { setUserSubscriptionTier } from '@/lib/subscription-entitlements'

export const dynamic = 'force-dynamic'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function loadProfile(supabase: NonNullable<ReturnType<typeof serviceClient>>, id: string) {
  const first = await supabase.from('user_profiles').select(MEMBER_PROFILE_SELECT).eq('id', id).maybeSingle()
  if (!first.error) return first.data as MemberProfileRow | null
  if (String(first.error.message || '').includes('subscription_source')) {
    const legacy = await supabase
      .from('user_profiles')
      .select(MEMBER_PROFILE_SELECT_LEGACY)
      .eq('id', id)
      .maybeSingle()
    return (legacy.data as MemberProfileRow | null) ?? null
  }
  throw first.error
}

/**
 * POST /api/admin/users/:id/cancel
 * Body: { mode: 'period_end' | 'immediate' }
 * Kun Stripe. App Store / Play afvises.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe er ikke konfigureret' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const mode = body.mode === 'immediate' ? 'immediate' : 'period_end'

  const row = await loadProfile(supabase, id)
  if (!row) return NextResponse.json({ error: 'Bruger findes ikke' }, { status: 404 })

  const source = inferSubscriptionSource(row)
  const blocked = cannotCancelReason(source)
  if (blocked || !row.stripe_subscription_id) {
    return NextResponse.json(
      { error: blocked || 'Ingen Stripe-subscription at opsige.' },
      { status: 409 }
    )
  }

  const stripe = getStripe()

  try {
    if (mode === 'immediate') {
      const canceled = await stripe.subscriptions.cancel(row.stripe_subscription_id)
      await setUserSubscriptionTier(supabase, id, 'free', {
        stripeSubscriptionId: null,
        monthlyAmountOre: null,
        subscriptionSource: 'none',
      })
      const reloaded = await loadProfile(supabase, id)
      return NextResponse.json({
        ok: true,
        mode,
        user: reloaded ? mapMember(reloaded, mapStripeLive(canceled)) : null,
      })
    }

    const updated = await stripe.subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
    const reloaded = await loadProfile(supabase, id)
    return NextResponse.json({
      ok: true,
      mode,
      user: reloaded ? mapMember(reloaded, mapStripeLive(updated)) : null,
    })
  } catch (err) {
    console.error('admin cancel subscription:', err)
    return NextResponse.json({ error: 'Stripe kunne ikke opsige abonnementet.' }, { status: 502 })
  }
}

