'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, MessageCircle, UserRound } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const PAGE_ID = process.env.NEXT_PUBLIC_MESSENGER_PAGE_ID

/**
 * Logget ind: widget med menneskelig vejledning + direkte til Messenger (ManyChat).
 * Henter personlig m.me-URL med engangstoken når API og DB er klar; ellers ff_logged_in.
 */
export default function MessengerHumanGuidanceWidget() {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [messengerUrl, setMessengerUrl] = useState<string | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)

  useEffect(() => {
    if (!user?.id || !PAGE_ID?.trim()) return

    let cancelled = false
    setLinkLoading(true)

    fetch('/api/user/messenger-link', {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data: { url?: string }) => {
        if (!cancelled && typeof data.url === 'string') {
          setMessengerUrl(data.url)
        }
      })
      .catch(() => {
        if (!cancelled && PAGE_ID) {
          setMessengerUrl(`https://m.me/${PAGE_ID.trim()}?ref=ff_logged_in`)
        }
      })
      .finally(() => {
        if (!cancelled) setLinkLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (!PAGE_ID?.trim() || loading || !user) {
    return null
  }

  if (!pathname || pathname.startsWith('/admin')) {
    return null
  }

  const href =
    messengerUrl ?? `https://m.me/${PAGE_ID.trim()}?ref=ff_logged_in`

  return (
    <aside
      className="pointer-events-none fixed z-[95] max-md:bottom-6 max-md:right-4 max-md:left-auto max-md:top-auto max-md:w-[min(18rem,calc(100vw-2rem))] md:right-0 md:top-1/2 md:w-[13.5rem] md:-translate-y-1/2 md:rounded-l-2xl md:rounded-r-none"
      aria-label="Personlig vejledning via Messenger"
    >
      <div className="pointer-events-auto rounded-2xl border border-emerald-200/90 bg-white/95 p-4 shadow-xl shadow-emerald-900/10 ring-1 ring-black/[0.04] backdrop-blur-sm md:rounded-l-2xl md:rounded-r-none md:border-r-0 md:pr-3 md:pl-4 md:shadow-[-8px_0_24px_-4px_rgba(0,0,0,0.08)]">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"
            aria-hidden
          >
            <UserRound className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/90">Personlig vejledning</p>
            <p className="mt-1 text-sm font-semibold leading-snug text-gray-900">Et menneske — ikke chat på siden</p>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
              Vi tager snakken i <strong className="font-semibold text-gray-800">Messenger</strong>, så du ved, det er
              rigtig support — ikke en bot her på websitet.
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
          Når du åbner Messenger, bruger vi et kort engangstoken til at koble samtalen til din FF-konto, så vi kan hjælpe
          dig bedre. Der chatttes ikke på denne side.
        </p>

        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-3 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#006bcf] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:opacity-70"
          aria-busy={linkLoading && !messengerUrl}
        >
          {linkLoading && !messengerUrl ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
          )}
          Åbn Messenger
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        </Link>
      </div>
    </aside>
  )
}
