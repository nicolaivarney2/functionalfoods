/**
 * Husstandens madplan (kostretning + måltids-scope) ejes af voksen 0 (adult_index 0).
 * Andre voksne har kun biometri og vægtmål — planindstillinger arves for at undgå modstrid.
 */

export type MealPlanScope = 'full' | 'dinner-only'

export const FULL_PLAN_MEALS = ['breakfast', 'lunch', 'dinner'] as const
export const DINNER_ONLY_MEALS = ['dinner'] as const

export function mealsPerDayFromScope(scope: MealPlanScope): string[] {
  return scope === 'full' ? [...FULL_PLAN_MEALS] : [...DINNER_ONLY_MEALS]
}

/** Normaliserer måltidsliste — aftensmad er altid med. */
export function normalizeMealsPerDay(meals?: string[] | null): string[] {
  const set = new Set<string>(['dinner'])
  for (const m of meals || []) {
    if (m === 'breakfast' || m === 'lunch' || m === 'dinner') set.add(m)
  }
  return Array.from(set)
}

export function mealPlanScopeFromMeals(mealsPerDay?: string[] | null): MealPlanScope {
  const normalized = normalizeMealsPerDay(mealsPerDay)
  return normalized.includes('breakfast') || normalized.includes('lunch') ? 'full' : 'dinner-only'
}

export interface PlanOwnerSettings {
  dietaryApproach?: string
  mealsPerDay: string[]
  mealPlanScope: MealPlanScope
}

export interface AdultPlanFields {
  dietaryApproach?: string
  mealsPerDay?: string[]
}

/** Læser planindstillinger fra voksen 0. */
export function getPlanOwnerSettings(adultsProfiles: AdultPlanFields[]): PlanOwnerSettings {
  const owner = adultsProfiles[0]
  const mealsPerDay = normalizeMealsPerDay(owner?.mealsPerDay)
  const dietaryApproach = String(owner?.dietaryApproach || '').trim() || undefined
  return {
    dietaryApproach,
    mealsPerDay,
    mealPlanScope: mealPlanScopeFromMeals(mealsPerDay),
  }
}

/**
 * Kopierer kostretning og måltids-scope fra voksen 0 til alle voksne.
 * Bruges ved load, save og når brugeren ændrer planindstillinger.
 */
export function syncPlanSettingsAcrossAdults<T extends AdultPlanFields>(profiles: T[]): T[] {
  if (!profiles.length) return profiles

  const owner = profiles[0]
  const mealsPerDay = normalizeMealsPerDay(owner?.mealsPerDay)
  const dietaryApproach = String(owner?.dietaryApproach || '').trim() || undefined

  return profiles.map((p, i) => {
    if (i === 0) {
      return {
        ...p,
        mealsPerDay,
        ...(dietaryApproach ? { dietaryApproach } : {}),
      }
    }
    return {
      ...p,
      mealsPerDay: [...mealsPerDay],
      ...(dietaryApproach ? { dietaryApproach } : {}),
    }
  })
}

/** Opdaterer kun voksen 0's måltids-scope og synkroniserer til resten. */
export function setMealPlanScopeOnProfiles<T extends AdultPlanFields>(
  profiles: T[],
  scope: MealPlanScope
): T[] {
  const mealsPerDay = mealsPerDayFromScope(scope)
  if (!profiles.length) return profiles
  const updated = profiles.map((p, i) =>
    i === 0 ? { ...p, mealsPerDay: [...mealsPerDay] } : p
  )
  return syncPlanSettingsAcrossAdults(updated)
}

/** Opdaterer kun voksen 0's kostretning og synkroniserer til resten. */
export function setDietaryApproachOnProfiles<T extends AdultPlanFields>(
  profiles: T[],
  dietaryApproach: string
): T[] {
  if (!dietaryApproach.trim()) return profiles
  if (!profiles.length) {
    return [{ dietaryApproach, mealsPerDay: [...DINNER_ONLY_MEALS] } as T]
  }
  const updated = profiles.map((p, i) =>
    i === 0 ? { ...p, dietaryApproach } : p
  )
  return syncPlanSettingsAcrossAdults(updated)
}

/** Toggle morgenmad/frokost på voksen 0 og synkroniser. */
export function setPlannerMealIncludedOnProfiles<T extends AdultPlanFields>(
  profiles: T[],
  meal: 'breakfast' | 'lunch',
  checked: boolean
): T[] {
  if (!profiles.length) return profiles
  const ownerMeals = new Set(normalizeMealsPerDay(profiles[0]?.mealsPerDay))
  if (checked) ownerMeals.add(meal)
  else ownerMeals.delete(meal)
  ownerMeals.add('dinner')
  const updated = profiles.map((p, i) =>
    i === 0 ? { ...p, mealsPerDay: Array.from(ownerMeals) } : p
  )
  return syncPlanSettingsAcrossAdults(updated)
}
