import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { rebuildShoppingListForUser } from '@/lib/meal-plan-system/rebuild-shopping-list'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type MealType = 'breakfast' | 'lunch' | 'dinner'

function emptyGrid(): Record<DayKey, Record<MealType, unknown | null>> {
  return {
    monday: { breakfast: null, lunch: null, dinner: null },
    tuesday: { breakfast: null, lunch: null, dinner: null },
    wednesday: { breakfast: null, lunch: null, dinner: null },
    thursday: { breakfast: null, lunch: null, dinner: null },
    friday: { breakfast: null, lunch: null, dinner: null },
    saturday: { breakfast: null, lunch: null, dinner: null },
    sunday: { breakfast: null, lunch: null, dinner: null },
  }
}

/** meal_plan_data er enten { v, grid, slotLocks } eller legacy (kun grid). */
function parseGrid(raw: unknown): Record<DayKey, Record<MealType, unknown | null>> {
  if (!raw || typeof raw !== 'object') return emptyGrid()
  const o = raw as Record<string, unknown>
  if ('grid' in o && o.grid && typeof o.grid === 'object') {
    return o.grid as Record<DayKey, Record<MealType, unknown | null>>
  }
  if ('monday' in o) {
    return raw as Record<DayKey, Record<MealType, unknown | null>>
  }
  return emptyGrid()
}

/**
 * Genberegner den aktive madplans indkøbsliste ud fra dens nuværende grid +
 * brugerens gemte familieprofil (antal personer/børn, kostretning, fravalg).
 *
 * Bruges når familieindstillinger ændres (fx antal personer): madplanens retter
 * beholdes, men mængderne på indkøbslisten skaleres til den nye husstand. Selve
 * priserne hentes som hidtil separat klient-side (shopping-list-prices).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: plan, error: planError } = await supabase
      .from('user_meal_plans')
      .select('id, meal_plan_data')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (planError) {
      console.error('recalculate-shopping-list: kunne ikke hente madplan:', planError)
      return NextResponse.json({ error: 'Failed to load meal plan' }, { status: 500 })
    }
    if (!plan) {
      return NextResponse.json({ error: 'No active meal plan' }, { status: 404 })
    }

    const grid = parseGrid(plan.meal_plan_data)
    const shoppingList = await rebuildShoppingListForUser(supabase, user.id, grid as any)

    if (shoppingList == null) {
      return NextResponse.json({ error: 'Failed to rebuild shopping list' }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from('user_meal_plans')
      .update({ shopping_list: shoppingList, updated_at: new Date().toISOString() })
      .eq('id', plan.id)

    if (updateError) {
      console.error('recalculate-shopping-list: kunne ikke gemme indkøbsliste:', updateError)
      return NextResponse.json({ error: 'Failed to save shopping list' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { shoppingList } })
  } catch (err) {
    console.error('POST /api/madbudget/meal-plan/recalculate-shopping-list:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
