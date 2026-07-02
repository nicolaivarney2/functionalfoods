export function extractRecipeIdsFromMealPlanData(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  const o = raw as Record<string, unknown>
  const grid =
    'grid' in o && o.grid && typeof o.grid === 'object'
      ? (o.grid as Record<string, Record<string, unknown>>)
      : 'monday' in o
        ? (o as Record<string, Record<string, unknown>>)
        : null
  if (!grid) return []

  const ids = new Set<string>()
  for (const day of Object.values(grid)) {
    if (!day || typeof day !== 'object') continue
    for (const cell of Object.values(day)) {
      if (!cell || typeof cell !== 'object') continue
      const id = (cell as { id?: unknown }).id
      if (id != null && String(id).trim()) ids.add(String(id))
    }
  }
  return Array.from(ids)
}

/** Seneste madplaners retter — undgås ved ny generering (typisk forrige uge). */
export function collectRecentlyUsedRecipeIds(
  plans: Array<{ week_start_date?: string; meal_plan_data?: unknown; updated_at?: string }>,
  currentWeekStart: string,
): string[] {
  const ids = new Set<string>()
  const now = Date.now()
  const rapidRetryWindowMs = 30 * 60 * 1000

  for (const plan of plans) {
    const isCurrentWeek = plan.week_start_date === currentWeekStart
    const updatedAt = plan.updated_at ? new Date(plan.updated_at).getTime() : 0
    const isRecentRetry = isCurrentWeek && now - updatedAt < rapidRetryWindowMs

    // Forrige uger: altid undgå. Samme uge inden for 30 min: også undgå (shake-up).
    if (!isCurrentWeek || isRecentRetry) {
      for (const id of extractRecipeIdsFromMealPlanData(plan.meal_plan_data)) {
        ids.add(id)
      }
    }
  }
  return Array.from(ids)
}
