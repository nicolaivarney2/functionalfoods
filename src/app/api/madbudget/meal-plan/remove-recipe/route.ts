import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { rebuildShoppingListForUser } from '@/lib/meal-plan-system/rebuild-shopping-list'
import { loadHouseholdForUser } from '@/lib/household-access'
import { clearLeftoversFromSource, type CookAheadGrid } from '@/lib/madbudget/cook-ahead'
import { resolveHouseholdMealPlan } from '@/lib/madbudget/resolve-meal-plan'

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
  const grid = emptyGrid()
  if (!raw || typeof raw !== 'object') return { grid, slotLocks: {} }
  const o = raw as Record<string, unknown>
  const source =
    'grid' in o && o.grid && typeof o.grid === 'object'
      ? (o.grid as Record<string, unknown>)
      : 'monday' in o || 'tuesday' in o
        ? o
        : null
  if (source) {
    for (const day of VALID_DAYS) {
      const dayObj = source[day]
      if (!dayObj || typeof dayObj !== 'object') continue
      const d = dayObj as Record<string, unknown>
      grid[day as DayKey] = {
        breakfast: (d.breakfast as unknown) ?? null,
        lunch: (d.lunch as unknown) ?? null,
        dinner: (d.dinner as unknown) ?? null,
      }
    }
  }
  return {
    grid,
    slotLocks:
      o.slotLocks && typeof o.slotLocks === 'object'
        ? { ...(o.slotLocks as Record<string, boolean>) }
        : {},
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const household = await loadHouseholdForUser(user)
    if (!household) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const ownerId = household.ownerId

    const body = await request.json()
    const day = body.day as string | undefined
    const meal = (body.meal as string | undefined) ?? 'dinner'
    const mealPlanId = typeof body.mealPlanId === 'string' ? body.mealPlanId : undefined
    const weekStartDateArg =
      typeof body.weekStartDate === 'string' ? body.weekStartDate : undefined

    if (!day || !VALID_DAYS.has(day)) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    }
    if (!VALID_MEALS.has(meal)) {
      return NextResponse.json({ error: 'Invalid meal' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    let plan
    try {
      plan = await resolveHouseholdMealPlan(supabase, ownerId, {
        mealPlanId,
        weekStartDate: weekStartDateArg,
      })
    } catch (planError) {
      console.error('remove-recipe load:', planError)
      return NextResponse.json({ error: 'Failed to load meal plan' }, { status: 500 })
    }
    if (!plan) {
      return NextResponse.json({ error: 'Ingen aktiv madplan' }, { status: 404 })
    }

    const parsed = parseMealPlanData(plan.meal_plan_data)
    const dayKey = day as DayKey
    const mealKey = meal as MealType
    const grid = clearLeftoversFromSource(parsed.grid as CookAheadGrid, dayKey, mealKey) as typeof parsed.grid
    const slotLocks = parsed.slotLocks
    grid[dayKey][mealKey] = null
    delete slotLocks[`${dayKey}_${mealKey}`]

    // Genopbyg indkøbslisten så priserne følger den ændrede madplan. Slår fejl ikke
    // ud over hele kaldet — grid-ændringen gemmes uanset (listen markeres stale i app'en).
    const shoppingList = await rebuildShoppingListForUser(supabase, ownerId, grid as any)

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
