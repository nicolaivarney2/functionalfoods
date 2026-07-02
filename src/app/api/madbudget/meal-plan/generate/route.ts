import { NextRequest, NextResponse } from 'next/server'

import { mealPlanGenerator } from '@/lib/meal-plan-system'
import { collectRecentlyUsedRecipeIds } from '@/lib/meal-plan-recent-recipes'
import {
  getWeekInfo,
  getWeekInfoByOffset,
  type MealPlanWeekTarget,
} from '@/lib/madbudget/week-dates'

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

function parseWeekTarget(raw: unknown): MealPlanWeekTarget {
  return raw === 'next' ? 'next' : 'current'
}

/** Udled børnenes aldersbånd (fallback til '4-9' hvis ikke sat), så generatoren altid får et array. */
function effectiveChildrenAges(children: number, raw: unknown): string[] {
  const arr = Array.isArray(raw) ? (raw as string[]) : []
  if (arr.length >= children) return arr.slice(0, Math.max(0, children))
  return [...arr, ...Array.from({ length: children - arr.length }, () => '4-9')]
}

/**
 * Børne-kulhydrat til aftensmaden: voksen-kostretninger (keto, sense, GLP-1 …) er
 * ofte lav-kulhydrat, men børn skal have et mættende tilbehør. Vi tilføjer 100 g
 * pasta/ris/bulgur pr. barn til hver aftensret (og dermed til indkøbslisten, der
 * bygges ud fra celle-ingredienserne). Roteres over ugen for variation.
 */
const KID_CARBS = ['Pasta (til børn)', 'Ris (til børn)', 'Bulgur (til børn)']

/**
 * Tilføjer 100 g kulhydrat pr. barn til hver aftensret (i grid-cellen) og lægger
 * den samlede mængde på indkøbslisten under en "Til børnene"-kategori.
 */
function appendKidCarbToDinners(
  grid: Record<DayKey, Record<MealType, unknown | null>>,
  childCount: number,
  shoppingList?: { categories?: { name: string; items: { name: string; amount: number; unit: string; notes?: string }[] }[] } | null
) {
  if (childCount <= 0) return
  const perCarb = new Map<string, number>()
  DAY_KEYS.forEach((dayKey, dayIndex) => {
    const cell = grid[dayKey]?.dinner
    if (!cell || typeof cell !== 'object') return
    const c = cell as Record<string, unknown>
    const carbName = KID_CARBS[dayIndex % KID_CARBS.length]
    const amount = 100 * childCount
    const ingredients = Array.isArray(c.ingredients) ? (c.ingredients as unknown[]) : []
    ingredients.push({ name: carbName, amount, unit: 'g', isKidCarb: true })
    c.ingredients = ingredients
    perCarb.set(carbName, (perCarb.get(carbName) ?? 0) + amount)
  })

  if (shoppingList && perCarb.size > 0) {
    const items = Array.from(perCarb.entries()).map(([name, amount]) => ({
      name,
      amount,
      unit: 'g',
      notes: 'Mættende tilbehør til børnene',
    }))
    const categories = Array.isArray(shoppingList.categories) ? shoppingList.categories : []
    categories.push({ name: 'Til børnene', items })
    shoppingList.categories = categories
  }
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
 * Body (valgfrit): { variationLevel?: number; targetWeek?: 'current' | 'next'; weekOffset?: number }
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

    const body = await request.json().catch(() => ({}))

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

    const variationLevel =
      typeof body?.variationLevel === 'number' ? body.variationLevel : profile.variation_level ?? 2
    const targetWeek = parseWeekTarget(body?.targetWeek)
    const weekInfo =
      typeof body?.weekOffset === 'number' && Number.isFinite(body.weekOffset)
        ? getWeekInfoByOffset(Math.max(0, Math.floor(body.weekOffset)))
        : getWeekInfo(targetWeek)

    const childrenAges = effectiveChildrenAges(profile.children ?? 0, profile.children_ages)

    const { data: recentPlans } = await supabase
      .from('user_meal_plans')
      .select('week_start_date, meal_plan_data, updated_at')
      .eq('user_id', user.id)
      .order('week_start_date', { ascending: false })
      .limit(4)

    const recentlyUsedRecipeIds = collectRecentlyUsedRecipeIds(recentPlans ?? [], weekInfo.weekStartDate)

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
        includedRecipeCategories: Array.isArray(profile.included_recipe_categories)
          ? profile.included_recipe_categories
          : [],
        recentlyUsedRecipeIds,
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
        // adjusted*-værdierne er husstands-total: (per-person måltidsmål) × (antal
        // personer der spiser). For at gemme næring PR. PERSON deler vi med
        // peopleEating — så summen af dagens måltider rammer den enkeltes dagsmål
        // (ikke husstands-totaler som ~6200 kcal/dag). At dele med `servings` ville
        // i stedet give opskriftens rå pr-portion-værdi, der ikke følger dagsmålet.
        const peopleEating = Math.max(
          1,
          ((meal as any).peopleEating as number) || meal.servings || 1
        )
        const perPortion = (v: number | null | undefined) =>
          v != null && Number.isFinite(v) ? v / peopleEating : v
        const perPortionMap = (obj: Record<string, unknown> | null | undefined) =>
          obj
            ? Object.fromEntries(
                Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' ? v / peopleEating : v])
              )
            : obj
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
          recipeServings: recipe.servings,
          recipeBaseServings: recipe.servings,
          prepTime: recipe.prepTime ? `${recipe.prepTime} min` : '30 min',
          category: recipe.categories?.[0] || 'Dinner',
          dietaryTags: recipe.dietaryApproaches || [],
          calories: perPortion(meal.adjustedCalories),
          protein: perPortion(meal.adjustedProtein),
          carbs: perPortion(meal.adjustedCarbs),
          fat: perPortion(meal.adjustedFat),
          fiber: perPortion(meal.adjustedFiber),
          vitamins: perPortionMap(meal.adjustedVitamins),
          minerals: perPortionMap(meal.adjustedMinerals),
        }
      })
    })

    // Børne-kulhydrat til aftensmaden (100 g pasta/ris/bulgur pr. barn) — også til indkøbslisten.
    appendKidCarbToDinners(grid, profile.children ?? 0, weekPlan.shoppingList as any)

    const { weekStartDate, weekEndDate, weekNumber } = weekInfo

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
