import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { normalizeSubscriptionTier, type SubscriptionTier } from '@/lib/subscription-tiers'

export const dynamic = 'force-dynamic'

/**
 * POST /api/subscription/apply-iap-tier
 * Kaldes fra appen efter gennemført App Store-køb (RevenueCat).
 * Sætter subscription_tier så gates matcher web/Stripe.
 *
 * Produktion bør også have RevenueCat server-webhook — denne route er
 * den klient-side sync der gør adgangen øjeblikkelig efter køb.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tier = normalizeSubscriptionTier(body.tier) as SubscriptionTier

    if (tier !== 'plus' && tier !== 'premium') {
      return NextResponse.json({ error: 'tier must be plus or premium' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const amountOre = tier === 'premium' ? 24900 : 2900

    const { error } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier: tier,
        last_contribution_amount_ore: amountOre,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('apply-iap-tier:', error)
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, tier })
  } catch (err) {
    console.error('POST /api/subscription/apply-iap-tier:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
