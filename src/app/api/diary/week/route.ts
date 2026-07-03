import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import {
  FOOD_LOG_ENTRY_SELECT,
  buildDiaryDayPayload,
  datesInRange,
  isValidIsoDate,
} from '@/lib/diary-day-aggregate'
import { computeDailyTargets } from '@/lib/diary/targets'

export const dynamic = 'force-dynamic'

const MAX_DAYS = 31

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

/**
 * Hent flere dage i ét kald (ét DB-query) — bruges af ugentligt ernæringstilbageblik
 * i stedet for N parallelle /api/diary/day-kald.
 *
 * GET /api/diary/week?start=YYYY-MM-DD&days=14
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    if (!start || !isValidIsoDate(start)) {
      return NextResponse.json({ error: 'Ugyldig start-dato (start=YYYY-MM-DD)' }, { status: 400 })
    }

    const days = Math.min(
      MAX_DAYS,
      Math.max(1, Number.parseInt(searchParams.get('days') ?? '7', 10) || 7)
    )
    const adultIndex = Number.parseInt(searchParams.get('adultIndex') ?? '0', 10) || 0
    const dateList = datesInRange(start, days)
    const end = dateList[dateList.length - 1]

    const [{ data: entries, error }, target] = await Promise.all([
      supabase
        .from('food_log_entries')
        .select(FOOD_LOG_ENTRY_SELECT)
        .eq('user_id', user.id)
        .gte('logged_date', start)
        .lte('logged_date', end)
        .order('logged_date', { ascending: true })
        .order('created_at', { ascending: true }),
      computeDailyTargets(supabase, user.id, adultIndex),
    ])

    if (error) {
      console.error('diary/week entries', error)
      return NextResponse.json({ error: 'Kunne ikke hente uge', details: error.message }, { status: 500 })
    }

    const byDate = new Map<string, Array<Record<string, unknown>>>()
    for (const row of entries ?? []) {
      const d = String((row as { logged_date?: string }).logged_date ?? '')
      if (!d) continue
      const list = byDate.get(d) ?? []
      list.push(row as Record<string, unknown>)
      byDate.set(d, list)
    }

    const items = dateList.map((date) => buildDiaryDayPayload(date, byDate.get(date) ?? [], target))

    return NextResponse.json({
      success: true,
      start,
      end,
      days,
      target,
      items,
    })
  } catch (e) {
    console.error('diary/week GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
