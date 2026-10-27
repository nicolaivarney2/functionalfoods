/**
 * Afgør hvilke dagbogs-rækker der skal slettes og indsættes, når madplanen synkes.
 * Ren funktion — kaldes af /api/diary/sync-meal-plan.
 */

export type DiarySyncMode = 'fill' | 'replace' | 'update' | 'sync'

const PLAN_MEALS = new Set(['breakfast', 'lunch', 'dinner'])

export interface DiarySyncExisting {
  id: string
  logged_date: string
  meal_type: string
  source: string
  recipe_id: string | null
  title: string
}

export interface DiarySyncDesired {
  logged_date: string
  meal_type: string
  recipe_id?: string | null
  title: string
}

export function diarySlotKey(loggedDate: string, mealType: string): string {
  return `${loggedDate}:${mealType}`
}

export function sameDiaryRecipe(
  entry: { recipe_id?: string | null; title?: string | null },
  desired: { recipe_id?: string | null; title?: string | null }
): boolean {
  const entryId = String(entry.recipe_id ?? '').trim()
  const desiredId = String(desired.recipe_id ?? '').trim()
  if (entryId && desiredId) return entryId === desiredId
  return String(entry.title ?? '').trim().toLowerCase() === String(desired.title ?? '').trim().toLowerCase()
}

/**
 * fill: læg kun manglende slots ind. Rør ikke noget der allerede ligger.
 * update: efter skift/fjern i planen. Udskift plan-slotet, og slet madplan-rækker
 *         på slots planen ikke længere har. Manuelle logninger bliver.
 * sync: hele ugen skal følge planen. Også opskrifter lagt ind af den gamle
 *       «læg i dagbogen»-knap (source recipe) fjernes, når de ikke er planen.
 * replace: ny genereret plan. Slet madplan-rækker i perioden og skriv forfra.
 *          Manuelle logninger og opskrifter på tomme slots bliver.
 */
export function reconcileMealPlanDiary<T extends DiarySyncDesired>(opts: {
  mode: DiarySyncMode
  desired: T[]
  existing: DiarySyncExisting[]
}): { deleteIds: string[]; insert: T[] } {
  const mode = opts.mode
  const desiredBySlot = new Map<string, T>()
  for (const row of opts.desired) {
    if (!PLAN_MEALS.has(row.meal_type)) continue
    desiredBySlot.set(diarySlotKey(row.logged_date, row.meal_type), row)
  }

  const dismissed = new Set<string>()
  for (const entry of opts.existing) {
    if (entry.source === 'meal-plan-dismissed') {
      dismissed.add(diarySlotKey(entry.logged_date, entry.meal_type))
    }
  }

  const deleteIds: string[] = []
  const satisfied = new Set<string>()

  const drop = (id: string) => {
    if (!deleteIds.includes(id)) deleteIds.push(id)
  }

  if (mode === 'fill') {
    const occupied = new Set<string>()
    for (const entry of opts.existing) {
      if (entry.source === 'meal-plan-dismissed') continue
      occupied.add(diarySlotKey(entry.logged_date, entry.meal_type))
    }
    const insert = [...desiredBySlot.entries()]
      .filter(([slot]) => !occupied.has(slot) && !dismissed.has(slot))
      .map(([, row]) => row)
    return { deleteIds: [], insert }
  }

  for (const entry of opts.existing) {
    const slot = diarySlotKey(entry.logged_date, entry.meal_type)
    const desired = desiredBySlot.get(slot)
    const planMeal = PLAN_MEALS.has(entry.meal_type)

    if (entry.source === 'manual' || entry.source === 'ai-voice') continue
    if (entry.source === 'meal-plan-dismissed') {
      if (mode === 'replace') drop(entry.id)
      continue
    }

    if (entry.source === 'meal-plan') {
      if (mode === 'replace' || !desired || !sameDiaryRecipe(entry, desired)) drop(entry.id)
      else satisfied.add(slot)
      continue
    }

    if (entry.source !== 'recipe' || !planMeal) continue

    if (desired && !dismissed.has(slot) && sameDiaryRecipe(entry, desired)) {
      satisfied.add(slot)
      continue
    }

    if (desired && !dismissed.has(slot)) {
      drop(entry.id)
      continue
    }

    // Gammel «læg i dagbogen»-kopi på et slot planen har tømt.
    if (!desired && mode === 'sync') drop(entry.id)
  }

  const insert: T[] = []
  for (const [slot, row] of desiredBySlot) {
    if (mode !== 'replace' && dismissed.has(slot)) continue
    if (satisfied.has(slot)) continue
    insert.push(row)
  }

  return { deleteIds, insert }
}
