const MEALS = ['breakfast', 'lunch', 'dinner'] as const

/** Fjern tunge felter fra grid-celler — bruges ved API-svar til app/klient. */
export function stripMealPlanDataForClient(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw
  const o = raw as Record<string, unknown>

  const gridSource =
    'grid' in o && o.grid && typeof o.grid === 'object'
      ? (o.grid as Record<string, unknown>)
      : 'monday' in o
        ? (raw as Record<string, unknown>)
        : null

  if (!gridSource) return raw

  const strippedGrid: Record<string, unknown> = {}
  for (const [day, dayObj] of Object.entries(gridSource)) {
    if (!dayObj || typeof dayObj !== 'object') {
      strippedGrid[day] = dayObj
      continue
    }
    const d = dayObj as Record<string, unknown>
    const outDay: Record<string, unknown> = {}
    for (const meal of MEALS) {
      const cell = d[meal]
      if (!cell || typeof cell !== 'object') {
        outDay[meal] = cell ?? null
        continue
      }
      const c = cell as Record<string, unknown>
      const {
        ingredients: _ing,
        vitamins: _vit,
        minerals: _min,
        ...rest
      } = c
      outDay[meal] = rest
    }
    strippedGrid[day] = outDay
  }

  if ('grid' in o && o.grid) {
    return { ...o, grid: strippedGrid }
  }
  return strippedGrid
}

export function slimMealPlanRowForClient<T extends { meal_plan_data?: unknown; family_profile_snapshot?: unknown }>(
  row: T
): T {
  if (!row) return row
  const { family_profile_snapshot: _snap, ...rest } = row
  return {
    ...rest,
    meal_plan_data: stripMealPlanDataForClient(row.meal_plan_data),
  } as T
}
