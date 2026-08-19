import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { getReferralSummary } from '@/lib/referrals'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/** GET /api/referrals/me — egen kode, share-URL, progress og lifetime-status. */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createSupabaseServiceClient()
    const summary = await getReferralSummary(supabase, user.id)
    return NextResponse.json(summary)
  } catch (err) {
    console.error('GET /api/referrals/me:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
