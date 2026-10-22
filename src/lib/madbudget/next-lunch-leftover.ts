/**
 * Planlagte rester: aftensmad i dag bliver frokost dagen efter.
 * Én ekstra portion lægges på kilde-retten, så indkøbslisten køber den med.
 * Selve frokost-cellen er en rester-plads og tæller ikke ingredienser igen.
 */

import {
  COOK_AHEAD_DAY_KEYS,
  clearLeftoversFromSource,
  copyMealNutrition,
  isLeftoverMealCell,
  type CookAheadDayKey,
  type CookAheadGrid,
  type CookAheadMealKey,
} from '@/lib/madbudget/cook-ahead'

const MEALS: CookAheadMealKey[] = ['breakfast', 'lunch', 'dinner']

export function extraShoppingPortions(cell: unknown): number {
  if (!cell || typeof cell !== 'object') return 0
  const n = Number((cell as Record<string, unknown>).extraShoppingPortions)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 10) / 10
}

/** Personer der spiser + planlagte rester-portioner. Bruges af den samme indkøbsberegning. */
export function shoppingPeopleEating(basePeople: number, cell: unknown): number {
  const base = Number.isFinite(basePeople) && basePeople > 0 ? basePeople : 0
  return Math.round((base + extraShoppingPortions(cell)) * 10) / 10
}

export function nextDayKey(day: string): CookAheadDayKey | null {
  const i = COOK_AHEAD_DAY_KEYS.indexOf(day as CookAheadDayKey)
  if (i < 0 || i >= COOK_AHEAD_DAY_KEYS.length - 1) return null
  return COOK_AHEAD_DAY_KEYS[i + 1]
}

export function previousDayKey(day: string): CookAheadDayKey | null {
  const i = COOK_AHEAD_DAY_KEYS.indexOf(day as CookAheadDayKey)
  if (i <= 0) return null
  return COOK_AHEAD_DAY_KEYS[i - 1]
}

export function plainMealTitle(title: unknown): string {
  const text = String(title || 'aftensmad').replace(/^Rester:\s*/i, '').trim()
  return text || 'aftensmad'
}

export function isNextLunchLeftover(cell: unknown): boolean {
  if (!isLeftoverMealCell(cell)) return false
  return (cell as Record<string, unknown>).leftoverKind === 'next-lunch'
}

export function isNextLunchFrom(cell: unknown, dinnerDay: string): boolean {
  if (!isNextLunchLeftover(cell)) return false
  return (cell as Record<string, unknown>).leftoverFromDay === dinnerDay
}

function setCell(
  grid: CookAheadGrid,
  day: string,
  meal: CookAheadMealKey,
  cell: Record<string, unknown> | null
): CookAheadGrid {
  return {
    ...grid,
    [day]: { ...(grid[day] || {}), [meal]: cell },
  }
}

function withExtraPortions(cell: Record<string, unknown>, portions: number): Record<string, unknown> {
  const next = { ...cell }
  if (portions > 0) next.extraShoppingPortions = portions
  else delete next.extraShoppingPortions
  return next
}

function dinnerCell(grid: CookAheadGrid, day: string): Record<string, unknown> | null {
  const cell = grid[day]?.dinner
  if (!cell || typeof cell !== 'object') return null
  return cell
}

/** Fjern den ekstra indkøbsportion, hvis frokost-pladsen er planlagte rester. */
export function detachNextLunchSlot(grid: CookAheadGrid, day: string, meal: CookAheadMealKey): CookAheadGrid {
  const cell = grid[day]?.[meal]
  if (!isNextLunchLeftover(cell)) return grid
  const sourceDay = String((cell as Record<string, unknown>).leftoverFromDay || '')
  const source = sourceDay ? dinnerCell(grid, sourceDay) : null
  if (!source || isLeftoverMealCell(source)) return grid
  return setCell(grid, sourceDay, 'dinner', withExtraPortions(source, 0))
}

function referencesSource(cell: unknown, sourceDay: string, sourceMeal: CookAheadMealKey, slot: CookAheadMealKey): boolean {
  if (!isLeftoverMealCell(cell)) return false
  const c = cell as Record<string, unknown>
  if (c.leftoverFromDay !== sourceDay) return false
  if (c.leftoverKind === 'next-lunch') {
    const fromMeal = typeof c.leftoverFromMeal === 'string' ? c.leftoverFromMeal : 'dinner'
    return fromMeal === sourceMeal
  }
  if (typeof c.leftoverFromMeal === 'string') return c.leftoverFromMeal === sourceMeal && slot === sourceMeal
  return slot === sourceMeal
}

function refreshedLeftover(
  existing: Record<string, unknown>,
  sourceDay: string,
  sourceMeal: CookAheadMealKey,
  source: Record<string, unknown>
): Record<string, unknown> {
  const title = plainMealTitle(source.title)
  const next: Record<string, unknown> = {
    ...existing,
    slug: typeof source.slug === 'string' ? source.slug : '',
    title: `Rester: ${title}`,
    image: source.image || source.imageUrl || '',
    imageUrl: source.imageUrl || source.image || '',
    ingredients: [],
    servings: 0,
    leftoverFromDay: sourceDay,
    leftoverFromMeal: sourceMeal,
    leftoverFromTitle: title,
    isLeftover: true,
  }
  if (existing.leftoverKind === 'next-lunch') next.leftoverKind = 'next-lunch'
  for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber', 'vitamins', 'minerals']) {
    if (source[key] != null) next[key] = source[key]
    else delete next[key]
  }
  return next
}

/** Opdater rester-tekst og næring, når kilde-retten skiftes. */
export function syncLeftoversToSource(
  grid: CookAheadGrid,
  sourceDay: string,
  sourceMeal: CookAheadMealKey,
  source: Record<string, unknown>
): CookAheadGrid {
  let next = grid
  for (const day of COOK_AHEAD_DAY_KEYS) {
    for (const meal of MEALS) {
      const cell = next[day]?.[meal]
      if (!referencesSource(cell, sourceDay, sourceMeal, meal)) continue
      next = setCell(
        next,
        day,
        meal,
        refreshedLeftover(cell as Record<string, unknown>, sourceDay, sourceMeal, source)
      )
    }
  }
  return next
}

function carryPlanningOnto(oldCell: unknown, newCell: Record<string, unknown>): Record<string, unknown> {
  if (!oldCell || typeof oldCell !== 'object' || isLeftoverMealCell(oldCell)) return newCell
  const old = oldCell as Record<string, unknown>
  const next = { ...newCell }
  const extra = extraShoppingPortions(old)
  if (extra > 0) next.extraShoppingPortions = extra
  const days = Number(old.cookAheadDays)
  if (days === 2 || days === 3) {
    next.cookAheadDays = days
    if (Number(old.servings) > 0) next.servings = old.servings
    if (Number(old.householdServings) > 0) next.householdServings = old.householdServings
  }
  return next
}

/**
 * Sæt eller fjern en ret. Rester der peger på pladsen følger med,
 * og en rester-plads frigiver den ekstra portion på aftensmaden.
 */
export function replaceMealKeepingLeftovers(
  grid: CookAheadGrid,
  day: string,
  meal: CookAheadMealKey,
  newCell: Record<string, unknown> | null
): CookAheadGrid {
  let next = detachNextLunchSlot(grid, day, meal)
  if (newCell == null) {
    next = clearLeftoversFromSource(next, day, meal, { includeNextLunch: true })
    return setCell(next, day, meal, null)
  }
  const old = next[day]?.[meal]
  const carried = carryPlanningOnto(old, newCell)
  next = setCell(next, day, meal, carried)
  return syncLeftoversToSource(next, day, meal, carried)
}

function nextLunchCell(sourceDay: string, source: Record<string, unknown>): Record<string, unknown> {
  const title = plainMealTitle(source.title)
  return {
    id: `leftover-${sourceDay}-dinner-${source.id ?? 'meal'}`,
    slug: typeof source.slug === 'string' ? source.slug : '',
    title: `Rester: ${title}`,
    image: source.image || source.imageUrl || '',
    imageUrl: source.imageUrl || source.image || '',
    ingredients: [],
    servings: 0,
    leftoverFromDay: sourceDay,
    leftoverFromMeal: 'dinner',
    leftoverFromTitle: title,
    leftoverKind: 'next-lunch',
    isLeftover: true,
    ...copyMealNutrition(source),
  }
}

export type NextLunchApplyResult =
  | { ok: true; grid: CookAheadGrid; already: boolean }
  | {
      ok: false
      reason: 'no-source' | 'source-is-leftover' | 'no-next-day' | 'locked' | 'occupied'
      occupiedTitle?: string
      nextDayLabel?: string
    }

const DAY_LABELS: Record<string, string> = {
  monday: 'mandag',
  tuesday: 'tirsdag',
  wednesday: 'onsdag',
  thursday: 'torsdag',
  friday: 'fredag',
  saturday: 'lørdag',
  sunday: 'søndag',
}

/**
 * Læg torsdagens aftensmad på fredagens frokost og plus én portion på aftensmaden.
 * Låste frokost-pladser røres ikke. Optagede pladser kræver overwrite.
 */
export function applyNextDayLunchLeftover(
  grid: CookAheadGrid,
  dinnerDay: string,
  options?: {
    overwrite?: boolean
    isLocked?: (day: string, meal: CookAheadMealKey) => boolean
  }
): NextLunchApplyResult {
  const source = dinnerCell(grid, dinnerDay)
  if (!source) return { ok: false, reason: 'no-source' }
  if (isLeftoverMealCell(source)) return { ok: false, reason: 'source-is-leftover' }

  const lunchDay = nextDayKey(dinnerDay)
  if (!lunchDay) return { ok: false, reason: 'no-next-day' }
  const nextDayLabel = DAY_LABELS[lunchDay] || lunchDay

  if (options?.isLocked?.(lunchDay, 'lunch')) {
    return { ok: false, reason: 'locked', nextDayLabel }
  }

  const target = grid[lunchDay]?.lunch
  if (isNextLunchFrom(target, dinnerDay)) {
    const linked = withExtraPortions(source, 1)
    let next = setCell(grid, dinnerDay, 'dinner', linked)
    next = setCell(next, lunchDay, 'lunch', nextLunchCell(dinnerDay, linked))
    return { ok: true, grid: next, already: true }
  }

  if (target && !options?.overwrite) {
    const occupiedTitle = plainMealTitle((target as Record<string, unknown>).title)
    return { ok: false, reason: 'occupied', occupiedTitle, nextDayLabel }
  }

  let next = grid
  if (target) {
    next = detachNextLunchSlot(next, lunchDay, 'lunch')
    next = clearLeftoversFromSource(next, lunchDay, 'lunch', { includeNextLunch: true })
  }

  const sourceNow = dinnerCell(next, dinnerDay) || source
  const linked = withExtraPortions(sourceNow, 1)
  next = setCell(next, dinnerDay, 'dinner', linked)
  next = setCell(next, lunchDay, 'lunch', nextLunchCell(dinnerDay, linked))
  return { ok: true, grid: next, already: false }
}

export function removeNextDayLunchLeftover(grid: CookAheadGrid, dinnerDay: string): CookAheadGrid {
  const lunchDay = nextDayKey(dinnerDay)
  if (!lunchDay) return grid
  if (!isNextLunchFrom(grid[lunchDay]?.lunch, dinnerDay)) return grid
  return replaceMealKeepingLeftovers(grid, lunchDay, 'lunch', null)
}

/** Efter ny generering: ekstra portion uden frokost-rester skal ikke blive hængende. */
export function stripOrphanExtraPortions(grid: CookAheadGrid): CookAheadGrid {
  let next = grid
  for (const day of COOK_AHEAD_DAY_KEYS) {
    const dinner = dinnerCell(next, day)
    if (!dinner || extraShoppingPortions(dinner) <= 0) continue
    const lunchDay = nextDayKey(day)
    const lunch = lunchDay ? next[lunchDay]?.lunch : null
    if (lunchDay && isNextLunchFrom(lunch, day)) continue
    next = setCell(next, day, 'dinner', withExtraPortions(dinner, 0))
  }
  return next
}

export function gridHasPlannedExtraPortions(grid: CookAheadGrid): boolean {
  return COOK_AHEAD_DAY_KEYS.some((day) => extraShoppingPortions(grid[day]?.dinner) > 0)
}

export type LeftoverSlotAction =
  | { type: 'plan'; dinnerDay: CookAheadDayKey; label: string }
  | { type: 'remove'; dinnerDay: CookAheadDayKey; label: string }

export function leftoverSlotAction(
  grid: CookAheadGrid,
  day: string,
  meal: CookAheadMealKey
): LeftoverSlotAction | null {
  if (meal === 'dinner') {
    const dinner = grid[day]?.dinner
    if (!dinner || isLeftoverMealCell(dinner)) return null
    const lunchDay = nextDayKey(day)
    if (!lunchDay) return null
    const dinnerDay = day as CookAheadDayKey
    if (isNextLunchFrom(grid[lunchDay]?.lunch, day)) {
      return { type: 'remove', dinnerDay, label: 'Fjern rester fra frokost dagen efter' }
    }
    return { type: 'plan', dinnerDay, label: 'Tilføj til frokost dagen efter' }
  }

  if (meal !== 'lunch') return null
  const dinnerDay = previousDayKey(day)
  if (!dinnerDay) return null
  const dinner = grid[dinnerDay]?.dinner
  if (!dinner || isLeftoverMealCell(dinner)) return null
  if (isNextLunchFrom(grid[day]?.lunch, dinnerDay)) return null
  return { type: 'plan', dinnerDay, label: 'Tilføj rester fra dagen før' }
}
