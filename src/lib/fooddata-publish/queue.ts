import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FOODDATA_PUBLISH_SOURCE,
  type FooddataCurationSource,
} from './config'

export type MatchQueueRow = {
  product_id: string
  store_product_id: string
  store_id: string
  product_name_snapshot?: string | null
  status: 'pending' | 'matched' | 'dismissed'
  queued_at?: string | null
  resolved_at?: string | null
}

function toFooddataQueueRow(
  row: MatchQueueRow,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
) {
  const now = new Date().toISOString()
  return {
    product_id: row.product_id,
    store_product_id: row.store_product_id,
    store_id: row.store_id,
    product_name_snapshot: row.product_name_snapshot ?? null,
    status: row.status,
    queued_at: row.queued_at ?? now,
    resolved_at: row.resolved_at ?? null,
    source,
    synced_at: now,
  }
}

export async function upsertQueueRowInFooddata(
  client: SupabaseClient,
  row: MatchQueueRow,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<void> {
  const payload = toFooddataQueueRow(row, source)
  const { error } = await client
    .from('product_ingredient_match_queue')
    .upsert(payload, { onConflict: 'product_id' })

  if (error) throw new Error(`upsertQueueRowInFooddata: ${error.message}`)
}

export async function upsertQueueBatchInFooddata(
  client: SupabaseClient,
  rows: MatchQueueRow[],
  batchSize = 100,
  source: FooddataCurationSource = FOODDATA_PUBLISH_SOURCE
): Promise<number> {
  let upserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize).map((r) => toFooddataQueueRow(r, source))
    const { error } = await client
      .from('product_ingredient_match_queue')
      .upsert(chunk, { onConflict: 'product_id' })
    if (error) throw new Error(`upsertQueueBatchInFooddata: ${error.message}`)
    upserted += chunk.length
  }
  return upserted
}

export function filterQueueForPublish(
  rows: MatchQueueRow[],
  mode: 'pending' | 'all' = 'pending'
): MatchQueueRow[] {
  if (mode === 'all') return rows
  return rows.filter((r) => r.status === 'pending')
}
