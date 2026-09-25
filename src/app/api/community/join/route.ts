import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { joinCommunityRoom } from '@/lib/community/actions'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'

export const dynamic = 'force-dynamic'

async function loadUser(request: NextRequest) {
  const user = await getSupabaseRouteUser(request)
  if (!user) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  const { data } = await createClient(url, key).auth.admin.getUserById(user.id)
  return data.user ?? null
}

export async function POST(request: NextRequest) {
  const user = await loadUser(request)
  if (!user) return NextResponse.json({ error: 'Du skal være logget ind.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { roomId?: string } | null
  if (!body?.roomId) return NextResponse.json({ error: 'roomId mangler' }, { status: 400 })

  try {
    const result = await joinCommunityRoom({ user, roomId: body.roomId })
    return NextResponse.json(result)
  } catch (err) {
    const status = typeof (err as { status?: number }).status === 'number' ? (err as { status: number }).status : 500
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Kunne ikke joine' }, { status })
  }
}
