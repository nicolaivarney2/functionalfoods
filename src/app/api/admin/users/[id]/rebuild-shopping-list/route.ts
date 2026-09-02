import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { requireAdmin } from '@/lib/admin-route-auth'
import {
  applyHydratedGridToMealPlanData,
  countCellsMissingIngredients,
  countMealsInGrid,
  hydrateGridIngredientsFromRecipes,
  type MealPlanGrid,
} from '@/lib/madbudget/meal-plan-ingredients'
import { shoppingListItemCount } from '@/lib/madbudget/shopping-list-presence'
import { rebuildShoppingListForUser } from '@/lib/meal-plan-system/rebuild-shopping-list'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function parseGrid(raw: unknown): MealPlanGrid {
  const empty = {
    monday: { breakfast: null, lunch: null, dinner: null },
    tuesday: { breakfast: null, lunch: null, dinner: null },
    wednesday: { breakfast: null, lunch: null, dinner: null },
    thursday: { breakfast: null, lunch: null, dinner: null },
    friday: { breakfast: null, lunch: null, dinner: null },
    saturday: { breakfast: null, lunch: null, dinner: null },
    sunday: { breakfast: null, lunch: null, dinner: null },
  } as MealPlanGrid
  if (!raw || typeof raw !== 'object') return empty
  const o = raw as Record<string, unknown>
  if ('grid' in o && o.grid && typeof o.grid === 'object') return o.grid as MealPlanGrid
  if ('monday' in o) return raw as MealPlanGrid
  return empty
}

/**
 * POST: hent ingredienser tilbage på strippede retter og genopbyg indkøbslisten.
 * Logger ikke ind som brugeren.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = serviceClient()
  if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { data: plan, error } = await supabase
    .from('user_meal_plans')
    .select('id, meal_plan_data, shopping_list, week_number, week_start_date')
    .eq('user_id', id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('admin rebuild shopping list:', error)
    return NextResponse.json({ error: 'Kunne ikke hente madplan' }, { status: 500 })
  }
  if (!plan) {
    return NextResponse.json({ error: 'Brugeren har ingen aktiv madplan' }, { status: 404 })
  }

  const grid = parseGrid(plan.meal_plan_data)
  const hydratedGrid = await hydrateGridIngredientsFromRecipes(supabase, grid)
  const shoppingList = await rebuildShoppingListForUser(supabase, id, hydratedGrid)

  if (shoppingList == null) {
    return NextResponse.json({ error: 'Kunne ikke genopbygge indkøbslisten' }, { status: 500 })
  }

  const mealPlanData = applyHydratedGridToMealPlanData(plan.meal_plan_data, hydratedGrid)
  const { error: updateError } = await supabase
    .from('user_meal_plans')
    .update({
      meal_plan_data: mealPlanData,
      shopping_list: shoppingList,
      updated_at: new Date().toISOString(),
    })
    .eq('id', plan.id)

  if (updateError) {
    console.error('admin rebuild shopping list save:', updateError)
    return NextResponse.json({ error: 'Kunne ikke gemme indkøbslisten' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    mealPlan: {
      id: plan.id,
      weekNumber: plan.week_number,
      weekStartDate: plan.week_start_date,
      mealCount: countMealsInGrid(mealPlanData),
      shoppingItemCount: shoppingListItemCount(shoppingList),
      missingIngredients: countCellsMissingIngredients(mealPlanData),
    },
  })
}
