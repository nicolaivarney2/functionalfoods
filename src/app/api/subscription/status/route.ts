import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { getSubscriptionStatus } from '@/lib/subscription-entitlements'
import { syncStripeAccessForUser } from '@/lib/stripe-subscription-sync'
import { COMMUNITY_PRICE_KR, TIER_LABELS, TIER_PRICES_KR, TRIAL_DAYS } from '@/lib/subscription-tiers'

export const dynamic = 'force-dynamic'

/** GET /api/subscription/status — tier, limits og forbrug for logged-in bruger. */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const first = await getSubscriptionStatus(supabase, user.id)
    if (first.stripeCustomerId) {
      try {
        await syncStripeAccessForUser(supabase, user.id, first.stripeCustomerId)
      } catch (syncError) {
        console.error('subscription status stripe sync', syncError)
      }
    }
    const status = first.stripeCustomerId ? await getSubscriptionStatus(supabase, user.id) : first
    const community = status.communityAccess && status.billedTier !== 'premium'
    const planLabel = community ? 'Community' : TIER_LABELS[status.billedTier]
    const priceKr = community
      ? COMMUNITY_PRICE_KR
      : status.billedTier === 'free'
        ? 0
        : TIER_PRICES_KR[status.billedTier]
    const paid = status.billedTier !== 'free' || status.communityAccess
    return NextResponse.json({
      ...status,
      planLabel,
      priceKr,
      trialDays: TRIAL_DAYS,
      canManageInStripe: Boolean(status.stripeCustomerId) && paid && status.subscriptionSource !== 'app_store',
    })
  } catch (err) {
    console.error('GET /api/subscription/status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
