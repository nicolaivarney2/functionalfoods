/** Lav en ret til 2–3 dage: skaler portioner og markér de næste dage som rester. */

export const COOK_AHEAD_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type CookAheadDayKey = (typeof COOK_AHEAD_DAY_KEYS)[number]
export type CookAheadMealKey = 'breakfast' | 'lunch' | 'dinner'
export type CookAheadDays = 2 | 3

export type CookAheadGrid = Record<
  string,
  Partial<Record<CookAheadMealKey, Record<string, unknown> | null>>
>

export function isLeftoverMealCell(cell: unknown): boolean {
  if (!cell || typeof cell !== 'object') return false
  const c = cell as Record<string, unknown>
  return Boolean(c.leftoverFromDay) || c.isLeftover === true
}

function nextDays(from: string, count: number): string[] {
  const i = COOK_AHEAD_DAY_KEYS.indexOf(from as CookAheadDayKey)
  if (i < 0) return []
  return COOK_AHEAD_DAY_KEYS.slice(i + 1, i + 1 + count)
}

function oneDayServings(cell: Record<string, unknown>): number {
  const days = Number(cell.cookAheadDays)
  const servings = Number(cell.householdServings || cell.servings)
  const base = Number.isFinite(servings) && servings > 0 ? servings : 4
  if (Number.isFinite(days) && days > 1) return base / days
  return base
}

function leftoverCell(sourceDay: string, source: Record<string, unknown>): Record<string, unknown> {
  const title = String(source.title || 'aftensmad')
  return {
    id: `leftover-${sourceDay}-${source.id ?? 'meal'}`,
    slug: '',
    title: `Rester: ${title}`,
    image: source.image || source.imageUrl || '',
    imageUrl: source.imageUrl || source.image || '',
    ingredients: [],
    servings: 0,
    leftoverFromDay: sourceDay,
    leftoverFromTitle: title,
    isLeftover: true,
  }
}

export function clearLeftoversFromSource(
  grid: CookAheadGrid,
  sourceDay: string,
  meal: CookAheadMealKey
): CookAheadGrid {
  const next: CookAheadGrid = { ...grid }
  for (const day of COOK_AHEAD_DAY_KEYS) {
    const row = { ...(next[day] || {}) }
    const cell = row[meal]
    if (isLeftoverMealCell(cell) && (cell as Record<string, unknown>).leftoverFromDay === sourceDay) {
      row[meal] = null
      next[day] = row
    }
  }
  return next
}

/**
 * Skaler retten til `totalDays` portioner og sæt de følgende dage til rester
 * (tæller ikke med på indkøbslisten). Låste pladser røres ikke.
 */
export function applyCookAhead(
  grid: CookAheadGrid,
  day: string,
  meal: CookAheadMealKey,
  totalDays: CookAheadDays,
  isLocked?: (dayKey: string, mealKey: CookAheadMealKey) => boolean
): CookAheadGrid {
  const row = grid[day]
  const cell = row?.[meal]
  if (!cell || isLeftoverMealCell(cell)) return grid

  let next = clearLeftoversFromSource({ ...grid }, day, meal)
  const source = { ...(next[day]?.[meal] as Record<string, unknown>) }
  const scaled = Math.round(oneDayServings(source) * totalDays * 10) / 10
  source.servings = scaled
  source.householdServings = scaled
  source.cookAheadDays = totalDays
  next[day] = { ...(next[day] || {}), [meal]: source }

  const follow = nextDays(day, totalDays - 1)
  for (const followDay of follow) {
    if (isLocked?.(followDay, meal)) continue
    const followRow = { ...(next[followDay] || {}) }
    followRow[meal] = leftoverCell(day, source)
    next[followDay] = followRow
  }
  return next
}
