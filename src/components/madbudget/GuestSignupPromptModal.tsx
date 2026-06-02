'use client'

import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'

type GuestSignupPromptModalProps = {
  open: boolean
  message: string
  onClose: () => void
}

export default function GuestSignupPromptModal({
  open,
  message,
  onClose,
}: GuestSignupPromptModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-signup-prompt-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id="guest-signup-prompt-title" className="text-lg font-semibold text-gray-900">
            Opret bruger for at fortsætte
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
        <p className="mb-6 text-sm leading-relaxed text-gray-600">{message}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Fortsæt demo
          </button>
          <Link
            href="/lav-din-plan"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Opret bruger her
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  )
}
