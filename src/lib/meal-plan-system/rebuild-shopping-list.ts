import { hydrateGridIngredientsFromRecipes } from '@/lib/madbudget/meal-plan-ingredients'
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

/** Rester gemt som `isLeftover` på den aktive indkøbsliste — genbruges ved genberegning. */
export function extractLeftoversFromShoppingList(
  list: unknown
): Array<{ ingredientId?: string; name: string; amount: number; unit: string }> {
  if (!list || typeof list !== 'object') return []
  const categories = (list as { categories?: unknown }).categories
  if (!Array.isArray(categories)) return []

  const out: Array<{ ingredientId?: string; name: string; amount: number; unit: string }> = []
  for (const cat of categories) {
    if (!cat || typeof cat !== 'object') continue
    const items = (cat as { items?: unknown }).items
    if (!Array.isArray(items)) continue
    for (const it of items) {
      if (!it || typeof it !== 'object') continue
      const row = it as Record<string, unknown>
      if (!row.isLeftover) continue
      const name = String(row.name || '').trim()
      const amount = Number(row.amount)
      if (!name || !Number.isFinite(amount) || amount <= 0) continue
      out.push({
        ingredientId: typeof row.ingredientId === 'string' ? row.ingredientId : undefined,
        name,
        amount,
        unit: String(row.unit || 'g'),
      })
    }
  }
  return out
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

    const hydratedGrid = await hydrateGridIngredientsFromRecipes(supabase, grid)
    const syncedGrid = mealPlanGenerator.applyHouseholdServingsToGrid(hydratedGrid as any, family)

    const planDietaryApproach =
      adultsProfiles.find((p: { dietaryApproach?: string }) => p.dietaryApproach)?.dietaryApproach

    const { data: activePlan } = await supabase
      .from('user_meal_plans')
      .select('shopping_list')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    const availableIngredients = extractLeftoversFromShoppingList(activePlan?.shopping_list)

    const shoppingList = await mealPlanGenerator.buildShoppingListFromMadbudgetGrid(
      syncedGrid,
      1,
      { ...family, planDietaryApproach },
      availableIngredients.length ? availableIngredients : undefined
    )

    return shoppingList ?? null
  } catch (err) {
    console.error('rebuildShoppingListForUser:', err)
    return null
  }
}
