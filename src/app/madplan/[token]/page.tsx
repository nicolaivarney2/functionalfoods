'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Share2, Utensils, ShoppingCart, ChevronRight, Users, Store, Calendar, PieChart, FlaskConical } from 'lucide-react'

type SharedMealSlot = {
  title?: string
  slug?: string
  id?: string
  image?: string
  imageUrl?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  vitamins?: Record<string, number>
}

type DayNutRow = {
  dayKey: string
  label: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  vitamins: Record<string, number>
  hasMacros: boolean
}

function sumMealNutrients(m: SharedMealSlot | null | undefined) {
  const vitamins: Record<string, number> = {}
  if (m?.vitamins && typeof m.vitamins === 'object') {
    for (const [k, v] of Object.entries(m.vitamins)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        vitamins[k] = (vitamins[k] ?? 0) + v
      }
    }
  }
  const calories = typeof m?.calories === 'number' && Number.isFinite(m.calories) ? m.calories : 0
  const protein = typeof m?.protein === 'number' && Number.isFinite(m.protein) ? m.protein : 0
  const carbs = typeof m?.carbs === 'number' && Number.isFinite(m.carbs) ? m.carbs : 0
  const fat = typeof m?.fat === 'number' && Number.isFinite(m.fat) ? m.fat : 0
  const fiber = typeof m?.fiber === 'number' && Number.isFinite(m.fiber) ? m.fiber : 0
  const hasMacros =
    calories > 0 || protein > 0 || carbs > 0 || fat > 0 || fiber > 0 || Object.keys(vitamins).length > 0
  return { calories, protein, carbs, fat, fiber, vitamins, hasMacros }
}

function addVitMaps(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) {
    out[k] = (out[k] ?? 0) + v
  }
  return out
}

function aggregateDayNutrients(
  day: Record<string, SharedMealSlot> | undefined,
  dayKey: string,
  label: string
): DayNutRow {
  const slots = ['breakfast', 'lunch', 'dinner'] as const
  let calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    fiber = 0
  let vitamins: Record<string, number> = {}
  let hasMacros = false
  if (day) {
    for (const sk of slots) {
      const part = sumMealNutrients(day[sk])
      calories += part.calories
      protein += part.protein
      carbs += part.carbs
      fat += part.fat
      fiber += part.fiber
      vitamins = addVitMaps(vitamins, part.vitamins)
      if (part.hasMacros) hasMacros = true
    }
  }
  return { dayKey, label, calories, protein, carbs, fat, fiber, vitamins, hasMacros }
}

function formatFetchedDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

const STORE_NAMES: Record<number, string> = {
  1: 'REMA 1000',
  2: 'Netto',
  3: 'Føtex',
  4: 'Bilka',
  5: 'Nemlig.com',
  6: 'MENY',
  7: 'Spar',
  8: 'Løvbjerg'
}

const STORE_COLORS: Record<number, string> = {
  1: 'bg-blue-600',
  2: 'bg-yellow-500',
  3: 'bg-blue-500',
  4: 'bg-blue-700',
  5: 'bg-orange-500',
  6: 'bg-red-600',
  7: 'bg-red-500',
  8: 'bg-green-600'
}

const STORE_ID_TO_KEY: Record<number, string> = {
  1: 'rema-1000',
  2: 'netto',
  3: 'føtex',
  4: 'bilka',
  5: 'nemlig',
  6: 'meny',
  7: 'spar',
  8: 'løvbjerg'
}

const DIETARY_LABELS: Record<string, string> = {
  keto: 'Keto',
  sense: 'Sense',
  'glp-1': 'GLP-1',
  familiemad: 'Kalorietælling',
  'lchf-paleo': 'LCHF/Paleo'
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mandag',
  tuesday: 'Tirsdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
  saturday: 'Lørdag',
  sunday: 'Søndag'
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Morgenmad',
  lunch: 'Frokost',
  dinner: 'Aftensmad'
}

const PLAN_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const
type MealSlotKey = (typeof MEAL_SLOTS)[number]

function slotHasPlannedMeal(m: SharedMealSlot | null | undefined): boolean {
  if (m == null || typeof m !== 'object') return false
  if (typeof m.title === 'string' && m.title.trim().length > 0) return true
  if (m.slug != null && String(m.slug).trim() !== '') return true
  if (m.id != null && String(m.id).trim() !== '') return true
  return false
}

function countPlannedMealsPerSlot(
  mealPlan: Record<string, Record<string, SharedMealSlot>>
): Record<MealSlotKey, number> {
  const slotCounts: Record<MealSlotKey, number> = { breakfast: 0, lunch: 0, dinner: 0 }
  for (const dayKey of PLAN_DAY_KEYS) {
    const day = mealPlan[dayKey]
    if (!day) continue
    for (const sk of MEAL_SLOTS) {
      if (slotHasPlannedMeal(day[sk])) slotCounts[sk]++
    }
  }
  return slotCounts
}

function formatDaList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} og ${items[1]}`
  return `${items.slice(0, -1).join(', ')} og ${items.at(-1)!}`
}

function mealSlotsSummaryFromCounts(slotCounts: Record<MealSlotKey, number>): {
  pills: { key: MealSlotKey; count: number; label: string }[]
  sentence: string
} {
  const pills = MEAL_SLOTS.map((key) => ({
    key,
    count: slotCounts[key],
    label: MEAL_LABELS[key] ?? key,
  }))
  const plannedMealsInWeek = pills.reduce((s, p) => s + p.count, 0)
  const never = pills.filter((p) => p.count === 0)
  const full = pills.filter((p) => p.count === 7)
  const partial = pills.filter((p) => p.count > 0 && p.count < 7)
  const active = pills.filter((p) => p.count > 0)

  let sentence = ''
  if (full.length === 3 && never.length === 0 && partial.length === 0) {
    sentence =
      'Alle tre måltider er sat alle ugens dage. Næringstallene er summen af morgenmad, frokost og aftensmad (3 måltider pr. dag).'
  } else if (partial.length === 0 && active.length > 0) {
    const inc = formatDaList(active.map((p) => p.label.toLowerCase()))
    const mpd = active.length
    if (never.length > 0) {
      const exc = formatDaList(never.map((p) => p.label.toLowerCase()))
      sentence = `Næringstallene indeholder kun ${inc} (${mpd} måltider pr. dag, ${plannedMealsInWeek} i ugen i alt). ${exc.charAt(0).toUpperCase() + exc.slice(1)} er ikke med i denne madplan.`
    } else {
      sentence = `Næringstallene summerer ${inc}.`
    }
  } else {
    const bits: string[] = []
    for (const p of partial) {
      bits.push(`${p.label} på ${p.count} af 7 dage`)
    }
    if (never.length > 0) {
      bits.push(`${formatDaList(never.map((n) => n.label))} er ikke planlagt`)
    }
    sentence = `Kun planlagte måltider tælles med: ${bits.join('; ')}. Kcal pr. dag er derfor ikke nødvendigvis et helt døgn, hvis der mangler måltider på nogle dage.`
  }

  return { pills, sentence }
}

function mealPlanGridFromPlan(plan: any): Record<string, Record<string, SharedMealSlot>> {
  const rawMealPlan = plan?.meal_plan_data || {}
  if (
    rawMealPlan &&
    typeof rawMealPlan === 'object' &&
    'grid' in rawMealPlan &&
    rawMealPlan.grid &&
    typeof rawMealPlan.grid === 'object' &&
    'monday' in (rawMealPlan.grid as object)
  ) {
    return rawMealPlan.grid as Record<string, Record<string, SharedMealSlot>>
  }
  return rawMealPlan as Record<string, Record<string, SharedMealSlot>>
}

export default function SharedMealPlanPage() {
  const params = useParams()
  const token = params?.token as string
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStoreTab, setSelectedStoreTab] = useState<string>('all')
  const [nutritionTab, setNutritionTab] = useState<'makro' | 'mikro'>('makro')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('Ugyldigt link')
      return
    }
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/madbudget/share/${token}`)
        const data = await res.json()
        if (!mounted) return
        if (!res.ok) {
          setError(data.error || 'Kunne ikke hente madplan')
          return
        }
        setPlan(data.plan)
      } catch (e) {
        if (mounted) setError('Noget gik galt')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [token])

  // Statisk priser fra deling – ingen API-kald ved besøg
  const rawPrices = (plan?.shopping_list_prices as Record<string, any>) || {}
  const pricesFetchedAt = rawPrices._fetchedAt as string | undefined
  const storePrices = Object.fromEntries(
    Object.entries(rawPrices).filter(([k]) => !k.startsWith('_'))
  ) as Record<string, Record<string, any>>

  const mealPlan = useMemo(() => mealPlanGridFromPlan(plan), [plan])

  const nutritionReport = useMemo(() => {
    const rows: DayNutRow[] = []
    for (const dayKey of PLAN_DAY_KEYS) {
      rows.push(aggregateDayNutrients(mealPlan[dayKey], dayKey, DAY_LABELS[dayKey] || dayKey))
    }
    const week = rows.reduce(
      (acc, r) => ({
        calories: acc.calories + r.calories,
        protein: acc.protein + r.protein,
        carbs: acc.carbs + r.carbs,
        fat: acc.fat + r.fat,
        fiber: acc.fiber + r.fiber,
        vitamins: addVitMaps(acc.vitamins, r.vitamins),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, vitamins: {} as Record<string, number> }
    )
    const daysWithMacros = rows.filter((r) => r.hasMacros).length
    const denom = daysWithMacros > 0 ? daysWithMacros : 1
    const weekAvg = {
      calories: Math.round(week.calories / denom),
      protein: Math.round((week.protein / denom) * 10) / 10,
      carbs: Math.round((week.carbs / denom) * 10) / 10,
      fat: Math.round((week.fat / denom) * 10) / 10,
      fiber: Math.round((week.fiber / denom) * 10) / 10,
    }
    const vitaminAvg: Record<string, number> = {}
    for (const [k, v] of Object.entries(week.vitamins)) {
      vitaminAvg[k] = v / 7
    }
    const vitaminRows = Object.entries(vitaminAvg)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 48)
    const hasAny = rows.some((r) => r.hasMacros)
    const slotCounts = countPlannedMealsPerSlot(mealPlan)
    const mealSlotsSummary = mealSlotsSummaryFromCounts(slotCounts)
    return { rows, week, weekAvg, vitaminRows, hasAny, daysWithMacros, mealSlotsSummary }
  }, [mealPlan])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Henter madplan...</p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Madplan ikke fundet</h1>
          <p className="text-gray-600 mb-6">{error || 'Linket er udløbet eller ugyldigt.'}</p>
          <Link href="/madbudget" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium">
            Lav din egen madplan <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const family = plan.family_profile_snapshot || {}
  const adults = family.adults ?? 0
  const children = family.children ?? 0
  const storeIds = family.selectedStores || []
  const storeNames = storeIds.map((id: number) => STORE_NAMES[id] || `Butik ${id}`).filter(Boolean)
  const primaryDiet = family.adultsProfiles?.[0]?.dietaryApproach || 'sense'
  const dietLabel = DIETARY_LABELS[primaryDiet] || primaryDiet
  const sharedByName = plan.shared_by_name || null
  const planTitle = sharedByName ? `${sharedByName}s madplan` : 'Delt madplan'

  const mealKeys = ['breakfast', 'lunch', 'dinner'] as const
  const shoppingList = plan.shopping_list || {}
  const categories = shoppingList.categories || []
  const mainCategories = categories.filter((c: any) => c.name !== 'Varer du måske allerede har')
  const basisCategory = categories.find((c: any) => c.name === 'Varer du måske allerede har')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Marketing */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-2">
            <Utensils size={16} />
            <span>Lavet med Functionalfoods</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {planTitle}
          </h1>
          <p className="text-gray-600 mb-6">
            Planlæg din uge med tilbud fra din butik, tilpasset din kostretning og antal personer. 
            Spar tid og penge – prøv at lave din egen madplan.
          </p>

          {/* Info-boks om madplanen */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Om denne madplan</h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-700">
              {(adults > 0 || children > 0) && (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-500" />
                  <span>
                    {adults > 0 && `${adults} voksne`}
                    {adults > 0 && children > 0 && ' og '}
                    {children > 0 && `${children} børn`}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Utensils size={16} className="text-gray-500" />
                <span>{dietLabel}</span>
              </div>
              {storeNames.length > 0 && (
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-gray-500" />
                  <span>Tilbud fra {storeNames.join(', ')}</span>
                </div>
              )}
              {pricesFetchedAt && (
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-500" />
                  <span>Tilbud hentet {formatFetchedDate(pricesFetchedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meal plan med billeder og links */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Utensils size={20} />
          Madplanen
        </h2>
        <div className="space-y-4">
          {PLAN_DAY_KEYS.map((dayKey) => {
            const day = mealPlan[dayKey]
            if (!day) return null
            return (
              <div key={dayKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <h3 className="font-medium text-gray-900 px-4 pt-4 pb-2">{DAY_LABELS[dayKey] || dayKey}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
                  {mealKeys.map((mealKey) => {
                    const m = day[mealKey]
                    if (!m?.title) return null
                    const slug = m.slug || m.id
                    const href = slug ? `/opskrift/${slug}` : null
                    const img = m.image || m.imageUrl
                    return (
                      <div key={mealKey} className="border-t border-gray-100 first:border-t-0 sm:first:border-t sm:first:border-l-0">
                        {href ? (
                          <Link href={href} className="block group">
                            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                              {img ? (
                                <img src={img} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Utensils size={32} />
                                </div>
                              )}
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-white/90 text-gray-700">
                                {MEAL_LABELS[mealKey]}
                              </span>
                            </div>
                            <div className="p-3">
                              <span className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">{m.title}</span>
                              {typeof m.calories === 'number' && m.calories > 0 && (
                                <p className="mt-1 text-xs text-gray-500 tabular-nums">ca. {Math.round(m.calories)} kcal</p>
                              )}
                            </div>
                          </Link>
                        ) : (
                          <div>
                            <div className="aspect-[4/3] bg-gray-100 relative">
                              {img ? (
                                <img src={img} alt={m.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Utensils size={32} />
                                </div>
                              )}
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium bg-white/90 text-gray-700">
                                {MEAL_LABELS[mealKey]}
                              </span>
                            </div>
                            <div className="p-3">
                              <span className="font-medium text-gray-900">{m.title}</span>
                              {typeof m.calories === 'number' && m.calories > 0 && (
                                <p className="mt-1 text-xs text-gray-500 tabular-nums">ca. {Math.round(m.calories)} kcal</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {nutritionReport.hasAny && (
          <div className="mt-10 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <PieChart size={20} className="text-emerald-600" />
                Ernæring i planen
              </h2>
              <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 self-start">
                <button
                  type="button"
                  onClick={() => setNutritionTab('makro')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    nutritionTab === 'makro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Makro (dag / uge)
                </button>
                <button
                  type="button"
                  onClick={() => setNutritionTab('mikro')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors inline-flex items-center gap-1 ${
                    nutritionTab === 'mikro' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FlaskConical size={14} />
                  Mikro
                </button>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {nutritionReport.mealSlotsSummary.pills.map((p) => (
                  <span
                    key={p.key}
                    className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${
                      p.count === 0
                        ? 'border-dashed border-gray-200 bg-white text-gray-500'
                        : p.count === 7
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                    title={
                      p.count === 0
                        ? 'Ikke med i næringstallene denne uge'
                        : p.count === 7
                          ? 'Med alle ugens dage'
                          : `Med ${p.count} af ugens dage`
                    }
                  >
                    {p.label}
                    <span className="ml-1 tabular-nums opacity-80 font-normal">
                      {p.count === 0 ? 'ikke i plan' : p.count === 7 ? '7/7' : `${p.count}/7`}
                    </span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{nutritionReport.mealSlotsSummary.sentence}</p>
            </div>
            <div className="p-4 text-sm text-gray-600">
              {nutritionTab === 'makro' ? (
                <>
                  <p className="mb-3 text-xs text-gray-500">
                    Pr. dag summeres kun de måltider, der står i planen ovenfor. Gennemsnit er over de dage, der har
                    næringsdata ({nutritionReport.daysWithMacros} af 7). Nederst: hele ugen summeret.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse min-w-[480px]">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                          <th className="py-2 pr-3 font-medium">Dag</th>
                          <th className="py-2 pr-3 font-medium text-right">kcal</th>
                          <th className="py-2 pr-3 font-medium text-right">P (g)</th>
                          <th className="py-2 pr-3 font-medium text-right">K (g)</th>
                          <th className="py-2 pr-3 font-medium text-right">F (g)</th>
                          <th className="py-2 font-medium text-right">Fiber</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nutritionReport.rows.map((r) =>
                          r.hasMacros ? (
                            <tr key={r.dayKey} className="border-b border-gray-100">
                              <td className="py-2 pr-3 font-medium text-gray-900">{r.label}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{Math.round(r.calories)}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{Math.round(r.protein * 10) / 10}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{Math.round(r.carbs * 10) / 10}</td>
                              <td className="py-2 pr-3 text-right tabular-nums">{Math.round(r.fat * 10) / 10}</td>
                              <td className="py-2 text-right tabular-nums">{Math.round(r.fiber * 10) / 10}</td>
                            </tr>
                          ) : null
                        )}
                        <tr className="bg-gray-50 font-semibold text-gray-900">
                          <td className="py-2 pr-3">Gennemsnit / dag</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{nutritionReport.weekAvg.calories}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{nutritionReport.weekAvg.protein}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{nutritionReport.weekAvg.carbs}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{nutritionReport.weekAvg.fat}</td>
                          <td className="py-2 text-right tabular-nums">{nutritionReport.weekAvg.fiber}</td>
                        </tr>
                        <tr className="text-gray-700 border-t border-gray-200">
                          <td className="py-2 pr-3">Total (7 dage)</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{Math.round(nutritionReport.week.calories)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{Math.round(nutritionReport.week.protein * 10) / 10}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{Math.round(nutritionReport.week.carbs * 10) / 10}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{Math.round(nutritionReport.week.fat * 10) / 10}</td>
                          <td className="py-2 text-right tabular-nums">{Math.round(nutritionReport.week.fiber * 10) / 10}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-3 text-xs text-gray-500">
                    Samme måltider som i båndet ovenfor. Vitaminer og mineraler pr. dag; snit/dag = hele ugen / 7. Navne
                    kommer fra opskrifternes næringsdata.
                  </p>
                  {nutritionReport.vitaminRows.length === 0 ? (
                    <p className="text-gray-500 text-sm">Ingen mikronæringsstoffer gemt på retterne i denne deling.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-gray-100">
                      <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-white border-b border-gray-200 text-xs text-gray-500">
                          <tr>
                            <th className="py-2 px-2 font-medium">Næringsstof</th>
                            {nutritionReport.rows.map((r) => (
                              <th key={r.dayKey} className="py-2 px-1 font-medium text-right whitespace-nowrap">
                                {r.label.slice(0, 3)}
                              </th>
                            ))}
                            <th className="py-2 px-2 font-medium text-right">Snit/dag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nutritionReport.vitaminRows.map(([key, avg]) => (
                            <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/80">
                              <td className="py-1.5 px-2 text-gray-800 font-medium break-all max-w-[140px]">{key}</td>
                              {nutritionReport.rows.map((r) => {
                                const v = r.vitamins[key]
                                const show = typeof v === 'number' && v > 0
                                return (
                                  <td key={r.dayKey} className="py-1.5 px-1 text-right tabular-nums text-gray-600 text-xs">
                                    {show ? Math.round(v * 10) / 10 : '-'}
                                  </td>
                                )
                              })}
                              <td className="py-1.5 px-2 text-right tabular-nums text-gray-900 font-medium text-xs">
                                {Math.round(avg * 10) / 10}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {!nutritionReport.hasAny && (
          <p className="mt-8 text-sm text-gray-500 max-w-2xl">
            Makro- og mikrooversigt vises, når retterne i planen har næringsdata (som i Madbudget). Denne deling har ingen
            gemt næring på retterne endnu - typisk fordi skålene er tomme, eller fordi planen er delt fra en ældre version.
            Gem og del igen fra Madbudget for at få tabellerne med.
          </p>
        )}

        {/* Indkøbsliste – madbudget-lignende med tilbud og priser */}
        {categories.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mt-10 mb-4 flex items-center gap-2">
              <ShoppingCart size={20} />
              Indkøbsliste
            </h2>
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Store tabs – kun når vi har cached priser fra deling */}
              {storeIds.length > 0 && Object.keys(storePrices).length > 0 && (
                <div className="border-b border-gray-200 mb-4">
                  <div className="flex space-x-1 overflow-x-auto">
                    <button
                      onClick={() => setSelectedStoreTab('all')}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        selectedStoreTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Alle butikker
                    </button>
                    {storeIds.map((storeId: number) => {
                      const storeKey = STORE_ID_TO_KEY[storeId]
                      if (!storeKey) return null
                      let storeTotal = 0
                      if (storePrices[storeKey]) {
                        Object.values(storePrices[storeKey]).forEach((p: any) => {
                          storeTotal += p?.totalPrice ?? p?.price ?? 0
                        })
                      }
                      return (
                        <button
                          key={storeId}
                          onClick={() => setSelectedStoreTab(storeKey)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            selectedStoreTab === storeKey ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${STORE_COLORS[storeId] || 'bg-gray-400'}`} />
                          {STORE_NAMES[storeId] || `Butik ${storeId}`}
                          {storeTotal > 0 && (
                            <span className="text-xs font-normal">
                              ({storeTotal.toFixed(0).replace('.', ',')} kr)
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                  {mainCategories.map((cat: any, i: number) => (
                    <div key={i} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h4 className="font-semibold text-gray-900 mb-3">{cat.name}</h4>
                      <ul className="space-y-2">
                        {cat.items?.map((item: any, j: number) => {
                          const itemNameLower = item.name?.toLowerCase().trim() || ''
                          let productInfo: any = null
                          if (selectedStoreTab !== 'all' && storePrices[selectedStoreTab]) {
                            productInfo = storePrices[selectedStoreTab][itemNameLower]
                            if (!productInfo) {
                              const found = Object.keys(storePrices[selectedStoreTab]).find(k =>
                                k.includes(itemNameLower) || itemNameLower.includes(k)
                              )
                              if (found) productInfo = storePrices[selectedStoreTab][found]
                            }
                          }
                          const formatQty = (n: number) => {
                            const r = Number.isFinite(n) ? parseFloat(Number(n).toFixed(2)) : n
                            return (r % 1 === 0 ? String(Math.round(r)) : r.toFixed(1)).replace('.', ',')
                          }
                          return (
                            <li key={j} className="flex items-center justify-between text-sm">
                              <div className="flex-1">
                                {productInfo ? (
                                  <div>
                                    <div className="text-gray-700 font-medium">{productInfo.name}</div>
                                    <div className="text-xs text-gray-500">{item.name}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-700">{item.name}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-gray-900 font-medium">
                                  {formatQty(item.amount)} {item.unit}
                                </div>
                                {productInfo && (productInfo.totalPrice || productInfo.price) && (
                                  <div className="text-sm">
                                    {productInfo.isOnSale ? (
                                      <>
                                        <span className="text-green-600 font-semibold">
                                          {(productInfo.totalPrice || productInfo.price).toFixed(2).replace('.', ',')} kr
                                        </span>
                                        {productInfo.totalNormalPrice && (
                                          <span className="text-gray-400 line-through ml-1 text-xs">
                                            {productInfo.totalNormalPrice.toFixed(2).replace('.', ',')} kr
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-gray-700">
                                        {(productInfo.totalPrice || productInfo.price).toFixed(2).replace('.', ',')} kr
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}

                  {basisCategory && basisCategory.items?.length > 0 && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="font-semibold text-amber-900 mb-2">Varer du måske allerede har</h4>
                      <ul className="space-y-1 text-sm text-amber-800">
                        {basisCategory.items.map((item: any, j: number) => {
                          const n = Number(item.amount)
                          const rounded = Number.isFinite(n) ? parseFloat(n.toFixed(2)) : item.amount
                          const fmt = typeof rounded === 'number' ? (rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1)).replace('.', ',') : rounded
                          return (
                            <li key={j} className="flex justify-between">
                              <span>{item.name}</span>
                              <span>{fmt} {item.unit}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
            </div>
          </>
        )}

        {/* CTA */}
        <div className="mt-12 p-6 bg-green-50 rounded-xl border border-green-200 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Lav din egen madplan</h3>
          <p className="text-gray-600 mb-4">
            Få tilbud fra din butik, tilpasset din familie og kostretning. Gratis at bruge.
          </p>
          <Link
            href="/madbudget"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Share2 size={18} />
            Prøv Functionalfoods
          </Link>
        </div>
      </div>
    </div>
  )
}
