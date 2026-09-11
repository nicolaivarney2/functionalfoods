'use client'

import { useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

export default function FeedbackCta({ screen }: { screen: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    setOpen(false)
    setSent(false)
    setMessage('')
    setError('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm"
      >
        Få hjælp & giv feedback
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Luk" onClick={close} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Få hjælp & giv feedback</h3>
            <p className="mt-2 text-sm text-gray-600">
              Functional Foods er ny, og det er naturligt at ikke alt fungerer endnu. Vi retter ting lynhurtigt, så
              fortæl os om de fejl du finder.
            </p>
            {sent ? (
              <p className="mt-4 text-sm text-emerald-800">Tak, vi har modtaget din besked.</p>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  placeholder="Beskriv fejlen eller det du har brug for hjælp til"
                />
                {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
                <button
                  type="button"
                  disabled={busy || !message.trim()}
                  onClick={async () => {
                    setBusy(true)
                    setError('')
                    try {
                      const res = await authFetch('/api/feedback', {
                        method: 'POST',
                        body: JSON.stringify({
                          message: message.trim(),
                          source: 'web',
                          sourceScreen: screen,
                          platform: 'web',
                        }),
                      })
                      if (!res.ok) throw new Error('Kunne ikke sende')
                      setSent(true)
                    } catch {
                      setError('Kunne ikke sende lige nu. Prøv igen.')
                    } finally {
                      setBusy(false)
                    }
                  }}
                  className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? 'Sender…' : 'Send feedback'}
                </button>
              </>
            )}
            <button type="button" onClick={close} className="mt-3 block text-sm text-gray-500">
              Luk
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
