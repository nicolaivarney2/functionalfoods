/**
 * Native grocery orchestrator (Salling full/leaflet + REMA).
 * Køres fra GitHub Actions — ikke Vercel cron (300s loft).
 */

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
  NATIVE_SYNC_LOG_SOURCES,
  scheduledStepIds,
  type NativeCronChain,
  type ScheduledGrocerySync,
} from '@/lib/grocery/sync-schedule'
import { enqueueAfterGrocerySync } from '@/lib/grocery/post-sync-enqueue'
import { snapshotPriceHistory } from '@/lib/grocery/snapshot-price-history'
import { retryGroceryDb } from '@/grocery/db/retry'
import type { EnqueueFooddataQueueResult } from '@/lib/product-match-queue'
import { sendDagligvarerOpsEmail } from '@/lib/dagligvarer-ops-email'

export type GroceryCronStepResult =
  | (SyncResult & { step: string })
  | (RemaSyncResult & { step: string })
  | (TjekSyncResult & { step: string })
  | { step: string; status: 'failed'; errorMessage: string; durationMs: number }
  | { step: string; status: 'success'; rowsAffected: number; durationMs: number }
  | (EnqueueFooddataQueueResult & { step: 'enqueue'; status: 'success'; durationMs: number })
  | { step: 'enqueue'; status: 'skipped'; reason: string; durationMs: number }

export interface GroceryCronSummary {
  startedAt: string
  completedAt: string
  totalDurationMs: number
  totalErrors: number
  steps: GroceryCronStepResult[]
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

export interface RunScheduledGrocerySyncOptions {
  only?: string | null
  fullSync?: boolean
  skipSnapshot?: boolean
}

async function nativeChainsMissingLastSlot(): Promise<NativeCronChain[]> {
  const supabase = getGroceryServiceClient()
  const missed: NativeCronChain[] = []
  for (const chain of Object.keys(NATIVE_SYNC_LOG_SOURCES) as NativeCronChain[]) {
    const [{ data: log, error: logErr }, { data: seen, error: seenErr }] = await Promise.all([
      supabase
        .from('sync_logs')
        .select('completed_at')
        .in('source', [...NATIVE_SYNC_LOG_SOURCES[chain]])
        .in('status', ['success', 'partial'])
        .order('completed_at', { ascending: false })
        .limit(1),
      supabase
        .from('products')
        .select('last_seen_at')
        .eq('source_chain', chain)
        .not('last_seen_at', 'is', null)
        .order('last_seen_at', { ascending: false })
        .limit(1),
    ])
    if (logErr) throw new Error(logErr.message)
    if (seenErr) throw new Error(seenErr.message)
    const lastOk = [log?.[0]?.completed_at, seen?.[0]?.last_seen_at]
      .filter((v): v is string => typeof v === 'string')
      .sort()
      .at(-1)
    if (missedLastScheduledSync(lastOk, NATIVE_CRON_WEEKDAY[chain])) {
      missed.push(chain)
    }
  }
  return missed
}

async function runStep(
  step: string,
  fn: () => Promise<GroceryCronStepResult>,
): Promise<GroceryCronStepResult> {
  const t0 = Date.now()
  try {
    const result = await fn()
    return { ...result, step } as GroceryCronStepResult
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

export async function runScheduledGrocerySync(
  options: RunScheduledGrocerySyncOptions = {},
): Promise<GroceryCronSummary> {
  const startedAt = new Date()
  const steps: GroceryCronStepResult[] = []
  const skipSnapshot = Boolean(options.skipSnapshot)
  const onlyParam = options.only?.trim() || null
  const fullSync = Boolean(options.fullSync)

  await retryGroceryDb(
    'wait for PostgREST schema cache',
    async () => {
      const supabase = getGroceryServiceClient()
      const { error } = await supabase.from('stores').select('id').limit(1)
      if (error) throw new Error(error.message)
    },
    { attempts: 10, maxWaitMs: 20_000 },
  )

  let mode: GroceryCronSummary['mode'] = 'scheduled'
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
  if (shouldRun('salling-offers')) {
    const alreadyFull = new Set(
      steps
        .filter(
          (s) =>
            (s.step === 'netto' || s.step === 'foetex' || s.step === 'bilka') &&
            s.status !== 'failed',
        )
        .map((s) => s.step),
    )
    for (const chain of ['netto', 'foetex', 'bilka'] as const) {
      if (alreadyFull.has(chain)) continue
      steps.push(
        await runStep(`salling-offers:${chain}`, async () => ({
          ...(await syncSallingChain(chain, { leafletRefresh: true })),
          step: `salling-offers:${chain}`,
        })),
      )
    }
  }

  if (shouldRun('rema-1000')) {
    steps.push(
      await runStep('rema-1000', async () => ({
        ...(await syncRema1000()),
        step: 'rema-1000',
      })),
    )
  }

  const tjekDisabled =
    isGomaImportEnabled() || process.env.GROCERY_TJEK_DISABLED === 'true'

  if (shouldRun('tjek') && !tjekDisabled) {
    steps.push(
      await runStep('tjek', async () => ({
        ...(await syncTjek(tjekChains ? { chains: tjekChains } : undefined)),
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
        const rowsAffected = await snapshotPriceHistory(supabase)
        return {
          step: 'snapshot',
          status: 'success' as const,
          rowsAffected,
          durationMs: Date.now() - t0,
        }
      }),
    )
  }

  const completedAt = new Date()
  const totalErrors = steps.filter((s) => s.status === 'failed').length

  const summary: GroceryCronSummary = {
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

  return summary
}
