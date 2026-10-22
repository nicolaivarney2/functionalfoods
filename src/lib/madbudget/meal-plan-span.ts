import {
  groupSpanByCalendarWeek,
  parsePlanDate,
  type WeekdayKey,
} from '@/lib/madbudget/week-dates'

export type ShopMeta = { date: string; dayCount: number }

type MealCell = Record<string, unknown> | null
type DayRow = Partial<Record<'breakfast' | 'lunch' | 'dinner', MealCell>>
export type SpanGrid = Record<string, DayRow>

export type SpanMealDay = {
  date: string
  breakfast?: unknown
  lunch?: unknown
  dinner?: unknown
}

export function parseShop(raw: unknown): ShopMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const shop = (raw as { shop?: unknown }).shop
  if (!shop || typeof shop !== 'object') return null
  const date = (shop as { date?: unknown }).date
  const dayCount = Number((shop as { dayCount?: unknown }).dayCount)
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 14) return null
  return { date, dayCount }
}

export function sameShop(a: ShopMeta | null, b: ShopMeta | null): boolean {
  return Boolean(a && b && a.date === b.date && a.dayCount === b.dayCount)
}

export function shopKey(shop: ShopMeta | null): string | null {
  return shop ? `${shop.date}:${shop.dayCount}` : null
}

/** Bevar shop (og andet meta) når griddet skrives om. */
export function mealPlanDataKeepingMeta(
  existing: unknown,
  grid: unknown,
  slotLocks: Record<string, boolean>
): Record<string, unknown> {
  const shop = parseShop(existing)
  return {
    v: 2,
    grid,
    slotLocks,
    ...(shop ? { shop } : {}),
  }
}

function gridFromPlan(raw: unknown): SpanGrid {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  if (o.grid && typeof o.grid === 'object') return o.grid as SpanGrid
  if ('monday' in o) return o as SpanGrid
  return {}
}

/**
 * Spise-rækkefølge for et indkøb. `gridsByWeek` vinder over det, der ligger i `plans`,
 * så et grid der endnu ikke er gemt, tæller med i indkøbslisten.
 */
export function spanMealDays(
  shop: ShopMeta,
  plans: Array<{ week_start_date?: string | null; meal_plan_data?: unknown }>,
  gridsByWeek?: Record<string, SpanGrid>
): SpanMealDay[] {
  const groups = groupSpanByCalendarWeek(parsePlanDate(shop.date), shop.dayCount)
  const fromPlans = new Map<string, SpanGrid>()
  for (const plan of plans) {
    const start = String(plan.week_start_date || '').slice(0, 10)
    if (!start) continue
    fromPlans.set(start, gridFromPlan(plan.meal_plan_data))
  }
  const days: SpanMealDay[] = []
  for (const group of groups) {
    const grid = gridsByWeek?.[group.weekStartDate] ?? fromPlans.get(group.weekStartDate) ?? {}
    for (const day of group.days) {
      const row = grid[day.weekday] ?? {}
      days.push({
        date: day.date,
        breakfast: row.breakfast,
        lunch: row.lunch,
        dinner: row.dinner,
      })
    }
  }
  return days
}

export function weekdayOfSpanDay(date: string): WeekdayKey {
  const groups = groupSpanByCalendarWeek(parsePlanDate(date), 1)
  return groups[0].days[0].weekday
}
