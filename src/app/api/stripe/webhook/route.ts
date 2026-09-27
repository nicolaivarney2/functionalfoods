import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

import { getStripe } from '@/lib/stripe-server'
import {
  grantStripeSubscription,
  revokeStripeSubscription,
  subscriptionIsEntitled,
} from '@/lib/stripe-subscription-sync'
import { tierFromMonthlyAmountKr } from '@/lib/subscription-tiers'

export const dynamic = 'force-dynamic'

async function applySubscription(supabase: SupabaseClient, sub: Stripe.Subscription) {
  const userId = sub.metadata?.supabase_user_id
  if (!userId) return
  if (subscriptionIsEntitled(sub.status)) {
    await grantStripeSubscription(supabase, userId, sub)
    const plan = sub.metadata?.subscription_tier
    if (plan === 'plus' || plan === 'premium' || plan === 'community') {
      const { notifyOpsPaid } = await import('@/lib/ops-user-alerts')
      void notifyOpsPaid(supabase, userId, { tier: plan === 'community' ? 'plus' : plan, source: 'Stripe (web)' })
    }
    return
  }
  if (sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired') {
    await revokeStripeSubscription(supabase, userId)
  }
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
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (userId && subId) {
          const stripe = getStripe()
          const sub = await stripe.subscriptions.retrieve(subId)
          if (!sub.metadata?.supabase_user_id) {
            sub.metadata = { ...sub.metadata, supabase_user_id: userId }
          }
          await applySubscription(supabase, sub)
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
    await applySubscription(supabase, sub)
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (userId) await revokeStripeSubscription(supabase, userId)
  }

  return NextResponse.json({ received: true })
}
