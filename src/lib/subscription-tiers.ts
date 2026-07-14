/** Abonnementsniveauer for Functional Foods (web + app). */

export type SubscriptionTier = 'free' | 'plus' | 'premium'

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Gratis',
  plus: 'Madbudget',
  premium: 'Premium',
}

export const TIER_PRICES_KR: Record<SubscriptionTier, number> = {
  free: 0,
  plus: 29,
  premium: 249,
}

/** Gratis: vist som 3 madplaner/uge i UI — faktisk grænse er højere (buffer ved onboarding). */
export const FREE_MEAL_PLANS_PER_WEEK = 3
/** Faktisk ugentlig grænse for gratis (API). Brugeren ser FREE_MEAL_PLANS_PER_WEEK i copy. */
export const FREE_MEAL_PLANS_PER_WEEK_LIMIT = 5
export const FREE_PRICE_ALERTS_MAX = 3

export const PREMIUM_GUIDANCE_HOURS =
  'Personlig vejledning i dagstimerne 7.30–21.30'

export const PREMIUM_CONSIDERATION_NOTE =
  'Mange oplever at struktur og personlig støtte gør det lettere at holde fast i en vægttabsplan'

export type TierEntitlements = {
  tier: SubscriptionTier
  mealPlansPerWeek: number | null
  priceAlertsMax: number | null
  messengerGuidance: boolean
  unlimitedMealPlans: boolean
  unlimitedPriceAlerts: boolean
}

export function entitlementsForTier(tier: SubscriptionTier): TierEntitlements {
  const isPaid = tier === 'plus' || tier === 'premium'
  return {
    tier,
    mealPlansPerWeek: isPaid ? null : FREE_MEAL_PLANS_PER_WEEK_LIMIT,
    priceAlertsMax: isPaid ? null : FREE_PRICE_ALERTS_MAX,
    messengerGuidance: tier === 'premium',
    unlimitedMealPlans: isPaid,
    unlimitedPriceAlerts: isPaid,
  }
}

/** Map Stripe/RevenueCat beløb (kr/md) til tier. */
export function tierFromMonthlyAmountKr(amountKr: number): SubscriptionTier {
  if (amountKr >= TIER_PRICES_KR.premium) return 'premium'
  if (amountKr >= TIER_PRICES_KR.plus) return 'plus'
  return 'free'
}

export function normalizeSubscriptionTier(raw: unknown): SubscriptionTier {
  if (raw === 'plus' || raw === 'premium' || raw === 'free') return raw
  return 'free'
}

/** ISO-uge start (mandag 00:00 UTC) for tælling af madplaner. */
export function currentWeekStartIso(): string {
  const now = new Date()
  const day = now.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  return monday.toISOString().slice(0, 10)
}
