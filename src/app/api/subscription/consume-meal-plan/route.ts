import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import {
  SubscriptionLimitError,
  assertMealPlanGenerationAllowed,
  getSubscriptionStatus,
  logMealPlanGeneration,
} from '@/lib/subscription-entitlements'

export const dynamic = 'force-dynamic'

/**
 * POST /api/subscription/consume-meal-plan
 * Tjekker ugens madplan-grænse og logger ét forbrug (kald FØR generering).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const status = await assertMealPlanGenerationAllowed(supabase, user.id)
    await logMealPlanGeneration(supabase, user.id)
    const refreshed = await getSubscriptionStatus(supabase, user.id)

    return NextResponse.json({
      ok: true,
      tier: status.tier,
      mealPlansRemainingThisWeek: refreshed.mealPlansRemainingThisWeek,
    })
  } catch (err) {
    if (err instanceof SubscriptionLimitError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          tier: err.tier,
          status: err.status,
        },
        { status: 402 },
      )
    }
    console.error('POST /api/subscription/consume-meal-plan:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
