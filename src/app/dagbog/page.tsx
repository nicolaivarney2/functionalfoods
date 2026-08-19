'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
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

/** Parse YYYY-MM-DD as local calendar date (avoid UTC day-shift). */
function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function formatWeekRange(weekStart: string, weekEnd?: string): string {
  const start = parseIsoDateLocal(weekStart)
  const end = parseIsoDateLocal(weekEnd || weekStart)
  if (!weekEnd) {
    end.setDate(start.getDate() + 6)
  }
  const fmt = (dt: Date) =>
    `${dt.getDate()}. ${DA_MONTHS_LONG[dt.getMonth()].toLowerCase().slice(0, 3)}`
  return `${fmt(start)}–${fmt(end)}`
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
    <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-black/5">
      <p className="truncate text-[11px] font-medium text-gray-600 lg:text-xs">{label}</p>
      <p className="text-sm font-semibold text-gray-900 lg:text-base">
        {Math.round(value)}
        {goal != null ? (
          <span className="font-normal text-gray-400"> / {Math.round(goal)}g</span>
        ) : (
          <span className="font-normal text-gray-400"> g</span>
        )}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200/80">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function DagbogPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, session, loading: authLoading } = useAuth()
  const [date, setDate] = useState(() => new Date())
  const [day, setDay] = useState<DiaryDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetMeal, setSheetMeal] = useState<MealType | null>(null)
  const [moveEntry, setMoveEntry] = useState<DiaryEntry | null>(null)
  const [moveBusy, setMoveBusy] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  /** Invalidér in-flight loads uden at lade `loading` hænge på true (AbortController-bug). */
  const loadGenRef = useRef(0)
  const accessToken = session?.access_token

  const today = isoDate(new Date())
  const dateKey = isoDate(date)
  const isToday = dateKey === today
  const weekDays = useMemo(() => weekDaysOf(date), [dateKey])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/kom-i-gang')
    }
  }, [authLoading, user, router])

  const load = useCallback(async () => {
    if (!user) {
      setDay(null)
      setLoading(false)
      return
    }
    const gen = ++loadGenRef.current
    setLoading(true)
    setError(null)
    let timeoutId: number | undefined
    try {
      const data = await Promise.race([
        loadDiaryDay(dateKey, { accessToken }),
        new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error('Timeout — tryk Prøv igen')), 20_000)
        }),
      ])
      if (gen !== loadGenRef.current) return
      setDay(data)
    } catch (e) {
      if (gen !== loadGenRef.current) return
      const msg = e instanceof Error ? e.message : 'Kunne ikke hente dagbogen'
      if (msg === 'The operation was aborted.' || (e instanceof DOMException && e.name === 'AbortError')) {
        return
      }
      setError(msg)
    } finally {
      if (timeoutId != null) window.clearTimeout(timeoutId)
      if (gen === loadGenRef.current) setLoading(false)
    }
  }, [accessToken, dateKey, user])

  // Primær load ved dato/auth-skift + når man navigerer tilbage til /dagbog
  useEffect(() => {
    if (authLoading) return
    if (pathname !== '/dagbog') return
    void load()
    return () => {
      loadGenRef.current += 1
    }
  }, [authLoading, load, pathname])

  // bfcache / app-resume: genindlæs så siden ikke sidder fast i "Henter…"
  useEffect(() => {
    if (!user) return
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void load()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [load, user])

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
      // Fuld uge-synk (ikke fromDate-filter) — find plan der dækker valgt dag, ellers aktiv/nyeste med mad.
      const res = await syncMealPlanToDiary({ preferDate: dateKey })
      if (res.weekStart) {
        const planMonday = parseIsoDateLocal(res.weekStart)
        const planEnd = res.weekEnd || isoDate(new Date(planMonday.getFullYear(), planMonday.getMonth(), planMonday.getDate() + 6))
        // Hop til planens uge, så synkede måltider er synlige.
        if (dateKey < res.weekStart || dateKey > planEnd) {
          setDate(planMonday)
        } else {
          await load()
        }
      } else {
        await load()
      }
      setSyncMsg(
        res.inserted > 0
          ? `${res.inserted} måltid${res.inserted === 1 ? '' : 'er'} synket fra madplanen${
              res.weekStart ? ` (${formatWeekRange(res.weekStart, res.weekEnd)})` : ''
            }`
          : res.weekStart
            ? `Ingen måltider i madplanen for ${formatWeekRange(res.weekStart, res.weekEnd)}`
            : 'Ingen måltider at synke — generér en madplan først'
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke synke madplan')
    } finally {
      setSyncBusy(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Indlæser dagbog…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-600">Sender dig videre til login…</p>
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

  const weekStrip = (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm lg:bg-slate-50 lg:ring-black/5 lg:backdrop-blur-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          className="rounded-full p-1.5 text-white hover:bg-white/10 lg:text-gray-700 lg:hover:bg-white"
          aria-label="Forrige uge"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-emerald-50 lg:text-gray-700">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          className="rounded-full p-1.5 text-white hover:bg-white/10 lg:text-gray-700 lg:hover:bg-white"
          aria-label="Næste uge"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
        {weekDays.map((d) => {
          const key = isoDate(d)
          const active = key === dateKey
          const isTodayDot = key === today
          return (
            <button
              key={key}
              type="button"
              onClick={() => setDate(d)}
              className={`flex flex-col items-center rounded-xl px-1 py-2 text-center transition lg:py-2.5 ${
                active
                  ? 'bg-white text-emerald-900 shadow-sm lg:bg-emerald-700 lg:text-white'
                  : 'text-emerald-50 hover:bg-white/10 lg:text-gray-600 lg:hover:bg-white'
              }`}
            >
              <span className="text-[10px] font-semibold tracking-wide lg:text-[11px]">
                {DA_WEEKDAYS_SHORT[d.getDay()]}
              </span>
              <span className="text-sm font-bold lg:text-base">{d.getDate()}</span>
              <span
                className={`mt-1 h-1 w-1 rounded-full ${
                  isTodayDot
                    ? active
                      ? 'bg-emerald-600 lg:bg-amber-300'
                      : 'bg-amber-300 lg:bg-emerald-500'
                    : 'bg-transparent'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )

  const summaryCard = (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:p-6">
      <p className="text-sm text-gray-500">{dateText}</p>
      <div className="mt-3 flex flex-col items-center text-center lg:items-start lg:text-left">
        <p className="text-4xl font-bold tracking-tight text-gray-900 lg:text-5xl">
          {(remaining != null ? remaining : totals.calories).toLocaleString('da-DK')}
        </p>
        <p className="text-sm text-gray-500 lg:mt-1">
          {remaining != null ? 'kcal tilbage' : 'kcal indtaget'}
        </p>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-sm text-gray-600 lg:justify-start">
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
  )

  const quickLinks = (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
      {[
        { href: '/madbudget', label: 'Madplan' },
        { href: '/vaegt-tracker', label: 'Vægt tracker' },
        { href: '/opskriftsoversigt', label: 'Opskrifter' },
        { href: '/prisalarmer', label: 'Prisalarmer' },
      ].map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-black/5 hover:bg-gray-50 lg:py-2.5"
        >
          {link.label}
        </Link>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-16 lg:pb-20">
      {/* Mobile header */}
      <div className="bg-gradient-to-b from-emerald-800 to-emerald-700 text-white lg:hidden">
        <div className="container mx-auto max-w-2xl px-4 pb-8 pt-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              href="/madbudget"
              className="inline-flex items-center gap-1 text-sm text-emerald-100 hover:text-white"
            >
              <ChevronLeft size={16} />
              Madplan
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
            Log det du spiser — opskrift, link, stemme eller manuelt.
          </p>
          <div className="mt-6">{weekStrip}</div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden border-b border-emerald-900/10 bg-gradient-to-r from-emerald-800 to-teal-700 text-white lg:block">
        <div className="container mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <Link
                href="/madbudget"
                className="mb-3 inline-flex items-center gap-1 text-sm text-emerald-100 hover:text-white"
              >
                <ChevronLeft size={16} />
                Tilbage til madplan
              </Link>
              <h1 className="text-3xl font-bold tracking-tight">Maddagbog</h1>
              <p className="mt-1.5 max-w-xl text-sm text-emerald-100">
                Log måltider med opskrift, link, stemme eller manuelt — synk madplanen når du vil.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void syncPlan()}
              disabled={syncBusy}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50 disabled:opacity-60"
            >
              {syncBusy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Synk madplan
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-2xl space-y-4 px-4 -mt-4 lg:mt-0 lg:max-w-6xl lg:px-6 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
          {/* Sidebar — desktop sticky */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="hidden lg:block">{weekStrip}</div>
            {summaryCard}
            <div className="hidden lg:block">{quickLinks}</div>
          </aside>

          {/* Meals */}
          <div className="space-y-4">
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
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
                <Loader2 className="animate-spin" size={18} />
                Henter dagbog…
              </div>
            ) : null}

            {loading && day ? (
              <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs text-gray-500 ring-1 ring-black/5">
                <Loader2 className="animate-spin" size={14} />
                Opdaterer…
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
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
                  <section
                    key={mealKey}
                    className="flex min-h-[180px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
                  >
                    <button
                      type="button"
                      onClick={() => setSheetMeal(mealKey)}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 lg:px-5 lg:py-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 lg:h-11 lg:w-11">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 lg:text-lg">{MEAL_LABELS[mealKey]}</p>
                        <p className="text-xs text-gray-500 lg:text-sm">
                          {mealKcal > 0
                            ? `${mealKcal.toLocaleString('da-DK')} kcal`
                            : rec
                              ? `Anbefalet ${rec}`
                              : 'Tom — klik for at logge'}
                        </p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white lg:h-10 lg:w-10">
                        <Plus size={18} />
                      </span>
                    </button>
                    {entries.length ? (
                      <ul className="flex-1 border-t border-gray-100 divide-y divide-gray-50">
                        {entries.map((entry) => (
                          <li key={entry.id} className="flex items-center gap-3 px-4 py-3 lg:px-5">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100 lg:h-12 lg:w-12">
                              {entry.imageUrl ? (
                                <Image
                                  src={entry.imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
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
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSheetMeal(mealKey)}
                        className="hidden flex-1 items-center justify-center border-t border-dashed border-gray-100 px-4 py-8 text-sm text-gray-400 hover:bg-emerald-50/40 hover:text-emerald-700 lg:flex"
                      >
                        + Tilføj {MEAL_LABELS[mealKey].toLowerCase()}
                      </button>
                    )}
                  </section>
                )
              })}
            </div>

            <div className="lg:hidden">{quickLinks}</div>
          </div>
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
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl lg:max-w-md lg:p-5">
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
