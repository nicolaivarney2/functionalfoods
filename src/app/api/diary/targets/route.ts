import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { computeDailyTargets } from '@/lib/diary/targets'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null
  return createClient(supabaseUrl, serviceKey)
}

/** Dagligt energi-/makromål for den loggede bruger (én voksen, adultIndex). */
export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const adultIndex = Number.parseInt(searchParams.get('adultIndex') ?? '0', 10) || 0

    const target = await computeDailyTargets(supabase, user.id, adultIndex)
    return NextResponse.json({ success: true, target })
  } catch (e) {
    console.error('diary/targets GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
