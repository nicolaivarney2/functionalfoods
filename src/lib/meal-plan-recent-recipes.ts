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

/**
 * Seneste madplaners retter — undgås ved ny generering (typisk forrige uge).
 * `currentWeekStarts` er alle mandage i det indkøb, der laves om. Den anden
 * mandag i samme indkøb må ikke tælle som en ældre plan.
 */
export function collectRecentlyUsedRecipeIds(
  plans: Array<{ week_start_date?: string; meal_plan_data?: unknown; updated_at?: string }>,
  currentWeekStarts: string | string[],
): string[] {
  const current = new Set(
    (Array.isArray(currentWeekStarts) ? currentWeekStarts : [currentWeekStarts]).map((d) =>
      String(d).slice(0, 10)
    )
  )
  const ids = new Set<string>()
  const now = Date.now()
  const rapidRetryWindowMs = 30 * 60 * 1000

  for (const plan of plans) {
    const start = String(plan.week_start_date || '').slice(0, 10)
    const isCurrentWeek = current.has(start)
    const updatedAt = plan.updated_at ? new Date(plan.updated_at).getTime() : 0
    const isRecentRetry = isCurrentWeek && now - updatedAt < rapidRetryWindowMs

    // Forrige uger: altid undgå. Samme indkøb inden for 30 min: også undgå (shake-up).
    if (!isCurrentWeek || isRecentRetry) {
      for (const id of extractRecipeIdsFromMealPlanData(plan.meal_plan_data)) {
        ids.add(id)
      }
    }
  }
  return Array.from(ids)
}
