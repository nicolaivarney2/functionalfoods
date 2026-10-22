'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Loader2, X } from 'lucide-react'
import {
  ACCIDENTAL_LEFTOVER_PORTIONS,
  accidentalLeftoverAmount,
  perPortionAmount,
  perPortionMicroMap,
} from '@/lib/diary/accidental-leftover'
import {
  addDiaryEntry,
  isoDate,
  loadDiaryWeek,
  MEAL_LABELS,
  parseIsoDate,
  type DiaryEntry,
  type MealType,
} from '@/lib/diary-client'

type Props = {
  open: boolean
  date: string
  onClose: () => void
  onLogged: () => void
}

const MEAL_ORDER: MealType[] = ['dinner', 'lunch', 'breakfast', 'snack']

function shiftIso(iso: string, days: number): string {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

function formatDay(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function plainTitle(title: string): string {
  return title.replace(/^Rester:\s*/i, '').trim() || title
}

function loggedKcal(entry: DiaryEntry): number {
  const per = perPortionAmount(entry.calories, entry.servings) ?? 0
  return Math.round(accidentalLeftoverAmount(per))
}

export default function LeftoverFromLogSheet({ open, date, onClose, onLogged }: Props) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<Array<{ date: string; entries: DiaryEntry[] }>>([])
  const [picked, setPicked] = useState<DiaryEntry | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPicked(null)
    setError(null)
    setLoading(true)
    const start = shiftIso(date, -3)
    loadDiaryWeek(start, 3)
      .then((items) => {
        if (cancelled) return
        const next = items
          .map((item) => ({
            date: item.date,
            entries: [...item.entries].sort(
              (a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)
            ),
          }))
          .filter((item) => item.entries.length > 0)
          .sort((a, b) => (a.date < b.date ? 1 : -1))
        setGroups(next)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Kunne ikke hente de seneste dage')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, date])

  const confirm = async () => {
    if (!picked) return
    const perCal = perPortionAmount(picked.calories, picked.servings) ?? 0
    const per = (value: number | null) => perPortionAmount(value, picked.servings)
    setSaving(true)
    setError(null)
    try {
      await addDiaryEntry({
        date,
        mealType: 'lunch',
        title: `Rester: ${plainTitle(picked.title)}`.slice(0, 200),
        imageUrl: picked.imageUrl ?? undefined,
        servings: ACCIDENTAL_LEFTOVER_PORTIONS,
        source: picked.recipeId || picked.recipeSlug ? 'recipe' : 'manual',
        recipeId: picked.recipeId ?? undefined,
        recipeSlug: picked.recipeSlug ?? undefined,
        calories: perCal,
        protein: per(picked.protein) ?? undefined,
        carbs: per(picked.carbs) ?? undefined,
        fat: per(picked.fat) ?? undefined,
        fiber: per(picked.fiber) ?? undefined,
        vitamins: perPortionMicroMap(picked.vitamins, picked.servings),
        minerals: perPortionMicroMap(picked.minerals, picked.servings),
      })
      onLogged()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke logge rester')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const originalKcal = picked ? Math.round(perPortionAmount(picked.calories, picked.servings) ?? 0) : 0
  const leftoverKcal = picked ? loggedKcal(picked) : 0

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Luk" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Frokost</p>
            <h2 className="text-lg font-semibold text-gray-900">Tilføj rester</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50" aria-label="Luk">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

          {picked ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Er det rester af <span className="font-semibold text-gray-900">{plainTitle(picked.title)}</span> fra{' '}
                {formatDay(picked.loggedDate).toLowerCase()} ({MEAL_LABELS[picked.mealType].toLowerCase()})?
              </p>
              <p className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-950">
                En resteportion er typisk lidt mindre, så vi trækker 25% fra næringsindholdet.{' '}
                <span className="font-semibold tabular-nums">
                  {originalKcal} kcal → {leftoverKcal} kcal
                </span>
                .
              </p>
              <MacroLine label="Protein" total={picked.protein} servings={picked.servings} unit="g" />
              <MacroLine label="Kulhydrat" total={picked.carbs} servings={picked.servings} unit="g" />
              <MacroLine label="Fedt" total={picked.fat} servings={picked.servings} unit="g" />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="animate-spin" size={18} />
              Henter de sidste 3 dage…
            </div>
          ) : groups.length === 0 ? (
            <p className="py-8 text-sm text-gray-500">
              Ingen måltider de sidste 3 dage. Log maden først, så kan du tage rester herfra.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Vælg det måltid, du har rester af.</p>
              {groups.map((group) => (
                <section key={group.date}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {formatDay(group.date)}
                  </h3>
                  <ul className="space-y-2">
                    {group.entries.map((entry) => (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(entry)}
                          className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-2 text-left hover:border-emerald-200 hover:bg-emerald-50/40"
                        >
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            {entry.imageUrl ? (
                              <Image src={entry.imageUrl} alt="" fill className="object-cover" sizes="48px" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{plainTitle(entry.title)}</p>
                            <p className="text-xs text-gray-500">
                              {MEAL_LABELS[entry.mealType]} · {Math.round(perPortionAmount(entry.calories, entry.servings) ?? 0)} kcal
                              {' → '}
                              {loggedKcal(entry)} kcal som rester
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-4 py-3">
          {picked ? (
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700"
            >
              Tilbage
            </button>
          ) : null}
          <button
            type="button"
            disabled={!picked || saving}
            onClick={() => void confirm()}
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? 'Gemmer…' : 'Log rester til frokost'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MacroLine({
  label,
  total,
  servings,
  unit,
}: {
  label: string
  total: number | null
  servings: number
  unit: string
}) {
  const per = perPortionAmount(total, servings)
  if (per == null) return null
  const logged = Math.round(accidentalLeftoverAmount(per) * 10) / 10
  return (
    <p className="text-sm text-gray-600">
      {label}: {Math.round(per * 10) / 10}
      {unit} → {logged}
      {unit}
    </p>
  )
}
