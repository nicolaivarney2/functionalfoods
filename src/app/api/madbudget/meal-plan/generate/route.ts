import { NextRequest, NextResponse } from 'next/server'

import { mealPlanGenerator } from '@/lib/meal-plan-system'
import { collectRecentlyUsedRecipeIds } from '@/lib/meal-plan-recent-recipes'
import type { CookAheadGrid } from '@/lib/madbudget/cook-ahead'
import {
  applyMealSlotStylesToGrids,
  inferBreakfastStyle,
  inferLunchStyle,
} from '@/lib/madbudget/meal-slot-style'
import { rebuildShoppingListForUser } from '@/lib/meal-plan-system/rebuild-shopping-list'
import { slimMealPlanRowForClient } from '@/lib/madbudget/meal-plan-client-payload'
import {
  getWeekInfo,
  getWeekInfoByOffset,
  groupSpanByCalendarWeek,
  localIsoDate,
  parseAnchoredShopDate,
  parseDayCount,
  type MealPlanWeekTarget,
} from '@/lib/madbudget/week-dates'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

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

type LeftoverIngredient = {
  ingredientId?: string
  name: string
  amount: number
  unit: string
}

/** Parse rester fra request-body. `body` er `any` fra `request.json()`, så kæden skal ikke køre på `any`. */
function parseAvailableIngredients(raw: unknown): LeftoverIngredient[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const parsed: LeftoverIngredient[] = []
  for (const it of raw) {
    if (!it || typeof it !== 'object') continue
    const row = it as { ingredientId?: unknown; name?: unknown; amount?: unknown; unit?: unknown }
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    const amount = Number(row.amount)
    if (!name || !Number.isFinite(amount) || amount <= 0) continue
    parsed.push({
      ingredientId:
        typeof row.ingredientId === 'string' && row.ingredientId.trim()
          ? row.ingredientId.trim()
          : undefined,
      name,
      amount,
      unit: typeof row.unit === 'string' && row.unit.trim() ? row.unit.trim() : 'g',
    })
  }
  return parsed
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

/** Samme børne-kulhydrat, men kun én gang på den delte indkøbsliste når spændet rammer flere uger. */
function appendKidCarbToSpan(
  grids: Array<Record<DayKey, Record<MealType, unknown | null>>>,
  childCount: number,
  shoppingList?: { categories?: { name: string; items: { name: string; amount: number; unit: string; notes?: string }[] }[] } | null
) {
  if (childCount <= 0) return
  const perCarb = new Map<string, number>()
  for (const grid of grids) {
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
  }
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
 * Body (valgfrit): { variationLevel?: number; targetWeek?: 'current' | 'next'; weekOffset?: number; shopDate?: string; dayCount?: number; availableIngredients?: [...] }
 * `shopDate` + `dayCount`: maden lægges fra indkøbsdagen og N dage frem, fordelt på de mandage dagene falder i.
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
    const { loadHouseholdForUser } = await import('@/lib/household-access')
    const household = await loadHouseholdForUser(user)
    if (!household) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const ownerId = household.ownerId

    const {
      assertMealPlanGenerationAllowed,
      getSubscriptionStatus,
      logMealPlanGeneration,
      SubscriptionLimitError,
    } = await import('@/lib/subscription-entitlements')
    const { syncStripeAccessForUser } = await import('@/lib/stripe-subscription-sync')

    try {
      const preview = await getSubscriptionStatus(supabase, ownerId)
      if (preview.stripeCustomerId) {
        try {
          await syncStripeAccessForUser(supabase, ownerId, preview.stripeCustomerId)
        } catch (syncError) {
          console.error('generate stripe sync', syncError)
        }
      }
      await assertMealPlanGenerationAllowed(supabase, ownerId)
    } catch (err) {
      if (err instanceof SubscriptionLimitError) {
        return NextResponse.json(
          { error: err.message, code: err.code, tier: err.tier, status: err.status },
          { status: 402 },
        )
      }
      throw err
    }

    const body = await request.json().catch(() => ({}))

    const [profileResult, adultResult, recentResult] = await Promise.all([
      supabase.from('family_profiles').select('*').eq('user_id', ownerId).single(),
      supabase
        .from('adult_weight_loss_profiles')
        .select('*')
        .eq('user_id', ownerId)
        .order('adult_index'),
      supabase
        .from('user_meal_plans')
        .select('week_start_date, meal_plan_data, updated_at')
        .eq('user_id', ownerId)
        .order('week_start_date', { ascending: false })
        .limit(8),
    ])

    const { data: profile, error: profileError } = profileResult

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
    const { data: adultRows } = adultResult

    const adultsProfiles = (adultRows ?? []).map((p) => ({
      gender: p.gender,
      age: p.age,
      height: p.height,
      weight: p.weight,
      activityLevel: p.activity_level,
      dietaryApproach: p.dietary_approach,
      mealsPerDay: Array.isArray(p.meals_per_day) ? p.meals_per_day : ['dinner'],
      breakfastStyle: p.breakfast_style,
      lunchStyle: p.lunch_style,
      weightGoal: p.weight_goal,
      excludedFoods: Array.isArray(p.excluded_foods) ? p.excluded_foods : [],
    }))

    const variationLevel =
      typeof body?.variationLevel === 'number' ? body.variationLevel : profile.variation_level ?? 2
    const availableIngredients = parseAvailableIngredients(body?.availableIngredients)
    const targetWeek = parseWeekTarget(body?.targetWeek)
    const shopDate = body?.shopDate != null ? parseAnchoredShopDate(body.shopDate) : null
    if (body?.shopDate != null && !shopDate) {
      return NextResponse.json(
        { error: 'Invalid shopDate', message: 'Indkøbsdagen skal være i går eller de næste tre uger.' },
        { status: 400 }
      )
    }
    let dayCount = 7
    if (shopDate) {
      if (body?.dayCount == null) {
        dayCount = 7
      } else {
        const parsedCount = parseDayCount(body.dayCount)
        if (parsedCount == null) {
          return NextResponse.json(
            { error: 'Invalid dayCount', message: 'Antal dage skal være mellem 1 og 14.' },
            { status: 400 }
          )
        }
        dayCount = parsedCount
      }
    }
    const weekInfo =
      typeof body?.weekOffset === 'number' && Number.isFinite(body.weekOffset)
        ? getWeekInfoByOffset(Math.max(0, Math.floor(body.weekOffset)))
        : getWeekInfo(targetWeek)
    const shopGroups = shopDate ? groupSpanByCalendarWeek(shopDate, dayCount) : null
    const currentWeekStarts = shopGroups?.map((group) => group.weekStartDate) ?? [weekInfo.weekStartDate]

    const childrenAges = effectiveChildrenAges(profile.children ?? 0, profile.children_ages)

    const { data: recentPlans } = recentResult

    const recentlyUsedRecipeIds = collectRecentlyUsedRecipeIds(recentPlans ?? [], currentWeekStarts)

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
        availableIngredients,
        planDayCount: shopGroups ? dayCount : 7,
      },
      variationLevel
    )

    // WeekPlan → v2 grid. Uden indkøbsdag: mandag–søndag. Med indkøbsdag fordeles
    // days[i] på kalenderdatoen indkøbsdag + i, og den dato bestemmer både ugedag og mandag-række.
    const grid = emptyGrid()
    const placeDay = (target: typeof grid, dayKey: DayKey, dayPlan: (typeof weekPlan.days)[number]) => {
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
        target[dayKey][mealType] = {
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
    }
    if (!shopGroups) {
      weekPlan.days.forEach((dayPlan, dayIndex) => {
        const dayKey = DAY_KEYS[dayIndex]
        if (!dayKey) return
        placeDay(grid, dayKey, dayPlan)
      })
      appendKidCarbToDinners(grid, profile.children ?? 0, weekPlan.shoppingList as any)
    }

    const { weekStartDate, weekEndDate, weekNumber } = weekInfo
    const shopMeta = shopDate ? { date: localIsoDate(shopDate), dayCount } : null

    const weeksToSave = shopGroups
      ? shopGroups.map((group) => {
          const weekGrid = emptyGrid()
          for (const day of group.days) {
            const dayPlan = weekPlan.days[day.offset]
            if (!dayPlan) continue
            placeDay(weekGrid, day.weekday, dayPlan)
          }
          return { ...group, grid: weekGrid }
        })
      : [{ weekStartDate, weekEndDate, weekNumber, days: [] as { date: string }[], grid }]

    if (shopGroups) {
      appendKidCarbToSpan(
        weeksToSave.map((week) => week.grid),
        profile.children ?? 0,
        weekPlan.shoppingList as any
      )
    }

    const owner = adultsProfiles[0] as
      | { mealsPerDay?: string[]; breakfastStyle?: unknown; lunchStyle?: unknown; dietaryApproach?: string }
      | undefined
    const styleProfile = {
      dietaryApproach: owner?.dietaryApproach,
      breakfastStyle: inferBreakfastStyle(owner?.mealsPerDay, owner?.breakfastStyle),
      lunchStyle: inferLunchStyle(owner?.mealsPerDay, owner?.lunchStyle),
    }
    const styledGrids = applyMealSlotStylesToGrids(
      weeksToSave.map((week) => week.grid as CookAheadGrid),
      styleProfile
    )
    for (let i = 0; i < weeksToSave.length; i += 1) {
      weeksToSave[i] = {
        ...weeksToSave[i],
        grid: (styledGrids[i] ?? weeksToSave[i].grid) as (typeof weeksToSave)[number]['grid'],
      }
    }
    const rebuiltList = await rebuildShoppingListForUser(supabase, ownerId, weeksToSave[0].grid as any, {
      shop: shopMeta,
      weekStartDate: weeksToSave[0].weekStartDate,
    })
    if (rebuiltList) weekPlan.shoppingList = rebuiltList as typeof weekPlan.shoppingList

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
      .eq('user_id', ownerId)
      .eq('is_active', true)

    const todayIso = localIsoDate(new Date())
    const activeWeekStart =
      shopGroups?.find((group) => group.days.some((day) => day.date === todayIso))?.weekStartDate ??
      weeksToSave[0].weekStartDate

    let saved: Record<string, unknown> | null = null
    const savedWeeks: Record<string, unknown>[] = []
    for (const group of weeksToSave) {
      const { data: existing } = await supabase
        .from('user_meal_plans')
        .select('id')
        .eq('user_id', ownerId)
        .eq('week_start_date', group.weekStartDate)
        .maybeSingle()

      const mealPlanData = {
        v: 2 as const,
        grid: group.grid,
        slotLocks: {},
        ...(shopMeta ? { shop: shopMeta } : {}),
      }
      const isActive = group.weekStartDate === activeWeekStart
      const rowValues = {
        name: `Madplan Uge ${group.weekNumber} (${group.weekStartDate})`,
        week_end_date: group.weekEndDate,
        week_number: group.weekNumber,
        variation_level: variationLevel,
        family_profile_snapshot: familyProfileSnapshot,
        meal_plan_data: mealPlanData,
        shopping_list: weekPlan.shoppingList,
        total_cost: null,
        total_savings: null,
        estimated_calories_per_day: null,
        is_active: isActive,
      }

      const write = existing
        ? await supabase
            .from('user_meal_plans')
            .update({ ...rowValues, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single()
        : await supabase
            .from('user_meal_plans')
            .insert({ user_id: ownerId, week_start_date: group.weekStartDate, ...rowValues })
            .select()
            .single()

      if (write.error) {
        console.error('generate: kunne ikke gemme madplan:', write.error)
        return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 })
      }
      if (write.data) savedWeeks.push(write.data)
      if (isActive) saved = write.data
    }

    if (!saved) {
      return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 })
    }

    await logMealPlanGeneration(supabase, user.id)

    return NextResponse.json({
      success: true,
      data: slimMealPlanRowForClient(saved),
      weeks: savedWeeks.map((row) => slimMealPlanRowForClient(row)),
    })
  } catch (error) {
    console.error('Error in POST /api/madbudget/meal-plan/generate:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
