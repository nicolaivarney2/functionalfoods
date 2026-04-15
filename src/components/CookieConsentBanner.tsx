'use client'

import { useCookieConsent } from '@/contexts/CookieConsentContext'
import Link from 'next/link'

export default function CookieConsentBanner() {
  const { consent, accept, decline } = useCookieConsent()

  if (consent !== 'unset') return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[240] border-t border-gray-200 bg-white px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] sm:px-6 sm:py-5"
      role="region"
      aria-label="Cookie-meddelelse"
    >
      <div className="container mx-auto max-w-3xl space-y-4">
        <div className="text-sm text-gray-800 leading-relaxed space-y-2">
          <p>
            Selvom vi er eksperter i vægttab, bruger vi stadig cookies&nbsp;🍪 Bl.a. så vi kan vise dig det indhold på
            vores side, der passer bedst til dig (kostfokus).
          </p>
          <p className="text-gray-600">
            <Link
              href="/cookies-og-privatliv"
              className="font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
            >
              Cookies og privatliv
            </Link>
            {' · '}Du kan ændre valget under «Cookie-indstillinger» i bunden af siden.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={accept}
            className="min-h-[44px] rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            Accepter
          </button>
          <button
            type="button"
            onClick={decline}
            className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
          >
            Afvis ikke-nødvendige
          </button>
        </div>
      </div>
    </div>
  )
}
