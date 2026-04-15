'use client'

import { useCookieConsent } from '@/contexts/CookieConsentContext'
import Link from 'next/link'

export default function CookieConsentBanner() {
  const { consent, accept, decline } = useCookieConsent()

  if (consent !== 'unset') return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[240] border-t border-gray-200 bg-white/98 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-5"
      role="region"
      aria-label="Cookie-meddelelse"
    >
      <div className="container mx-auto max-w-4xl">
        <p className="text-sm text-gray-800 leading-relaxed mb-4">
          Selvom vi er eksperter i vægttab, bruger vi stadig{' '}
          <strong className="font-semibold text-gray-900">cookies</strong>. Nødvendige cookies får siden til at virke;
          med dit samtykke bruger vi også måling (fx Google Analytics) og kan vise mere relevante annoncer (fx Meta).
          Du kan altid ændre valget under «Cookie-indstillinger» i bunden af siden.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            Læs mere på{' '}
            <Link
              href="/cookies-og-privatliv"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
            >
              Cookies og privatliv
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={decline}
              className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
            >
              Afvis ikke-nødvendige
            </button>
            <button
              type="button"
              onClick={accept}
              className="min-h-[44px] rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              Accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
