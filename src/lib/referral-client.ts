import { REFERRAL_COOKIE, normalizeReferralCode } from '@/lib/referral-shared'

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export function readStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    const fromQuery = normalizeReferralCode(params.get('ref') || params.get('code'))
    if (fromQuery) {
      writeStoredReferralCode(fromQuery)
      return fromQuery
    }
    const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]*)`))
    return normalizeReferralCode(match?.[1] ? decodeURIComponent(match[1]) : null)
  } catch {
    return null
  }
}

export function writeStoredReferralCode(code: string): void {
  if (typeof window === 'undefined') return
  const normalized = normalizeReferralCode(code)
  if (!normalized) return
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(normalized)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax`
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return
  document.cookie = `${REFERRAL_COOKIE}=; path=/; max-age=0`
}
