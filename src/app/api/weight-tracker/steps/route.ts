import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { isMissingTableError, missingWeightTrackerTablesResponse } from '@/lib/supabase-postgrest-error'

export const dynamic = 'force-dynamic'
const MAX_ADULT_INDEX = 9

function parseAdultIndex(value: string | null | undefined): number | null {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return null
  if (parsed < 0 || parsed > MAX_ADULT_INDEX) return null
  return parsed
}

function parseDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const adultIndex = parseAdultIndex(searchParams.get('adultIndex'))
    if (adultIndex == null) {
      return NextResponse.json({ error: 'Ugyldig adultIndex' }, { status: 400 })
    }

    const limit = Math.min(Math.max(Number.parseInt(searchParams.get('limit') ?? '90', 10) || 90, 1), 365)

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('step_log_entries')
      .select('id, adult_index, steps, active_kcal, logged_date, source, updated_at')
      .eq('user_id', user.id)
      .eq('adult_index', adultIndex)
      .order('logged_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('step_log_entries GET', error)
      if (isMissingTableError(error)) return missingWeightTrackerTablesResponse(error)
      return NextResponse.json({ error: 'Kunne ikke hente skridt', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (e) {
    console.error('weight-tracker/steps GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const adultIndex = parseAdultIndex(String(body.adultIndex ?? '0'))
    const loggedDate = parseDate(body.loggedDate)
    const steps = Number.parseInt(String(body.steps ?? ''), 10)
    const activeKcalRaw = body.activeKcal
    const activeKcal =
      activeKcalRaw == null || activeKcalRaw === ''
        ? null
        : Number.parseInt(String(activeKcalRaw), 10)
    const source = typeof body.source === 'string' ? body.source.trim().slice(0, 64) : null

    if (adultIndex == null) {
      return NextResponse.json({ error: 'Ugyldig person' }, { status: 400 })
    }
    if (!loggedDate) {
      return NextResponse.json({ error: 'Ugyldig dato' }, { status: 400 })
    }
    if (!Number.isFinite(steps) || steps < 0 || steps > 200_000) {
      return NextResponse.json({ error: 'Ugyldigt antal skridt' }, { status: 400 })
    }
    if (activeKcal != null && (!Number.isFinite(activeKcal) || activeKcal < 0 || activeKcal > 20_000)) {
      return NextResponse.json({ error: 'Ugyldig aktiv forbrænding' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('step_log_entries')
      .upsert(
        {
          user_id: user.id,
          adult_index: adultIndex,
          steps,
          active_kcal: activeKcal,
          logged_date: loggedDate,
          source,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,adult_index,logged_date' }
      )
      .select('id, adult_index, steps, active_kcal, logged_date, source, updated_at')
      .single()

    if (error) {
      console.error('step_log_entries POST', error)
      if (isMissingTableError(error)) return missingWeightTrackerTablesResponse(error)
      return NextResponse.json({ error: 'Kunne ikke gemme skridt', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('weight-tracker/steps POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
