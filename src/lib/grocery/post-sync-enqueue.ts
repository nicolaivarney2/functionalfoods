import type { SupabaseClient } from '@supabase/supabase-js'
import type { SourceChain } from '@/grocery/types'
import { enqueueUnmatchedFooddataProducts } from '@/lib/product-match-queue'
import type { EnqueueFooddataQueueResult } from '@/lib/product-match-queue'
import type { ScheduledGrocerySync } from '@/lib/grocery/sync-schedule'

const PAGE = 1000

type SyncStepWithCreates = {
  step: string
  status: string
  productsCreated?: number
}

/** Map cron steps to fooddata `source_chain` values for scoped enqueue. */
export function sourceChainsForCronRun(options: {
  mode: 'scheduled' | 'full' | 'manual-only'
  schedule: ScheduledGrocerySync | null
  only: Set<string> | null
}): string[] | null {
  if (options.mode === 'full') return null

  const chains = new Set<string>()
  const addSalling = (c: 'netto' | 'foetex' | 'bilka') => chains.add(c)

  if (options.only) {
    if (options.only.has('netto')) addSalling('netto')
    if (options.only.has('foetex')) addSalling('foetex')
    if (options.only.has('bilka')) addSalling('bilka')
    if (options.only.has('rema-1000')) chains.add('rema-1000')
    if (options.only.has('tjek') && options.schedule?.tjekChains.length) {
      for (const c of options.schedule.tjekChains) chains.add(c)
    }
  } else if (options.schedule) {
    for (const c of options.schedule.sallingChains) addSalling(c)
    if (options.schedule.rema1000) chains.add('rema-1000')
    for (const c of options.schedule.tjekChains) chains.add(c)
  }

  return chains.size > 0 ? Array.from(chains) : null
}

export async function loadProductIdsCreatedSince(
  supabase: SupabaseClient,
  since: Date,
  sourceChains: string[] | null,
): Promise<string[]> {
  const ids: string[] = []
  const sinceIso = since.toISOString()
  let from = 0

  while (true) {
    let query = supabase
      .from('products')
      .select('id')
      .gte('created_at', sinceIso)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)

    if (sourceChains?.length) {
      query = query.in('source_chain', sourceChains as SourceChain[])
    }

    const { data, error } = await query
    if (error) throw error
    if (!data?.length) break

    for (const row of data) {
      if (row.id) ids.push(String(row.id))
    }
    if (data.length < PAGE) break
    from += PAGE
  }

  return ids
}

export function syncStepsCreatedProducts(steps: SyncStepWithCreates[]): boolean {
  return steps.some(
    (s) =>
      s.step !== 'snapshot' &&
      s.step !== 'enqueue' &&
      s.status !== 'failed' &&
      (s.productsCreated ?? 0) > 0,
  )
}

export async function enqueueAfterGrocerySync(options: {
  supabase: SupabaseClient
  startedAt: Date
  mode: 'scheduled' | 'full' | 'manual-only'
  schedule: ScheduledGrocerySync | null
  only: Set<string> | null
  steps: SyncStepWithCreates[]
}): Promise<EnqueueFooddataQueueResult | null> {
  if (!syncStepsCreatedProducts(options.steps)) return null

  const sourceChains = sourceChainsForCronRun({
    mode: options.mode,
    schedule: options.schedule,
    only: options.only,
  })

  const newProductIds = await loadProductIdsCreatedSince(
    options.supabase,
    options.startedAt,
    sourceChains,
  )

  if (newProductIds.length === 0) return null

  return enqueueUnmatchedFooddataProducts(options.supabase, {
    productIds: newProductIds,
  })
}
