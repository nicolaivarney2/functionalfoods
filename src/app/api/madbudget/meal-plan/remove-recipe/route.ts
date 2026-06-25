import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { rebuildShoppingListForUser } from '@/lib/meal-plan-system/rebuild-shopping-list'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type MealType = 'breakfast' | 'lunch' | 'dinner'

const VALID_DAYS = new Set<string>([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
const VALID_MEALS = new Set<string>(['breakfast', 'lunch', 'dinner'])

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

/** meal_plan_data er enten { v, grid, slotLocks } eller legacy (dag-nøgler i toppen). */
function parseMealPlanData(raw: unknown): {
  grid: Record<DayKey, Record<MealType, unknown | null>>
  slotLocks: Record<string, boolean>
} {
  if (!raw || typeof raw !== 'object') return { grid: emptyGrid(), slotLocks: {} }
  const o = raw as Record<string, unknown>
  if ('grid' in o && o.grid && typeof o.grid === 'object') {
    const g = o.grid as Record<string, unknown>
    if (g.monday) {
      return {
        grid: o.grid as Record<DayKey, Record<MealType, unknown | null>>,
        slotLocks: (o.slotLocks as Record<string, boolean>) ?? {},
      }
    }
  }
  if ('monday' in o) {
    return { grid: raw as Record<DayKey, Record<MealType, unknown | null>>, slotLocks: {} }
  }
  return { grid: emptyGrid(), slotLocks: {} }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const day = body.day as string | undefined
    const meal = (body.meal as string | undefined) ?? 'dinner'

    if (!day || !VALID_DAYS.has(day)) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    }
    if (!VALID_MEALS.has(meal)) {
      return NextResponse.json({ error: 'Invalid meal' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Fjern fra den aktive plan (den brugeren ser i appen).
    const { data: plan, error: planError } = await supabase
      .from('user_meal_plans')
      .select('id, meal_plan_data')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (planError) {
      console.error('remove-recipe load:', planError)
      return NextResponse.json({ error: 'Failed to load meal plan' }, { status: 500 })
    }
    if (!plan) {
      return NextResponse.json({ error: 'Ingen aktiv madplan' }, { status: 404 })
    }

    const { grid, slotLocks } = parseMealPlanData(plan.meal_plan_data)
    const dayKey = day as DayKey
    const mealKey = meal as MealType
    grid[dayKey][mealKey] = null
    delete slotLocks[`${dayKey}_${mealKey}`]

    // Genopbyg indkøbslisten så priserne følger den ændrede madplan. Slår fejl ikke
    // ud over hele kaldet — grid-ændringen gemmes uanset (listen markeres stale i app'en).
    const shoppingList = await rebuildShoppingListForUser(supabase, user.id, grid as any)

    const { error: updateError } = await supabase
      .from('user_meal_plans')
      .update({
        meal_plan_data: { v: 2, grid, slotLocks },
        ...(shoppingList != null ? { shopping_list: shoppingList } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id)

    if (updateError) {
      console.error('remove-recipe update:', updateError)
      return NextResponse.json({ error: 'Failed to update meal plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/madbudget/meal-plan/remove-recipe:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
