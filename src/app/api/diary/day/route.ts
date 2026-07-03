import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { computeDailyTargets } from '@/lib/diary/targets'
import { aggregateEntryMicros } from '@/lib/diary-food-log-micro'

export const dynamic = 'force-dynamic'

function todayUtc(): string {
  return new Date().toISOString().split('T')[0]
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

/**
 * Hele dagen i ét kald: dagens loggede måltider, summerede totaler og det daglige
 * mål (genbruger DietaryCalculator). Bruges af appens dagbogs-skærm.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || todayUtc()
    if (!isValidDate(date)) return NextResponse.json({ error: 'Ugyldig dato' }, { status: 400 })
    const adultIndex = Number.parseInt(searchParams.get('adultIndex') ?? '0', 10) || 0

    const [{ data: entries, error }, target] = await Promise.all([
      supabase
        .from('food_log_entries')
        .select('id, logged_date, meal_type, source, recipe_id, recipe_slug, title, image_url, servings, calories, protein, carbs, fat, fiber, vitamins, minerals, created_at')
        .eq('user_id', user.id)
        .eq('logged_date', date)
        .order('created_at', { ascending: true }),
      computeDailyTargets(supabase, user.id, adultIndex),
    ])

    if (error) {
      console.error('diary/day entries', error)
      return NextResponse.json({ error: 'Kunne ikke hente dag', details: error.message }, { status: 500 })
    }

    const totals = (entries ?? []).reduce(
      (acc: { calories: number; protein: number; carbs: number; fat: number; fiber: number }, e: any) => {
        acc.calories += Number(e.calories) || 0
        acc.protein += Number(e.protein) || 0
        acc.carbs += Number(e.carbs) || 0
        acc.fat += Number(e.fat) || 0
        acc.fiber += Number(e.fiber) || 0
        return acc
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    )
    totals.calories = Math.round(totals.calories)
    totals.protein = Math.round(totals.protein)
    totals.carbs = Math.round(totals.carbs)
    totals.fat = Math.round(totals.fat)
    totals.fiber = Math.round(totals.fiber)

    const microTotals = aggregateEntryMicros(entries ?? [])

    return NextResponse.json({
      success: true,
      date,
      target,
      totals: { ...totals, vitamins: microTotals.vitamins, minerals: microTotals.minerals },
      entries: entries ?? [],
    })
  } catch (e) {
    console.error('diary/day GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
