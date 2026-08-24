/**
 * Daily orchestrator for the grocery service.
 *
 * Hit by Vercel Cron (see vercel.json) at 04:00 UTC (~05:00 DK). Default:
 * kun de kæder der fik nye tilbud **dagen før** (se sync-schedule.ts).
 * Manuel fuld sync: `?full=true`. Eksplicit subset: `?only=netto,rema-1000`.
 *
 * Behavior:
 *   1. Sync each chain sequentially with isolated try/catch (a failure in
 *      one chain doesn't abort the others).
 *   2. Snapshot the current `product_offers` into `price_history` so the
 *      "price chart" feature has daily granularity.
 *   3. Return a summary of every step.
 *
 * Timeouts: a scheduled day is typically ~30-90s; full run ~150-180s. We cap
 * maxDuration at 300s — Vercel's current ceiling for non-Enterprise plans.
 */

import { NextResponse } from 'next/server'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { syncSallingChain } from '@/grocery/adapters/salling-algolia'
import type { SyncResult } from '@/grocery/adapters/salling-algolia/sync'
import { syncRema1000 } from '@/grocery/adapters/rema1000'
import type { RemaSyncResult } from '@/grocery/adapters/rema1000'
import { syncTjek, type TjekSyncResult } from '@/grocery/adapters/tjek'
import type { SourceChain } from '@/grocery/types'
import { isGomaImportEnabled } from '@/lib/goma-sunset'
import {
  getScheduledSyncForNow,
  missedLastScheduledSync,
  NATIVE_CRON_WEEKDAY,
  scheduledStepIds,
  type NativeCronChain,
  type ScheduledGrocerySync,
} from '@/lib/grocery/sync-schedule'
import { enqueueAfterGrocerySync } from '@/lib/grocery/post-sync-enqueue'
import type { EnqueueFooddataQueueResult } from '@/lib/product-match-queue'
import { sendDagligvarerOpsEmail } from '@/lib/dagligvarer-ops-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type StepResult =
  | (SyncResult & { step: string })
  | (RemaSyncResult & { step: string })
  | (TjekSyncResult & { step: string })
  | { step: string; status: 'failed'; errorMessage: string; durationMs: number }
  | { step: string; status: 'success'; rowsAffected: number; durationMs: number }
  | (EnqueueFooddataQueueResult & { step: 'enqueue'; status: 'success'; durationMs: number })
  | { step: 'enqueue'; status: 'skipped'; reason: string; durationMs: number }

interface CronSummary {
  startedAt: string
  completedAt: string
  totalDurationMs: number
  totalErrors: number
  steps: StepResult[]
  mode: 'scheduled' | 'full' | 'manual-only'
  schedule?: {
    labelDa: string
    releaseNoteDa: string
    plannedSteps: string[]
    tjekChains?: SourceChain[]
  }
  skipped?: boolean
  skipReason?: string
  catchUp?: NativeCronChain[]
}

const NATIVE_SYNC_SOURCE: Record<NativeCronChain, string> = {
  netto: 'salling-algolia:netto',
  foetex: 'salling-algolia:foetex',
  bilka: 'salling-algolia:bilka',
  'rema-1000': 'rema-1000-api',
}

async function nativeChainsMissingLastSlot(): Promise<NativeCronChain[]> {
  const supabase = getGroceryServiceClient()
  const missed: NativeCronChain[] = []
  for (const chain of Object.keys(NATIVE_SYNC_SOURCE) as NativeCronChain[]) {
    const { data } = await supabase
      .from('sync_logs')
      .select('completed_at')
      .eq('source', NATIVE_SYNC_SOURCE[chain])
      .in('status', ['success', 'partial'])
      .order('completed_at', { ascending: false })
      .limit(1)
    if (missedLastScheduledSync(data?.[0]?.completed_at, NATIVE_CRON_WEEKDAY[chain])) {
      missed.push(chain)
    }
  }
  return missed
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
    return { ...result, step } as StepResult
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
  const fullSync = url.searchParams.get('full') === 'true'

  let mode: CronSummary['mode'] = 'scheduled'
  let schedule: ScheduledGrocerySync | null = null
  let catchUp: NativeCronChain[] = []

  if (onlyParam) {
    mode = 'manual-only'
  } else if (fullSync) {
    mode = 'full'
  } else {
    schedule = getScheduledSyncForNow()
    try {
      catchUp = await nativeChainsMissingLastSlot()
    } catch (err) {
      console.warn(
        '[grocery/cron] catch-up lookup failed:',
        err instanceof Error ? err.message : err,
      )
    }
    if (!schedule && catchUp.length === 0) {
      const completedAt = new Date()
      const summary: CronSummary = {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        totalDurationMs: completedAt.getTime() - startedAt.getTime(),
        totalErrors: 0,
        steps: [],
        mode: 'scheduled',
        skipped: true,
        skipReason:
          'Ingen kæder planlagt i dag, og ingen native kæder har misset deres ugeslot.',
      }
      return NextResponse.json(summary, { status: 200 })
    }
  }

  const only = onlyParam
    ? new Set(onlyParam.split(',').map((s) => s.trim()))
    : mode === 'full'
      ? null
      : new Set([
          ...(schedule ? scheduledStepIds(schedule) : []),
          ...catchUp,
        ])

  const shouldRun = (id: string) => !only || only.has(id)
  const tjekChains =
    mode === 'scheduled' && schedule && schedule.tjekChains.length > 0
      ? schedule.tjekChains
      : undefined

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

  // Tjek (squid-api) — udfaset jul 2026. Goma dækker alle ikke-native kæder.
  // Spring over når GOMA_IMPORT_ENABLED=true (sæt GROCERY_TJEK_DISABLED=true som ekstra sikkerhed).
  const tjekDisabled =
    isGomaImportEnabled() || process.env.GROCERY_TJEK_DISABLED === 'true'

  if (shouldRun('tjek') && !tjekDisabled) {
    steps.push(
      await runStep('tjek', async () => ({
        ...(await syncTjek(
          tjekChains ? { chains: tjekChains } : undefined,
        )),
        step: 'tjek',
      })),
    )
  }

  const ranProductSync = steps.some(
    (s) => s.step !== 'snapshot' && s.step !== 'enqueue',
  )

  if (ranProductSync) {
    const enqueueT0 = Date.now()
    try {
      const supabase = getGroceryServiceClient()
      const enqueueResult = await enqueueAfterGrocerySync({
        supabase,
        startedAt,
        mode,
        schedule,
        only,
        steps,
      })
      if (!enqueueResult) {
        steps.push({
          step: 'enqueue',
          status: 'skipped',
          reason: 'Ingen nye produkter at enqueue',
          durationMs: Date.now() - enqueueT0,
        })
      } else {
        steps.push({
          step: 'enqueue',
          status: 'success',
          durationMs: Date.now() - enqueueT0,
          ...enqueueResult,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn('[grocery/cron] enqueue failed (non-fatal):', message)
      steps.push({
        step: 'enqueue',
        status: 'skipped',
        reason: message,
        durationMs: Date.now() - enqueueT0,
      })
    }
  }

  if (!skipSnapshot && ranProductSync) {
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
    mode,
    ...(catchUp.length > 0 ? { catchUp } : {}),
    ...(schedule
      ? {
          schedule: {
            labelDa: schedule.labelDa,
            releaseNoteDa: schedule.releaseNoteDa,
            plannedSteps: scheduledStepIds(schedule),
            ...(schedule.tjekChains.length > 0
              ? { tjekChains: schedule.tjekChains }
              : {}),
          },
        }
      : {}),
  }

  if (totalErrors > 0) {
    const failed = steps
      .filter((s) => s.status === 'failed')
      .map((s) => `${s.step}: ${'errorMessage' in s ? s.errorMessage : 'failed'}`)
    const text = [
      `Grocery sync ${summary.startedAt}`,
      `mode=${summary.mode} duration=${summary.totalDurationMs}ms errors=${summary.totalErrors}`,
      catchUp.length ? `catch-up: ${catchUp.join(', ')}` : '',
      'Fejl:',
      ...failed.map((f) => `  - ${f}`),
      'Steps:',
      ...steps.map((s) => `  ${s.step}: ${s.status}`),
    ]
      .filter(Boolean)
      .join('\n')
    void sendDagligvarerOpsEmail({
      subject: `[FF grocery] ${totalErrors} sync-step fejlede`,
      text,
    }).then((r) => {
      if (!r.ok) console.warn('[grocery/cron] ops-mail fejlede:', r.error)
    })
  }

  return NextResponse.json(summary, {
    status: totalErrors > 0 ? 207 : 200, // 207 Multi-Status when any step failed
  })
}
