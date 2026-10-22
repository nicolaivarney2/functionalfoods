/**
 * Husstandens madplan (kostretning + måltids-scope) ejes af voksen 0 (adult_index 0).
 * Andre voksne har kun biometri og vægtmål — planindstillinger arves for at undgå modstrid.
 */

import {
  inferBreakfastStyle,
  inferLunchStyle,
  mealsPerDayFromStyles,
  parseBreakfastStyle,
  parseLunchStyle,
  type BreakfastStyle,
  type LunchStyle,
} from '@/lib/madbudget/meal-slot-style'

export type { BreakfastStyle, LunchStyle }
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
  breakfastStyle: BreakfastStyle
  lunchStyle: LunchStyle
}

export interface AdultPlanFields {
  dietaryApproach?: string
  mealsPerDay?: string[]
  breakfastStyle?: BreakfastStyle | null
  lunchStyle?: LunchStyle | null
}

/** Læser planindstillinger fra voksen 0. */
function mealsFrom(profile?: AdultPlanFields | null): string[] | undefined {
  if (!profile) return undefined
  const raw = profile as AdultPlanFields & { meals_per_day?: string[] }
  return raw.mealsPerDay ?? raw.meals_per_day
}

function breakfastFrom(profile?: AdultPlanFields | null): unknown {
  if (!profile) return undefined
  const raw = profile as AdultPlanFields & { breakfast_style?: unknown }
  return raw.breakfastStyle ?? raw.breakfast_style
}

function lunchFrom(profile?: AdultPlanFields | null): unknown {
  if (!profile) return undefined
  const raw = profile as AdultPlanFields & { lunch_style?: unknown }
  return raw.lunchStyle ?? raw.lunch_style
}

export function getPlanOwnerSettings(adultsProfiles: AdultPlanFields[]): PlanOwnerSettings {
  const owner = adultsProfiles[0]
  const breakfastStyle = inferBreakfastStyle(mealsFrom(owner), breakfastFrom(owner))
  const lunchStyle = inferLunchStyle(mealsFrom(owner), lunchFrom(owner))
  const mealsPerDay = normalizeMealsPerDay(mealsPerDayFromStyles(breakfastStyle, lunchStyle))
  const dietaryApproach = String(owner?.dietaryApproach || '').trim() || undefined
  return {
    dietaryApproach,
    mealsPerDay,
    mealPlanScope: mealPlanScopeFromMeals(mealsPerDay),
    breakfastStyle,
    lunchStyle,
  }
}

/**
 * Kopierer kostretning og måltids-scope fra voksen 0 til alle voksne.
 * Bruges ved load, save og når brugeren ændrer planindstillinger.
 */
export function syncPlanSettingsAcrossAdults<T extends AdultPlanFields>(profiles: T[]): T[] {
  if (!profiles.length) return profiles

  const owner = profiles[0]
  const breakfastStyle = inferBreakfastStyle(mealsFrom(owner), breakfastFrom(owner))
  const lunchStyle = inferLunchStyle(mealsFrom(owner), lunchFrom(owner))
  const mealsPerDay = normalizeMealsPerDay(mealsPerDayFromStyles(breakfastStyle, lunchStyle))
  const dietaryApproach = String(owner?.dietaryApproach || '').trim() || undefined

  return profiles.map((p, i) => {
    if (i === 0) {
      return {
        ...p,
        mealsPerDay,
        breakfastStyle,
        lunchStyle,
        ...(dietaryApproach ? { dietaryApproach } : {}),
      }
    }
    return {
      ...p,
      mealsPerDay: [...mealsPerDay],
      breakfastStyle,
      lunchStyle,
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
  const breakfastStyle: BreakfastStyle = scope === 'full' ? 'fast' : 'skip'
  const lunchStyle: LunchStyle = scope === 'full' ? 'home' : 'skip'
  const updated = profiles.map((p, i) =>
    i === 0 ? { ...p, mealsPerDay: [...mealsPerDay], breakfastStyle, lunchStyle } : p
  )
  return syncPlanSettingsAcrossAdults(updated)
}

export function setBreakfastStyleOnProfiles<T extends AdultPlanFields>(
  profiles: T[],
  style: BreakfastStyle
): T[] {
  if (!profiles.length) return profiles
  const parsed = parseBreakfastStyle(style) ?? 'skip'
  const owner = profiles[0]
  const lunchStyle = inferLunchStyle(owner?.mealsPerDay, owner?.lunchStyle)
  const mealsPerDay = mealsPerDayFromStyles(parsed, lunchStyle)
  const updated = profiles.map((p, i) =>
    i === 0 ? { ...p, breakfastStyle: parsed, lunchStyle, mealsPerDay } : p
  )
  return syncPlanSettingsAcrossAdults(updated)
}

export function setLunchStyleOnProfiles<T extends AdultPlanFields>(
  profiles: T[],
  style: LunchStyle
): T[] {
  if (!profiles.length) return profiles
  const parsed = parseLunchStyle(style) ?? 'skip'
  const owner = profiles[0]
  const breakfastStyle = inferBreakfastStyle(owner?.mealsPerDay, owner?.breakfastStyle)
  const mealsPerDay = mealsPerDayFromStyles(breakfastStyle, parsed)
  const updated = profiles.map((p, i) =>
    i === 0 ? { ...p, breakfastStyle, lunchStyle: parsed, mealsPerDay } : p
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
  if (meal === 'breakfast') {
    return setBreakfastStyleOnProfiles(profiles, checked ? 'fast' : 'skip')
  }
  return setLunchStyleOnProfiles(profiles, checked ? 'home' : 'skip')
}
