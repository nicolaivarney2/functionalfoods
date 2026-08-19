import type { SupabaseClient } from '@supabase/supabase-js'

import {
  FREE_MEAL_PLANS_PER_WEEK,
  FREE_PRICE_ALERTS_MAX,
  TIER_PRICES_KR,
  currentWeekStartIso,
  entitlementsForTier,
  normalizeSubscriptionTier,
  tierFromMonthlyAmountKr,
  type SubscriptionTier,
  type TierEntitlements,
} from '@/lib/subscription-tiers'
import type { SubscriptionSource } from '@/lib/subscription-source'

export type SubscriptionUsage = {
  mealPlansUsedThisWeek: number
  priceAlertsActive: number
}

export type SubscriptionStatus = TierEntitlements & {
  usage: SubscriptionUsage
  mealPlansRemainingThisWeek: number | null
  priceAlertsRemaining: number | null
  lifetimeAccess: boolean
}

type ProfileRow = {
  subscription_tier?: string | null
  last_contribution_amount_ore?: number | null
  lifetime_access?: boolean | null
}

function tierFromProfileRow(row: ProfileRow | null): SubscriptionTier {
  const stored = row?.subscription_tier ? normalizeSubscriptionTier(row.subscription_tier) : null
  if (row?.lifetime_access && stored !== 'premium') return 'plus'
  if (stored) return stored
  return 'free'
}

export async function getUserSubscriptionTier(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionTier> {
  const first = await supabase
    .from('user_profiles')
    .select('subscription_tier, last_contribution_amount_ore, lifetime_access')
    .eq('id', userId)
    .maybeSingle()

  let row = first.data as ProfileRow | null
  if (first.error && String(first.error.message || '').includes('lifetime_access')) {
    const fallback = await supabase
      .from('user_profiles')
      .select('subscription_tier, last_contribution_amount_ore')
      .eq('id', userId)
      .maybeSingle()
    row = fallback.data as ProfileRow | null
  }

  const fromRow = tierFromProfileRow(row)
  if (fromRow !== 'free' || row?.subscription_tier) {
    return fromRow
  }

  // Legacy: pay-what-you-can beløb → tier (indtil alle er migreret).
  const ore = row?.last_contribution_amount_ore
  if (typeof ore === 'number' && ore > 0) {
    return tierFromMonthlyAmountKr(Math.round(ore / 100))
  }

  return 'free'
}

export async function getSubscriptionUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionUsage> {
  const weekStart = currentWeekStartIso()

  const [{ count: genCount }, { count: alertCount }] = await Promise.all([
    supabase
      .from('meal_plan_generation_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${weekStart}T00:00:00.000Z`),
    supabase
      .from('user_price_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  return {
    mealPlansUsedThisWeek: genCount ?? 0,
    priceAlertsActive: alertCount ?? 0,
  }
}

export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionStatus> {
  const [tier, lifetimeAccess, usage] = await Promise.all([
    getUserSubscriptionTier(supabase, userId),
    profileHasLifetimeAccess(supabase, userId),
    getSubscriptionUsage(supabase, userId),
  ])
  const ent = entitlementsForTier(tier)

  const mealPlansRemainingThisWeek =
    ent.mealPlansPerWeek == null
      ? null
      : Math.max(0, ent.mealPlansPerWeek - usage.mealPlansUsedThisWeek)

  const priceAlertsRemaining =
    ent.priceAlertsMax == null ? null : Math.max(0, ent.priceAlertsMax - usage.priceAlertsActive)

  return {
    ...ent,
    usage,
    mealPlansRemainingThisWeek,
    priceAlertsRemaining,
    lifetimeAccess,
  }
}

export class SubscriptionLimitError extends Error {
  code: 'meal_plan_limit' | 'price_alert_limit' | 'messenger_premium_only'
  tier: SubscriptionTier
  status: SubscriptionStatus

  constructor(
    code: 'meal_plan_limit' | 'price_alert_limit' | 'messenger_premium_only',
    tier: SubscriptionTier,
    status: SubscriptionStatus,
    message: string,
  ) {
    super(message)
    this.code = code
    this.tier = tier
    this.status = status
  }
}

export async function assertMealPlanGenerationAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionStatus> {
  const status = await getSubscriptionStatus(supabase, userId)
  if (status.unlimitedMealPlans) return status
  if ((status.mealPlansRemainingThisWeek ?? 0) <= 0) {
    throw new SubscriptionLimitError(
      'meal_plan_limit',
      status.tier,
      status,
      `Du har brugt dine ${FREE_MEAL_PLANS_PER_WEEK} madplaner denne uge. Opgrader til Madbudget (${TIER_PRICES_KR.plus} kr/md) for ubegrænset.`,
    )
  }
  return status
}

export async function logMealPlanGeneration(supabase: SupabaseClient, userId: string): Promise<void> {
  const { error } = await supabase.from('meal_plan_generation_log').insert({ user_id: userId })
  if (error) console.error('meal_plan_generation_log insert:', error)
}

export async function assertPriceAlertCreationAllowed(
  supabase: SupabaseClient,
  userId: string,
  additionalAlerts = 1,
): Promise<SubscriptionStatus> {
  const status = await getSubscriptionStatus(supabase, userId)
  if (status.unlimitedPriceAlerts) return status
  const remaining = status.priceAlertsRemaining ?? 0
  if (remaining < additionalAlerts) {
    throw new SubscriptionLimitError(
      'price_alert_limit',
      status.tier,
      status,
      `Du har ${FREE_PRICE_ALERTS_MAX} prisalarmer på gratis-planen. Opgrader til Madbudget (${TIER_PRICES_KR.plus} kr/md) for ubegrænset.`,
    )
  }
  return status
}

export async function assertMessengerGuidanceAllowed(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionStatus> {
  const status = await getSubscriptionStatus(supabase, userId)
  if (!status.messengerGuidance) {
    throw new SubscriptionLimitError(
      'messenger_premium_only',
      status.tier,
      status,
      `Personlig vejledning på Messenger er inkluderet i Premium (${TIER_PRICES_KR.premium} kr/md).`,
    )
  }
  return status
}

export async function profileHasLifetimeAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('lifetime_access')
    .eq('id', userId)
    .maybeSingle()
  if (error && String(error.message || '').includes('lifetime_access')) return false
  return Boolean((data as { lifetime_access?: boolean | null } | null)?.lifetime_access)
}

export async function setUserSubscriptionTier(
  supabase: SupabaseClient,
  userId: string,
  tier: SubscriptionTier,
  extra?: {
    stripeSubscriptionId?: string | null
    monthlyAmountOre?: number | null
    subscriptionSource?: SubscriptionSource | null
    ignoreLifetime?: boolean
  },
): Promise<void> {
  let nextTier = tier
  if (tier === 'free' && !extra?.ignoreLifetime) {
    const lifetime = await profileHasLifetimeAccess(supabase, userId)
    if (lifetime) {
      nextTier = 'plus'
      extra = {
        ...extra,
        subscriptionSource: extra?.subscriptionSource === 'none' ? 'manual' : extra?.subscriptionSource,
      }
    }
  }

  const patch: Record<string, unknown> = {
    subscription_tier: nextTier,
    updated_at: new Date().toISOString(),
  }
  if (extra?.stripeSubscriptionId !== undefined) {
    patch.stripe_subscription_id = extra.stripeSubscriptionId
  }
  if (extra?.monthlyAmountOre !== undefined) {
    patch.last_contribution_amount_ore = extra.monthlyAmountOre
    patch.last_contribution_at = new Date().toISOString()
  }
  if (extra?.subscriptionSource !== undefined) {
    patch.subscription_source = extra.subscriptionSource
  }

  const { error } = await supabase.from('user_profiles').update(patch).eq('id', userId)
  if (error) {
    const { error: insErr } = await supabase.from('user_profiles').insert({
      id: userId,
      role: 'user',
      ...patch,
    })
    if (insErr) console.error('setUserSubscriptionTier insert:', insErr)
  }
}
