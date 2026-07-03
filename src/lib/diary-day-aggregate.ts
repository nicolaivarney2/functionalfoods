import { aggregateEntryMicros } from '@/lib/diary-food-log-micro'

export const FOOD_LOG_ENTRY_SELECT =
  'id, logged_date, meal_type, source, recipe_id, recipe_slug, title, image_url, servings, calories, protein, carbs, fat, fiber, vitamins, minerals, created_at'

export type MacroTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

export function addUtcDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

export function datesInRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addUtcDays(start, i))
}

export function sumMacroTotals(entries: Array<Record<string, unknown>>): MacroTotals {
  const acc = entries.reduce(
    (a, e) => {
      a.calories += Number(e.calories) || 0
      a.protein += Number(e.protein) || 0
      a.carbs += Number(e.carbs) || 0
      a.fat += Number(e.fat) || 0
      a.fiber += Number(e.fiber) || 0
      return a
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
  return {
    calories: Math.round(acc.calories),
    protein: Math.round(acc.protein),
    carbs: Math.round(acc.carbs),
    fat: Math.round(acc.fat),
    fiber: Math.round(acc.fiber),
  }
}

export function buildDiaryDayPayload(
  date: string,
  entries: Array<Record<string, unknown>>,
  target: unknown
) {
  const totals = sumMacroTotals(entries)
  const microTotals = aggregateEntryMicros(entries)
  return {
    date,
    target,
    totals: { ...totals, vitamins: microTotals.vitamins, minerals: microTotals.minerals },
    entries,
  }
}
