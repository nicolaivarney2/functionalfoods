/** localStorage-nøgle — versionér ved ændring af betydning. */
export const COOKIE_CONSENT_STORAGE_KEY = 'ff_cookie_consent_v1'

export type CookieConsentChoice = 'accepted' | 'declined'

export function readStoredCookieConsent(): CookieConsentChoice | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (v === 'accepted' || v === 'declined') return v
    return null
  } catch {
    return null
  }
}

export function writeStoredCookieConsent(choice: CookieConsentChoice): void {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice)
  } catch {
    /* private mode */
  }
}

export function clearStoredCookieConsent(): void {
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
