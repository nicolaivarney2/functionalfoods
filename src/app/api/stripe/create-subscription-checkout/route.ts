import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { ensureStripeCustomerForUser } from '@/lib/stripe-customers'
import { getStripe } from '@/lib/stripe-server'
import {
  PREMIUM_GUIDANCE_HOURS,
  TIER_PRICES_KR,
  TRIAL_DAYS,
  type SubscriptionTier,
} from '@/lib/subscription-tiers'

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
    description: `Alt i Madbudget + ${PREMIUM_GUIDANCE_HOURS.toLowerCase()} på Messenger.`,
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
    const tier = body?.tier as SubscriptionTier | 'community'
    if (tier !== 'plus' && tier !== 'premium' && tier !== 'community') {
      return NextResponse.json({ error: 'tier skal være plus, community eller premium' }, { status: 400 })
    }
    if (tier === 'community' && !process.env.STRIPE_PRICE_COMMUNITY_MONTHLY) {
      return NextResponse.json(
        { error: 'Community på web mangler Stripe-prisen STRIPE_PRICE_COMMUNITY_MONTHLY.' },
        { status: 503 },
      )
    }

    const stripe = getStripe()
    const supabase = createSupabaseServerClient()
    const customerId = await ensureStripeCustomerForUser(supabase, user)
    const origin = siteOrigin(request)
    await supabase
      .from('user_profiles')
      .update({ checkout_started: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    const amountKr = tier === 'community' ? 49 : TIER_PRICES_KR[tier]
    const product =
      tier === 'community'
        ? {
            name: 'Functional Foods Community',
            description: 'Vægttabsforløb i grupper à 10, plus madplaner, madlog og prisalarmer.',
          }
        : TIER_PRODUCT[tier]

    const configuredPriceId =
      tier === 'premium'
        ? process.env.STRIPE_PRICE_PREMIUM_MONTHLY
        : tier === 'community'
          ? process.env.STRIPE_PRICE_COMMUNITY_MONTHLY
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
      payment_method_collection: 'always',
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          supabase_user_id: user.id,
          subscription_tier: tier,
        },
      },
      line_items: lineItems,
      success_url: `${origin}/madbudget?ny=1&betaling=ok&session_id={CHECKOUT_SESSION_ID}`,
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
