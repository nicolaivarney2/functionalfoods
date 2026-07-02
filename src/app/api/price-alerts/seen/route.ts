import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createSupabaseServiceClient()
    const now = new Date().toISOString()

    const { error } = await supabase.from('user_price_alert_meta').upsert(
      { user_id: user.id, last_seen_at: now },
      { onConflict: 'user_id' },
    )

    if (error) {
      console.error('POST /api/price-alerts/seen:', error)
      return NextResponse.json({ error: 'Failed to update seen state' }, { status: 500 })
    }

    return NextResponse.json({ success: true, lastSeenAt: now })
  } catch (err) {
    console.error('POST /api/price-alerts/seen:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
