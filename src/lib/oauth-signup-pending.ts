import type { SubscriptionTier } from '@/lib/subscription-tiers'

export const OAUTH_SIGNUP_PENDING_KEY = 'ff_oauth_signup_pending_v1'

export type OAuthSignupPending = {
  tier: SubscriptionTier
  productUpdatesConsent: boolean
  source: 'onboarding'
}

export function saveOAuthSignupPending(data: OAuthSignupPending): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(OAUTH_SIGNUP_PENDING_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota */
  }
}

export function loadOAuthSignupPending(): OAuthSignupPending | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(OAUTH_SIGNUP_PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<OAuthSignupPending>
    if (parsed.source !== 'onboarding') return null
    if (parsed.tier !== 'free' && parsed.tier !== 'plus' && parsed.tier !== 'premium') return null
    return {
      tier: parsed.tier,
      productUpdatesConsent: Boolean(parsed.productUpdatesConsent),
      source: 'onboarding',
    }
  } catch {
    return null
  }
}

export function clearOAuthSignupPending(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(OAUTH_SIGNUP_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export function hasOAuthSignupPending(): boolean {
  return loadOAuthSignupPending() != null
}
