import type Stripe from 'stripe'

import {
  canCancelViaStripe,
  inferSubscriptionSource,
  type SubscriptionSource,
} from '@/lib/subscription-source'
import { normalizeSubscriptionTier, TIER_LABELS, type SubscriptionTier } from '@/lib/subscription-tiers'

export const MEMBER_PROFILE_SELECT =
  'id, email, first_name, last_name, role, created_at, updated_at, subscription_tier, stripe_subscription_id, stripe_customer_id, last_contribution_amount_ore, last_contribution_at, subscription_source, lifetime_access, referral_code, referral_reward_notified_at, referred_by'

export const MEMBER_PROFILE_SELECT_LEGACY =
  'id, email, first_name, last_name, role, created_at, updated_at, subscription_tier, stripe_subscription_id, stripe_customer_id, last_contribution_amount_ore, last_contribution_at'

export type MemberProfileRow = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  role?: string | null
  created_at?: string | null
  updated_at?: string | null
  subscription_tier?: string | null
  stripe_subscription_id?: string | null
  stripe_customer_id?: string | null
  last_contribution_amount_ore?: number | null
  last_contribution_at?: string | null
  subscription_source?: string | null
  lifetime_access?: boolean | null
  referral_code?: string | null
  referral_reward_notified_at?: string | null
  referred_by?: string | null
}

export type StripeLiveStatus = {
  id: string
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  canceledAt: string | null
} | null

export type AdminMember = {
  id: string
  email: string | null
  name: string | null
  role: string
  createdAt: string | null
  updatedAt: string | null
  tier: SubscriptionTier
  tierLabel: string
  source: SubscriptionSource
  stripeSubscriptionId: string | null
  stripeCustomerId: string | null
  lastContributionOre: number | null
  lastContributionAt: string | null
  canCancelStripe: boolean
  lifetimeAccess: boolean
  referralCode: string | null
  referralRewardNotifiedAt: string | null
  referredBy: string | null
  stripeLive?: StripeLiveStatus
}

export function displayName(row: MemberProfileRow): string | null {
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim()
  return full || null
}

export function mapMember(row: MemberProfileRow, stripeLive?: StripeLiveStatus): AdminMember {
  const tier = normalizeSubscriptionTier(row.subscription_tier)
  const source = inferSubscriptionSource(row)
  return {
    id: row.id,
    email: row.email ?? null,
    name: displayName(row),
    role: row.role || 'user',
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    tier,
    tierLabel: TIER_LABELS[tier],
    source,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    lastContributionOre: row.last_contribution_amount_ore ?? null,
    lastContributionAt: row.last_contribution_at ?? null,
    canCancelStripe: canCancelViaStripe(source, row.stripe_subscription_id),
    lifetimeAccess: Boolean(row.lifetime_access),
    referralCode: row.referral_code ?? null,
    referralRewardNotifiedAt: row.referral_reward_notified_at ?? null,
    referredBy: row.referred_by ?? null,
    stripeLive,
  }
}

export function stripePeriodEndIso(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined
  const ts =
    item?.current_period_end ??
    (sub as { current_period_end?: number }).current_period_end
  return typeof ts === 'number' ? new Date(ts * 1000).toISOString() : null
}

export function mapStripeLive(sub: Stripe.Subscription): StripeLiveStatus {
  return {
    id: sub.id,
    status: sub.status,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    currentPeriodEnd: stripePeriodEndIso(sub),
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  }
}

export async function fetchStripeLive(
  stripe: { subscriptions: { retrieve: (id: string) => Promise<Stripe.Subscription> } },
  subscriptionId: string | null | undefined
): Promise<StripeLiveStatus> {
  if (!subscriptionId) return null
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    return mapStripeLive(sub)
  } catch (err) {
    console.warn('admin members: stripe retrieve', err)
    return null
  }
}
