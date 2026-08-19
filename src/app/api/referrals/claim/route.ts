import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { claimReferral } from '@/lib/referrals'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/referrals/claim
 * Binder den indloggede bruger til en henvisningskode (kun nye konti).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseServiceClient()
    const result = await claimReferral(supabase, user.id, body.code ?? body.referralCode)

    if (!result.ok) {
      const messages: Record<typeof result.error, string> = {
        missing_code: 'Angiv en henvisningskode.',
        unknown_code: 'Vi kender ikke den henvisningskode.',
        self: 'Du kan ikke bruge din egen kode.',
        too_old: 'Henvisningskoden kan kun bruges lige efter oprettelse.',
        failed: 'Kunne ikke gemme henvisningen. Prøv igen.',
      }
      const status =
        result.error === 'unknown_code' || result.error === 'missing_code'
          ? 400
          : result.error === 'self' || result.error === 'too_old'
            ? 409
            : 500
      return NextResponse.json({ error: messages[result.error], code: result.error }, { status })
    }

    return NextResponse.json({
      ok: true,
      alreadyClaimed: Boolean(result.alreadyClaimed),
      count: result.count,
      notified: result.notified,
    })
  } catch (err) {
    console.error('POST /api/referrals/claim:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
