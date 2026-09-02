'use client'

import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'

import { APP_STORE_URL } from '@/lib/referral-shared'

type AppStoreBadgesProps = {
  /** Kort linje under badges. Hold den tynd på forsiden. */
  showCaption?: boolean
  align?: 'start' | 'center'
  /** `dark` = hvid tekst (hero/footer). */
  tone?: 'light' | 'dark'
  className?: string
}

export default function AppStoreBadges({
  showCaption = false,
  align = 'start',
  tone = 'light',
  className = '',
}: AppStoreBadgesProps) {
  const [betaOpen, setBetaOpen] = useState(false)
  const alignCls = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  const captionCls = tone === 'dark' ? 'text-white/70' : 'text-slate-500'

  return (
    <div className={`flex flex-col gap-2 ${alignCls} ${className}`}>
      {showCaption ? (
        <p className={`text-xs leading-snug ${captionCls}`}>
          <a
            href={APP_STORE_URL}
            className={`font-medium underline underline-offset-2 ${
              tone === 'dark'
                ? 'text-white decoration-white/40 hover:decoration-white'
                : 'text-slate-700 decoration-slate-400 hover:decoration-slate-700'
            }`}
          >
            Hent appen til iPhone
          </a>
          {'. '}
          <button
            type="button"
            onClick={() => setBetaOpen(true)}
            className={`font-medium underline underline-offset-2 ${
              tone === 'dark'
                ? 'text-white decoration-white/40 hover:decoration-white'
                : 'text-slate-700 decoration-slate-400 hover:decoration-slate-700'
            }`}
          >
            Android: tilmeld beta
          </button>
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <a href={APP_STORE_URL} className="inline-flex h-11 shrink-0 items-center" aria-label="Hent i App Store">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/store-badges/app-store-da.svg"
            alt="Hent i App Store"
            className="h-11 w-auto"
          />
        </a>
        <button
          type="button"
          onClick={() => setBetaOpen(true)}
          className="inline-flex h-11 shrink-0 items-center opacity-50 grayscale transition hover:opacity-80 hover:grayscale-0"
          title="Tilmeld Android-beta"
          aria-label="Tilmeld Android-beta"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/store-badges/google-play-da.png"
            alt="Tilmeld Android-beta"
            className="h-[58px] w-auto"
          />
        </button>
      </div>
      <AndroidBetaModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </div>
  )
}

export function AndroidBetaLink({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <AndroidBetaModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function AndroidBetaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setError('')
    setBusy(false)
    setDone(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/android-beta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error || 'Kunne ikke sende. Prøv igen.')
        return
      }
      setDone(true)
    } catch {
      setError('Kunne ikke sende. Prøv igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id={titleId} className="text-lg font-semibold text-gray-900">
            Tilmeld Android-beta
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Luk"
          >
            <X size={22} />
          </button>
        </div>

        {done ? (
          <p className="text-sm leading-relaxed text-gray-600">
            Tak. Vi skriver, når du kan teste appen på Android.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm leading-relaxed text-gray-600">
              Appen er endnu ikke i Play Butik. Skriv din e-mail, så får du en invitation.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-800">E-mail</span>
              <input
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.dk"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 outline-none ring-emerald-700/20 placeholder:text-gray-400 focus:border-emerald-600 focus:ring-4"
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-60"
            >
              {busy ? 'Sender…' : 'Tilmeld'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
