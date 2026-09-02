const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const
const MEALS = ['breakfast', 'lunch', 'dinner'] as const

export type MealPlanDayKey = (typeof DAY_KEYS)[number]
export type MealPlanMealKey = (typeof MEALS)[number]
export type MealPlanGrid = Record<
  MealPlanDayKey,
  Record<MealPlanMealKey, Record<string, unknown> | null>
>

type SupabaseLike = { from: (table: string) => any }

function asGrid(raw: unknown): MealPlanGrid | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const source =
    'grid' in o && o.grid && typeof o.grid === 'object'
      ? (o.grid as Record<string, unknown>)
      : 'monday' in o
        ? o
        : null
  if (!source || typeof source.monday !== 'object') return null
  return source as MealPlanGrid
}

export function cellHasIngredients(cell: Record<string, unknown> | null | undefined): boolean {
  return Array.isArray(cell?.ingredients) && cell.ingredients.length > 0
}

export function countMealsInGrid(raw: unknown): number {
  const grid = asGrid(raw)
  if (!grid) return 0
  let n = 0
  for (const day of DAY_KEYS) {
    for (const meal of MEALS) {
      if (grid[day]?.[meal]) n++
    }
  }
  return n
}

export function countCellsMissingIngredients(raw: unknown): number {
  const grid = asGrid(raw)
  if (!grid) return 0
  let n = 0
  for (const day of DAY_KEYS) {
    for (const meal of MEALS) {
      const cell = grid[day]?.[meal]
      if (cell && !cellHasIngredients(cell)) n++
    }
  }
  return n
}

/**
 * Klienten har tidligere fået slim-payload uden ingredients og skrevet det tilbage.
 * Bevar ingredients fra den gemte plan, når det indkommende felt er tomt.
 */
export function mergeMealPlanDataPreservingIngredients(incoming: unknown, existing: unknown): unknown {
  const incomingGrid = asGrid(incoming)
  const existingGrid = asGrid(existing)
  if (!incomingGrid || !existingGrid) return incoming

  const nextGrid = { ...incomingGrid }
  for (const day of DAY_KEYS) {
    const inDay = incomingGrid[day]
    const exDay = existingGrid[day]
    if (!inDay) continue
    const mergedDay = { ...inDay }
    for (const meal of MEALS) {
      const inCell = inDay[meal]
      const exCell = exDay?.[meal]
      if (!inCell || !exCell) continue
      if (!cellHasIngredients(inCell) && cellHasIngredients(exCell)) {
        mergedDay[meal] = { ...inCell, ingredients: exCell.ingredients }
      }
    }
    nextGrid[day] = mergedDay
  }

  if (incoming && typeof incoming === 'object' && 'grid' in (incoming as object)) {
    return { ...(incoming as Record<string, unknown>), grid: nextGrid }
  }
  return nextGrid
}

/** Hent manglende ingredients fra recipes via slug, så genberegn virker på strippede planer. */
export async function hydrateGridIngredientsFromRecipes(
  supabase: SupabaseLike,
  grid: MealPlanGrid
): Promise<MealPlanGrid> {
  const slugs = new Set<string>()
  for (const day of DAY_KEYS) {
    for (const meal of MEALS) {
      const cell = grid[day]?.[meal]
      if (!cell || cellHasIngredients(cell)) continue
      const slug = typeof cell.slug === 'string' ? cell.slug.trim() : ''
      if (slug) slugs.add(slug)
    }
  }
  if (slugs.size === 0) return grid

  const { data, error } = await supabase
    .from('recipes')
    .select('slug, ingredients')
    .in('slug', [...slugs])

  if (error || !data?.length) {
    if (error) console.error('hydrateGridIngredientsFromRecipes:', error)
    return grid
  }

  const bySlug = new Map<string, unknown[]>()
  for (const row of data) {
    if (typeof row.slug === 'string' && Array.isArray(row.ingredients) && row.ingredients.length) {
      bySlug.set(row.slug, row.ingredients)
    }
  }
  if (bySlug.size === 0) return grid

  const next: MealPlanGrid = { ...grid }
  for (const day of DAY_KEYS) {
    const row = grid[day]
    if (!row) continue
    const nextDay = { ...row }
    let changed = false
    for (const meal of MEALS) {
      const cell = row[meal]
      if (!cell || cellHasIngredients(cell)) continue
      const slug = typeof cell.slug === 'string' ? cell.slug.trim() : ''
      const ingredients = slug ? bySlug.get(slug) : undefined
      if (!ingredients) continue
      nextDay[meal] = { ...cell, ingredients }
      changed = true
    }
    if (changed) next[day] = nextDay
  }
  return next
}

export function applyHydratedGridToMealPlanData(raw: unknown, hydrated: MealPlanGrid): unknown {
  if (raw && typeof raw === 'object' && 'grid' in (raw as object)) {
    return { ...(raw as Record<string, unknown>), grid: hydrated }
  }
  return hydrated
}
