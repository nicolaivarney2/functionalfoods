import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { applyCookAhead, applyCookAheadOnDates, type CookAheadDays, type CookAheadGrid } from '@/lib/madbudget/cook-ahead'
import { mealPlanDataKeepingMeta, parseShop, sameShop } from '@/lib/madbudget/meal-plan-span'
import { buildPlannerDays } from '@/lib/madbudget/week-dates'
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

    const shop = parseShop(plan.meal_plan_data)
    const { grid, slotLocks } = parseMealPlanData(plan.meal_plan_data)

    if (shop) {
      const { data: rows } = await supabase
        .from('user_meal_plans')
        .select('id, week_start_date, meal_plan_data')
        .eq('user_id', household.ownerId)
        .order('week_start_date', { ascending: false })
        .limit(12)
      const siblings = (rows ?? []).filter((row) => sameShop(parseShop(row.meal_plan_data), shop))
      const grids: Record<string, CookAheadGrid> = {}
      const locksByWeek: Record<string, Record<string, boolean>> = {}
      for (const row of siblings) {
        const parsed = parseMealPlanData(row.meal_plan_data)
        const start = String(row.week_start_date).slice(0, 10)
        grids[start] = parsed.grid
        locksByWeek[start] = parsed.slotLocks
      }
      const planStart = String(plan.week_start_date).slice(0, 10)
      grids[planStart] = grid
      locksByWeek[planStart] = slotLocks
      const slots = buildPlannerDays(planStart, shop).map((plannerDay) => ({
        date: plannerDay.id,
        dayKey: plannerDay.dayKey,
        weekStart: plannerDay.weekStartDate,
      }))
      const sourceDate = slots.find((slot) => slot.weekStart === planStart && slot.dayKey === day)?.date
      if (!sourceDate) {
        return NextResponse.json({ error: 'Dagen ligger ikke i indkøbet' }, { status: 400 })
      }
      const nextGrids = applyCookAheadOnDates(grids, slots, sourceDate, meal as MealType, days, (week, d, m) =>
        Boolean(locksByWeek[week]?.[`${d}_${m}`])
      )
      const shoppingList = await rebuildShoppingListForUser(
        supabase,
        household.ownerId,
        (nextGrids[planStart] ?? grid) as any,
        { shop, weekStartDate: planStart }
      )
      for (const row of siblings) {
        const start = String(row.week_start_date).slice(0, 10)
        const nextGrid = nextGrids[start]
        if (!nextGrid) continue
        const { error: updateError } = await supabase
          .from('user_meal_plans')
          .update({
            meal_plan_data: mealPlanDataKeepingMeta(row.meal_plan_data, nextGrid, locksByWeek[start] ?? {}),
            ...(shoppingList != null ? { shopping_list: shoppingList } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        if (updateError) {
          return NextResponse.json({ error: 'Failed to update meal plan' }, { status: 500 })
        }
      }
      return NextResponse.json({ success: true })
    }

    const nextGrid = applyCookAhead(grid, day, meal as MealType, days, (d, m) =>
      Boolean(slotLocks[`${d}_${m}`])
    )
    const shoppingList = await rebuildShoppingListForUser(
      supabase,
      household.ownerId,
      nextGrid as any,
      { weekStartDate: plan.week_start_date }
    )

    const { error: updateError } = await supabase
      .from('user_meal_plans')
      .update({
        meal_plan_data: mealPlanDataKeepingMeta(plan.meal_plan_data, nextGrid, slotLocks),
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
