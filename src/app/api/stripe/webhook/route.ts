import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

import { getStripe } from '@/lib/stripe-server'
import { normalizeSubscriptionTier, tierFromMonthlyAmountKr } from '@/lib/subscription-tiers'
import { setUserSubscriptionTier } from '@/lib/subscription-entitlements'

export const dynamic = 'force-dynamic'

function tierFromSubscription(sub: Stripe.Subscription): 'free' | 'plus' | 'premium' {
  const meta = sub.metadata?.subscription_tier
  if (meta === 'plus' || meta === 'premium') return meta

  const item = sub.items.data[0]
  const unitAmount = item?.price?.unit_amount
  if (typeof unitAmount === 'number') {
    return tierFromMonthlyAmountKr(Math.round(unitAmount / 100))
  }
  return 'free'
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!secret || !serviceKey || !supabaseUrl) {
    console.error('Stripe webhook: missing env')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('Stripe webhook signature', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const userId =
      session.metadata?.supabase_user_id || (session.client_reference_id as string | undefined)
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (userId && customerId) {
      const patch: Record<string, unknown> = {
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }

      if (session.mode === 'subscription') {
        const tier = normalizeSubscriptionTier(session.metadata?.subscription_tier)
        if (tier === 'plus' || tier === 'premium') {
          await setUserSubscriptionTier(supabase, userId, tier, {
            stripeSubscriptionId:
              typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
            monthlyAmountOre:
              tier === 'premium' ? 24900 : tier === 'plus' ? 2900 : null,
          })
        }
      } else if (typeof session.amount_total === 'number') {
        // Legacy engangsbetaling → tier ud fra beløb
        const tier = tierFromMonthlyAmountKr(Math.round(session.amount_total / 100))
        patch.last_contribution_amount_ore = session.amount_total
        patch.last_contribution_at = new Date().toISOString()
        patch.subscription_tier = tier
        await supabase.from('user_profiles').update(patch).eq('id', userId)
      }
    }
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.created'
  ) {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (userId && ['active', 'trialing'].includes(sub.status)) {
      const tier = tierFromSubscription(sub)
      await setUserSubscriptionTier(supabase, userId, tier, {
        stripeSubscriptionId: sub.id,
        monthlyAmountOre: tier === 'premium' ? 24900 : tier === 'plus' ? 2900 : null,
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (userId) {
      await setUserSubscriptionTier(supabase, userId, 'free', {
        stripeSubscriptionId: null,
        monthlyAmountOre: null,
      })
    }
  }

  return NextResponse.json({ received: true })
}
