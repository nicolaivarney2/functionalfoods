import { NextRequest, NextResponse } from 'next/server'

import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { getStripe } from '@/lib/stripe-server'
import { grantStripeSubscription, subscriptionIsEntitled } from '@/lib/stripe-subscription-sync'

export const dynamic = 'force-dynamic'

/**
 * Kaldes når Stripe sender brugeren tilbage efter betaling.
 * Webhook kan være forsinket, især på localhost, så adgangen sættes her med det samme.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json({ error: 'Du skal være logget ind.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    if (!sessionId.startsWith('cs_')) {
      return NextResponse.json({ error: 'Manglende betalingssession.' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const ownerId = session.metadata?.supabase_user_id || session.client_reference_id
    if (ownerId !== user.id) {
      return NextResponse.json({ error: 'Betalingen hører til en anden konto.' }, { status: 403 })
    }

    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    if (!subId) {
      return NextResponse.json({ error: 'Abonnementet er ikke oprettet endnu.' }, { status: 409 })
    }

    const sub = await stripe.subscriptions.retrieve(subId)
    if (!subscriptionIsEntitled(sub.status)) {
      return NextResponse.json({ error: 'Abonnementet er ikke aktivt.' }, { status: 402 })
    }
    if (!sub.metadata?.supabase_user_id) {
      sub.metadata = { ...sub.metadata, supabase_user_id: user.id }
    }

    const supabase = createSupabaseServerClient()
    await grantStripeSubscription(supabase, user.id, sub)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('confirm-checkout', error)
    return NextResponse.json({ error: 'Kunne ikke bekræfte betalingen.' }, { status: 500 })
  }
}
