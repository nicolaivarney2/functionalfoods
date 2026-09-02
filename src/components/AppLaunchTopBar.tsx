'use client'

import { usePathname } from 'next/navigation'

import { AndroidBetaLink } from '@/components/AppStoreBadges'
import { APP_STORE_URL } from '@/lib/referral-shared'

/**
 * Site-wide top announcement — app launch + new recipes.
 * Skjules på admin for at undgå støj i værktøjerne.
 */
export default function AppLaunchTopBar() {
  const pathname = usePathname()

  if (pathname?.startsWith('/admin')) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Nyhedsmeddelelse"
      className="bg-emerald-800 text-white"
    >
      <div className="container px-3 sm:px-4 py-2">
        <p className="text-center text-xs sm:text-sm leading-snug text-white/95">
          <a href={APP_STORE_URL} className="font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
            Hent appen til iPhone
          </a>
          {' · '}
          <AndroidBetaLink className="font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
            Android: tilmeld beta
          </AndroidBetaLink>
        </p>
      </div>
    </div>
  )
}
