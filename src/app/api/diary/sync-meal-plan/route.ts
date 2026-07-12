import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { prepareStoredMicros } from '@/lib/diary-food-log-micro'

export const dynamic = 'force-dynamic'

const PLAN_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const PLAN_MEALS = ['breakfast', 'lunch', 'dinner'] as const

type Cell = {
  id?: string
  slug?: string
  title?: string
  image?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** meal_plan_data er { grid, … } eller legacy (dag-nøgler i toppen). */
function extractGrid(raw: unknown): Record<string, Record<string, Cell | null>> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  if ('grid' in o && o.grid && typeof o.grid === 'object') return o.grid as any
  if ('monday' in o) return o as any
  return {}
}

/** weekStartDate (mandag) + offset dage → 'YYYY-MM-DD' (UTC, undgår TZ-drift). */
function addDays(weekStartDate: string, days: number): string {
  const d = new Date(`${weekStartDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const mealPlanId = typeof body.mealPlanId === 'string' ? body.mealPlanId : null
    /** Kun opdatér dagbog fra denne dato (YYYY-MM-DD) — bruges ved swap/fjern fremad i ugen. */
    const fromDate =
      typeof body.fromDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fromDate)
        ? body.fromDate
        : null

    // Hent planen (specifik eller aktiv).
    let query = supabase
      .from('user_meal_plans')
      .select('id, week_start_date, week_end_date, meal_plan_data')
      .eq('user_id', user.id)
    query = mealPlanId
      ? query.eq('id', mealPlanId)
      : query.eq('is_active', true).order('week_start_date', { ascending: false }).limit(1)

    const { data: planRows, error: planErr } = await query
    if (planErr) {
      console.error('sync-meal-plan load', planErr)
      return NextResponse.json({ error: 'Kunne ikke hente madplan', details: planErr.message }, { status: 500 })
    }
    const plan = Array.isArray(planRows) ? planRows[0] : planRows
    if (!plan) return NextResponse.json({ error: 'Ingen madplan fundet' }, { status: 404 })

    const weekStart = plan.week_start_date as string
    if (!weekStart) return NextResponse.json({ error: 'Madplan mangler startdato' }, { status: 400 })
    const weekEnd = (plan.week_end_date as string) || addDays(weekStart, 6)

    const grid = extractGrid(plan.meal_plan_data)

    // Byg entries for alle dage/måltider planen dækker.
    const rows: Record<string, unknown>[] = []
    PLAN_DAYS.forEach((day, dayIdx) => {
      const dayObj = grid[day]
      if (!dayObj || typeof dayObj !== 'object') return
      const loggedDate = addDays(weekStart, dayIdx)
      if (fromDate && loggedDate < fromDate) return
      for (const meal of PLAN_MEALS) {
        const cell = dayObj[meal] as Cell | null
        if (!cell || !cell.title) continue
        const micro = prepareStoredMicros(cell.vitamins, cell.minerals, 1)
        rows.push({
          user_id: user.id,
          logged_date: loggedDate,
          meal_type: meal,
          source: 'meal-plan',
          meal_plan_id: plan.id,
          recipe_id: cell.id != null ? String(cell.id) : null,
          recipe_slug: cell.slug != null ? String(cell.slug) : null,
          title: String(cell.title).slice(0, 200),
          image_url: typeof cell.image === 'string' ? cell.image : null,
          servings: 1,
          // Næring er pr. portion; servings=1 → snapshot = celleværdier.
          calories: Math.round(num(cell.calories)),
          protein: cell.protein != null ? round1(num(cell.protein)) : null,
          carbs: cell.carbs != null ? round1(num(cell.carbs)) : null,
          fat: cell.fat != null ? round1(num(cell.fat)) : null,
          fiber: cell.fiber != null ? round1(num(cell.fiber)) : null,
          vitamins: micro.vitamins,
          minerals: micro.minerals,
        })
      }
    })

    // Erstat tidligere madplan-entries (bevarer manuelle logninger).
    const deleteFrom = fromDate && fromDate > weekStart ? fromDate : weekStart;
    let delErr;
    if (fromDate) {
      ({ error: delErr } = await supabase
        .from('food_log_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('source', 'meal-plan')
        .eq('meal_plan_id', plan.id)
        .gte('logged_date', deleteFrom)
        .lte('logged_date', weekEnd));
    } else {
      await supabase
        .from('food_log_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('source', 'meal-plan')
        .eq('meal_plan_id', plan.id);

      ({ error: delErr } = await supabase
        .from('food_log_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('source', 'meal-plan')
        .gte('logged_date', weekStart)
        .lte('logged_date', weekEnd));
    }
    if (delErr) {
      console.error('sync-meal-plan delete', delErr)
      return NextResponse.json({ error: 'Kunne ikke rydde gamle madplan-entries', details: delErr.message }, { status: 500 })
    }

    const dedupedRows: Record<string, unknown>[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      const key = `${row.logged_date}:${row.meal_type}:${row.recipe_id ?? row.title}`
      if (seen.has(key)) continue
      seen.add(key)
      dedupedRows.push(row)
    }

    if (!dedupedRows.length) {
      return NextResponse.json({ success: true, inserted: 0, weekStart, weekEnd })
    }

    const { error: insErr } = await supabase.from('food_log_entries').insert(dedupedRows)
    if (insErr) {
      console.error('sync-meal-plan insert', insErr)
      return NextResponse.json({ error: 'Kunne ikke kopiere madplan til dagbog', details: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, inserted: dedupedRows.length, weekStart, weekEnd })
  } catch (e) {
    console.error('diary/sync-meal-plan POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
