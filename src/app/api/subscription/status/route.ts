import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { getSubscriptionStatus } from '@/lib/subscription-entitlements'

export const dynamic = 'force-dynamic'

/** GET /api/subscription/status — tier, limits og forbrug for logged-in bruger. */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const status = await getSubscriptionStatus(supabase, user.id)
    return NextResponse.json(status)
  } catch (err) {
    console.error('GET /api/subscription/status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
