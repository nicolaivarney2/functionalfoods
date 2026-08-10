'use client'

import { usePathname } from 'next/navigation'

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
          Vi er ved at udgive vores Gratis functionalfoods APP + 1200 nye opskrifter.
          Stay tuned. // Nicolai
        </p>
      </div>
    </div>
  )
}
