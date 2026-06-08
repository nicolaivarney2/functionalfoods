/**
 * Import fooddata → FF Supabase (main app DB).
 *
 * One-shot import (idempotent via UPSERT) of stores, products, product_offers,
 * and price_history from the shared fooddata Supabase into Planomo's local
 * tables. After import, `product_ingredient_matches.product_external_id` will
 * resolve against `products.id` (text, format: `<source_chain>-<source_id>`).
 *
 * Usage:
 *   npx tsx scripts/import-fooddata-to-ff.ts            # full import
 *   npx tsx scripts/import-fooddata-to-ff.ts --dry-run  # show counts only
 *   npx tsx scripts/import-fooddata-to-ff.ts --skip-history  # skip price_history
 *   npx tsx scripts/import-fooddata-to-ff.ts --limit=100    # smoke test
 *   npx tsx scripts/import-fooddata-to-ff.ts --enqueue-unmatched  # fill match queue (all unmatched)
 *   npx tsx scripts/import-fooddata-to-ff.ts --skip-queue   # no queue writes
 *   npx tsx scripts/import-fooddata-to-ff.ts --pull-curation  # pull matches/tags fra fooddata
 *   npx tsx scripts/import-fooddata-to-ff.ts --curation-only  # kun pull (ingen katalog-import)
 *
 * Mapping reference: see FOODDATA_IMPORT_ANSWERS.md.
 *
 * SAFETY: Reads from fooddata (READ-only). Writes ONLY to Planomo.
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { pullCurationFromFooddata } from '../src/lib/fooddata-import/curation-pull'
import { parseFooddataProductId } from '../src/lib/product-match-snapshots'
import { enqueueUnmatchedFooddataProducts } from '../src/lib/product-match-queue'

const args = new Set(process.argv.slice(2))
const limitArg = process.argv.slice(2).find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null
const DRY_RUN = args.has('--dry-run')
const SKIP_HISTORY = args.has('--skip-history')
const SKIP_PRODUCTS = args.has('--skip-products')
const SKIP_OFFERS = args.has('--skip-offers')
const SKIP_QUEUE = args.has('--skip-queue')
const ENQUEUE_UNMATCHED = args.has('--enqueue-unmatched')
const PULL_CURATION = args.has('--pull-curation')
const CURATION_ONLY = args.has('--curation-only')
const PULL_QUEUE = args.has('--pull-queue')

const BATCH_SIZE = 2000
const FETCH_PAGE_SIZE = 1000

function getFooddataClient(): SupabaseClient {
  const url = process.env.GROCERY_SUPABASE_URL
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error('Missing GROCERY_SUPABASE_URL or GROCERY_SUPABASE_SECRET_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  })
}

function getFfClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  })
}

function bar(label: string) {
  console.log('\n' + '═'.repeat(60))
  console.log(`▶ ${label}`)
  console.log('═'.repeat(60))
}

async function fetchAll<T = any>(
  client: SupabaseClient,
  table: string,
  selectCols: string,
  options: { activeOnly?: boolean } = {},
): Promise<T[]> {
  const all: T[] = []
  let from = 0
  const pageSize = FETCH_PAGE_SIZE

  while (true) {
    // Deterministic order — uden ORDER BY kan range() springe rækker over (Postgres).
    let q = client
      .from(table)
      .select(selectCols)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (options.activeOnly) q = q.eq('active', true)

    const { data, error } = await q
    if (error) throw new Error(`fetchAll(${table}) failed: ${error.message}`)
    if (!data || data.length === 0) break

    all.push(...(data as T[]))
    process.stdout.write(`\r  fetched ${all.length}…`)

    if (data.length < pageSize) break
    from += pageSize
    if (LIMIT && all.length >= LIMIT) break
  }
  process.stdout.write('\n')
  return LIMIT ? all.slice(0, LIMIT) : all
}

const PRODUCT_SELECT_COLS =
  'id, source_chain, source_id, gtin, name, brand, manufacturer, description, amount, unit, image_url, category_path, category_lvl0, category_lvl1, category_lvl2, last_seen_at, active'

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
): Promise<any[]> {
  const rows: any[] = []
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

    if (error) {
      console.warn('  ⚠ fetch matched products batch:', error.message)
      continue
    }
    for (const row of data || []) {
      const key = String(row.id)
      if (seen.has(key)) continue
      seen.add(key)
      rows.push(row)
    }
  }
  return rows
}

function dedupeByConflictKey<T extends Record<string, any>>(
  rows: T[],
  onConflict: string,
): T[] {
  const keys = onConflict.split(',').map((k) => k.trim()).filter(Boolean)
  const seen = new Map<string, T>()
  for (const row of rows) {
    const id =
      keys.length > 0
        ? keys.map((k) => String(row[k] ?? '')).join('\0')
        : String(row.id ?? '')
    if (id) seen.set(id, row)
  }
  return Array.from(seen.values())
}

async function upsertBatched<T extends Record<string, any>>(
  client: SupabaseClient,
  table: string,
  rows: T[],
  onConflict: string,
): Promise<void> {
  const uniqueRows = dedupeByConflictKey(rows, onConflict)
  if (uniqueRows.length < rows.length) {
    console.log(`  ↳ deduped ${rows.length - uniqueRows.length} duplicate ${onConflict} rows`)
  }
  let done = 0
  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE)
    const { error } = await client.from(table).upsert(batch, { onConflict })
    if (error) {
      console.error(`\n  ✗ upsert batch ${i}-${i + batch.length} failed:`, error.message)
      throw error
    }
    done += batch.length
    process.stdout.write(`\r  upserted ${done}/${uniqueRows.length}…`)
  }
  process.stdout.write('\n')
}

// ─── Mappers ──────────────────────────────────────────────────────────────

function mapStore(s: any) {
  return {
    id: s.id,
    name: s.name,
    updated_at: new Date().toISOString(),
  }
}

function mapProduct(p: any) {
  const id = `${p.source_chain}-${p.source_id}`
  return {
    id,
    ean: p.gtin ?? null,
    name_generic: p.name,
    brand: p.brand ?? null,
    category: p.category_lvl1 ?? null,
    subcategory: p.category_lvl2 ?? null,
    department: p.category_lvl0 ?? null,
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

function mapOffer(o: any, productLookup: Map<string, { id: string; amount: number | null; unit: string | null; name: string }>) {
  const ref = productLookup.get(o.product_id)
  if (!ref) return null
  const now = new Date()
  const fromOk = !o.offer_from || new Date(o.offer_from) <= now
  const untilOk = !o.offer_until || new Date(o.offer_until) > now
  const currentKr = o.price_cents != null ? Number(o.price_cents) / 100 : 0
  const beforeKr = resolveBeforePriceKr(o)
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

function mapHistory(h: any, productLookup: Map<string, { id: string }>) {
  const ref = productLookup.get(h.product_id)
  if (!ref) return null
  return {
    product_id: ref.id,
    store_id: h.store_id,
    price_cents: h.price_cents,
    before_price_cents: h.before_price_cents ?? null,
    is_on_sale: !!h.is_on_sale,
    snapshot_date: h.snapshot_date,
  }
}

async function runCurationPull(ff: SupabaseClient, fooddata: SupabaseClient) {
  bar('CURATION · pull matches/tags from fooddata')
  if (DRY_RUN) {
    console.log('  DRY-RUN — pull skipped (use sync-fooddata-curation-to-ff.ts without --dry-run)')
    return
  }
  const result = await pullCurationFromFooddata(ff, fooddata, {
    pullQueue: PULL_QUEUE,
  })
  console.log(
    `  ✓ matches: ${result.matches.upserted} upserted (${result.matches.skipped} skipped)`,
  )
  console.log(`  ✓ tags: ${result.tags.updated} updated (${result.tags.skipped} skipped)`)
  console.log(`  ✓ organic: ${result.organic.updated} updated (${result.organic.skipped} skipped)`)
  if (PULL_QUEUE) {
    console.log(`  ✓ queue: ${result.queue.upserted} upserted (${result.queue.skipped} skipped)`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const fooddata = getFooddataClient()
  const ff = getFfClient()

  bar('Pre-flight check')
  console.log(`  fooddata URL : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log(`  ff URL  : ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`  dry-run      : ${DRY_RUN}`)
  console.log(`  limit        : ${LIMIT ?? 'none'}`)
  console.log(`  skip-history : ${SKIP_HISTORY}`)
  console.log(`  batch size   : ${BATCH_SIZE}`)
  console.log(`  pull-curation: ${PULL_CURATION || CURATION_ONLY}`)
  console.log(`  curation-only: ${CURATION_ONLY}`)

  if (CURATION_ONLY) {
    await runCurationPull(ff, fooddata)
    bar('DONE')
    console.log('  Curation pull complete.')
    return
  }

  // ─── 1. Stores ──────────────────────────────────────────────────────────
  bar('1/4 · STORES')
  const fooddataStores = await fetchAll(fooddata, 'stores', '*')
  console.log(`  ↳ ${fooddataStores.length} rows from fooddata`)
  const mappedStores = fooddataStores.map(mapStore)
  if (DRY_RUN) {
    console.log('  DRY-RUN — sample:', JSON.stringify(mappedStores[0], null, 2))
  } else {
    await upsertBatched(ff, 'stores', mappedStores, 'id')
    console.log('  ✓ stores upserted')
  }

  // ─── 2. Products ────────────────────────────────────────────────────────
  let productLookup = new Map<string, { id: string; amount: number | null; unit: string | null; name: string }>()
  let newlyImportedProductIds: string[] = []
  const ffIdsBeforeProducts = new Set<string>()
  if (!SKIP_PRODUCTS && !DRY_RUN) {
    let from = 0
    while (true) {
      const { data, error } = await ff.from('products').select('id').order('id').range(from, from + FETCH_PAGE_SIZE - 1)
      if (error) throw error
      if (!data?.length) break
      for (const r of data as { id: string }[]) ffIdsBeforeProducts.add(r.id)
      if (data.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
  }
  if (!SKIP_PRODUCTS) {
    bar('2/4 · PRODUCTS')
    const activeProducts = await fetchAll(fooddata, 'products', PRODUCT_SELECT_COLS, {
      activeOnly: true,
    })
    console.log(`  ↳ ${activeProducts.length} active products from fooddata`)

    const matchedFfIds = await fetchAllFfMatchedProductIds(ff)
    const activeFfIds = new Set(
      activeProducts.map((p: any) => `${p.source_chain}-${p.source_id}`),
    )
    const matchedOnlyIds = matchedFfIds.filter((id) => !activeFfIds.has(id))
    const matchedInactive = await fetchFooddataProductsForFfIds(fooddata, matchedOnlyIds)
    if (matchedInactive.length > 0) {
      console.log(
        `  ↳ ${matchedInactive.length} extra catalog rows for matched products (inactive in fooddata)`,
      )
    }

    const byFooddataUuid = new Map<string, any>()
    for (const p of activeProducts) byFooddataUuid.set(String(p.id), p)
    for (const p of matchedInactive) byFooddataUuid.set(String(p.id), p)
    const fooddataProducts = Array.from(byFooddataUuid.values())

    const mapped = fooddataProducts.map(mapProduct)
    productLookup = new Map(
      fooddataProducts.map((p: any) => [
        p.id,
        {
          id: `${p.source_chain}-${p.source_id}`,
          amount: p.amount ?? null,
          unit: p.unit ?? null,
          name: p.name,
        },
      ]),
    )
    if (DRY_RUN) {
      console.log('  DRY-RUN — sample:', JSON.stringify(mapped[0], null, 2))
    } else {
      await upsertBatched(ff, 'products', mapped, 'id')
      console.log('  ✓ products upserted')
      for (const ref of productLookup.values()) {
        if (!ffIdsBeforeProducts.has(ref.id)) newlyImportedProductIds.push(ref.id)
      }
      console.log(`  ↳ ${newlyImportedProductIds.length} nye product_id til match-kø`)
    }
  } else {
    console.log('\n  ⊘ products skipped — building lookup from fooddata (active only, matching Planomo state)')
    const fooddataProducts = await fetchAll(
      fooddata,
      'products',
      'id, source_chain, source_id, name, amount, unit',
      { activeOnly: true },
    )
    productLookup = new Map(
      fooddataProducts.map((p: any) => [
        p.id,
        { id: `${p.source_chain}-${p.source_id}`, amount: p.amount ?? null, unit: p.unit ?? null, name: p.name },
      ]),
    )
  }

  // ─── 3. Product offers ──────────────────────────────────────────────────
  let ffProductIds: Set<string> | null = null
  if (!SKIP_OFFERS || !SKIP_HISTORY) {
    process.stdout.write('  ↳ fetching Planomo product IDs as FK whitelist…')
    ffProductIds = new Set<string>()
    let from = 0
    while (true) {
      const { data, error } = await ff
        .from('products')
        .select('id')
        .order('id', { ascending: true })
        .range(from, from + FETCH_PAGE_SIZE - 1)
      if (error) throw new Error(`Planomo products fetch failed: ${error.message}`)
      if (!data || data.length === 0) break
      for (const r of data as { id: string }[]) ffProductIds.add(r.id)
      if (data.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
    process.stdout.write(` ${ffProductIds.size} ids\n`)
  }
  if (!SKIP_OFFERS) {
    bar('3/4 · PRODUCT_OFFERS')
    const fooddataOffers = await fetchAll(
      fooddata,
      'product_offers',
      'product_id, store_id, price_cents, before_price_cents, unit_price_cents, unit_price_unit, is_on_sale, offer_from, offer_until, discount_percentage, in_stock, source, source_synced_at, raw_data',
    )
    console.log(`  ↳ ${fooddataOffers.length} offers from fooddata`)
    const mapped = fooddataOffers
      .map((o: any) => mapOffer(o, productLookup))
      .filter((x: any): x is NonNullable<typeof x> => x !== null && ffProductIds!.has(x.product_id))
    const dropped = fooddataOffers.length - mapped.length
    if (dropped > 0) console.log(`  ⚠ ${dropped} offers dropped (no matching product in Planomo)`)
    if (DRY_RUN) {
      console.log('  DRY-RUN — sample:', JSON.stringify(mapped[0], null, 2))
    } else {
      await upsertBatched(ff, 'product_offers', mapped, 'store_id,store_product_id')
      console.log('  ✓ product_offers upserted')
    }
  }

  // ─── 4. Price history ───────────────────────────────────────────────────
  if (!SKIP_HISTORY) {
    bar('4/4 · PRICE_HISTORY')
    const fooddataHistory = await fetchAll(
      fooddata,
      'price_history',
      'product_id, store_id, price_cents, before_price_cents, is_on_sale, snapshot_date',
    )
    console.log(`  ↳ ${fooddataHistory.length} snapshots from fooddata`)
    const mapped = fooddataHistory
      .map((h: any) => mapHistory(h, productLookup))
      .filter((x: any): x is NonNullable<typeof x> => x !== null && (!ffProductIds || ffProductIds.has(x.product_id)))
    const dropped = fooddataHistory.length - mapped.length
    if (dropped > 0) console.log(`  ⚠ ${dropped} snapshots dropped (no matching product in Planomo)`)
    if (DRY_RUN) {
      console.log('  DRY-RUN — sample:', JSON.stringify(mapped[0], null, 2))
    } else {
      await upsertBatched(ff, 'price_history', mapped, 'product_id,store_id,snapshot_date')
      console.log('  ✓ price_history upserted')
    }
  } else {
    console.log('\n  ⊘ price_history skipped (--skip-history)')
  }

  if (!DRY_RUN && !SKIP_QUEUE) {
    bar('5/5 · MATCH QUEUE (nye fooddata-varer)')
    if (ENQUEUE_UNMATCHED) {
      const queueResult = await enqueueUnmatchedFooddataProducts(ff)
      console.log(
        `  ✓ kø: ${queueResult.inserted} tilføjet, ${queueResult.skippedAlreadyMatched} allerede matchet, ${queueResult.skippedAlreadyQueued} allerede i kø, ${queueResult.skippedNonFood} non-food sprunget over`,
      )
    } else if (newlyImportedProductIds.length > 0) {
      const queueResult = await enqueueUnmatchedFooddataProducts(ff, {
        productIds: newlyImportedProductIds,
      })
      console.log(
        `  ✓ kø: ${queueResult.inserted} nye mad-varer, ${queueResult.skippedAlreadyMatched} matchet, ${queueResult.skippedAlreadyQueued} i kø, ${queueResult.skippedNonFood} non-food`,
      )
    } else {
      console.log('  ⊘ ingen nye product_id — match-kø springes over')
    }
  } else if (SKIP_QUEUE) {
    console.log('\n  ⊘ match queue skipped (--skip-queue)')
  }

  if (PULL_CURATION) {
    await runCurationPull(ff, fooddata)
  }

  bar('DONE')
  console.log(DRY_RUN ? '  Dry-run finished — no writes performed.' : '  Import complete.')
}

main().catch((err) => {
  console.error('\nFATAL', err)
  process.exit(1)
})
