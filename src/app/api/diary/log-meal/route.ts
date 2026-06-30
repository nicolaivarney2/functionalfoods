import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { nutritionForProvisionalMeal } from '@/lib/provisional-nutrition'
import { sanitizeIngredients } from '@/lib/provisional-recipes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const
type MealType = (typeof MEAL_TYPES)[number]

function todayUtc(): string {
  return new Date().toISOString().split('T')[0]
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

/**
 * Log et måltid direkte i dagbogen ud fra ingrediensliste.
 * Beregner ernæring server-side (Frida) — kræver ikke gemt opskrift.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))

    const mealType = String(body.mealType ?? '') as MealType
    if (!MEAL_TYPES.includes(mealType)) {
      return NextResponse.json({ error: 'Ugyldigt måltid' }, { status: 400 })
    }

    const date = typeof body.date === 'string' && isValidDate(body.date) ? body.date : todayUtc()
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
    if (!title) return NextResponse.json({ error: 'Mangler titel' }, { status: 400 })

    const ingredients = sanitizeIngredients(body.ingredients)
    const servings = Math.max(0.1, num(body.servings, 1))
    const portionsLogged = Math.max(0.1, num(body.portionsLogged ?? body.servings, 1))

    const { nutrition, matchedIngredients, totalIngredients, source } = await nutritionForProvisionalMeal(
      ingredients,
      servings,
      body.aiFallback ?? null
    )

    const perPortion = {
      calories: num(nutrition.calories),
      protein: nutrition.protein != null ? num(nutrition.protein) : null,
      carbs: nutrition.carbs != null ? num(nutrition.carbs) : null,
      fat: nutrition.fat != null ? num(nutrition.fat) : null,
      fiber: nutrition.fiber != null ? num(nutrition.fiber) : null,
    }

    if (perPortion.calories <= 0 && matchedIngredients === 0) {
      return NextResponse.json(
        {
          error: 'Kunne ikke beregne ernæring',
          details: 'Tilføj ingredienser med mængde, eller angiv kcal manuelt.',
        },
        { status: 400 }
      )
    }

    const calories = Math.round(perPortion.calories * portionsLogged)
    const protein = perPortion.protein != null ? round1(perPortion.protein * portionsLogged) : null
    const carbs = perPortion.carbs != null ? round1(perPortion.carbs * portionsLogged) : null
    const fat = perPortion.fat != null ? round1(perPortion.fat * portionsLogged) : null
    const fiber = perPortion.fiber != null ? round1(perPortion.fiber * portionsLogged) : null

    const provisionalId = typeof body.provisionalId === 'string' ? body.provisionalId : null

    const { data, error } = await supabase
      .from('food_log_entries')
      .insert({
        user_id: user.id,
        logged_date: date,
        meal_type: mealType,
        source: 'manual',
        recipe_id: provisionalId,
        recipe_slug: null,
        title,
        image_url: typeof body.imageUrl === 'string' ? body.imageUrl : null,
        servings: portionsLogged,
        calories,
        protein,
        carbs,
        fat,
        fiber,
      })
      .select(
        'id, logged_date, meal_type, source, recipe_id, recipe_slug, title, image_url, servings, calories, protein, carbs, fat, fiber, created_at'
      )
      .single()

    if (error) {
      console.error('diary/log-meal insert', error)
      return NextResponse.json({ error: 'Kunne ikke logge måltid', details: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      nutrition: {
        perPortion,
        logged: { calories, protein, carbs, fat, fiber },
        matchedIngredients,
        totalIngredients,
        source,
      },
    })
  } catch (e) {
    console.error('diary/log-meal POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
