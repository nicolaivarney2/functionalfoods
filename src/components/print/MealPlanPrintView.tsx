'use client'

import { PrintToolbar } from '@/components/print/PrintToolbar'
import { mergeVitaminsAgainstRda } from '@/lib/nutrition-reference-values'

type MealSlot = {
  title?: string
  slug?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
  isLeftover?: boolean
  leftoverFromTitle?: string
}

type DayNutrition = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  vitamins: Record<string, number>
  minerals: Record<string, number>
  hasData: boolean
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Mandag',
  tuesday: 'Tirsdag',
  wednesday: 'Onsdag',
  thursday: 'Torsdag',
  friday: 'Fredag',
  saturday: 'Lørdag',
  sunday: 'Søndag',
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Morgenmad',
  lunch: 'Frokost',
  dinner: 'Aftensmad',
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner'] as const

function mealGrid(plan: Record<string, unknown>): Record<string, Record<string, MealSlot | null>> {
  const raw = plan.meal_plan_data
  if (!raw || typeof raw !== 'object') return {}
  const wrapped = raw as { grid?: unknown }
  const source =
    wrapped.grid && typeof wrapped.grid === 'object' && 'monday' in (wrapped.grid as object)
      ? (wrapped.grid as Record<string, unknown>)
      : (raw as Record<string, unknown>)

  const grid: Record<string, Record<string, MealSlot | null>> = {}
  for (const day of DAY_KEYS) {
    const dayObj = source[day]
    grid[day] = { breakfast: null, lunch: null, dinner: null }
    if (!dayObj || typeof dayObj !== 'object') continue
    const meals = dayObj as Record<string, MealSlot | null>
    for (const meal of MEAL_KEYS) {
      const cell = meals[meal]
      grid[day][meal] = cell && typeof cell === 'object' ? cell : null
    }
  }
  return grid
}

function formatDaDate(iso: unknown): string {
  if (typeof iso !== 'string' || !iso) return ''
  const date = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
}

function mealLabel(cell: MealSlot | null): string {
  if (!cell) return '—'
  const title = typeof cell.title === 'string' ? cell.title.trim() : ''
  if (!title && !cell.slug) return '—'
  const name = cell.isLeftover ? `Rester: ${title || cell.leftoverFromTitle || 'rester'}` : title || 'Ret'
  const kcal =
    typeof cell.calories === 'number' && Number.isFinite(cell.calories) && cell.calories > 0
      ? ` · ${Math.round(cell.calories)} kcal`
      : ''
  return `${name}${kcal}`
}

const MINERAL_LABELS: Record<string, { label: string; unit: string }> = {
  calcium: { label: 'Kalcium', unit: 'mg' },
  iron: { label: 'Jern', unit: 'mg' },
  magnesium: { label: 'Magnesium', unit: 'mg' },
  phosphor: { label: 'Fosfor', unit: 'mg' },
  phosphorus: { label: 'Fosfor', unit: 'mg' },
  potassium: { label: 'Kalium', unit: 'mg' },
  zinc: { label: 'Zink', unit: 'mg' },
  selenium: { label: 'Selen', unit: 'µg' },
  sodium: { label: 'Natrium', unit: 'mg' },
  iodine: { label: 'Jod', unit: 'µg' },
  copper: { label: 'Kobber', unit: 'mg' },
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function addMaps(a: Record<string, number>, b: unknown): Record<string, number> {
  const out = { ...a }
  if (!b || typeof b !== 'object') return out
  for (const [key, value] of Object.entries(b as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = (out[key] ?? 0) + value
  }
  return out
}

function dayNutrition(day: Record<string, MealSlot | null> | undefined): DayNutrition {
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  let fiber = 0
  let vitamins: Record<string, number> = {}
  let minerals: Record<string, number> = {}
  if (day) {
    for (const meal of MEAL_KEYS) {
      const cell = day[meal]
      if (!cell) continue
      calories += num(cell.calories)
      protein += num(cell.protein)
      carbs += num(cell.carbs)
      fat += num(cell.fat)
      fiber += num(cell.fiber)
      vitamins = addMaps(vitamins, cell.vitamins)
      minerals = addMaps(minerals, cell.minerals)
    }
  }
  const hasData =
    calories > 0 ||
    protein > 0 ||
    carbs > 0 ||
    fat > 0 ||
    fiber > 0 ||
    Object.keys(vitamins).length > 0 ||
    Object.keys(minerals).length > 0
  return { calories, protein, carbs, fat, fiber, vitamins, minerals, hasData }
}

function da(value: number, digits = 0): string {
  const factor = 10 ** digits
  const rounded = Math.round(value * factor) / factor
  return rounded.toLocaleString('da-DK', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

function averageMap(total: Record<string, number>, days: number): Record<string, number> {
  if (days <= 0) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(total)) {
    if (value > 0) out[key] = value / days
  }
  return out
}

function householdLine(plan: Record<string, unknown>): string {
  const family = plan.family_profile_snapshot
  if (!family || typeof family !== 'object') return ''
  const snapshot = family as { adults?: number; children?: number }
  const adults = Number(snapshot.adults) || 0
  const children = Number(snapshot.children) || 0
  const parts: string[] = []
  if (adults > 0) parts.push(`${adults} ${adults === 1 ? 'voksen' : 'voksne'}`)
  if (children > 0) parts.push(`${children} ${children === 1 ? 'barn' : 'børn'}`)
  return parts.join(' · ')
}

export function MealPlanPrintView({
  plan,
  autoprint = false,
}: {
  plan: Record<string, unknown>
  autoprint?: boolean
}) {
  const grid = mealGrid(plan)
  const days = DAY_KEYS.map((day) => ({ key: day, label: DAY_LABELS[day], ...dayNutrition(grid[day]) }))
  const daysWithData = days.filter((day) => day.hasData)
  const denom = daysWithData.length || 1
  const week = days.reduce(
    (acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fat: acc.fat + day.fat,
      fiber: acc.fiber + day.fiber,
      vitamins: addMaps(acc.vitamins, day.vitamins),
      minerals: addMaps(acc.minerals, day.minerals),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      vitamins: {} as Record<string, number>,
      minerals: {} as Record<string, number>,
    }
  )
  const vitaminAvg = mergeVitaminsAgainstRda(averageMap(week.vitamins, denom))
  const mineralAvg = Object.entries(averageMap(week.minerals, denom))
    .map(([key, value]) => {
      const known = MINERAL_LABELS[key.toLowerCase()]
      return { key, label: known?.label ?? key, unit: known?.unit ?? '', value }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'da'))
  const hasNutrition = daysWithData.length > 0
  const weekNumber = typeof plan.week_number === 'number' ? plan.week_number : null
  const start = formatDaDate(plan.week_start_date)
  const end = formatDaDate(plan.week_end_date)
  const range = start && end ? `${start} – ${end}` : start || end
  const title = typeof plan.name === 'string' && plan.name.trim() ? plan.name.trim() : 'Madplan'
  const people = householdLine(plan)
  const subtitle = [weekNumber ? `Uge ${weekNumber}` : '', range, people].filter(Boolean).join(' · ')

  return (
    <article className="mx-auto max-w-[720px] px-5 py-8 text-gray-950 print:max-w-none print:px-0 print:py-0">
      <PrintToolbar autoprint={autoprint} backHref="/madbudget" backLabel="Tilbage til madplanen" />

      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Functional Foods</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-gray-700">{subtitle}</p> : null}

      <div className="mt-6 divide-y divide-gray-300 border-y border-gray-300">
        {DAY_KEYS.map((day) => (
          <section key={day} className="grid grid-cols-[7.5rem_1fr] gap-3 py-3 sm:grid-cols-[9rem_1fr]">
            <h2 className="text-sm font-bold">{DAY_LABELS[day]}</h2>
            <ul className="space-y-1">
              {MEAL_KEYS.map((meal) => (
                <li key={meal} className="text-sm leading-snug">
                  <span className="font-medium text-gray-600">{MEAL_LABELS[meal]}: </span>
                  <span>{mealLabel(grid[day]?.[meal] ?? null)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {hasNutrition ? (
        <>
          <h2 className="mt-8 border-b border-gray-300 pb-1 text-xl font-bold">Makro pr. person</h2>
          <p className="mt-2 text-xs text-gray-600">
            Sum pr. dag for de måltider, der står i planen. Gennemsnit er over de {daysWithData.length} dage, der har
            næringstal.
          </p>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-1.5 pr-2 font-medium">Dag</th>
                <th className="py-1.5 pr-2 text-right font-medium">kcal</th>
                <th className="py-1.5 pr-2 text-right font-medium">Protein</th>
                <th className="py-1.5 pr-2 text-right font-medium">Kulhydrat</th>
                <th className="py-1.5 pr-2 text-right font-medium">Fedt</th>
                <th className="py-1.5 text-right font-medium">Fibre</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) =>
                day.hasData ? (
                  <tr key={day.key} className="border-b border-gray-200">
                    <td className="py-1.5 pr-2 font-medium">{day.label}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{da(day.calories)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{da(day.protein, 1)} g</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{da(day.carbs, 1)} g</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{da(day.fat, 1)} g</td>
                    <td className="py-1.5 text-right tabular-nums">{da(day.fiber, 1)} g</td>
                  </tr>
                ) : null
              )}
              <tr className="font-semibold">
                <td className="py-1.5 pr-2">Gennemsnit / dag</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{da(week.calories / denom)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{da(week.protein / denom, 1)} g</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{da(week.carbs / denom, 1)} g</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">{da(week.fat / denom, 1)} g</td>
                <td className="py-1.5 text-right tabular-nums">{da(week.fiber / denom, 1)} g</td>
              </tr>
            </tbody>
          </table>

          <h2 className="mt-8 border-b border-gray-300 pb-1 text-xl font-bold">Mikro pr. person</h2>
          <p className="mt-2 text-xs text-gray-600">Snit pr. dag for de samme dage som makroen.</p>
          {vitaminAvg.length > 0 ? (
            <>
              <h3 className="mt-3 text-sm font-semibold">Vitaminer</h3>
              <ul className="mt-1 columns-2 gap-x-8 text-sm">
                {vitaminAvg.map((row) => (
                  <li key={row.display} className="flex justify-between gap-3 border-b border-gray-100 py-0.5">
                    <span>{row.display === 'Folsyre' ? 'Folsyre' : `${row.display}-vitamin`}</span>
                    <span className="tabular-nums text-gray-700">
                      {da(row.value, 1)} {row.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {mineralAvg.length > 0 ? (
            <>
              <h3 className="mt-4 text-sm font-semibold">Mineraler</h3>
              <ul className="mt-1 columns-2 gap-x-8 text-sm">
                {mineralAvg.map((row) => (
                  <li key={row.key} className="flex justify-between gap-3 border-b border-gray-100 py-0.5">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-gray-700">
                      {da(row.value, 1)} {row.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {vitaminAvg.length === 0 && mineralAvg.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">Retterne i den her plan har ingen gemte vitaminer eller mineraler.</p>
          ) : null}
        </>
      ) : null}

      <p className="mt-8 text-sm leading-relaxed text-gray-800">
        Du kan se både fuld mikro (vitaminer og mineraler) og makro ernæring på din madplan i app og på web.
      </p>
      <p className="mt-2 text-xs text-gray-500">Næringstal er pr. person. functionalfoods.dk</p>
    </article>
  )
}
