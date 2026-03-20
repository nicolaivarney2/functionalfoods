import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { isMissingTableError, missingWeightTrackerTablesResponse } from '@/lib/supabase-postgrest-error'

export const dynamic = 'force-dynamic'

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
    const adultIndex = parseInt(searchParams.get('adultIndex') ?? '0', 10)
    if (Number.isNaN(adultIndex) || adultIndex < 0) {
      return NextResponse.json({ error: 'Ugyldig adultIndex' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('weight_log_entries')
      .select('id, adult_index, weight_kg, logged_at, notes, created_at')
      .eq('user_id', user.id)
      .eq('adult_index', adultIndex)
      .order('logged_at', { ascending: true })

    if (error) {
      console.error('weight_log_entries GET', error)
      if (isMissingTableError(error)) return missingWeightTrackerTablesResponse(error)
      return NextResponse.json({ error: 'Kunne ikke hente log', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (e) {
    console.error('weight-tracker/entries GET', e)
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
    const adultIndex = parseInt(String(body.adultIndex ?? '0'), 10)
    const weightKg = parseFloat(String(body.weightKg))
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : null
    let loggedAt = typeof body.loggedAt === 'string' ? body.loggedAt : null

    if (Number.isNaN(adultIndex) || adultIndex < 0) {
      return NextResponse.json({ error: 'Ugyldig person' }, { status: 400 })
    }
    if (Number.isNaN(weightKg) || weightKg < 30 || weightKg > 300) {
      return NextResponse.json({ error: 'Vægt skal være mellem 30 og 300 kg' }, { status: 400 })
    }

    if (!loggedAt) {
      loggedAt = new Date().toISOString()
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('weight_log_entries')
      .insert({
        user_id: user.id,
        adult_index: adultIndex,
        weight_kg: weightKg,
        logged_at: loggedAt,
        notes,
      })
      .select('id, adult_index, weight_kg, logged_at, notes')
      .single()

    if (error) {
      console.error('weight_log_entries POST', error)
      if (isMissingTableError(error)) return missingWeightTrackerTablesResponse(error)
      return NextResponse.json(
        { error: 'Kunne ikke gemme vægt', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    await supabase
      .from('adult_weight_loss_profiles')
      .update({ weight: weightKg, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('adult_index', adultIndex)

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('weight-tracker/entries POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Mangler id' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { error } = await supabase
      .from('weight_log_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)

    if (error) {
      console.error('weight_log_entries DELETE', error)
      if (isMissingTableError(error)) return missingWeightTrackerTablesResponse(error)
      return NextResponse.json({ error: 'Kunne ikke slette', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('weight-tracker/entries DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
