'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const STORAGE_KEY = 'ff-soft-launch-banner-dismissed'

export default function SoftLaunchBanner() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setVisible(false)
    } catch {
      /* ignore */
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (!visible || (pathname ?? '').startsWith('/admin')) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Meddelelse om soft launch"
      className="border-b border-amber-200/90 bg-gradient-to-r from-amber-50 via-emerald-50/80 to-amber-50"
    >
      <div className="container max-w-4xl mx-auto px-4 py-3 sm:py-3.5 relative pr-10 sm:pr-12">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-2 top-2 sm:top-3 rounded-md p-1.5 text-gray-500 hover:bg-white/70 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          aria-label="Skjul denne meddelelse"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="text-sm sm:text-[15px] leading-relaxed text-gray-800 text-center sm:text-left space-y-2">
          <p>
            <span className="font-semibold text-gray-900">Vi har lige åbnet Functional Foods i en soft launch.</span>{' '}
            Siden er levende, men vi finder stadig fejl og mangler — vi er taknemmelige for lidt tålmodighed, mens vi
            retter til. Falder du over noget der driller, eller har du spørgsmål, så skriv til{' '}
            <a
              href="mailto:w@nicolaivarney.dk"
              className="font-medium text-emerald-800 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-950"
            >
              w@nicolaivarney.dk
            </a>
            . Ellers er du velkommen til at udforske siden i dit eget tempo.
          </p>
          <p className="text-gray-700">
            Vil du have en konto, kan du oprette dig gratis: gå til{' '}
            <Link
              href="/kom-i-gang"
              className="font-medium text-emerald-800 underline decoration-emerald-600/50 underline-offset-2 hover:text-emerald-950"
            >
              Kom i gang
            </Link>{' '}
            og vælg <strong className="font-semibold text-gray-900">0 kr</strong> — så opretter du en gratis profil
            uden betaling.
          </p>
        </div>
      </div>
    </div>
  )
}
