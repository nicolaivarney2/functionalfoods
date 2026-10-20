'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { donationDismissKey, donationIsDue, hasMobilePayBox, mobilePayBoxLabel } from '@/lib/donation'

export default function DonationPrompt() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (loading || !user?.id || !donationIsDue(user.created_at)) {
      setOpen(false)
      return
    }
    try {
      if (localStorage.getItem(donationDismissKey(user.id))) return
    } catch {
      return
    }
    setOpen(true)
  }, [loading, user])

  const dismiss = () => {
    if (user?.id) {
      try {
        localStorage.setItem(donationDismissKey(user.id), new Date().toISOString())
      } catch {
        /* popuppen lukker alligevel */
      }
    }
    setOpen(false)
  }

  if (!open) return null

  const box = mobilePayBoxLabel()
  const showBox = hasMobilePayBox()

  const copyBox = async () => {
    try {
      await navigator.clipboard.writeText(box)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-end justify-center bg-emerald-950/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Heart className="h-5 w-5" aria-hidden />
        </div>
        <h2 id="donation-title" className="text-xl font-bold text-gray-900">
          Functional Foods er gratis
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Du har brugt det i et par uger. Hvis det hjælper, kan du støtte os med en donation på MobilePay. Det er
          frivilligt.
        </p>
        {showBox ? (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">MobilePay-boks</p>
            <p className="mt-1 text-2xl font-bold tracking-wide text-gray-900">{box}</p>
          </div>
        ) : null}
        <div className="mt-5 flex flex-col gap-2">
          {showBox ? (
            <button
              type="button"
              onClick={copyBox}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {copied ? 'Boksen er kopieret' : 'Kopiér MobilePay-boks'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-gray-500 hover:text-gray-800"
          >
            Ikke nu
          </button>
        </div>
      </div>
    </div>
  )
}
