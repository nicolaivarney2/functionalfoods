import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { ensureStripeCustomerForUser } from '@/lib/stripe-customers'
import { getStripe } from '@/lib/stripe-server'
import { TIER_PRICES_KR, type SubscriptionTier } from '@/lib/subscription-tiers'

export const dynamic = 'force-dynamic'

function siteOrigin(request: NextRequest): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL
  if (env) {
    return env.startsWith('http') ? env : `https://${env}`
  }
  return request.nextUrl.origin
}

const TIER_PRODUCT: Record<'plus' | 'premium', { name: string; description: string }> = {
  plus: {
    name: 'Functional Foods Madbudget',
    description: 'Ubegrænset madplaner, prisalarmer og indkøbsliste med priser.',
  },
  premium: {
    name: 'Functional Foods Premium',
    description: 'Alt i Madbudget + personlig vejledning på Messenger 24/7.',
  },
}

/**
 * Opret Stripe Checkout for månedligt abonnement (plus 29 kr / premium 249 kr).
 * Body: { tier: 'plus' | 'premium' }
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Betaling er ikke konfigureret endnu.' }, { status: 503 })
    }

    const user = await getAuthenticatedUser(request)
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Du skal være logget ind.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tier = body?.tier as SubscriptionTier
    if (tier !== 'plus' && tier !== 'premium') {
      return NextResponse.json({ error: 'tier skal være plus eller premium' }, { status: 400 })
    }

    const stripe = getStripe()
    const supabase = createSupabaseServerClient()
    const customerId = await ensureStripeCustomerForUser(supabase, user)
    const origin = siteOrigin(request)
    const amountKr = TIER_PRICES_KR[tier]
    const product = TIER_PRODUCT[tier]

    const configuredPriceId =
      tier === 'premium'
        ? process.env.STRIPE_PRICE_PREMIUM_MONTHLY
        : process.env.STRIPE_PRICE_PLUS_MONTHLY

    const lineItems = configuredPriceId
      ? [{ price: configuredPriceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'dkk',
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: amountKr * 100,
              recurring: { interval: 'month' as const },
            },
            quantity: 1,
          },
        ]

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        subscription_tier: tier,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          subscription_tier: tier,
        },
      },
      line_items: lineItems,
      success_url: `${origin}/overblik?betaling=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/lav-din-plan?betaling=annulleret`,
      automatic_tax: { enabled: false },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Kunne ikke starte betaling.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('create-subscription-checkout', e)
    return NextResponse.json({ error: 'Kunne ikke starte betaling.' }, { status: 500 })
  }
}
