import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { ensureStripeCustomerForUser } from '@/lib/stripe-customers'
import { getStripe } from '@/lib/stripe-server'

export const dynamic = 'force-dynamic'

/** Tillad kun functionalfoods.dk (inkl. subdomæner som www) og localhost til udvikling. */
function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
    return url.protocol === 'https:' && /(^|\.)functionalfoods\.dk$/.test(url.hostname)
  } catch {
    return false
  }
}

function siteOrigin(request: NextRequest, requestedOrigin?: unknown): string {
  if (typeof requestedOrigin === 'string' && isAllowedOrigin(requestedOrigin)) {
    return requestedOrigin.replace(/\/$/, '')
  }
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL
  if (env) {
    return env.startsWith('http') ? env : `https://${env}`
  }
  return request.nextUrl.origin
}

/**
 * Stripe Customer Portal — lader en allerede betalende bruger skifte støttebeløb,
 * opdatere betalingskort eller opsige. App'en kalder denne route med Bearer-token,
 * får en URL retur og åbner den i browseren.
 *
 * Kræver at Customer Portal er aktiveret i Stripe Dashboard (Settings → Billing →
 * Customer portal). Uden konfiguration returnerer Stripe en fejl.
 */
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

    const stripe = getStripe()
    const supabase = createSupabaseServerClient()
    const customerId = await ensureStripeCustomerForUser(supabase, user)
    const origin = siteOrigin(request, body?.origin)

    // Valgfri: lås portalen til en bestemt konfiguration (bpc_...). Uden env
    // bruger Stripe standard-konfigurationen, som virker fint.
    const configuration = process.env.STRIPE_BILLING_PORTAL_CONFIG_ID?.trim()

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/overblik`,
      ...(configuration ? { configuration } : {}),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Kunne ikke åbne abonnementsstyring.' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('create-portal-session', e)
    return NextResponse.json(
      { error: 'Kunne ikke åbne abonnementsstyring. Prøv igen senere.' },
      { status: 500 }
    )
  }
}
