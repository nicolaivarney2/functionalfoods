import { mealPlanGenerator } from '@/lib/meal-plan-system'

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type MealType = 'breakfast' | 'lunch' | 'dinner'
type Grid = Record<DayKey, Record<MealType, Record<string, unknown> | null>>

/** Minimal Supabase-klient-form vi har brug for her (undgår hård typeafhængighed). */
type SupabaseLike = {
  from: (table: string) => any
}

/** Udled børnenes aldersbånd (fallback '4-9'), så generatoren altid får et array. */
function effectiveChildrenAges(children: number, raw: unknown): string[] {
  const arr = Array.isArray(raw) ? (raw as string[]) : []
  if (arr.length >= children) return arr.slice(0, Math.max(0, children))
  return [...arr, ...Array.from({ length: children - arr.length }, () => '4-9')]
}

/**
 * Genopbygger indkøbslisten ud fra en madplan-grid + brugerens gemte familieprofil.
 *
 * Bruges af add-recipe/remove-recipe, så indkøbslisten (og dermed priserne) altid
 * følger med når madplanen ændres — ikke kun ved fuld generering. Returnerer null
 * ved fejl, så kalderen kan vælge at gemme grid-ændringen alligevel.
 */
export async function rebuildShoppingListForUser(
  supabase: SupabaseLike,
  userId: string,
  grid: Grid
): Promise<unknown | null> {
  try {
    const { data: profile } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!profile) return null

    const { data: adultRows } = await supabase
      .from('adult_weight_loss_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('adult_index')

    const adultsProfiles = (adultRows ?? []).map((p: Record<string, any>) => ({
      gender: p.gender,
      age: p.age,
      height: p.height,
      weight: p.weight,
      activityLevel: p.activity_level,
      dietaryApproach: p.dietary_approach,
      mealsPerDay: Array.isArray(p.meals_per_day) ? p.meals_per_day : ['dinner'],
      weightGoal: p.weight_goal,
      excludedFoods: Array.isArray(p.excluded_foods) ? p.excluded_foods : [],
    }))

    const childrenAges = effectiveChildrenAges(profile.children ?? 0, profile.children_ages)
    const family = {
      adults: Number(profile.adults) || 1,
      childrenAges,
      adultsProfiles,
    }

    const syncedGrid = mealPlanGenerator.applyHouseholdServingsToGrid(grid as any, family)

    const planDietaryApproach =
      adultsProfiles.find((p: { dietaryApproach?: string }) => p.dietaryApproach)?.dietaryApproach

    const shoppingList = await mealPlanGenerator.buildShoppingListFromMadbudgetGrid(
      syncedGrid,
      1,
      { ...family, planDietaryApproach }
    )

    return shoppingList ?? null
  } catch (err) {
    console.error('rebuildShoppingListForUser:', err)
    return null
  }
}
