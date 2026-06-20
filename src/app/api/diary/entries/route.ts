import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'

export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || todayUtc()
    if (!isValidDate(date)) return NextResponse.json({ error: 'Ugyldig dato' }, { status: 400 })

    const { data, error } = await supabase
      .from('food_log_entries')
      .select('id, logged_date, meal_type, source, recipe_id, recipe_slug, title, image_url, servings, calories, protein, carbs, fat, fiber, created_at')
      .eq('user_id', user.id)
      .eq('logged_date', date)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('food_log_entries GET', error)
      return NextResponse.json({ error: 'Kunne ikke hente madlog', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, date, data: data ?? [] })
  } catch (e) {
    console.error('diary/entries GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const source = body.source === 'manual' ? 'manual' : 'recipe'
    const servings = Math.max(0.1, num(body.servings, 1))

    // Indkommende næring er pr. portion → gem totaler (gange antal portioner) som snapshot.
    const calories = Math.round(num(body.calories) * servings)
    const protein = body.protein != null ? round1(num(body.protein) * servings) : null
    const carbs = body.carbs != null ? round1(num(body.carbs) * servings) : null
    const fat = body.fat != null ? round1(num(body.fat) * servings) : null
    const fiber = body.fiber != null ? round1(num(body.fiber) * servings) : null

    const { data, error } = await supabase
      .from('food_log_entries')
      .insert({
        user_id: user.id,
        logged_date: date,
        meal_type: mealType,
        source,
        recipe_id: body.recipeId != null ? String(body.recipeId) : null,
        recipe_slug: body.recipeSlug != null ? String(body.recipeSlug) : null,
        title,
        image_url: typeof body.imageUrl === 'string' ? body.imageUrl : null,
        servings,
        calories,
        protein,
        carbs,
        fat,
        fiber,
      })
      .select('id, logged_date, meal_type, source, recipe_id, recipe_slug, title, image_url, servings, calories, protein, carbs, fat, fiber, created_at')
      .single()

    if (error) {
      console.error('food_log_entries POST', error)
      return NextResponse.json({ error: 'Kunne ikke gemme', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('diary/entries POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 })

    const { error } = await supabase
      .from('food_log_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)

    if (error) {
      console.error('food_log_entries DELETE', error)
      return NextResponse.json({ error: 'Kunne ikke slette', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('diary/entries DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
