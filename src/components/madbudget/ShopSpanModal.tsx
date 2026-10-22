'use client'

import { useMemo, useState } from 'react'
import { localIsoDate } from '@/lib/madbudget/week-dates'

const SHORT = ['søn', 'man', 'tir', 'ons', 'tor', 'fre', 'lør']

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (shopDate: string, dayCount: number) => void
}

/** Næste 7 dage i vælgeren. Serveren accepterer i går til 21 dage frem. */
export default function ShopSpanModal({ open, onClose, onConfirm }: Props) {
  const [offset, setOffset] = useState(0)
  const [dayCount, setDayCount] = useState(7)
  const choices = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      return date
    })
  }, [open])
  if (!open) return null
  const shopDate = choices[offset] ?? choices[0]

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Ny madplan</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Vælg hvornår I køber ind, og hvor mange dage maden skal række. Maden lægges på den dag og de følgende dage — også når det krydser søndag.
        </p>
        <p className="mt-3 text-sm font-medium text-gray-800">Hvornår køber I ind?</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {choices.map((date, i) => {
            const on = i === offset
            return (
              <button
                key={localIsoDate(date)}
                type="button"
                onClick={() => setOffset(i)}
                className={`flex min-w-[3.25rem] flex-col items-center rounded-xl border px-2 py-2 text-sm ${
                  on ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 bg-white text-gray-800'
                }`}
              >
                <span className="text-xs uppercase">{SHORT[date.getDay()]}</span>
                <span className="font-semibold">{date.getDate()}.</span>
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-sm font-medium text-gray-800">Hvor mange dage frem?</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            className="h-10 w-10 rounded-lg border border-gray-300 text-lg"
            onClick={() => setDayCount((n) => Math.max(1, n - 1))}
            aria-label="Færre dage"
          >
            −
          </button>
          <span className="min-w-[5rem] text-center font-medium">{dayCount === 1 ? '1 dag' : `${dayCount} dage`}</span>
          <button
            type="button"
            className="h-10 w-10 rounded-lg border border-gray-300 text-lg"
            onClick={() => setDayCount((n) => Math.min(14, n + 1))}
            aria-label="Flere dage"
          >
            +
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Annuller
          </button>
          <button
            type="button"
            onClick={() => onConfirm(localIsoDate(shopDate), dayCount)}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Lav madplanen
          </button>
        </div>
      </div>
    </div>
  )
}
