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
  leftoverFromDay?: unknown
  isLeftover?: unknown
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
    const { loadHouseholdForUser } = await import('@/lib/household-access')
    const household = await loadHouseholdForUser(user)
    if (!household) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ownerId = household.ownerId

    const body = await request.json().catch(() => ({}))
    const mealPlanId = typeof body.mealPlanId === 'string' ? body.mealPlanId : null
    /** Kun opdatér dagbog fra denne dato (YYYY-MM-DD) — bruges ved swap/fjern fremad i ugen. */
    const fromDate =
      typeof body.fromDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.fromDate)
        ? body.fromDate
        : null
    /** Foretræk plan der dækker denne dato (fx den uge brugeren kigger på i dagbogen). */
    const preferDate =
      typeof body.preferDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.preferDate)
        ? body.preferDate
        : null
    /** true = ny genereret plan (slet og skriv forfra). false = åbning/fill: kun manglende slots. */
    const replaceAll = body.replaceAll === true || body.mode === 'replace'
    /** Opdatér eksisterende madplan-slots (fx efter skift af ret), men rør ikke manuelt fjernede. */
    const updateExisting = body.mode === 'update' || body.updateExisting === true

    type PlanRow = {
      id: string
      week_start_date: string
      week_end_date: string | null
      meal_plan_data: unknown
      is_active?: boolean
    }

    const countMealsInPlan = (raw: unknown): number => {
      const grid = extractGrid(raw)
      let n = 0
      for (const day of PLAN_DAYS) {
        const dayObj = grid[day]
        if (!dayObj) continue
        for (const meal of PLAN_MEALS) {
          const cell = dayObj[meal] as Cell | null
          if (cell?.title) n += 1
        }
      }
      return n
    }

    let plan: PlanRow | null = null

    if (mealPlanId) {
      const { data, error: planErr } = await supabase
        .from('user_meal_plans')
        .select('id, week_start_date, week_end_date, meal_plan_data, is_active')
        .eq('user_id', ownerId)
        .eq('id', mealPlanId)
        .maybeSingle()
      if (planErr) {
        console.error('sync-meal-plan load', planErr)
        return NextResponse.json({ error: 'Kunne ikke hente madplan', details: planErr.message }, { status: 500 })
      }
      plan = data
    } else {
      // Hent seneste planer og vælg smart: 1) dækker preferDate, 2) aktiv med mad, 3) nyeste med mad.
      const { data: planRows, error: planErr } = await supabase
        .from('user_meal_plans')
        .select('id, week_start_date, week_end_date, meal_plan_data, is_active')
        .eq('user_id', ownerId)
        .order('week_start_date', { ascending: false })
        .limit(20)
      if (planErr) {
        console.error('sync-meal-plan load', planErr)
        return NextResponse.json({ error: 'Kunne ikke hente madplan', details: planErr.message }, { status: 500 })
      }
      const plans = (planRows ?? []) as PlanRow[]
      const withEnd = plans.map((p) => ({
        ...p,
        week_end_date: p.week_end_date || addDays(p.week_start_date, 6),
      }))

      if (preferDate) {
        plan =
          withEnd.find(
            (p) => p.week_start_date <= preferDate && preferDate <= (p.week_end_date as string)
          ) ?? null
      }
      if (!plan || countMealsInPlan(plan.meal_plan_data) === 0) {
        const active = withEnd.find((p) => p.is_active && countMealsInPlan(p.meal_plan_data) > 0)
        const recentWithMeals = withEnd.find((p) => countMealsInPlan(p.meal_plan_data) > 0)
        plan = active ?? recentWithMeals ?? withEnd.find((p) => p.is_active) ?? withEnd[0] ?? null
      }
    }

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
        if (cell.leftoverFromDay || cell.isLeftover === true) continue
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

    const rangeStart = fromDate && fromDate > weekStart ? fromDate : weekStart

    const { data: existingSlots, error: existErr } = await supabase
      .from('food_log_entries')
      .select('logged_date, meal_type, source')
      .eq('user_id', user.id)
      .in('source', ['meal-plan', 'meal-plan-dismissed'])
      .gte('logged_date', rangeStart)
      .lte('logged_date', weekEnd)
    if (existErr) {
      console.error('sync-meal-plan existing', existErr)
      return NextResponse.json({ error: 'Kunne ikke læse dagbogen', details: existErr.message }, { status: 500 })
    }

    const occupied = new Set<string>()
    const dismissed = new Set<string>()
    for (const row of existingSlots ?? []) {
      const key = `${row.logged_date}:${row.meal_type}`
      if (row.source === 'meal-plan-dismissed') dismissed.add(key)
      else occupied.add(key)
    }

    let delErr
    if (replaceAll) {
      const sources = ['meal-plan', 'meal-plan-dismissed']
      if (fromDate) {
        ({ error: delErr } = await supabase
          .from('food_log_entries')
          .delete()
          .eq('user_id', user.id)
          .in('source', sources)
          .eq('meal_plan_id', plan.id)
          .gte('logged_date', rangeStart)
          .lte('logged_date', weekEnd))
      } else {
        await supabase
          .from('food_log_entries')
          .delete()
          .eq('user_id', user.id)
          .in('source', sources)
          .eq('meal_plan_id', plan.id)
        ;({ error: delErr } = await supabase
          .from('food_log_entries')
          .delete()
          .eq('user_id', user.id)
          .in('source', sources)
          .gte('logged_date', weekStart)
          .lte('logged_date', weekEnd))
      }
      if (delErr) {
        console.error('sync-meal-plan delete', delErr)
        return NextResponse.json({ error: 'Kunne ikke rydde gamle madplan-entries', details: delErr.message }, { status: 500 })
      }
    }

    const dedupedRows: Record<string, unknown>[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      const slotKey = `${row.logged_date}:${row.meal_type}`
      const key = `${slotKey}:${row.recipe_id ?? row.title}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!replaceAll) {
        if (dismissed.has(slotKey)) continue
        if (occupied.has(slotKey) && !updateExisting) continue
      }
      dedupedRows.push(row)
    }

    if (updateExisting && !replaceAll && dedupedRows.length) {
      const dates = [...new Set(dedupedRows.map((r) => String(r.logged_date)))]
      const meals = [...new Set(dedupedRows.map((r) => String(r.meal_type)))]
      const { error: updDelErr } = await supabase
        .from('food_log_entries')
        .delete()
        .eq('user_id', user.id)
        .eq('source', 'meal-plan')
        .in('logged_date', dates)
        .in('meal_type', meals)
      if (updDelErr) {
        console.error('sync-meal-plan update-delete', updDelErr)
        return NextResponse.json({ error: 'Kunne ikke opdatere dagbogen', details: updDelErr.message }, { status: 500 })
      }
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
