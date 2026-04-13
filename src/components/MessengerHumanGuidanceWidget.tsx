'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, MessageCircle, UserRound, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'

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
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!user?.id || !PAGE_ID?.trim()) return

    let cancelled = false
    setLinkLoading(true)
    const supabase = createSupabaseClient()

    const loadMessengerLink = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const accessToken = sessionData.session?.access_token
        const headers: Record<string, string> = {}
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }

        const res = await fetch('/api/user/messenger-link', {
          method: 'POST',
          credentials: 'include',
          headers,
        })
        const data = (await res.json()) as { url?: string }
        if (!cancelled && typeof data.url === 'string') {
          setMessengerUrl(data.url)
        }
      } catch {
        if (!cancelled && PAGE_ID) {
          setMessengerUrl(`https://m.me/${PAGE_ID.trim()}?ref=ff_logged_in`)
        }
      } finally {
        if (!cancelled) setLinkLoading(false)
      }
    }

    loadMessengerLink()

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
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-[95] flex h-14 w-14 items-center justify-center rounded-full bg-[#0084FF] text-white shadow-xl shadow-blue-900/25 transition hover:bg-[#006bcf] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        aria-label="Åbn vejledning i Messenger"
      >
        <MessageCircle className="h-6 w-6" aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 md:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Personlig vejledning via Messenger"
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-200/90 bg-white p-5 shadow-2xl ring-1 ring-black/[0.04]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"
                  aria-hidden
                >
                  <UserRound className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/90">Personlig vejledning</p>
                  <p className="text-sm font-semibold text-gray-900">Et menneske svarer dig i Messenger</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Luk"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-gray-700">
              Du bliver sendt videre til Messenger, hvor en person fra teamet hjælper dig videre. Der chatttes ikke på denne side.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Vi bruger et kort engangstoken for at kunne koble samtalen til din FF-konto.
            </p>

            <div className="mt-4 flex items-center gap-2">
              <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-3 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#006bcf] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
                aria-busy={linkLoading && !messengerUrl}
              >
                {linkLoading && !messengerUrl ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                )}
                Fortsæt til Messenger
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
