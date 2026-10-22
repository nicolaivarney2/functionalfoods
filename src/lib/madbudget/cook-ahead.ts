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

export const MEAL_NUTRITION_KEYS = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'vitamins',
  'minerals',
] as const

/** Næring pr. portion fra kilde-retten. Madplan-rester kopierer den uforkortet. */
export function copyMealNutrition(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of MEAL_NUTRITION_KEYS) {
    if (source[key] != null) out[key] = source[key]
  }
  return out
}

function leftoverCell(
  sourceDay: string,
  source: Record<string, unknown>,
  meal: CookAheadMealKey
): Record<string, unknown> {
  const title = String(source.title || 'aftensmad').replace(/^Rester:\s*/i, '')
  return {
    id: `leftover-${sourceDay}-${meal}-${source.id ?? 'meal'}`,
    slug: typeof source.slug === 'string' ? source.slug : '',
    title: `Rester: ${title}`,
    image: source.image || source.imageUrl || '',
    imageUrl: source.imageUrl || source.image || '',
    ingredients: [],
    servings: 0,
    leftoverFromDay: sourceDay,
    leftoverFromMeal: meal,
    leftoverFromTitle: title,
    isLeftover: true,
    ...copyMealNutrition(source),
  }
}

function sameMealLeftoverFrom(cell: unknown, sourceDay: string): boolean {
  if (!isLeftoverMealCell(cell)) return false
  const c = cell as Record<string, unknown>
  if (c.leftoverKind === 'next-lunch') return false
  return c.leftoverFromDay === sourceDay
}

function nextLunchLeftoverFrom(cell: unknown, sourceDay: string, sourceMeal: CookAheadMealKey): boolean {
  if (!isLeftoverMealCell(cell)) return false
  const c = cell as Record<string, unknown>
  if (c.leftoverKind !== 'next-lunch') return false
  if (c.leftoverFromDay !== sourceDay) return false
  const fromMeal = typeof c.leftoverFromMeal === 'string' ? c.leftoverFromMeal : 'dinner'
  return fromMeal === sourceMeal
}

export function clearLeftoversFromSource(
  grid: CookAheadGrid,
  sourceDay: string,
  meal: CookAheadMealKey,
  options?: { includeNextLunch?: boolean }
): CookAheadGrid {
  const next: CookAheadGrid = { ...grid }
  const meals: CookAheadMealKey[] = ['breakfast', 'lunch', 'dinner']
  for (const day of COOK_AHEAD_DAY_KEYS) {
    const row = { ...(next[day] || {}) }
    let changed = false
    for (const slot of meals) {
      const cell = row[slot]
      const clearSameMeal = slot === meal && sameMealLeftoverFrom(cell, sourceDay)
      const clearNextLunch =
        options?.includeNextLunch === true && nextLunchLeftoverFrom(cell, sourceDay, meal)
      if (!clearSameMeal && !clearNextLunch) continue
      row[slot] = null
      changed = true
    }
    if (changed) next[day] = row
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
    followRow[meal] = leftoverCell(day, source, meal)
    next[followDay] = followRow
  }
  return next
}

export type DatedCookSlot = {
  date: string
  dayKey: CookAheadDayKey
  weekStart: string
}

/**
 * Rester må hoppe over søndag ind i næste uges grid.
 * leftoverFromDate er koge-dagens dato, så næste uges mandag ikke forveksles med søndag.
 */
export function applyCookAheadOnDates(
  grids: Record<string, CookAheadGrid>,
  slots: DatedCookSlot[],
  sourceDate: string,
  meal: CookAheadMealKey,
  totalDays: CookAheadDays,
  isLocked?: (weekStart: string, dayKey: string, mealKey: CookAheadMealKey) => boolean
): Record<string, CookAheadGrid> {
  const sourceIndex = slots.findIndex((slot) => slot.date === sourceDate)
  if (sourceIndex < 0) return grids
  const sourceSlot = slots[sourceIndex]
  const sourceCell = grids[sourceSlot.weekStart]?.[sourceSlot.dayKey]?.[meal]
  if (!sourceCell || isLeftoverMealCell(sourceCell)) return grids

  const next: Record<string, CookAheadGrid> = {}
  for (const [week, grid] of Object.entries(grids)) next[week] = { ...grid }

  for (const slot of slots) {
    const row = { ...(next[slot.weekStart]?.[slot.dayKey] || {}) }
    const cell = row[meal]
    if (!isLeftoverMealCell(cell)) continue
    const marker = cell as Record<string, unknown>
    const fromThisCook =
      marker.leftoverFromDate === sourceDate ||
      (slot.weekStart === sourceSlot.weekStart &&
        marker.leftoverFromDay === sourceSlot.dayKey &&
        !marker.leftoverFromDate)
    if (!fromThisCook) continue
    row[meal] = null
    next[slot.weekStart] = { ...(next[slot.weekStart] || {}), [slot.dayKey]: row }
  }

  const source = { ...(next[sourceSlot.weekStart]?.[sourceSlot.dayKey]?.[meal] as Record<string, unknown>) }
  const scaled = Math.round(oneDayServings(source) * totalDays * 10) / 10
  source.servings = scaled
  source.householdServings = scaled
  source.cookAheadDays = totalDays
  next[sourceSlot.weekStart] = {
    ...(next[sourceSlot.weekStart] || {}),
    [sourceSlot.dayKey]: {
      ...(next[sourceSlot.weekStart]?.[sourceSlot.dayKey] || {}),
      [meal]: source,
    },
  }

  for (const slot of slots.slice(sourceIndex + 1, sourceIndex + totalDays)) {
    if (isLocked?.(slot.weekStart, slot.dayKey, meal)) continue
    const row = { ...(next[slot.weekStart]?.[slot.dayKey] || {}) }
    row[meal] = { ...leftoverCell(sourceSlot.dayKey, source, meal), leftoverFromDate: sourceDate }
    next[slot.weekStart] = { ...(next[slot.weekStart] || {}), [slot.dayKey]: row }
  }
  return next
}
