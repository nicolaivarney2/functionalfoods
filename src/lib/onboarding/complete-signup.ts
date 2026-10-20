import { applyPendingOnboarding } from '@/lib/onboarding/vaegttabsplan-onboarding'
import type { CheckoutPlan } from '@/lib/subscription-tiers'

export type CompleteSignupResult =
  | { ok: true; redirectUrl: string; external: boolean }
  | { ok: false; error: string }

export async function completeSignupAfterAuth(
  accessToken: string,
  tier: CheckoutPlan,
  productUpdatesConsent: boolean,
  referralCode?: string | null
): Promise<CompleteSignupResult> {
  const prefRes = await fetch('/api/user/signup-preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ productUpdatesConsent, referralCode: referralCode || undefined }),
  })

  if (!prefRes.ok) {
    const j = await prefRes.json().catch(() => ({}))
    return { ok: false, error: (j.error as string) || 'Kunne ikke gemme dine valg.' }
  }

  await applyPendingOnboarding(accessToken)

  // Nye konti sendes ikke til Stripe. Eksisterende abonnementer kører videre, til de selv opsiges.
  void tier
  return { ok: true, redirectUrl: '/madbudget?ny=1', external: false }
}
