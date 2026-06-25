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
import { pullCurationFromFooddata } from './curation-pull'
import { parseFooddataProductId } from '@/lib/product-match-snapshots'
import {
  enqueueUnmatchedFooddataProducts,
  type EnqueueFooddataQueueResult,
} from '@/lib/product-match-queue'
import { isFoodCatalogProduct } from '@/lib/product-food-classification'

const BATCH_SIZE = 2000
const FETCH_PAGE_SIZE = 1000

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
  /** Logger — defaults to console.log. Pass a no-op or accumulator for serverless. */
  log?: (msg: string) => void
}

export interface RunImportResult {
  dryRun: boolean
  curationOnly: boolean
  stores: number
  products: { upserted: number; newlyImported: number }
  offers: { upserted: number; dropped: number }
  history: { upserted: number; dropped: number; skipped: boolean }
  queue: EnqueueFooddataQueueResult | null
  curation: {
    matchesUpserted: number
    tagsUpdated: number
    organicUpdated: number
    queueUpserted: number
  } | null
  durationMs: number
}

type ProductRef = { id: string; amount: number | null; unit: string | null; name: string }

const PRODUCT_SELECT_COLS =
  'id, source_chain, source_id, gtin, name, brand, manufacturer, description, amount, unit, image_url, category_path, category_lvl0, category_lvl1, category_lvl2, last_seen_at, active'

async function fetchAll<T = Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  selectCols: string,
  options: { activeOnly?: boolean; limit?: number | null } = {},
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  const limit = options.limit ?? null

  while (true) {
    let q = client
      .from(table)
      .select(selectCols)
      .order('id', { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1)
    if (options.activeOnly) q = q.eq('active', true)

    const { data, error } = await q
    if (error) throw new Error(`fetchAll(${table}) failed: ${error.message}`)
    if (!data || data.length === 0) break

    all.push(...(data as T[]))
    if (data.length < FETCH_PAGE_SIZE) break
    from += FETCH_PAGE_SIZE
    if (limit && all.length >= limit) break
  }
  return limit ? all.slice(0, limit) : all
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

async function upsertBatched<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
): Promise<number> {
  const uniqueRows = dedupeByConflictKey(rows, onConflict)
  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE)
    const { error } = await client.from(table).upsert(batch, { onConflict })
    if (error) {
      throw new Error(`upsert ${table} batch ${i}-${i + batch.length} failed: ${error.message}`)
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
    ean: p.gtin ?? null,
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

function mapOffer(o: Record<string, any>, productLookup: Map<string, ProductRef>) {
  const ref = productLookup.get(o.product_id)
  if (!ref) return null
  const now = new Date()
  const fromOk = !o.offer_from || new Date(o.offer_from) <= now
  const untilOk = !o.offer_until || new Date(o.offer_until) > now
  const currentKr = o.price_cents != null ? Number(o.price_cents) / 100 : 0
  const beforeKr = resolveBeforePriceKr(o as Parameters<typeof resolveBeforePriceKr>[0])
  const hasProvenDiscount = beforeKr != null
  const isOfferActive = !!(fromOk && untilOk && hasProvenDiscount)
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
    sale_valid_to: o.offer_until ?? null,
    source: o.source,
    last_seen_at: o.source_synced_at ?? null,
    amount: ref.amount,
    unit: ref.unit,
    is_offer_active: isOfferActive,
  }
}

function mapHistory(h: Record<string, any>, productLookup: Map<string, ProductRef>) {
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
    log = console.log,
  } = options

  const t0 = Date.now()
  const result: RunImportResult = {
    dryRun,
    curationOnly,
    stores: 0,
    products: { upserted: 0, newlyImported: 0 },
    offers: { upserted: 0, dropped: 0 },
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
  const fooddataStores = await fetchAll(fooddata, 'stores', '*')
  const mappedStores = fooddataStores.map(mapStore)
  if (!dryRun) {
    result.stores = await upsertBatched(ff, 'stores', mappedStores, 'id')
  }
  log(`  stores: ${dryRun ? `${mappedStores.length} (dry-run)` : result.stores}`)

  // ─── 2. Products ──────────────────────────────────────────────────────
  let productLookup = new Map<string, ProductRef>()
  const newlyImportedProductIds: string[] = []
  const ffIdsBeforeProducts = new Set<string>()

  if (!skipProducts && !dryRun) {
    let from = 0
    while (true) {
      const { data, error } = await ff
        .from('products')
        .select('id')
        .order('id')
        .range(from, from + FETCH_PAGE_SIZE - 1)
      if (error) throw error
      if (!data?.length) break
      for (const r of data as { id: string }[]) ffIdsBeforeProducts.add(r.id)
      if (data.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
  }

  if (!skipProducts) {
    log('2/4 · PRODUCTS')
    const activeProducts = await fetchAll<Record<string, any>>(
      fooddata,
      'products',
      PRODUCT_SELECT_COLS,
      { activeOnly: true, limit },
    )

    const matchedFfIds = await fetchAllFfMatchedProductIds(ff)
    const activeFfIds = new Set(
      activeProducts.map((p) => `${p.source_chain}-${p.source_id}`),
    )
    const matchedOnlyIds = matchedFfIds.filter((id) => !activeFfIds.has(id))
    const matchedInactive = await fetchFooddataProductsForFfIds(fooddata, matchedOnlyIds)

    const byFooddataUuid = new Map<string, Record<string, any>>()
    for (const p of activeProducts) byFooddataUuid.set(String(p.id), p)
    for (const p of matchedInactive) byFooddataUuid.set(String((p as any).id), p as any)
    const fooddataProducts = Array.from(byFooddataUuid.values())

    const mapped = fooddataProducts.map(mapProduct)
    productLookup = new Map(
      fooddataProducts.map((p) => [
        String(p.id),
        {
          id: `${p.source_chain}-${p.source_id}`,
          amount: p.amount ?? null,
          unit: p.unit ?? null,
          name: p.name,
        },
      ]),
    )
    if (!dryRun) {
      result.products.upserted = await upsertBatched(ff, 'products', mapped, 'id')
      for (const ref of productLookup.values()) {
        if (!ffIdsBeforeProducts.has(ref.id)) newlyImportedProductIds.push(ref.id)
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
      { activeOnly: true, limit },
    )
    productLookup = new Map(
      fooddataProducts.map((p) => [
        String(p.id),
        { id: `${p.source_chain}-${p.source_id}`, amount: p.amount ?? null, unit: p.unit ?? null, name: p.name },
      ]),
    )
  }

  // ─── 3. Product offers ──────────────────────────────────────────────────
  let ffProductIds: Set<string> | null = null
  if (!skipOffers || !skipHistory) {
    ffProductIds = new Set<string>()
    let from = 0
    while (true) {
      const { data, error } = await ff
        .from('products')
        .select('id')
        .order('id', { ascending: true })
        .range(from, from + FETCH_PAGE_SIZE - 1)
      if (error) throw new Error(`FF products fetch failed: ${error.message}`)
      if (!data || data.length === 0) break
      for (const r of data as { id: string }[]) ffProductIds.add(r.id)
      if (data.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
  }

  if (!skipOffers) {
    log('3/4 · PRODUCT_OFFERS')
    const fooddataOffers = await fetchAll<Record<string, any>>(
      fooddata,
      'product_offers',
      'product_id, store_id, price_cents, before_price_cents, unit_price_cents, unit_price_unit, is_on_sale, offer_from, offer_until, discount_percentage, in_stock, source, source_synced_at, raw_data',
    )
    const mapped = fooddataOffers
      .map((o) => mapOffer(o, productLookup))
      .filter((x): x is NonNullable<typeof x> => x !== null && ffProductIds!.has(x.product_id))
    result.offers.dropped = fooddataOffers.length - mapped.length
    if (!dryRun) {
      result.offers.upserted = await upsertBatched(
        ff,
        'product_offers',
        mapped,
        'store_id,store_product_id',
      )
    }
    log(
      `  offers: ${dryRun ? `${mapped.length} (dry-run)` : result.offers.upserted}, ${result.offers.dropped} dropped`,
    )
  }

  // ─── 4. Price history ───────────────────────────────────────────────────
  if (!skipHistory) {
    log('4/4 · PRICE_HISTORY')
    const fooddataHistory = await fetchAll<Record<string, any>>(
      fooddata,
      'price_history',
      'product_id, store_id, price_cents, before_price_cents, is_on_sale, snapshot_date',
    )
    const mapped = fooddataHistory
      .map((h) => mapHistory(h, productLookup))
      .filter((x): x is NonNullable<typeof x> => x !== null && (!ffProductIds || ffProductIds.has(x.product_id)))
    result.history.dropped = fooddataHistory.length - mapped.length
    if (!dryRun) {
      result.history.upserted = await upsertBatched(
        ff,
        'price_history',
        mapped,
        'product_id,store_id,snapshot_date',
      )
    }
    log(
      `  price_history: ${dryRun ? `${mapped.length} (dry-run)` : result.history.upserted}, ${result.history.dropped} dropped`,
    )
  } else {
    log('  price_history skipped')
  }

  // ─── 5. Match queue ─────────────────────────────────────────────────────
  if (!dryRun && !skipQueue) {
    log('5/5 · MATCH QUEUE')
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
  }

  if (pullCuration) {
    await runCurationPull()
  }

  result.durationMs = Date.now() - t0
  return result
}
