import { normalizeSubscriptionTier } from '@/lib/subscription-tiers'

export type SubscriptionSource = 'stripe' | 'app_store' | 'manual' | 'unknown' | 'none'

export const SUBSCRIPTION_SOURCE_LABELS: Record<SubscriptionSource, string> = {
  stripe: 'Stripe (web)',
  app_store: 'App Store / Play',
  manual: 'Manuel (admin)',
  unknown: 'Ukendt (ikke Stripe)',
  none: 'Ingen',
}

export type ProfileBillingFields = {
  subscription_tier?: string | null
  stripe_subscription_id?: string | null
  subscription_source?: string | null
}

export function normalizeSubscriptionSource(raw: unknown): SubscriptionSource | null {
  if (
    raw === 'stripe' ||
    raw === 'app_store' ||
    raw === 'manual' ||
    raw === 'unknown' ||
    raw === 'none'
  ) {
    return raw
  }
  return null
}

/** Kilde til abonnement — gemt værdi først, ellers udledt af Stripe-id / tier. */
export function inferSubscriptionSource(row: ProfileBillingFields): SubscriptionSource {
  const stored = normalizeSubscriptionSource(row.subscription_source)
  if (stored) return stored

  if (row.stripe_subscription_id) return 'stripe'

  const tier = normalizeSubscriptionTier(row.subscription_tier)
  if (tier === 'plus' || tier === 'premium') return 'unknown'

  return 'none'
}

export function canCancelViaStripe(source: SubscriptionSource, stripeSubscriptionId?: string | null) {
  return source === 'stripe' && Boolean(stripeSubscriptionId)
}

export function cannotCancelReason(source: SubscriptionSource): string | null {
  if (source === 'app_store') {
    return 'Abonnementet er købt i App Store eller Google Play. Det kan kun opsiges dér — ikke herfra.'
  }
  if (source === 'unknown') {
    return 'Ingen Stripe-subscription. Sandsynligvis App Store/Play eller ældre betaling — kan ikke opsiges via Stripe.'
  }
  if (source === 'manual') {
    return 'Adgangen er sat manuelt. Brug «Sæt til gratis» for at fjerne den.'
  }
  if (source === 'none') {
    return 'Ingen aktiv betaling at opsige.'
  }
  return null
}
