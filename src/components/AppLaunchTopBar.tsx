'use client'

import { usePathname } from 'next/navigation'

import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/referral-shared'

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
      data-site-chrome
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
          <a href={PLAY_STORE_URL} className="font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
            Hent appen til Android
          </a>
        </p>
      </div>
    </div>
  )
}
