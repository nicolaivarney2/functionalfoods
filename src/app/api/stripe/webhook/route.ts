import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe-server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

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
      session.metadata?.supabase_user_id ||
      (session.client_reference_id as string | undefined)
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id
    const amountTotal = session.amount_total

    if (userId && customerId && typeof amountTotal === 'number') {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          stripe_customer_id: customerId,
          last_contribution_amount_ore: amountTotal,
          last_contribution_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error('user_profiles update after checkout', error)
        const { error: insertErr } = await supabase.from('user_profiles').insert({
          id: userId,
          role: 'user',
          stripe_customer_id: customerId,
          last_contribution_amount_ore: amountTotal,
          last_contribution_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        if (insertErr) {
          console.error('user_profiles insert after checkout', insertErr)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
