import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { assertDiaryWriteAllowed, SubscriptionLimitError } from '@/lib/subscription-entitlements'
import { prepareStoredMicros } from '@/lib/diary-food-log-micro'
import {
  reconcileMealPlanDiary,
  type DiarySyncDesired,
  type DiarySyncExisting,
  type DiarySyncMode,
} from '@/lib/diary-meal-plan-sync'
import { parseShop, sameShop } from '@/lib/madbudget/meal-plan-span'
import { addIsoDays } from '@/lib/madbudget/week-dates'

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

    try {
      await assertDiaryWriteAllowed(supabase, ownerId)
    } catch (err) {
      if (err instanceof SubscriptionLimitError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 402 })
      }
      throw err
    }

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
    /** fill = kun tomme slots. update = skift i planen. sync = dagbogen følger planen. replace = ny plan. */
    const mode: DiarySyncMode =
      body.mode === 'replace' || body.replaceAll === true
        ? 'replace'
        : body.mode === 'sync'
          ? 'sync'
          : body.mode === 'update' || body.updateExisting === true
            ? 'update'
            : 'fill'

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
      // Uden mealPlanId: planen der dækker preferDate. Uden dato: aktiv plan med mad, ellers nyeste med mad.
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
        // Kun den plan der faktisk dækker dagen i dagbogen. En ældre plan der
        // stadig står som aktiv (fx sidste måned) må ikke hoppe ind i ugen.
        plan =
          withEnd.find(
            (p) => p.week_start_date <= preferDate && preferDate <= (p.week_end_date as string)
          ) ?? null
        if (!plan) {
          return NextResponse.json({ success: true, inserted: 0 })
        }
      } else if (!plan || countMealsInPlan(plan.meal_plan_data) === 0) {
        const active = withEnd.find((p) => p.is_active && countMealsInPlan(p.meal_plan_data) > 0)
        const recentWithMeals = withEnd.find((p) => countMealsInPlan(p.meal_plan_data) > 0)
        plan = active ?? recentWithMeals ?? withEnd.find((p) => p.is_active) ?? withEnd[0] ?? null
      }
    }

    if (!plan) return NextResponse.json({ error: 'Ingen madplan fundet' }, { status: 404 })

    const weekStart = plan.week_start_date as string
    if (!weekStart) return NextResponse.json({ error: 'Madplan mangler startdato' }, { status: 400 })
    const shop = parseShop(plan.meal_plan_data)
    let sources: PlanRow[] = [plan]
    if (shop) {
      const { data: siblingRows } = await supabase
        .from('user_meal_plans')
        .select('id, week_start_date, week_end_date, meal_plan_data, is_active')
        .eq('user_id', ownerId)
        .order('week_start_date', { ascending: true })
        .limit(12)
      const matched = ((siblingRows ?? []) as PlanRow[]).filter((row) =>
        sameShop(parseShop(row.meal_plan_data), shop)
      )
      if (matched.length) sources = matched
    }
    const weekEnd = shop ? addIsoDays(shop.date, shop.dayCount - 1) : (plan.week_end_date as string) || addDays(weekStart, 6)
    const spanStart = shop ? shop.date : weekStart

    const rows: Array<Record<string, unknown> & DiarySyncDesired> = []
    for (const source of sources) {
      const sourceStart = source.week_start_date as string
      const grid = extractGrid(source.meal_plan_data)
      PLAN_DAYS.forEach((day, dayIdx) => {
      const dayObj = grid[day]
      if (!dayObj || typeof dayObj !== 'object') return
      const loggedDate = addDays(sourceStart, dayIdx)
      if (shop && (loggedDate < shop.date || loggedDate > weekEnd)) return
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
          meal_plan_id: source.id,
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
    }

    const rangeStart = fromDate && fromDate > spanStart ? fromDate : spanStart

    const { data: existingSlots, error: existErr } = await supabase
      .from('food_log_entries')
      .select('id, logged_date, meal_type, source, recipe_id, title')
      .eq('user_id', user.id)
      .gte('logged_date', rangeStart)
      .lte('logged_date', weekEnd)
    if (existErr) {
      console.error('sync-meal-plan existing', existErr)
      return NextResponse.json({ error: 'Kunne ikke læse dagbogen', details: existErr.message }, { status: 500 })
    }

    const { deleteIds, insert } = reconcileMealPlanDiary({
      mode,
      desired: rows,
      existing: (existingSlots ?? []) as DiarySyncExisting[],
    })

    if (mode === 'replace') {
      const entrySources = ['meal-plan', 'meal-plan-dismissed']
      const planIds = sources.map((source) => source.id)
      const { error: planDelErr } = await supabase
        .from('food_log_entries')
        .delete()
        .eq('user_id', user.id)
        .in('source', entrySources)
        .in('meal_plan_id', planIds)
      if (planDelErr) {
        console.error('sync-meal-plan delete', planDelErr)
        return NextResponse.json(
          { error: 'Kunne ikke rydde gamle madplan-entries', details: planDelErr.message },
          { status: 500 }
        )
      }
    }

    if (deleteIds.length) {
      const { error: delErr } = await supabase
        .from('food_log_entries')
        .delete()
        .eq('user_id', user.id)
        .in('id', deleteIds)
      if (delErr) {
        console.error('sync-meal-plan delete', delErr)
        return NextResponse.json(
          { error: 'Kunne ikke rydde gamle madplan-entries', details: delErr.message },
          { status: 500 }
        )
      }
    }

    if (!insert.length) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        removed: deleteIds.length,
        weekStart,
        weekEnd,
      })
    }

    const { error: insErr } = await supabase.from('food_log_entries').insert(insert)
    if (insErr) {
      console.error('sync-meal-plan insert', insErr)
      return NextResponse.json({ error: 'Kunne ikke kopiere madplan til dagbog', details: insErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      inserted: insert.length,
      removed: deleteIds.length,
      weekStart,
      weekEnd,
    })
  } catch (e) {
    console.error('diary/sync-meal-plan POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
