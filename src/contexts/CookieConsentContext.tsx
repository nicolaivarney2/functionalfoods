'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearStoredCookieConsent,
  readStoredCookieConsent,
  writeStoredCookieConsent,
  type CookieConsentChoice,
} from '@/lib/cookie-consent'

const HAS_GA = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim())
const HAS_META = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim())

export type CookieConsentUIState = 'loading' | 'unset' | CookieConsentChoice

type CookieConsentContextValue = {
  /** loading = afventer localStorage (undgå hydration mismatch) */
  consent: CookieConsentUIState
  /** GA/Meta-scripts er klar (eller ingen scripts konfigureret). Bruges til page_view / events. */
  marketingTagsReady: boolean
  /** Kald fra ConsentGatedMarketingScripts når gtag/fbq er initialiseret. */
  notifyMarketingTagsReady: () => void
  accept: () => void
  decline: () => void
  /** Fjerner valg og viser banner igen (footer / tilbagetrækning af samtykke). */
  reopenSettings: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentUIState>('loading')
  const [marketingTagsReady, setMarketingTagsReady] = useState(false)

  useEffect(() => {
    const stored = readStoredCookieConsent()
    if (stored === 'accepted' || stored === 'declined') setConsent(stored)
    else setConsent('unset')
  }, [])

  useEffect(() => {
    if (consent !== 'accepted') {
      setMarketingTagsReady(false)
      return
    }
    if (!HAS_GA && !HAS_META) {
      setMarketingTagsReady(true)
      return
    }
    setMarketingTagsReady(false)
  }, [consent])

  const notifyMarketingTagsReady = useCallback(() => {
    setMarketingTagsReady(true)
  }, [])

  const accept = useCallback(() => {
    writeStoredCookieConsent('accepted')
    setConsent('accepted')
  }, [])

  const decline = useCallback(() => {
    writeStoredCookieConsent('declined')
    setConsent('declined')
  }, [])

  const reopenSettings = useCallback(() => {
    clearStoredCookieConsent()
    setConsent('unset')
  }, [])

  const value = useMemo(
    () => ({
      consent,
      marketingTagsReady,
      notifyMarketingTagsReady,
      accept,
      decline,
      reopenSettings,
    }),
    [consent, marketingTagsReady, notifyMarketingTagsReady, accept, decline, reopenSettings]
  )

  return (
    <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
  )
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) {
    throw new Error('useCookieConsent skal bruges inde i CookieConsentProvider')
  }
  return ctx
}
