/**
 * Daily orchestrator for the grocery service.
 *
 * Hit by Vercel Cron (see vercel.json) once per day. Can also be triggered
 * manually with the GROCERY_SYNC_SECRET for ad-hoc runs.
 *
 * Behavior:
 *   1. Sync each chain sequentially with isolated try/catch (a failure in
 *      one chain doesn't abort the others).
 *   2. Snapshot the current `product_offers` into `price_history` so the
 *      "price chart" feature has daily granularity.
 *   3. Return a summary of every step.
 *
 * Timeouts: a full run is ~150-180s (Netto + Føtex + Bilka + REMA). We cap
 * maxDuration at 300s — Vercel's current ceiling for non-Enterprise plans.
 * If a future run consistently flirts with the limit, split the chains into
 * separate cron entries (vercel.json) instead of bumping the timeout.
 */

import { NextResponse } from 'next/server'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { syncSallingChain } from '@/grocery/adapters/salling-algolia'
import type { SyncResult } from '@/grocery/adapters/salling-algolia/sync'
import { syncRema1000 } from '@/grocery/adapters/rema1000'
import type { RemaSyncResult } from '@/grocery/adapters/rema1000'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type StepResult =
  | (SyncResult & { step: string })
  | (RemaSyncResult & { step: string })
  | { step: string; status: 'failed'; errorMessage: string; durationMs: number }
  | { step: string; status: 'success'; rowsAffected: number; durationMs: number }

interface CronSummary {
  startedAt: string
  completedAt: string
  totalDurationMs: number
  totalErrors: number
  steps: StepResult[]
}

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const bearer = auth.replace(/^Bearer\s+/i, '')

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === cronSecret) return true

  const manualSecret = process.env.GROCERY_SYNC_SECRET
  if (manualSecret && bearer === manualSecret) return true

  // Vercel cron also sends the `user-agent: vercel-cron/1.0` header, but we
  // require an actual secret too so the route can't be hit anonymously.
  return false
}

async function runStep(
  step: string,
  fn: () => Promise<StepResult>,
): Promise<StepResult> {
  const t0 = Date.now()
  try {
    const result = await fn()
    return { ...result, step }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      step,
      status: 'failed',
      errorMessage: message,
      durationMs: Date.now() - t0,
    }
  }
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 },
    )
  }

  const startedAt = new Date()
  const steps: StepResult[] = []

  const url = new URL(request.url)
  const skipSnapshot = url.searchParams.get('skipSnapshot') === 'true'
  const onlyParam = url.searchParams.get('only') // e.g. "netto,rema-1000"
  const only = onlyParam ? new Set(onlyParam.split(',').map((s) => s.trim())) : null
  const shouldRun = (id: string) => !only || only.has(id)

  if (shouldRun('netto')) {
    steps.push(
      await runStep('netto', async () => ({
        ...(await syncSallingChain('netto')),
        step: 'netto',
      })),
    )
  }
  if (shouldRun('foetex')) {
    steps.push(
      await runStep('foetex', async () => ({
        ...(await syncSallingChain('foetex')),
        step: 'foetex',
      })),
    )
  }
  if (shouldRun('bilka')) {
    steps.push(
      await runStep('bilka', async () => ({
        ...(await syncSallingChain('bilka')),
        step: 'bilka',
      })),
    )
  }
  if (shouldRun('rema-1000')) {
    steps.push(
      await runStep('rema-1000', async () => ({
        ...(await syncRema1000()),
        step: 'rema-1000',
      })),
    )
  }

  if (!skipSnapshot) {
    steps.push(
      await runStep('snapshot', async () => {
        const t0 = Date.now()
        const supabase = getGroceryServiceClient()
        const { data, error } = await supabase.rpc('snapshot_price_history')
        if (error) throw new Error(error.message)
        return {
          step: 'snapshot',
          status: 'success' as const,
          rowsAffected: typeof data === 'number' ? data : 0,
          durationMs: Date.now() - t0,
        }
      }),
    )
  }

  const completedAt = new Date()
  const totalErrors = steps.filter((s) => s.status === 'failed').length

  const summary: CronSummary = {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalDurationMs: completedAt.getTime() - startedAt.getTime(),
    totalErrors,
    steps,
  }

  return NextResponse.json(summary, {
    status: totalErrors > 0 ? 207 : 200, // 207 Multi-Status when any step failed
  })
}
