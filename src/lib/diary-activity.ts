export type DiaryActivity = {
  id: string
  loggedDate: string
  title: string
  calories: number
}

export function sumActivityCalories(activities: Array<{ calories?: number | null }>): number {
  return activities.reduce((sum, a) => sum + (Number(a.calories) || 0), 0)
}

/** Læg forbrændt aktivitet oven i dagens kalorie- og makromål (samme fordeling). */
export function applyActivityToTargets<
  T extends { calories: number; protein: number; carbs: number; fat: number },
>(target: T | null, extraKcal: number): T | null {
  if (!target || !Number.isFinite(extraKcal) || extraKcal <= 0) return target
  const base = target.calories > 0 ? target.calories : 1
  const factor = (base + extraKcal) / base
  return {
    ...target,
    calories: Math.round(target.calories + extraKcal),
    protein: Math.round(target.protein * factor),
    carbs: Math.round(target.carbs * factor),
    fat: Math.round(target.fat * factor),
  }
}

export function mapActivityRow(row: Record<string, unknown>): DiaryActivity {
  return {
    id: String(row.id),
    loggedDate: String(row.logged_date ?? ''),
    title: String(row.title ?? 'Aktivitet'),
    calories: Math.round(Number(row.calories) || 0),
  }
}
