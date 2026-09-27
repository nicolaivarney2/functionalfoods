import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

import { getStripe } from '@/lib/stripe-server'
import { setUserSubscriptionTier } from '@/lib/subscription-entitlements'
import { tierFromMonthlyAmountKr, type CheckoutPlan } from '@/lib/subscription-tiers'

function planFromSubscription(sub: Stripe.Subscription): CheckoutPlan {
  const meta = sub.metadata?.subscription_tier
  if (meta === 'plus' || meta === 'premium' || meta === 'community') return meta
  const unitAmount = sub.items.data[0]?.price?.unit_amount
  if (typeof unitAmount === 'number') {
    const kr = Math.round(unitAmount / 100)
    if (kr === 49) return 'community'
    return tierFromMonthlyAmountKr(kr)
  }
  return 'free'
}

function trialEndIso(sub: Stripe.Subscription): string | null {
  if (sub.status !== 'trialing' || !sub.trial_end) return null
  return new Date(sub.trial_end * 1000).toISOString()
}

export function subscriptionIsEntitled(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing'
}

export async function grantStripeSubscription(
  supabase: SupabaseClient,
  userId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const plan = planFromSubscription(sub)
  const tier = plan === 'premium' ? 'premium' : 'plus'
  const monthlyAmountOre = plan === 'premium' ? 24900 : plan === 'community' ? 4900 : 2900
  await setUserSubscriptionTier(supabase, userId, tier, {
    stripeSubscriptionId: sub.id,
    monthlyAmountOre,
    subscriptionSource: 'stripe',
    checkoutStarted: true,
    communityAccess: plan === 'community' || plan === 'premium',
    trialEndsAt: trialEndIso(sub),
  })
}

export async function revokeStripeSubscription(supabase: SupabaseClient, userId: string): Promise<void> {
  await setUserSubscriptionTier(supabase, userId, 'free', {
    stripeSubscriptionId: null,
    monthlyAmountOre: null,
    subscriptionSource: 'none',
    checkoutStarted: true,
    communityAccess: false,
    trialEndsAt: null,
  })
}

/** Sørg for at profilen matcher det abonnement, Stripe faktisk har. */
export async function syncStripeAccessForUser(
  supabase: SupabaseClient,
  userId: string,
  stripeCustomerId: string | null,
): Promise<void> {
  if (!stripeCustomerId || !process.env.STRIPE_SECRET_KEY) return
  const stripe = getStripe()
  const listed = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'all',
    limit: 10,
  })
  const live = listed.data.find((sub) => subscriptionIsEntitled(sub.status))
  if (live) {
    await grantStripeSubscription(supabase, userId, live)
    return
  }
  const hadStripeSub = listed.data.length > 0
  if (!hadStripeSub) return
  const { data } = await supabase
    .from('user_profiles')
    .select('subscription_source, checkout_started, lifetime_access')
    .eq('id', userId)
    .maybeSingle()
  const row = data as {
    subscription_source?: string | null
    checkout_started?: boolean | null
    lifetime_access?: boolean | null
  } | null
  if (row?.lifetime_access) return
  if (row?.subscription_source === 'app_store' || row?.subscription_source === 'manual') return
  if (row?.subscription_source !== 'stripe' && !row?.checkout_started) return
  await revokeStripeSubscription(supabase, userId)
}
