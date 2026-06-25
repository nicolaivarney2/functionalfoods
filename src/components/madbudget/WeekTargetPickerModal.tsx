'use client'

import { X } from 'lucide-react'
import type { MealPlanWeekTarget, WeekInfo } from '@/lib/madbudget/week-dates'

type WeekTargetPickerModalProps = {
  open: boolean
  currentWeek: WeekInfo
  nextWeek: WeekInfo
  onClose: () => void
  onSelect: (target: MealPlanWeekTarget) => void
}

export default function WeekTargetPickerModal({
  open,
  currentWeek,
  nextWeek,
  onClose,
  onSelect,
}: WeekTargetPickerModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="week-target-picker-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id="week-target-picker-title" className="text-lg font-semibold text-gray-900">
            Hvilken uge planlægger du for?
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
        <p className="mb-5 text-sm leading-relaxed text-gray-600">
          Mange handler ind til næste uge allerede fredag–søndag. Vælg hvilken uge den nye madplan skal gælde
          for.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onSelect('next')}
            className="rounded-xl border-2 border-green-600 bg-green-50 px-4 py-3 text-left transition-colors hover:bg-green-100"
          >
            <span className="block text-sm font-semibold text-green-900">
              Næste uge (uge {nextWeek.weekNumber})
            </span>
            <span className="mt-0.5 block text-xs text-green-800">
              {formatWeekRange(nextWeek)} — anbefalet hvis du handler ind nu
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSelect('current')}
            className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
          >
            <span className="block text-sm font-semibold text-gray-900">
              Denne uge (uge {currentWeek.weekNumber})
            </span>
            <span className="mt-0.5 block text-xs text-gray-600">{formatWeekRange(currentWeek)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function formatWeekRange(week: WeekInfo): string {
  const start = new Date(`${week.weekStartDate}T12:00:00`)
  const end = new Date(`${week.weekEndDate}T12:00:00`)
  const fmt = (d: Date) =>
    d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(end)}`
}
