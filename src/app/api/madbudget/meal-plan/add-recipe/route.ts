import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type DayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

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

function getCurrentWeekDates(): { weekStartDate: string; weekEndDate: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStartDate: monday.toISOString().slice(0, 10),
    weekEndDate: sunday.toISOString().slice(0, 10),
  }
}

function parseMealPlanData(raw: unknown): {
  grid: Record<DayKey, Record<MealType, unknown | null>>
  slotLocks: Record<string, boolean>
} {
  if (!raw || typeof raw !== 'object') {
    return { grid: emptyGrid(), slotLocks: {} }
  }
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

function mealSlotFromRecipe(
  recipe: Record<string, unknown>,
  meal: MealType,
): Record<string, unknown> {
  const image =
    (recipe.image_url as string) ||
    (recipe.imageUrl as string) ||
    (recipe.image as string) ||
    ''
  const totalTime = recipe.total_time as number | undefined
  const nutritionalInfo = recipe.nutritional_info as
    | { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }
    | undefined

  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    image,
    imageUrl: image,
    store: 'Tilbud denne uge',
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    servings: (recipe.servings as number) ?? (meal === 'breakfast' ? 2 : 4),
    prepTime: totalTime ? `${totalTime} min` : '30 min',
    category: recipe.main_category ?? recipe.mainCategory ?? null,
    dietaryTags: recipe.dietary_categories ?? recipe.dietaryCategories ?? [],
    mealType: meal,
    calories: recipe.calories ?? nutritionalInfo?.calories,
    protein: recipe.protein ?? nutritionalInfo?.protein,
    carbs: recipe.carbs ?? nutritionalInfo?.carbs,
    fat: recipe.fat ?? nutritionalInfo?.fat,
    fiber: recipe.fiber ?? nutritionalInfo?.fiber,
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const slug = body.slug as string | undefined
    const day = body.day as string | undefined
    const meal = (body.meal as string | undefined) ?? 'dinner'

    if (!slug || !day) {
      return NextResponse.json({ error: 'slug and day are required' }, { status: 400 })
    }
    if (!VALID_DAYS.has(day)) {
      return NextResponse.json({ error: 'Invalid day' }, { status: 400 })
    }
    if (!VALID_MEALS.has(meal)) {
      return NextResponse.json({ error: 'Invalid meal' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const { weekStartDate, weekEndDate } = getCurrentWeekDates()

    const { data: existingPlan } = await supabase
      .from('user_meal_plans')
      .select('id, meal_plan_data')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate)
      .maybeSingle()

    const { grid, slotLocks } = parseMealPlanData(existingPlan?.meal_plan_data)
    const dayKey = day as DayKey
    const mealKey = meal as MealType
    grid[dayKey][mealKey] = mealSlotFromRecipe(recipe, mealKey)
    slotLocks[`${dayKey}_${mealKey}`] = true

    const mealPlanData = { v: 2, grid, slotLocks }

    if (existingPlan) {
      const { error: updateError } = await supabase
        .from('user_meal_plans')
        .update({
          meal_plan_data: mealPlanData,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPlan.id)

      if (updateError) {
        console.error('add-recipe update:', updateError)
        return NextResponse.json({ error: 'Failed to update meal plan' }, { status: 500 })
      }
    } else {
      await supabase
        .from('user_meal_plans')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true)

      const { error: insertError } = await supabase.from('user_meal_plans').insert({
        user_id: user.id,
        name: `Madplan ${weekStartDate}`,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        meal_plan_data: mealPlanData,
        is_active: true,
      })

      if (insertError) {
        console.error('add-recipe insert:', insertError)
        return NextResponse.json({ error: 'Failed to create meal plan' }, { status: 500 })
      }
    }

    const dayLabels: Record<string, string> = {
      monday: 'mandag',
      tuesday: 'tirsdag',
      wednesday: 'onsdag',
      thursday: 'torsdag',
      friday: 'fredag',
      saturday: 'lørdag',
      sunday: 'søndag',
    }
    const mealLabels: Record<string, string> = {
      breakfast: 'morgenmad',
      lunch: 'frokost',
      dinner: 'aftenmad',
    }

    return NextResponse.json({
      success: true,
      message: `Opskrift tilføjet til ${dayLabels[day]} ${mealLabels[meal]}`,
    })
  } catch (err) {
    console.error('POST /api/madbudget/meal-plan/add-recipe:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
