type SupabaseLike = {
  from: (table: string) => any
}

export type MealPlanTarget = {
  mealPlanId?: string
  weekStartDate?: string
}

export type HouseholdMealPlanRow = {
  id: string
  meal_plan_data: unknown
  week_start_date: string
  week_end_date: string
}

const PLAN_COLUMNS = 'id, meal_plan_data, week_start_date, week_end_date'

/**
 * Find den madplan der skal redigeres.
 *
 * Tidligere ramte add-recipe altid indeværende kalenderuge, mens remove/GET
 * brugte seneste aktive plan. I weekenden (næste uges plan) skabte det en ny,
 * næsten tom uge-plan og fik de andre retter til at forsvinde.
 */
export async function resolveHouseholdMealPlan(
  supabase: SupabaseLike,
  ownerId: string,
  target: MealPlanTarget = {},
): Promise<HouseholdMealPlanRow | null> {
  if (target.mealPlanId) {
    const { data, error } = await supabase
      .from('user_meal_plans')
      .select(PLAN_COLUMNS)
      .eq('user_id', ownerId)
      .eq('id', target.mealPlanId)
      .maybeSingle()
    if (error) throw error
    if (data) return data as HouseholdMealPlanRow
  }

  if (target.weekStartDate) {
    const { data, error } = await supabase
      .from('user_meal_plans')
      .select(PLAN_COLUMNS)
      .eq('user_id', ownerId)
      .eq('week_start_date', target.weekStartDate)
      .maybeSingle()
    if (error) throw error
    if (data) return data as HouseholdMealPlanRow
  }

  const { data, error } = await supabase
    .from('user_meal_plans')
    .select(PLAN_COLUMNS)
    .eq('user_id', ownerId)
    .eq('is_active', true)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as HouseholdMealPlanRow | null) ?? null
}
