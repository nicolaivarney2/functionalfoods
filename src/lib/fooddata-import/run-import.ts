/**
 * Fooddata -> FF (main app DB) import core.
 *
 * Shared by:
 *   - CLI: scripts/import-fooddata-to-ff.ts (full/manual imports)
 *   - Cron: src/app/api/grocery/import-to-ff/cron/route.ts (nightly auto-import)
 *
 * Idempotent via UPSERT. Reads from fooddata (READ-only). Writes ONLY to FF.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SourceChain } from '@/grocery/types'
import { pullCurationFromFooddata } from './curation-pull'
import { parseFooddataProductId } from '@/lib/product-match-snapshots'
import {
  enqueueUnmatchedFooddataProducts,
  type EnqueueFooddataQueueResult,
} from '@/lib/product-match-queue'
import { isFoodCatalogProduct } from '@/lib/product-food-classification'
import { isGomaImportEnabled } from '@/lib/goma-sunset'
import { extractEanFromFfProductId } from '@/lib/product-ean'
import {
  isGomaFullCatalogChain,
  isGomaImportChain,
  shouldImportFooddataOfferSource,
  shouldImportFooddataProduct,
} from '@/lib/goma-import-stores'
import { sanitizeGomaOfferUntil } from '@/grocery/adapters/goma/mapper'

/** PostgREST/Supabase default statement_timeout (~8s) bites on wide product rows. */
const BATCH_SIZE = 500
const FETCH_PAGE_SIZE = 1000
const MIN_FETCH_PAGE_SIZE = 25
const MIN_UPSERT_BATCH = 25
/** PostgREST `.in()` stays reliable under this size. */
const ID_IN_CHUNK = 150
/** Daily import: ~1 new snapshot/product/store/day. FF already has older rows from prior runs. */
const PRICE_HISTORY_IMPORT_WINDOW_DAYS = 3
const PRICE_HISTORY_PRODUCT_CHUNK = 80

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isStatementTimeout(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('statement timeout') || m.includes('canceling statement')
}

function isRetryableFetchError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    isStatementTimeout(message) ||
    m.includes('fetch failed') ||
    m.includes('econnreset') ||
    m.includes('etimedout') ||
    m.includes('enotfound') ||
    m.includes('socket') ||
    m.includes('network') ||
    /\b(429|502|503|504)\b/.test(m)
  )
}

async function retryingQuery<T>(
  label: string,
  log: (msg: string) => void,
  run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  maxAttempts = 5,
): Promise<T> {
  let lastError = 'unknown error'
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await run()
      if (!error) return (data ?? []) as T
      lastError = error.message
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'RPC_MISSING') throw err
      lastError = message
    }
    if (!isRetryableFetchError(lastError) || attempt === maxAttempts) {
      throw new Error(`${label} failed: ${lastError}`)
    }
    const delay = Math.min(8000, 400 * 2 ** (attempt - 1))
    log(`  ⚠ ${label}: ${lastError} — retry ${attempt}/${maxAttempts - 1} in ${delay}ms`)
    await sleep(delay)
  }
  throw new Error(`${label} failed: ${lastError}`)
}

export interface RunImportOptions {
  ff: SupabaseClient
  fooddata: SupabaseClient
  dryRun?: boolean
  limit?: number | null
  skipProducts?: boolean
  skipOffers?: boolean
  skipHistory?: boolean
  skipQueue?: boolean
  enqueueUnmatched?: boolean
  pullCuration?: boolean
  curationOnly?: boolean
  pullQueue?: boolean
  /** How many days of price_history to copy from fooddata (default: recent only). */
  historyDays?: number
  /** Logger — defaults to console.log. Pass a no-op or accumulator for serverless. */
  log?: (msg: string) => void
  /**
   * Spring over hvis FF allerede er nyere eller lig fooddata (inden for 2 min)
   * og sidste FF-offer er under 14 timer gammel. Bruges af backup-cron 07:00/16:00.
   */
  skipIfFresh?: boolean
}

export interface RunImportResult {
  dryRun: boolean
  curationOnly: boolean
  stores: number
  products: { upserted: number; newlyImported: number }
  offers: { upserted: number; dropped: number; cleaned: number }
  history: { upserted: number; dropped: number; skipped: boolean }
  queue: EnqueueFooddataQueueResult | null
  curation: {
    matchesUpserted: number
    tagsUpdated: number
    organicUpdated: number
    queueUpserted: number
  } | null
  durationMs: number
  skippedFresh?: boolean
}

type ProductRef = {
  id: string
  source_chain: SourceChain
  amount: number | null
  unit: string | null
  name: string
}


async function fetchGomaOfferProductUuids(fooddata: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await fooddata
      .from('product_offers')
      .select('product_id')
      .eq('source', 'goma')
      .order('product_id', { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1)
    if (error) throw new Error(`fetchGomaOfferProductUuids failed: ${error.message}`)
    if (!data?.length) break
    for (const row of data as { product_id: string }[]) {
      if (row.product_id) ids.add(String(row.product_id))
    }
    if (data.length < FETCH_PAGE_SIZE) break
    from += FETCH_PAGE_SIZE
  }
  return ids
}

const PRODUCT_SELECT_COLS =
  'id, source_chain, source_id, gtin, name, brand, manufacturer, description, amount, unit, image_url, category_path, category_lvl0, category_lvl1, category_lvl2, last_seen_at, active'

/** Salling/REMA-kæder må aldrig have source=goma offers i FF (kommer fra fooddata-native). */
const SALLING_REMA_STORE_IDS = ['netto', 'bilka', 'foetex', 'rema-1000'] as const

/**
 * Ryd ophobede stale Goma-offers i FF. UPSERT-importen sletter aldrig rækker der
 * forsvinder fra fooddata, så udløbne/forkerte Goma-offers hober sig op:
 *   1. Goma-offers på Salling/REMA-kæder (gammelt eksperiment — skal aldrig være goma)
 *   2. Udløbne Goma-offers (sale_valid_to i fortiden) — tilbudsavisen er slut
 */
async function cleanupStaleGomaOffers(
  ff: SupabaseClient,
  log: (msg: string) => void,
): Promise<number> {
  let cleaned = 0

  const { count: sallingCount, error: sallingErr } = await ff
    .from('product_offers')
    .delete({ count: 'exact' })
    .eq('source', 'goma')
    .in('store_id', SALLING_REMA_STORE_IDS as unknown as string[])
  if (sallingErr) {
    log(`  ! cleanup (Salling goma) fejlede: ${sallingErr.message}`)
  } else {
    cleaned += sallingCount ?? 0
  }

  const { count: expiredCount, error: expiredErr } = await ff
    .from('product_offers')
    .delete({ count: 'exact' })
    .eq('source', 'goma')
    .not('sale_valid_to', 'is', null)
    .lt('sale_valid_to', new Date().toISOString())
  if (expiredErr) {
    log(`  ! cleanup (udløbne goma) fejlede: ${expiredErr.message}`)
  } else {
    cleaned += expiredCount ?? 0
  }

  return cleaned
}

/** Goma-kæder — Tjek skal ikke længere vises i FF når Goma er primær. */
const GOMA_CHAIN_STORE_IDS = [
  'lidl',
  '365discount',
  'kvickly',
  'superbrugsen',
  'brugsen',
  'meny',
  'spar',
  'loevbjerg',
  'abc-lavpris',
  'min-koebmand',
  'nemlig',
] as const

async function cleanupTjekOffersForGomaChains(
  ff: SupabaseClient,
  log: (msg: string) => void,
): Promise<number> {
  const { count, error } = await ff
    .from('product_offers')
    .delete({ count: 'exact' })
    .like('source', 'tjek%')
    .in('store_id', [...GOMA_CHAIN_STORE_IDS])
  if (error) {
    log(`  ! cleanup (Tjek på Goma-kæder) fejlede: ${error.message}`)
    return 0
  }
  const n = count ?? 0
  if (n > 0) log(`  cleaned ${n} legacy Tjek-offers på Goma-kæder`)
  return n
}

/**
 * PK lookups for the ids we actually care about.
 * Avoids ORDER BY id / OFFSET over the full FF products table (statement_timeout
 * even at pageSize=62 once the catalog is ~95k rows).
 */
async function fetchExistingFfProductIds(
  ff: SupabaseClient,
  candidateIds: string[],
  log: (msg: string) => void,
): Promise<Set<string>> {
  const ids = new Set<string>()
  if (candidateIds.length === 0) return ids

  for (let i = 0; i < candidateIds.length; i += ID_IN_CHUNK) {
    const chunk = candidateIds.slice(i, i + ID_IN_CHUNK)
    const rows = await retryingQuery<{ id: string }[]>(
      `FF product ids ${i + 1}-${Math.min(i + chunk.length, candidateIds.length)}`,
      log,
      () => ff.from('products').select('id').in('id', chunk),
    )
    for (const row of rows) {
      if (row.id) ids.add(String(row.id))
    }
    const done = Math.min(i + ID_IN_CHUNK, candidateIds.length)
    if (done % 15000 < ID_IN_CHUNK || done === candidateIds.length) {
      log(`  FF product ids: ${ids.size} existing (${done}/${candidateIds.length} checked)`)
    }
  }
  return ids
}

async function fetchAll<T = Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  selectCols: string,
  options: { activeOnly?: boolean; limit?: number | null; log?: (msg: string) => void } = {},
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  let pageSize = FETCH_PAGE_SIZE
  const limit = options.limit ?? null
  const log = options.log ?? (() => {})

  while (true) {
    try {
      const rows = await retryingQuery<T[]>(`fetchAll(${table}) ${from}`, log, () => {
        let q = client
          .from(table)
          .select(selectCols)
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1)
        if (options.activeOnly) q = q.eq('active', true)
        return q
      })
      if (!rows.length) break
      all.push(...rows)
      if (rows.length < pageSize) break
      from += pageSize
      if (limit && all.length >= limit) break
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isStatementTimeout(message) && pageSize > MIN_FETCH_PAGE_SIZE) {
        pageSize = Math.max(MIN_FETCH_PAGE_SIZE, Math.floor(pageSize / 2))
        log(`  fetchAll(${table}): timeout, prøver pageSize=${pageSize}`)
        await sleep(500)
        continue
      }
      throw err
    }
  }
  return limit ? all.slice(0, limit) : all
}

const PRICE_HISTORY_COLS =
  'product_id, store_id, price_cents, before_price_cents, is_on_sale, snapshot_date'

type FooddataHistoryRow = Record<string, unknown> & {
  id?: string
  product_id?: string
  snapshot_date?: string
}

function historyCursor(rows: FooddataHistoryRow[]): { date: string; id: string } | null {
  const last = rows[rows.length - 1]
  if (!last?.snapshot_date || !last.id) return null
  return { date: String(last.snapshot_date), id: String(last.id) }
}

/** Prefer grocery RPC (60s timeout + snapshot_date index). Returns null if RPC missing. */
async function fetchPriceHistoryViaRpc(
  client: SupabaseClient,
  sinceDate: string,
  log: (msg: string) => void,
): Promise<FooddataHistoryRow[] | null> {
  const all: FooddataHistoryRow[] = []
  let afterDate: string | null = null
  let afterId: string | null = null

  while (true) {
    let rows: FooddataHistoryRow[]
    try {
      rows = await retryingQuery<FooddataHistoryRow[]>(
        'price_history RPC page',
        log,
        async () => {
          const { data, error } = await client.rpc(
            'price_history_since_page' as never,
            {
              p_since: sinceDate,
              p_after_date: afterDate,
              p_after_id: afterId,
              p_limit: FETCH_PAGE_SIZE,
            } as never,
          )
          if (error && /could not find the function|PGRST202/i.test(error.message)) {
            throw new Error('RPC_MISSING')
          }
          return { data: (data ?? []) as FooddataHistoryRow[], error }
        },
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'RPC_MISSING' || /RPC_MISSING/.test(message)) return null
      throw err
    }
    if (!rows.length) break
    all.push(...rows)
    const cursor = historyCursor(rows)
    if (!cursor) break
    afterDate = cursor.date
    afterId = cursor.id
    if (rows.length < FETCH_PAGE_SIZE) break
    if (all.length % 5000 === 0) log(`  price_history RPC: ${all.length} rows`)
  }
  return all
}

async function fetchPriceHistoryByDate(
  client: SupabaseClient,
  sinceDate: string,
  log: (msg: string) => void,
): Promise<FooddataHistoryRow[]> {
  const all: FooddataHistoryRow[] = []
  let afterDate: string | null = null
  let afterId: string | null = null

  while (true) {
    const rows = await retryingQuery<FooddataHistoryRow[]>(
      `price_history since ${sinceDate}`,
      log,
      () => {
        let q = client
          .from('price_history')
          .select(`id,${PRICE_HISTORY_COLS}`)
          .gte('snapshot_date', sinceDate)
          .order('snapshot_date', { ascending: true })
          .order('id', { ascending: true })
          .limit(FETCH_PAGE_SIZE)
        if (afterDate && afterId) {
          q = q.or(
            `and(snapshot_date.eq.${afterDate},id.gt.${afterId}),snapshot_date.gt.${afterDate}`,
          )
        }
        return q
      },
    )
    if (!rows.length) break
    all.push(...rows)
    const cursor = historyCursor(rows)
    if (!cursor) break
    afterDate = cursor.date
    afterId = cursor.id
    if (rows.length < FETCH_PAGE_SIZE) break
    if (all.length % 5000 === 0) log(`  price_history fetch: ${all.length} rows`)
  }
  return all
}

/**
 * Fallback when date-range queries time out (missing idx_history_snapshot_date_id).
 * Uses idx_history_product_date — do not ORDER BY id (forces a PK scan).
 */
async function fetchPriceHistoryByProductChunks(
  client: SupabaseClient,
  fooddataProductIds: string[],
  sinceDate: string,
  log: (msg: string) => void,
): Promise<FooddataHistoryRow[]> {
  const all: FooddataHistoryRow[] = []

  for (let i = 0; i < fooddataProductIds.length; i += PRICE_HISTORY_PRODUCT_CHUNK) {
    const chunk = fooddataProductIds.slice(i, i + PRICE_HISTORY_PRODUCT_CHUNK)
    let from = 0
    let pageSize = FETCH_PAGE_SIZE

    while (true) {
      try {
        const rows = await retryingQuery<FooddataHistoryRow[]>(
          `price_history products ${i + 1}-${i + chunk.length}`,
          log,
          () =>
            client
              .from('price_history')
              .select(PRICE_HISTORY_COLS)
              .in('product_id', chunk)
              .gte('snapshot_date', sinceDate)
              .order('product_id', { ascending: true })
              .order('snapshot_date', { ascending: true })
              .order('store_id', { ascending: true })
              .range(from, from + pageSize - 1),
        )
        if (!rows.length) break
        all.push(...rows)
        if (rows.length < pageSize) break
        from += pageSize
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (isStatementTimeout(message) && pageSize > MIN_FETCH_PAGE_SIZE) {
          pageSize = Math.max(MIN_FETCH_PAGE_SIZE, Math.floor(pageSize / 2))
          log(
            `  price_history: timeout på produkt-chunk ${i + 1}-${i + chunk.length}, prøver pageSize=${pageSize}`,
          )
          await sleep(500)
          continue
        }
        throw err
      }
    }

    const done = Math.min(i + PRICE_HISTORY_PRODUCT_CHUNK, fooddataProductIds.length)
    if (done % 2000 < PRICE_HISTORY_PRODUCT_CHUNK || done === fooddataProductIds.length) {
      log(`  price_history fetch: ${all.length} rows (${done}/${fooddataProductIds.length} products)`)
    }
  }

  return all
}

/**
 * Fetch recent price_history without scanning 90k+ products one chunk at a time.
 * RPC (indexed, 60s) → PostgREST date keyset → per-product fallback.
 */
async function fetchPriceHistoryForImport(
  client: SupabaseClient,
  fooddataProductIds: string[],
  sinceDate: string,
  log: (msg: string) => void,
): Promise<Record<string, unknown>[]> {
  if (fooddataProductIds.length === 0) return []

  try {
    const rpcRows = await fetchPriceHistoryViaRpc(client, sinceDate, log)
    if (rpcRows) {
      log(`  price_history: ${rpcRows.length} rows via RPC`)
      return rpcRows
    }
    log('  price_history RPC mangler — bruger PostgREST snapshot_date')
  } catch (err) {
    log(
      `  ⚠ price_history RPC: ${err instanceof Error ? err.message : err} — bruger PostgREST`,
    )
  }

  try {
    const byDate = await fetchPriceHistoryByDate(client, sinceDate, log)
    log(`  price_history: ${byDate.length} rows via snapshot_date`)
    return byDate
  } catch (err) {
    log(
      `  ⚠ price_history by date failed: ${err instanceof Error ? err.message : err} — fallback til produkt-chunks`,
    )
  }

  return fetchPriceHistoryByProductChunks(client, fooddataProductIds, sinceDate, log)
}

async function fetchAllFfMatchedProductIds(ff: SupabaseClient): Promise<string[]> {
  const ids = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await ff
      .from('product_ingredient_matches')
      .select('product_external_id')
      .order('product_external_id', { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      if (row.product_external_id) ids.add(String(row.product_external_id))
    }
    if (data.length < FETCH_PAGE_SIZE) break
    from += FETCH_PAGE_SIZE
  }
  return Array.from(ids)
}

/** Matched FF ids that may be inactive in fooddata — keep catalog rows for sticky matches. */
async function fetchFooddataProductsForFfIds(
  fooddata: SupabaseClient,
  ffProductIds: string[],
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  const seen = new Set<string>()

  for (let i = 0; i < ffProductIds.length; i += 60) {
    const chunk = ffProductIds.slice(i, i + 60)
    const orParts: string[] = []
    for (const pid of chunk) {
      const parsed = parseFooddataProductId(pid)
      if (!parsed) continue
      orParts.push(
        `and(source_chain.eq.${parsed.source_chain},source_id.eq.${parsed.source_id})`,
      )
    }
    if (!orParts.length) continue

    const { data, error } = await fooddata
      .from('products')
      .select(PRODUCT_SELECT_COLS)
      .or(orParts.join(','))

    if (error) continue
    for (const row of data || []) {
      const key = String((row as { id: unknown }).id)
      if (seen.has(key)) continue
      seen.add(key)
      rows.push(row as Record<string, unknown>)
    }
  }
  return rows
}

function dedupeByConflictKey<T extends Record<string, unknown>>(
  rows: T[],
  onConflict: string,
): T[] {
  const keys = onConflict.split(',').map((k) => k.trim()).filter(Boolean)
  const seen = new Map<string, T>()
  for (const row of rows) {
    const id =
      keys.length > 0
        ? keys.map((k) => String(row[k] ?? '')).join('\0')
        : String((row as { id?: unknown }).id ?? '')
    if (id) seen.set(id, row)
  }
  return Array.from(seen.values())
}

async function upsertBatchWithRetry<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  batch: T[],
  onConflict: string,
  offset: number,
): Promise<void> {
  const { error } = await client.from(table).upsert(batch, { onConflict })
  if (!error) return

  if (isStatementTimeout(error.message) && batch.length > MIN_UPSERT_BATCH) {
    const mid = Math.ceil(batch.length / 2)
    await upsertBatchWithRetry(client, table, batch.slice(0, mid), onConflict, offset)
    await upsertBatchWithRetry(
      client,
      table,
      batch.slice(mid),
      onConflict,
      offset + mid,
    )
    return
  }

  throw new Error(
    `upsert ${table} batch ${offset}-${offset + batch.length} failed: ${error.message}`,
  )
}

async function upsertBatched<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
  options: { log?: (msg: string) => void } = {},
): Promise<number> {
  const uniqueRows = dedupeByConflictKey(rows, onConflict)
  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE)
    await upsertBatchWithRetry(client, table, batch, onConflict, i)
    if (options.log && (i + BATCH_SIZE) % 5000 === 0) {
      options.log(`  ${table}: ${Math.min(i + BATCH_SIZE, uniqueRows.length)}/${uniqueRows.length}`)
    }
  }
  return uniqueRows.length
}

// ─── Mappers ──────────────────────────────────────────────────────────────

function mapStore(s: Record<string, unknown>) {
  return {
    id: s.id,
    name: s.name,
    updated_at: new Date().toISOString(),
  }
}

function mapProduct(p: Record<string, any>) {
  const id = `${p.source_chain}-${p.source_id}`
  const department = p.category_lvl0 ?? null
  const category = p.category_lvl1 ?? null
  const subcategory = p.category_lvl2 ?? null
  return {
    id,
    ean: p.gtin ?? extractEanFromFfProductId(`${p.source_chain}-${p.source_id}`),
    name_generic: p.name,
    brand: p.brand ?? null,
    category,
    subcategory,
    department,
    is_food: isFoodCatalogProduct({ department, category, subcategory, name: p.name }),
    amount: p.amount ?? null,
    unit: p.unit ?? null,
    image_url: p.image_url ?? null,
    metadata: {
      source_chain: p.source_chain,
      source_id: p.source_id,
      fooddata_uuid: p.id,
      fooddata_last_seen_at: p.last_seen_at,
      manufacturer: p.manufacturer ?? null,
      description: p.description ?? null,
      category_path: p.category_path ?? null,
      active: p.active,
      synced_from_fooddata_at: new Date().toISOString(),
    },
  }
}

function resolveBeforePriceKr(o: {
  price_cents: number | null
  before_price_cents: number | null
  raw_data?: {
    storeData?: {
      beforePrice?: number
      unitsOfMeasurePrice?: number
      unitsOfMeasureOfferPrice?: number
      offerDescription?: string
    }
    isInCurrentLeaflet?: boolean
    cpOriginalPrice?: number
    prices?: unknown
  } | null
}): number | null {
  const priceCents = o.price_cents != null ? Math.round(Number(o.price_cents)) : 0
  if (priceCents <= 0) return null
  const currentKr = priceCents / 100

  if (o.before_price_cents != null) {
    const kr = Number(o.before_price_cents) / 100
    if (Number.isFinite(kr) && kr > currentKr + 0.01) return kr
  }

  const sd = o.raw_data?.storeData
  if (sd?.beforePrice != null) {
    const kr = Number(sd.beforePrice) / 100
    if (Number.isFinite(kr) && kr > currentKr + 0.01) return kr
  }

  const cp = o.raw_data?.cpOriginalPrice
  if (cp != null && cp > priceCents) {
    const kr = Number(cp) / 100
    if (Number.isFinite(kr) && kr > currentKr + 0.01) return kr
  }

  const prices = o.raw_data?.prices as
    | { price: number; is_campaign: boolean }[]
    | undefined
  if (prices?.length) {
    const campaigns = prices.filter((p) => p.is_campaign)
    const current = campaigns.length
      ? campaigns.reduce((a, b) => (a.price < b.price ? a : b))
      : prices[0]
    const nonCampaign = prices.filter((p) => !p.is_campaign)
    const regular = nonCampaign.length
      ? nonCampaign.reduce((a, b) => (a.price > b.price ? a : b))
      : prices.filter((p) => p.price > current.price + 0.01)[0]
    if (regular && regular.price > current.price + 0.01) return regular.price
  }

  const reg = sd?.unitsOfMeasurePrice ?? 0
  const off = sd?.unitsOfMeasureOfferPrice ?? 0
  const hasOfferSignal =
    Boolean(sd?.offerDescription?.trim()) || Boolean(o.raw_data?.isInCurrentLeaflet)
  if (hasOfferSignal && reg > off + 1 && off > 0) {
    const inferred = Math.round(priceCents * (reg / off))
    if (inferred > priceCents + 1 && inferred <= priceCents * 3) {
      return inferred / 100
    }
  }

  return null
}

function mapOffer(
  o: Record<string, any>,
  productLookup: Map<string, ProductRef>,
  gomaImportEnabled: boolean,
) {
  const ref = productLookup.get(o.product_id)
  if (!ref) return null
  if (
    !shouldImportFooddataOfferSource(
      ref.source_chain,
      String(o.source ?? ''),
      gomaImportEnabled,
    )
  ) {
    return null
  }
  const now = new Date()
  const fromOk = !o.offer_from || new Date(o.offer_from) <= now
  const currentKr = o.price_cents != null ? Number(o.price_cents) / 100 : 0
  const beforeKr = resolveBeforePriceKr(o as Parameters<typeof resolveBeforePriceKr>[0])
  const hasProvenDiscount = beforeKr != null
  // Tilbudsavis (Tjek): hele rækken er et tilbud uden bevist førpris.
  // Goma offers-only: stol på fooddata is_on_sale (mapper + Goma verify) — ellers
  // ville stale rækker med forældet sale_valid_to blive genoplivet som aktuelle.
  const isTjekSource =
    typeof o.source === 'string' && o.source.toLowerCase().startsWith('tjek')
  const isGomaOffersOnlySource =
    o.source === 'goma' &&
    isGomaImportChain(ref.source_chain) &&
    !isGomaFullCatalogChain(ref.source_chain)
  const saleValidTo =
    o.source === 'goma'
      ? sanitizeGomaOfferUntil(o.offer_until ?? null, {
          keepLiveSale: isGomaOffersOnlySource && o.is_on_sale === true,
          now,
        })
      : (o.offer_until ?? null)
  const untilOk = !saleValidTo || new Date(saleValidTo) > now
  const isOfferActive = !!(
    fromOk &&
    untilOk &&
    (hasProvenDiscount || isTjekSource || o.is_on_sale)
  )
  return {
    product_id: ref.id,
    store_product_id: ref.id.includes('-') ? ref.id.split('-').slice(1).join('-') : ref.id,
    store_id: o.store_id,
    name_store: ref.name,
    current_price: currentKr,
    normal_price: beforeKr,
    currency: 'DKK',
    is_on_sale: isOfferActive,
    discount_percentage:
      isOfferActive && beforeKr != null
        ? Number((((beforeKr - currentKr) / beforeKr) * 100).toFixed(2))
        : (o.discount_percentage ?? null),
    price_per_unit: o.unit_price_cents != null ? Number(o.unit_price_cents) / 100 : null,
    is_available: o.in_stock ?? true,
    sale_valid_from: o.offer_from ?? null,
    sale_valid_to: saleValidTo,
    source: o.source,
    last_seen_at: o.source_synced_at ?? null,
    amount: ref.amount,
    unit: ref.unit,
    is_offer_active: isOfferActive,
  }
}

function mapHistory(
  h: Record<string, any>,
  productLookup: Map<string, ProductRef>,
) {
  const ref = productLookup.get(h.product_id)
  if (!ref) return null
  // FF main `price_history` stores prices in DKK (columns `price`/`normal_price`),
  // whereas fooddata stores øre (`price_cents`/`before_price_cents`).
  const priceKr = h.price_cents != null ? Number(h.price_cents) / 100 : null
  if (priceKr == null) return null
  const normalKr =
    h.before_price_cents != null ? Number(h.before_price_cents) / 100 : null
  return {
    product_id: ref.id,
    store_id: h.store_id,
    price: priceKr,
    normal_price: normalKr,
    is_on_sale: !!h.is_on_sale,
    snapshot_date: h.snapshot_date,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

export async function runFooddataImport(
  options: RunImportOptions,
): Promise<RunImportResult> {
  const {
    ff,
    fooddata,
    dryRun = false,
    limit = null,
    skipProducts = false,
    skipOffers = false,
    skipHistory = false,
    skipQueue = false,
    enqueueUnmatched = false,
    pullCuration = false,
    curationOnly = false,
    pullQueue = false,
    historyDays = PRICE_HISTORY_IMPORT_WINDOW_DAYS,
    log = console.log,
    skipIfFresh = false,
  } = options

  const t0 = Date.now()

  if (skipIfFresh && !dryRun && !curationOnly) {
    try {
    const [{ data: ffOffer }, { data: fdProduct }] = await Promise.all([
      ff
        .from('product_offers')
        .select('last_seen_at')
        .not('last_seen_at', 'is', null)
        .order('last_seen_at', { ascending: false })
        .limit(1),
      fooddata
        .from('products')
        .select('last_seen_at')
        .not('last_seen_at', 'is', null)
        .order('last_seen_at', { ascending: false })
        .limit(1),
    ])
    const ffAt = ffOffer?.[0]?.last_seen_at
      ? new Date(ffOffer[0].last_seen_at as string).getTime()
      : 0
    const fdAt = fdProduct?.[0]?.last_seen_at
      ? new Date(fdProduct[0].last_seen_at as string).getTime()
      : 0
    const ageMs = ffAt > 0 ? Date.now() - ffAt : Number.POSITIVE_INFINITY
    const fooddataIsNewer = fdAt > ffAt + 2 * 60 * 1000
    if (ffAt > 0 && !fooddataIsNewer && ageMs < 14 * 60 * 60 * 1000) {
      log(
        `skip-if-fresh: FF last_seen ${new Date(ffAt).toISOString()} er ≤ fooddata og < 14t gammel — hopper over`,
      )
      return {
        dryRun,
        curationOnly,
        stores: 0,
        products: { upserted: 0, newlyImported: 0 },
        offers: { upserted: 0, dropped: 0, cleaned: 0 },
        history: { upserted: 0, dropped: 0, skipped: true },
        queue: null,
        curation: null,
        durationMs: Date.now() - t0,
        skippedFresh: true,
      }
    }
    } catch (err) {
      log(
        `skip-if-fresh lookup fejlede — kører import (${err instanceof Error ? err.message : err})`,
      )
    }
  }

  const gomaImportEnabled = isGomaImportEnabled()
  if (gomaImportEnabled) {
    log('Goma aktiv — fooddata→FF bruger source=goma for offers-only kæder (Tjek cold backup i grocery-DB)')
  }
  const gomaOfferProductUuids = gomaImportEnabled
    ? await fetchGomaOfferProductUuids(fooddata)
    : new Set<string>()
  const matchedFfIdSet = new Set<string>()
  const result: RunImportResult = {
    dryRun,
    curationOnly,
    stores: 0,
    products: { upserted: 0, newlyImported: 0 },
    offers: { upserted: 0, dropped: 0, cleaned: 0 },
    history: { upserted: 0, dropped: 0, skipped: skipHistory },
    queue: null,
    curation: null,
    durationMs: 0,
  }

  const runCurationPull = async () => {
    if (dryRun) {
      log('CURATION · dry-run — pull skipped')
      return
    }
    const c = await pullCurationFromFooddata(ff, fooddata, { pullQueue })
    result.curation = {
      matchesUpserted: c.matches.upserted,
      tagsUpdated: c.tags.updated,
      organicUpdated: c.organic.updated,
      queueUpserted: pullQueue ? c.queue.upserted : 0,
    }
    log(
      `CURATION · matches ${c.matches.upserted}, tags ${c.tags.updated}, organic ${c.organic.updated}` +
        (pullQueue ? `, queue ${c.queue.upserted}` : ''),
    )
  }

  if (curationOnly) {
    await runCurationPull()
    result.durationMs = Date.now() - t0
    return result
  }

  // ─── 1. Stores ────────────────────────────────────────────────────────
  log('1/4 · STORES')
  const fooddataStores = await fetchAll(fooddata, 'stores', '*', { log })
  const mappedStores = fooddataStores.map(mapStore)
  if (!dryRun) {
    result.stores = await upsertBatched(ff, 'stores', mappedStores, 'id')
  }
  log(`  stores: ${dryRun ? `${mappedStores.length} (dry-run)` : result.stores}`)

  // ─── 2. Products ──────────────────────────────────────────────────────
  let productLookup = new Map<string, ProductRef>()
  const newlyImportedProductIds: string[] = []

  if (!skipProducts) {
    log('2/4 · PRODUCTS')
    const activeProducts = await fetchAll<Record<string, any>>(
      fooddata,
      'products',
      PRODUCT_SELECT_COLS,
      { activeOnly: true, limit, log },
    )

    const matchedFfIds = await fetchAllFfMatchedProductIds(ff)
    for (const id of matchedFfIds) matchedFfIdSet.add(id)
    const activeFfIds = new Set(
      activeProducts.map((p) => `${p.source_chain}-${p.source_id}`),
    )
    const matchedOnlyIds = matchedFfIds.filter((id) => !activeFfIds.has(id))
    const matchedInactive = await fetchFooddataProductsForFfIds(fooddata, matchedOnlyIds)

    const byFooddataUuid = new Map<string, Record<string, any>>()
    for (const p of activeProducts) byFooddataUuid.set(String(p.id), p)
    for (const p of matchedInactive) byFooddataUuid.set(String((p as any).id), p as any)
    const fooddataProducts = Array.from(byFooddataUuid.values()).filter((p) =>
      shouldImportFooddataProduct(
        p.source_chain as SourceChain,
        String(p.id),
        gomaImportEnabled,
        gomaOfferProductUuids,
        matchedFfIdSet,
        `${p.source_chain}-${p.source_id}`,
      ),
    )

    const mapped = fooddataProducts.map(mapProduct)
    productLookup = new Map(
      fooddataProducts.map((p) => [
        String(p.id),
        {
          id: `${p.source_chain}-${p.source_id}`,
          source_chain: p.source_chain as SourceChain,
          amount: p.amount ?? null,
          unit: p.unit ?? null,
          name: p.name,
        },
      ]),
    )
    if (!dryRun) {
      const existingIds = await fetchExistingFfProductIds(
        ff,
        mapped.map((p) => String(p.id)),
        log,
      )
      result.products.upserted = await upsertBatched(ff, 'products', mapped, 'id', { log })
      for (const ref of productLookup.values()) {
        if (!existingIds.has(ref.id)) newlyImportedProductIds.push(ref.id)
      }
      result.products.newlyImported = newlyImportedProductIds.length
    }
    log(
      `  products: ${dryRun ? `${mapped.length} (dry-run)` : result.products.upserted}` +
        (dryRun ? '' : `, ${result.products.newlyImported} new`),
    )
  } else {
    const fooddataProducts = await fetchAll<Record<string, any>>(
      fooddata,
      'products',
      'id, source_chain, source_id, name, amount, unit',
      { activeOnly: true, limit, log },
    )
    productLookup = new Map(
      fooddataProducts
        .filter((p) =>
          shouldImportFooddataProduct(
            p.source_chain as SourceChain,
            String(p.id),
            gomaImportEnabled,
            gomaOfferProductUuids,
            matchedFfIdSet,
            `${p.source_chain}-${p.source_id}`,
          ),
        )
        .map((p) => [
          String(p.id),
          {
            id: `${p.source_chain}-${p.source_id}`,
            source_chain: p.source_chain as SourceChain,
            amount: p.amount ?? null,
            unit: p.unit ?? null,
            name: p.name,
          },
        ]),
    )
  }

  // ─── 3. Product offers ──────────────────────────────────────────────────
  const importedFfIds = new Set(Array.from(productLookup.values()).map((r) => r.id))
  let ffProductIds = importedFfIds
  if (skipProducts && (!skipOffers || !skipHistory) && importedFfIds.size > 0) {
    ffProductIds = await fetchExistingFfProductIds(ff, Array.from(importedFfIds), log)
  }

  if (!skipOffers) {
    log('3/4 · PRODUCT_OFFERS')
    const fooddataOffers = await fetchAll<Record<string, any>>(
      fooddata,
      'product_offers',
      'product_id, store_id, price_cents, before_price_cents, unit_price_cents, unit_price_unit, is_on_sale, offer_from, offer_until, discount_percentage, in_stock, source, source_synced_at, raw_data',
      { log },
    )
    const mapped = fooddataOffers
      .map((o) => mapOffer(o, productLookup, gomaImportEnabled))
      .filter((x): x is NonNullable<typeof x> => x !== null && ffProductIds.has(x.product_id))
    result.offers.dropped = fooddataOffers.length - mapped.length
    if (!dryRun) {
      result.offers.upserted = await upsertBatched(
        ff,
        'product_offers',
        mapped,
        'store_id,store_product_id',
        { log },
      )
    }
    if (!dryRun && gomaImportEnabled) {
      result.offers.cleaned += await cleanupStaleGomaOffers(ff, log)
      result.offers.cleaned += await cleanupTjekOffersForGomaChains(ff, log)
    }
    log(
      `  offers: ${dryRun ? `${mapped.length} (dry-run)` : result.offers.upserted}, ${result.offers.dropped} dropped` +
        (result.offers.cleaned ? `, ${result.offers.cleaned} cleaned` : ''),
    )
  }

  // ─── 4. Price history ───────────────────────────────────────────────────
  // Non-fatal: katalog + offers er allerede skrevet. En history-timeout
  // må ikke markere hele daily import som failed (GH Action / cron).
  if (!skipHistory) {
    log('4/4 · PRICE_HISTORY')
    try {
      const sinceDate = new Date(Date.now() - historyDays * 86400000).toISOString().slice(0, 10)
      log(`  importing snapshots since ${sinceDate} (${historyDays} days)`)
      const fooddataHistory = await fetchPriceHistoryForImport(
        fooddata,
        Array.from(productLookup.keys()),
        sinceDate,
        log,
      )
      const mapped = fooddataHistory
        .map((h) => mapHistory(h, productLookup))
        .filter((x): x is NonNullable<typeof x> => x !== null && ffProductIds.has(x.product_id))
      result.history.dropped = fooddataHistory.length - mapped.length
      if (!dryRun) {
        result.history.upserted = await upsertBatched(
          ff,
          'price_history',
          mapped,
          'product_id,store_id,snapshot_date',
          { log },
        )
      }
      log(
        `  price_history: ${dryRun ? `${mapped.length} (dry-run)` : result.history.upserted}, ${result.history.dropped} dropped`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.history.skipped = true
      log(`  price_history: SKIPPED after error (import otherwise OK): ${msg}`)
      console.warn('[fooddata-import] price_history failed (non-fatal):', err)
    }
  } else {
    log('  price_history skipped')
  }

  // ─── 5. Match queue ─────────────────────────────────────────────────────
  // Non-fatal: katalog + price history er allerede skrevet. En queue-timeout
  // må ikke markere hele daily import som failed (GH Action / cron).
  if (!dryRun && !skipQueue) {
    log('5/5 · MATCH QUEUE')
    try {
      if (enqueueUnmatched) {
        result.queue = await enqueueUnmatchedFooddataProducts(ff)
      } else if (newlyImportedProductIds.length > 0) {
        result.queue = await enqueueUnmatchedFooddataProducts(ff, {
          productIds: newlyImportedProductIds,
        })
      }
      if (result.queue) {
        log(
          `  queue: ${result.queue.inserted} new, ${result.queue.skippedAlreadyMatched} matched, ${result.queue.skippedAlreadyQueued} queued, ${result.queue.skippedNonFood} non-food`,
        )
      } else {
        log('  queue: no new product ids — skipped')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`  queue: SKIPPED after error (import otherwise OK): ${msg}`)
      console.warn('[fooddata-import] match queue failed (non-fatal):', err)
    }
  }

  if (pullCuration) {
    await runCurationPull()
  }

  result.durationMs = Date.now() - t0
  return result
}
