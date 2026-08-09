'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Loader2,
  Plus,
  RefreshCw,
  Salad,
  Trash2,
  Utensils,
  Cookie,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import HealthInformationNotice from '@/components/HealthInformationNotice'
import AddMealSheet from '@/components/diary/AddMealSheet'
import {
  deleteDiaryEntry,
  isoDate,
  loadDiaryDay,
  MEAL_BANDS,
  MEAL_KEYS,
  MEAL_LABELS,
  moveDiaryEntry,
  syncMealPlanToDiary,
  type DiaryDay,
  type DiaryEntry,
  type MealType,
} from '@/lib/diary-client'

const DA_MONTHS_LONG = [
  'Januar',
  'Februar',
  'Marts',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'December',
]
const DA_WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag']
const DA_WEEKDAYS_SHORT = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR']

const MEAL_ICONS: Record<MealType, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Salad,
  dinner: Utensils,
  snack: Cookie,
}

function weekDaysOf(d: Date): Date[] {
  const monday = new Date(d)
  const dow = (monday.getDay() + 6) % 7
  monday.setDate(monday.getDate() - dow)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    return x
  })
}

function MacroBox({
  label,
  value,
  goal,
  color,
}: {
  label: string
  value: number
  goal: number | null
  color: string
}) {
  const pct = goal && goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0
  return (
    <div className="min-w-0 flex-1 rounded-xl bg-white/80 px-2.5 py-2 ring-1 ring-black/5">
      <p className="truncate text-[11px] font-medium text-gray-600">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        {Math.round(value)}
        {goal != null ? (
          <span className="font-normal text-gray-400"> / {Math.round(goal)}g</span>
        ) : (
          <span className="font-normal text-gray-400"> g</span>
        )}
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function DagbogPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [date, setDate] = useState(() => new Date())
  const [day, setDay] = useState<DiaryDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetMeal, setSheetMeal] = useState<MealType | null>(null)
  const [moveEntry, setMoveEntry] = useState<DiaryEntry | null>(null)
  const [moveBusy, setMoveBusy] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const today = isoDate(new Date())
  const dateKey = isoDate(date)
  const isToday = dateKey === today
  const weekDays = useMemo(() => weekDaysOf(date), [dateKey])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/kom-i-gang')
    }
  }, [authLoading, user, router])

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) {
        setDay(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await loadDiaryDay(dateKey, signal)
        setDay(data)
      } catch (e) {
        if (signal?.aborted) return
        setError(e instanceof Error ? e.message : 'Kunne ikke hente dagbogen')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [dateKey, user]
  )

  useEffect(() => {
    const ctrl = new AbortController()
    void load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  const shiftWeek = (delta: number) => {
    setDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + delta * 7)
      return next
    })
  }

  const removeEntry = async (id: string) => {
    try {
      await deleteDiaryEntry(id)
      setDay((prev) =>
        prev
          ? {
              ...prev,
              entries: prev.entries.filter((e) => e.id !== id),
              totals: recalcTotals(prev.entries.filter((e) => e.id !== id)),
            }
          : prev
      )
      void load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke slette')
    }
  }

  const confirmMove = async (mealType: MealType) => {
    if (!moveEntry || moveBusy) return
    setMoveBusy(true)
    try {
      await moveDiaryEntry({ id: moveEntry.id, mealType })
      setMoveEntry(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke flytte')
    } finally {
      setMoveBusy(false)
    }
  }

  const syncPlan = async () => {
    if (syncBusy) return
    setSyncBusy(true)
    setSyncMsg(null)
    setError(null)
    try {
      const res = await syncMealPlanToDiary({ fromDate: dateKey })
      setSyncMsg(
        res.inserted > 0
          ? `${res.inserted} måltid${res.inserted === 1 ? '' : 'er'} synket fra madplanen`
          : 'Ingen nye måltider at synke (tom plan eller allerede synket)'
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke synke madplan')
    } finally {
      setSyncBusy(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Indlæser dagbog…</p>
      </div>
    )
  }

  const target = day?.target ?? null
  const totals = day?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  const remaining = target ? Math.max(0, target.calories - totals.calories) : null
  const progress = target && target.calories > 0 ? Math.min(1, totals.calories / target.calories) : 0
  const monthLabel = `${DA_MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`
  const dateText = (() => {
    const dd = date.getDate()
    const mon = DA_MONTHS_LONG[date.getMonth()].toLowerCase()
    const weekday = DA_WEEKDAYS[date.getDay()]
    if (isToday) return `I dag · ${weekday.toLowerCase()} d. ${dd}. ${mon}`
    return `${weekday} d. ${dd}. ${mon}`
  })()

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-b from-emerald-800 to-emerald-700 text-white">
        <div className="container mx-auto max-w-2xl px-4 pb-8 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/overblik"
              className="inline-flex items-center gap-1 text-sm text-emerald-100 hover:text-white"
            >
              <ChevronLeft size={16} />
              Overblik
            </Link>
            <button
              type="button"
              onClick={() => void syncPlan()}
              disabled={syncBusy}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/15 disabled:opacity-60"
            >
              {syncBusy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Synk madplan
            </button>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Maddagbog</h1>
          <p className="mt-1 text-sm text-emerald-100">
            Log det du spiser — opskrift, link, stemme eller manuelt. Foto er i appen.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftWeek(-1)}
                className="rounded-full p-1.5 hover:bg-white/10"
                aria-label="Forrige uge"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-emerald-50">{monthLabel}</span>
              <button
                type="button"
                onClick={() => shiftWeek(1)}
                className="rounded-full p-1.5 hover:bg-white/10"
                aria-label="Næste uge"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((d) => {
                const key = isoDate(d)
                const active = key === dateKey
                const isTodayDot = key === today
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDate(d)}
                    className={`flex flex-col items-center rounded-xl px-1 py-2 text-center transition ${
                      active ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-50 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-[10px] font-semibold tracking-wide">
                      {DA_WEEKDAYS_SHORT[d.getDay()]}
                    </span>
                    <span className="text-sm font-bold">{d.getDate()}</span>
                    <span
                      className={`mt-1 h-1 w-1 rounded-full ${
                        isTodayDot ? (active ? 'bg-emerald-600' : 'bg-amber-300') : 'bg-transparent'
                      }`}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 -mt-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-gray-500">{dateText}</p>
          <div className="mt-2 text-center">
            <p className="text-4xl font-bold tracking-tight text-gray-900">
              {(remaining != null ? remaining : totals.calories).toLocaleString('da-DK')}
            </p>
            <p className="text-sm text-gray-500">
              {remaining != null ? 'kcal tilbage' : 'kcal indtaget'}
            </p>
          </div>
          <div className="mt-3 flex justify-center gap-6 text-sm text-gray-600">
            <span>
              <strong className="text-gray-900">{totals.calories.toLocaleString('da-DK')}</strong> indtaget
            </span>
            <span>
              <strong className="text-gray-900">
                {target ? target.calories.toLocaleString('da-DK') : '–'}
              </strong>{' '}
              mål
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <MacroBox label="Kulhydrater" value={totals.carbs} goal={target?.carbs ?? null} color="#059669" />
            <MacroBox label="Protein" value={totals.protein} goal={target?.protein ?? null} color="#d98324" />
            <MacroBox label="Fedt" value={totals.fat} goal={target?.fat ?? null} color="#5b8bd0" />
          </div>
          {!target ? (
            <Link
              href="/madbudget"
              className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-100"
            >
              <CalendarDays size={16} />
              Udfyld diæt-profil i Madbudget for at få et dagligt mål
            </Link>
          ) : null}
          <div className="mt-4">
            <HealthInformationNotice variant="inline" />
          </div>
        </div>

        {syncMsg ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {syncMsg}
          </div>
        ) : null}

        {error ? (
          <button
            type="button"
            onClick={() => void load()}
            className="flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm text-red-700"
          >
            <span className="flex-1">{error}</span>
            <span className="font-medium">Prøv igen</span>
          </button>
        ) : null}

        {loading && !day ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="animate-spin" size={18} />
            Henter dagbog…
          </div>
        ) : null}

        {MEAL_KEYS.map((mealKey) => {
          const Icon = MEAL_ICONS[mealKey]
          const entries = (day?.entries ?? []).filter((e) => e.mealType === mealKey)
          const band = target ? MEAL_BANDS[mealKey] : null
          const rec =
            band && target
              ? `${Math.round(band[0] * target.calories)}–${Math.round(band[1] * target.calories)} kcal`
              : null
          const mealKcal = entries.reduce((s, e) => s + e.calories, 0)
          return (
            <section key={mealKey} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <button
                type="button"
                onClick={() => setSheetMeal(mealKey)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{MEAL_LABELS[mealKey]}</p>
                  <p className="text-xs text-gray-500">
                    {mealKcal > 0
                      ? `${mealKcal.toLocaleString('da-DK')} kcal`
                      : rec
                        ? `Anbefalet ${rec}`
                        : 'Tom'}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <Plus size={18} />
                </span>
              </button>
              {entries.length ? (
                <ul className="border-t border-gray-100 divide-y divide-gray-50">
                  {entries.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {entry.imageUrl ? (
                          <Image src={entry.imageUrl} alt="" fill className="object-cover" sizes="44px" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{entry.title}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round(entry.calories).toLocaleString('da-DK')} kcal
                          {entry.source === 'meal-plan' ? ' · madplan' : ''}
                          {entry.source === 'manual' ? ' · manuel' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMoveEntry(entry)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        aria-label="Flyt"
                        title="Flyt til andet måltid"
                      >
                        <ArrowLeftRight size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeEntry(entry.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Slet"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          )
        })}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            href="/vaegt-tracker"
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
          >
            Vægt tracker
          </Link>
          <Link
            href="/madbudget"
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
          >
            Madplan
          </Link>
          <Link
            href="/opskriftsoversigt"
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
          >
            Opskrifter
          </Link>
          <Link
            href="/prisalarmer"
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-50"
          >
            Prisalarmer
          </Link>
        </div>
      </div>

      <AddMealSheet
        open={sheetMeal != null}
        meal={sheetMeal ?? 'breakfast'}
        date={dateKey}
        onClose={() => setSheetMeal(null)}
        onLogged={() => void load()}
      />

      {moveEntry ? (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Luk"
            onClick={() => setMoveEntry(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <h3 className="font-semibold text-gray-900">Flyt «{moveEntry.title}»</h3>
            <p className="mt-1 text-sm text-gray-500">Vælg måltid</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {MEAL_KEYS.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={moveBusy || m === moveEntry.mealType}
                  onClick={() => void confirmMove(m)}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-800 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-40"
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function recalcTotals(entries: DiaryEntry[]): DiaryDay['totals'] {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + (e.protein ?? 0),
      carbs: acc.carbs + (e.carbs ?? 0),
      fat: acc.fat + (e.fat ?? 0),
      fiber: acc.fiber + (e.fiber ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
}
