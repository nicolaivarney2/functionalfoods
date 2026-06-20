import { NextRequest, NextResponse } from 'next/server'

import { mealPlanGenerator } from '@/lib/meal-plan-system'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type MealType = 'breakfast' | 'lunch' | 'dinner'

const DAY_KEYS: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function emptyGrid(): Record<DayKey, Record<MealType, unknown | null>> {
  return DAY_KEYS.reduce((acc, day) => {
    acc[day] = { breakfast: null, lunch: null, dinner: null }
    return acc
  }, {} as Record<DayKey, Record<MealType, unknown | null>>)
}

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** Udled børnenes aldersbånd (fallback til '4-9' hvis ikke sat), så generatoren altid får et array. */
function effectiveChildrenAges(children: number, raw: unknown): string[] {
  const arr = Array.isArray(raw) ? (raw as string[]) : []
  if (arr.length >= children) return arr.slice(0, Math.max(0, children))
  return [...arr, ...Array.from({ length: children - arr.length }, () => '4-9')]
}

/**
 * Genererer en uges madplan server-side ud fra brugerens gemte familieprofil
 * (family_profiles) + voksen-profiler (adult_weight_loss_profiles, der bærer
 * kostretning/vægtmål pr. voksen) og persisterer i user_meal_plans.
 *
 * Web kører generatoren i browseren (madbudget/page.tsx). Appen kan ikke det, så
 * vi genbruger samme generator (mealPlanGenerator) her med samme input-form, så
 * app og web deler præcis samme logik og output-format.
 *
 * Body (valgfrit): { variationLevel?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Bearer-auth (appen sender altid Authorization: Bearer <access_token>).
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Hent gemt familieprofil.
    const { data: profile, error: profileError } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('generate: kunne ikke hente familieprofil:', profileError)
      return NextResponse.json({ error: 'Failed to load family profile' }, { status: 500 })
    }
    if (!profile) {
      return NextResponse.json(
        { error: 'No family profile', message: 'Opret en familieprofil før du genererer en madplan.' },
        { status: 400 }
      )
    }

    // Hent voksen-profiler (kostretning/vægtmål pr. voksen). Tom liste = generatoren
    // falder tilbage til standard-kostretning.
    const { data: adultRows } = await supabase
      .from('adult_weight_loss_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('adult_index')

    const adultsProfiles = (adultRows ?? []).map((p) => ({
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

    const body = await request.json().catch(() => ({}))
    const variationLevel =
      typeof body?.variationLevel === 'number' ? body.variationLevel : profile.variation_level ?? 2

    const childrenAges = effectiveChildrenAges(profile.children ?? 0, profile.children_ages)

    // Kør generatoren (samme input-form som web's klient-flow).
    const weekPlan = await mealPlanGenerator.generateOneWeekMealPlan(
      {
        adults: profile.adults ?? 2,
        children: profile.children ?? 0,
        childrenAges,
        adultsProfiles: adultsProfiles as any,
        excludedIngredients: profile.excluded_ingredients ?? [],
        selectedStores: profile.selected_stores ?? [],
        prioritizeOrganic: profile.prioritize_organic === true,
        prioritizeAnimalOrganic: profile.prioritize_animal_organic === true,
      },
      variationLevel
    )

    // WeekPlan → v2 grid (samme cell-form som planomo-app'ens meal-plan.ts forventer).
    const grid = emptyGrid()
    weekPlan.days.forEach((dayPlan, dayIndex) => {
      const dayKey = DAY_KEYS[dayIndex]
      if (!dayKey) return
      dayPlan.meals.forEach((meal) => {
        const mealType = meal.mealType as MealType
        if (!mealType || !grid[dayKey]) return
        const recipe = meal.recipe as any
        grid[dayKey][mealType] = {
          id: recipe.id,
          slug: recipe.slug || '',
          title: recipe.title,
          image: recipe.images?.[0] || '',
          ingredients: (recipe.ingredients ?? []).map((ing: any) => ({
            name: ing.name || ing.ingredientName,
            amount: ing.amount,
            unit: ing.unit,
          })),
          servings: meal.servings,
          recipeBaseServings: recipe.servings,
          prepTime: recipe.prepTime ? `${recipe.prepTime} min` : '30 min',
          category: recipe.categories?.[0] || 'Dinner',
          dietaryTags: recipe.dietaryApproaches || [],
          calories: meal.adjustedCalories,
          protein: meal.adjustedProtein,
          carbs: meal.adjustedCarbs,
          fat: meal.adjustedFat,
          fiber: meal.adjustedFiber,
          vitamins: meal.adjustedVitamins,
          minerals: meal.adjustedMinerals,
        }
      })
    })

    // Uge-datoer (mandag–søndag for indeværende uge).
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // mandag
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekStartDate = weekStart.toISOString().split('T')[0]
    const weekEndDate = weekEnd.toISOString().split('T')[0]
    const weekNumber = isoWeekNumber(weekStart)

    const mealPlanData = { v: 2 as const, grid, slotLocks: {} }
    const familyProfileSnapshot = {
      adults: profile.adults,
      children: profile.children,
      childrenAges,
      children_ages: childrenAges,
      adultsProfiles,
      selectedStores: profile.selected_stores,
    }

    // Persistér (deaktiver tidligere, upsert på (user_id, week_start_date)).
    await supabase
      .from('user_meal_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    const { data: existing } = await supabase
      .from('user_meal_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate)
      .single()

    const rowValues = {
      name: `Madplan Uge ${weekNumber} (${weekStartDate})`,
      week_end_date: weekEndDate,
      week_number: weekNumber,
      variation_level: variationLevel,
      family_profile_snapshot: familyProfileSnapshot,
      meal_plan_data: mealPlanData,
      shopping_list: weekPlan.shoppingList,
      total_cost: null,
      total_savings: null,
      estimated_calories_per_day: null,
      is_active: true,
    }

    let saved
    let saveError
    if (existing) {
      const { data, error } = await supabase
        .from('user_meal_plans')
        .update({ ...rowValues, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      saved = data
      saveError = error
    } else {
      const { data, error } = await supabase
        .from('user_meal_plans')
        .insert({ user_id: user.id, week_start_date: weekStartDate, ...rowValues })
        .select()
        .single()
      saved = data
      saveError = error
    }

    if (saveError) {
      console.error('generate: kunne ikke gemme madplan:', saveError)
      return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: saved })
  } catch (error) {
    console.error('Error in POST /api/madbudget/meal-plan/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
