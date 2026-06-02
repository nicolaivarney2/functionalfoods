'use client'

import { Compass, Info, X } from 'lucide-react'

type GuestDemoBannerProps = {
  onStartTour: () => void
  onDismiss: () => void
}

/**
 * Top-bar på Madbudget når brugeren er gæst (ikke logget ind).
 */
export default function GuestDemoBanner({ onStartTour, onDismiss }: GuestDemoBannerProps) {
  return (
    <div
      className="border-b border-green-200 bg-gradient-to-r from-green-50 via-white to-emerald-50"
      role="status"
      aria-live="polite"
    >
      <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5 text-sm text-green-950">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
          <p className="leading-relaxed">
            <strong className="font-semibold">Demo til vægttab:</strong> Fiktiv madplan med morgenmad,
            frokost og aftensmad fra ugens tilbud. Først en kort intro til jeres familie — derefter en
            guidet tour på siden.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={onStartTour}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Compass className="h-4 w-4" aria-hidden />
            Tag en guidet tour
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Luk besked"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-green-200 bg-white text-green-900 transition-colors hover:bg-green-50"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
