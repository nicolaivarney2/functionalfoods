import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { isValidIsoDate } from '@/lib/diary-day-aggregate'

export const dynamic = 'force-dynamic'

const SELECT = 'id, logged_date, title, calories, created_at'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function todayUtc(): string {
  return new Date().toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || todayUtc()
    if (!isValidIsoDate(date)) return NextResponse.json({ error: 'Ugyldig dato' }, { status: 400 })

    const { data, error } = await supabase
      .from('diary_activity_entries')
      .select(SELECT)
      .eq('user_id', user.id)
      .eq('logged_date', date)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('diary/activity GET', error)
      return NextResponse.json({ error: 'Kunne ikke hente aktivitet', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (e) {
    console.error('diary/activity GET', e)
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
    const date =
      typeof body.date === 'string' && isValidIsoDate(body.date) ? body.date : todayUtc()
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : ''
    const calories = Math.round(Number(body.calories))
    if (!title) return NextResponse.json({ error: 'Angiv en titel' }, { status: 400 })
    if (!Number.isFinite(calories) || calories < 1 || calories > 5000) {
      return NextResponse.json({ error: 'Angiv kcal mellem 1 og 5000' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('diary_activity_entries')
      .insert({
        user_id: user.id,
        logged_date: date,
        title,
        calories,
      })
      .select(SELECT)
      .single()

    if (error) {
      console.error('diary/activity POST', error)
      return NextResponse.json({ error: 'Kunne ikke gemme aktivitet', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('diary/activity POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 })

    const { error } = await supabase
      .from('diary_activity_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)

    if (error) {
      console.error('diary/activity DELETE', error)
      return NextResponse.json({ error: 'Kunne ikke slette', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('diary/activity DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
