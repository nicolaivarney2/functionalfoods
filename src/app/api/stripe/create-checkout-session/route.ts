import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * @deprecated Pay-what-you-can er fjernet. Brug POST /api/stripe/create-subscription-checkout
 * med { tier: 'plus' | 'premium' }.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Pay-what-you-can er udfaset. Brug abonnement via /lav-din-plan eller POST /api/stripe/create-subscription-checkout.',
    },
    { status: 410 },
  )
}
