import { applyPendingOnboarding } from '@/lib/onboarding/vaegttabsplan-onboarding'
import type { SubscriptionTier } from '@/lib/subscription-tiers'

export type CompleteSignupResult =
  | { ok: true; redirectUrl: string; external: boolean }
  | { ok: false; error: string }

export async function completeSignupAfterAuth(
  accessToken: string,
  tier: SubscriptionTier,
  productUpdatesConsent: boolean
): Promise<CompleteSignupResult> {
  const prefRes = await fetch('/api/user/signup-preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ productUpdatesConsent }),
  })

  if (!prefRes.ok) {
    const j = await prefRes.json().catch(() => ({}))
    return { ok: false, error: (j.error as string) || 'Kunne ikke gemme dine valg.' }
  }

  await applyPendingOnboarding(accessToken)

  if (tier === 'plus' || tier === 'premium') {
    const payRes = await fetch('/api/stripe/create-subscription-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ tier }),
    })
    const payJson = await payRes.json().catch(() => ({}))
    if (!payRes.ok || !payJson.url) {
      return {
        ok: false,
        error: (payJson.error as string) || 'Kunne ikke starte betaling — din profil er gemt, gå til Madbudget.',
      }
    }
    return { ok: true, redirectUrl: payJson.url as string, external: true }
  }

  return { ok: true, redirectUrl: '/madbudget?ny=1', external: false }
}
