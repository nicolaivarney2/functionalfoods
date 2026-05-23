'use client'

import Link from 'next/link'
import { Info, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type GuestExperienceBannerProps = {
  /** Kontekst-specifik note, fx "madplan" eller "dagligvarer" */
  featureLabel?: string
}

export default function GuestExperienceBanner({
  featureLabel = 'denne side',
}: GuestExperienceBannerProps) {
  const { user, loading } = useAuth()

  if (loading || user) return null

  return (
    <div
      className="border-b border-amber-200 bg-amber-50"
      role="status"
      aria-live="polite"
    >
      <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 text-sm text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <p className="leading-relaxed">
            Du kan se {featureLabel} uden login, men indhold og funktioner kan variere eller virke
            mangelfuldt.{' '}
            <Link
              href="/kom-i-gang"
              className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
            >
              Lav en gratis bruger her
            </Link>{' '}
            for den fulde oplevelse.
          </p>
        </div>
        <Link
          href="/kom-i-gang"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-100 sm:self-center"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          Opret bruger gratis
        </Link>
      </div>
    </div>
  )
}
