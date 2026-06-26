/**
 * Daily cleanup of expired offers across BOTH Supabase projects.
 *
 * Run by Vercel Cron (see vercel.json) at 04:30 UTC — between the nightly
 * grocery scrape (04:00 UTC) and the GitHub Actions fooddata→FF import
 * (05:00 UTC). This ordering matters:
 *
 *   1. 04:00 — grocery sync pulls fresh offers + sleeps stale ones per chain
 *   2. 04:30 — THIS job sweeps anything still flagged active but past
 *               offer_until, in both the grocery DB and the main FF DB
 *   3. 05:00 — fooddata import copies the cleaned state into main FF DB
 *
 * Why a dedicated cron instead of relying on the per-chain retention step:
 * `sleepStaleOffersForChain` only runs on a chain's scheduled sync day
 * (e.g. Saturday for Netto/Bilka). A Netto offer expiring Tuesday would
 * otherwise stay flagged active for 4 days → false positives on
 * /dagligvarer. This daily cross-chain sweep closes that gap.
 *
 * Auth: Bearer $CRON_SECRET (same as the scrape cron).
 */

import { NextResponse } from 'next/server'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { cleanupExpiredOffers } from '@/lib/dagligvarer-offer-cleanup'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.replace(/^Bearer\s+/i, '')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === cronSecret) return true
  // Allow the manual admin secret as a fallback so it can be triggered by hand.
  const manualSecret = process.env.GROCERY_SYNC_SECRET
  return Boolean(manualSecret && bearer === manualSecret)
}

async function runGroceryCleanup(): Promise<{
  status: 'success' | 'failed'
  result?: Record<string, unknown>
  error?: string
  durationMs: number
}> {
  const t0 = Date.now()
  try {
    const supabase = getGroceryServiceClient()
    const { data, error } = await supabase.rpc('cleanup_expired_offers', {
      p_stale_product_days: 30,
      p_batch_limit: 50000,
    })
    if (error) {
      return {
        status: 'failed',
        error: error.message,
        durationMs: Date.now() - t0,
      }
    }
    return {
      status: 'success',
      result: (data ?? undefined) as Record<string, unknown> | undefined,
      durationMs: Date.now() - t0,
    }
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
    }
  }
}

async function runMainFfCleanup(): Promise<{
  status: 'success' | 'failed'
  result?: Awaited<ReturnType<typeof cleanupExpiredOffers>>
  error?: string
  durationMs: number
}> {
  const t0 = Date.now()
  try {
    const result = await cleanupExpiredOffers()
    return { status: 'success', result, durationMs: Date.now() - t0 }
  } catch (err) {
    return {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
    }
  }
}

async function handle(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const grocery = await runGroceryCleanup()
  const mainFf = await runMainFfCleanup()

  const totalErrors = [grocery, mainFf].filter((s) => s.status === 'failed').length
  const completedAt = new Date()

  return NextResponse.json(
    {
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      totalDurationMs: completedAt.getTime() - startedAt.getTime(),
      totalErrors,
      steps: {
        groceryCleanup: grocery,
        mainFfCleanup: mainFf,
      },
    },
    { status: totalErrors > 0 ? 207 : 200 },
  )
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request)
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request)
}
