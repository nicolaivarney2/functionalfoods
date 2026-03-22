import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { getStripe } from '@/lib/stripe-server'

export const dynamic = 'force-dynamic'

const MIN_KR = 5
const MAX_KR = 50_000

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

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Betaling er ikke konfigureret endnu.' },
        { status: 503 }
      )
    }

    const user = await getAuthenticatedUser(request)
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Du skal være logget ind.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const amountKr = Number(body?.amountKr)
    if (!Number.isFinite(amountKr) || amountKr < MIN_KR || amountKr > MAX_KR) {
      return NextResponse.json(
        { error: `Beløb skal være mellem ${MIN_KR} og ${MAX_KR} kr.` },
        { status: 400 }
      )
    }

    const unitAmountOre = Math.round(amountKr * 100)
    if (unitAmountOre < MIN_KR * 100) {
      return NextResponse.json({ error: 'Ugyldigt beløb.' }, { status: 400 })
    }

    const stripe = getStripe()
    const origin = siteOrigin(request)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'dkk',
            product_data: {
              name: 'Støtte – betal det du kan',
              description: 'Frivillig støtte til Functional Foods – du vælger beløbet.',
            },
            unit_amount: unitAmountOre,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/overblik?betaling=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/kom-i-gang?betaling=annulleret`,
      automatic_tax: { enabled: false },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Kunne ikke starte betaling.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('create-checkout-session', e)
    return NextResponse.json({ error: 'Kunne ikke starte betaling.' }, { status: 500 })
  }
}
