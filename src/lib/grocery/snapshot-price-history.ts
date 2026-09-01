import type { SupabaseClient } from '@supabase/supabase-js'

const RPC_BATCH = 1500
const REST_PAGE = 400
const MAX_ATTEMPTS = 8

type BatchResult = {
  rows_affected: number
  last_product_id: string | null
  done: boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return String(err)
}

function isTimeout(err: unknown): boolean {
  return /timeout|57014|canceling statement|upstream request/i.test(errorMessage(err))
}

/** PostgREST could not load schema (DB busy) — retry, do not treat as missing RPC. */
function isSchemaCacheBusy(err: unknown): boolean {
  return /could not query the database for the schema cache/i.test(errorMessage(err))
}

/** Function truly absent from PostgREST schema cache (PGRST202). */
function isMissingRpc(err: unknown): boolean {
  const msg = errorMessage(err)
  if (isSchemaCacheBusy(err)) return false
  return /could not find the function|pgrst202/i.test(msg)
}

function isRetryable(err: unknown): boolean {
  return isTimeout(err) || isSchemaCacheBusy(err) || /fetch failed|econnreset|503|502/i.test(errorMessage(err))
}

function parseBatchResult(data: unknown): BatchResult {
  const raw = typeof data === 'string' ? JSON.parse(data) : data
  if (!raw || typeof raw !== 'object') {
    throw new Error('snapshot_price_history_batch: unexpected response')
  }
  const obj = raw as Record<string, unknown>
  return {
    rows_affected: Number(obj.rows_affected) || 0,
    last_product_id:
      typeof obj.last_product_id === 'string' ? obj.last_product_id : null,
    done: Boolean(obj.done),
  }
}

async function withRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (!isRetryable(err) || attempt === MAX_ATTEMPTS - 1) throw err
      const wait = Math.min(30_000, 1000 * 2 ** attempt)
      console.warn(
        `[grocery/cron] ${label} retry ${attempt + 1}/${MAX_ATTEMPTS} in ${wait}ms: ${errorMessage(err)}`,
      )
      await sleep(wait)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(errorMessage(lastError))
}

async function listStoreIds(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await withRetries('list chain stores', async () => {
    const res = await supabase.from('stores').select('id').eq('type', 'chain')
    if (res.error) throw new Error(res.error.message)
    return res
  })
  const ids = (data ?? [])
    .map((row) => (typeof row.id === 'string' ? row.id : null))
    .filter((id): id is string => Boolean(id))
  if (ids.length > 0) return ids

  const { data: offers, error: offerErr } = await supabase
    .from('product_offers')
    .select('store_id')
    .limit(5000)
  if (offerErr) throw new Error(offerErr.message)
  return [...new Set((offers ?? []).map((r) => r.store_id).filter(Boolean))]
}

async function snapshotStoreViaRpc(
  supabase: SupabaseClient,
  storeId: string,
): Promise<number> {
  let after: string | null = null
  let limit = RPC_BATCH
  let total = 0

  for (;;) {
    const page = await withRetries(`snapshot rpc ${storeId}`, async () => {
      const { data, error } = await supabase.rpc('snapshot_price_history_batch', {
        p_store_id: storeId,
        p_after_product_id: after,
        p_limit: limit,
      })
      if (!error) return parseBatchResult(data)
      if (isMissingRpc(error)) throw error
      if (isTimeout(error) && limit > 250) {
        limit = Math.max(250, Math.floor(limit / 2))
      }
      throw new Error(error.message)
    })

    total += page.rows_affected
    if (page.done) break
    if (!page.last_product_id) break
    after = page.last_product_id
  }

  return total
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10)
}

async function snapshotStoreViaRest(
  supabase: SupabaseClient,
  storeId: string,
): Promise<number> {
  const snapshotDate = todayUtcDate()
  let after: string | null = null
  let total = 0

  for (;;) {
    const rows = await withRetries(`snapshot rest read ${storeId}`, async () => {
      let query = supabase
        .from('product_offers')
        .select('product_id, store_id, price_cents, before_price_cents, is_on_sale')
        .eq('store_id', storeId)
        .not('price_cents', 'is', null)
        .order('product_id', { ascending: true })
        .limit(REST_PAGE)
      if (after) query = query.gt('product_id', after)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return data ?? []
    })
    if (rows.length === 0) break

    const payload = rows.map((row) => ({
      product_id: row.product_id,
      store_id: row.store_id,
      price_cents: row.price_cents,
      before_price_cents: row.before_price_cents,
      is_on_sale: row.is_on_sale,
      snapshot_date: snapshotDate,
    }))

    await withRetries(`snapshot rest upsert ${storeId}`, async () => {
      const { error } = await supabase.from('price_history').upsert(payload, {
        onConflict: 'product_id,store_id,snapshot_date',
      })
      if (error) throw new Error(error.message)
    })

    total += rows.length
    after = rows[rows.length - 1]?.product_id ?? null
    if (rows.length < REST_PAGE) break
    if (!after) break
  }

  return total
}

/**
 * Snapshot current product_offers into price_history for today.
 * Prefers paged RPC (stays under API gateway timeout); falls back to REST upserts
 * only if the RPC is actually missing from PostgREST.
 */
export async function snapshotPriceHistory(supabase: SupabaseClient): Promise<number> {
  // Heavy offer upserts just ran — give PostgREST a moment to reload schema.
  await sleep(5000)

  const storeIds = await listStoreIds(supabase)
  if (storeIds.length === 0) return 0

  let useRpc = true
  let total = 0

  for (const storeId of storeIds) {
    if (useRpc) {
      try {
        total += await snapshotStoreViaRpc(supabase, storeId)
        continue
      } catch (err) {
        if (!isMissingRpc(err)) throw err
        console.warn(
          '[grocery/cron] snapshot_price_history_batch mangler i PostgREST — REST-fallback',
        )
        useRpc = false
      }
    }
    total += await snapshotStoreViaRest(supabase, storeId)
  }

  return total
}
