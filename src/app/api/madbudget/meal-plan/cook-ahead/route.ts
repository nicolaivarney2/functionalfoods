import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { applyCookAhead, type CookAheadDays, type CookAheadGrid } from '@/lib/madbudget/cook-ahead'
import { loadHouseholdForUser } from '@/lib/household-access'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { rebuildShoppingListForUser } from '@/lib/meal-plan-system/rebuild-shopping-list'
import { resolveHouseholdMealPlan } from '@/lib/madbudget/resolve-meal-plan'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

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

function emptyGrid(): CookAheadGrid {
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

function parseMealPlanData(raw: unknown): {
  grid: CookAheadGrid
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
      grid[day as keyof CookAheadGrid] = {
        breakfast: (d.breakfast as CookAheadGrid[keyof CookAheadGrid]['breakfast']) ?? null,
        lunch: (d.lunch as CookAheadGrid[keyof CookAheadGrid]['lunch']) ?? null,
        dinner: (d.dinner as CookAheadGrid[keyof CookAheadGrid]['dinner']) ?? null,
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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const household = await loadHouseholdForUser(user)
    if (!household) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const day = body.day as string | undefined
    const meal = (body.meal as string | undefined) ?? 'dinner'
    const days = Number(body.days) as CookAheadDays
    const mealPlanId = typeof body.mealPlanId === 'string' ? body.mealPlanId : undefined
    const weekStartDateArg =
      typeof body.weekStartDate === 'string' ? body.weekStartDate : undefined

    if (!day || !VALID_DAYS.has(day)) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    }
    if (!VALID_MEALS.has(meal)) {
      return NextResponse.json({ error: 'Invalid meal' }, { status: 400 })
    }
    if (days !== 2 && days !== 3) {
      return NextResponse.json({ error: 'days skal være 2 eller 3' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    let plan
    try {
      plan = await resolveHouseholdMealPlan(supabase, household.ownerId, {
        mealPlanId,
        weekStartDate: weekStartDateArg,
      })
    } catch {
      return NextResponse.json({ error: 'Failed to load meal plan' }, { status: 500 })
    }
    if (!plan) {
      return NextResponse.json({ error: 'Ingen aktiv madplan' }, { status: 404 })
    }

    const { grid, slotLocks } = parseMealPlanData(plan.meal_plan_data)
    const nextGrid = applyCookAhead(grid, day, meal as MealType, days, (d, m) =>
      Boolean(slotLocks[`${d}_${m}`])
    )
    const shoppingList = await rebuildShoppingListForUser(
      supabase,
      household.ownerId,
      nextGrid as any
    )

    const { error: updateError } = await supabase
      .from('user_meal_plans')
      .update({
        meal_plan_data: { v: 2, grid: nextGrid, slotLocks },
        ...(shoppingList != null ? { shopping_list: shoppingList } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update meal plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/madbudget/meal-plan/cook-ahead:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
