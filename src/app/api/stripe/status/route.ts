import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Tjek om Stripe er klar til test (ingen hemmeligheder i svaret).
 * GET /api/stripe/status
 */
export async function GET() {
  const sk = process.env.STRIPE_SECRET_KEY || ''
  const mode: 'test' | 'live' | 'none' = sk.startsWith('sk_live')
    ? 'live'
    : sk.startsWith('sk_test')
      ? 'test'
      : 'none'

  return NextResponse.json({
    ok: true,
    stripe_secret_configured: Boolean(sk),
    stripe_mode: mode,
    webhook_secret_configured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    site_url_configured: Boolean(
      process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ),
    hint:
      mode === 'none'
        ? 'Sæt STRIPE_SECRET_KEY (sk_test_…) i .env.local og genstart npm run dev. Webhook: STRIPE_WEBHOOK_SECRET + stripe listen.'
        : mode === 'test'
          ? 'Test mode: brug testkort 4242424242424242. Kør stripe listen --forward-to localhost:3000/api/stripe/webhook'
          : 'Live mode: dobbelttjek webhook-endpoint i Stripe Dashboard.',
  })
}
