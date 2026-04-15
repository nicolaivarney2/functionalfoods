'use client'

import { useCookieConsent } from '@/contexts/CookieConsentContext'

type Props = {
  /** Ekstra klasser (fx på lys baggrund). Udeladt = footer-stil på mørk baggrund. */
  className?: string
}

export default function CookieSettingsFooterLink({ className }: Props) {
  const { reopenSettings } = useCookieConsent()

  const combinedClassName =
    className?.trim() ??
    'text-left text-sm text-white/80 hover:text-white underline-offset-2 hover:underline'

  return (
    <button type="button" onClick={reopenSettings} className={combinedClassName}>
      Cookie-indstillinger
    </button>
  )
}
