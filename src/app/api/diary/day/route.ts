import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { computeDailyTargets } from '@/lib/diary/targets'
import {
  FOOD_LOG_ENTRY_SELECT,
  buildDiaryDayPayload,
  isValidIsoDate,
} from '@/lib/diary-day-aggregate'

export const dynamic = 'force-dynamic'

function todayUtc(): string {
  return new Date().toISOString().split('T')[0]
}

function isValidDate(value: string): boolean {
  return isValidIsoDate(value)
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
        .select(FOOD_LOG_ENTRY_SELECT)
        .eq('user_id', user.id)
        .eq('logged_date', date)
        .order('created_at', { ascending: true }),
      computeDailyTargets(supabase, user.id, adultIndex),
    ])

    if (error) {
      console.error('diary/day entries', error)
      return NextResponse.json({ error: 'Kunne ikke hente dag', details: error.message }, { status: 500 })
    }

    const payload = buildDiaryDayPayload(date, (entries ?? []) as Record<string, unknown>[], target)

    return NextResponse.json({ success: true, ...payload })
  } catch (e) {
    console.error('diary/day GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
