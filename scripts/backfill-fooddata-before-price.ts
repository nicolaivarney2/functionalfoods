/**
 * Backfill before_price_cents / is_on_sale / discount_percentage on existing
 * product_offers rows using the same pricing logic as the sync mappers.
 *
 * Run once after deploying mapper fixes, before the next full sync:
 *   npx tsx scripts/backfill-fooddata-before-price.ts
 *   npx tsx scripts/backfill-fooddata-before-price.ts --dry-run
 *   npx tsx scripts/backfill-fooddata-before-price.ts --store=netto
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { getGroceryServiceClient } from '../src/grocery/db/client'
import {
  resolveRemaOfferPricing,
} from '../src/grocery/adapters/rema1000/mapper'
import type { RemaPrice } from '../src/grocery/adapters/rema1000/types'
import {
  resolveBeforePriceCents,
} from '../src/grocery/adapters/salling-algolia/pricing'
import type { AlgoliaStoreData } from '../src/grocery/adapters/salling-algolia/types'

const SALLING_STORES = new Set(['netto', 'bilka', 'foetex'])
const ALL_STORES = [...SALLING_STORES, 'rema-1000']
const PAGE_SIZE = 500

interface OfferRow {
  id: string
  store_id: string
  price_cents: number | null
  before_price_cents: number | null
  is_on_sale: boolean
  discount_percentage: number | null
  raw_data: Record<string, unknown> | null
}

interface BackfillUpdate {
  id: string
  store_id: string
  before_price_cents: number | null
  is_on_sale: boolean
  discount_percentage: number | null
}

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=')
    args.set(k, v ?? true)
  }
}

const dryRun = Boolean(args.get('dry-run'))
const storeFilter =
  typeof args.get('store') === 'string' ? (args.get('store') as string) : null

function resolveSallingPricing(raw: Record<string, unknown>, priceCents: number) {
  const storeData = raw.storeData as AlgoliaStoreData | undefined
  if (!storeData || priceCents <= 0) {
    return { beforePriceCents: null as number | null, isOnSale: false, discountPct: null as number | null }
  }

  const hitContext = {
    cpOriginalPrice: Number(raw.cpOriginalPrice ?? 0),
    isInCurrentLeaflet: Boolean(raw.isInCurrentLeaflet),
  }

  const beforePriceCents = resolveBeforePriceCents(storeData, priceCents, hitContext)
  const isOnSale = beforePriceCents !== null

  let discountPct: number | null = null
  if (beforePriceCents && beforePriceCents > priceCents) {
    discountPct = Number(
      (((beforePriceCents - priceCents) / beforePriceCents) * 100).toFixed(2),
    )
  }

  return { beforePriceCents, isOnSale, discountPct }
}

function resolveRemaPricing(raw: Record<string, unknown>) {
  const prices = raw.prices as RemaPrice[] | undefined
  const pricing = resolveRemaOfferPricing(prices)
  if (!pricing) {
    return { beforePriceCents: null as number | null, isOnSale: false, discountPct: null as number | null }
  }

  return {
    beforePriceCents: pricing.beforePriceCents,
    isOnSale: pricing.isOnSale,
    discountPct: pricing.discountPct,
  }
}

function computeBackfill(row: OfferRow): BackfillUpdate | null {
  if (!row.raw_data || row.price_cents === null || row.price_cents <= 0) {
    if (row.is_on_sale || row.before_price_cents !== null) {
      return {
        id: row.id,
        store_id: row.store_id,
        before_price_cents: null,
        is_on_sale: false,
        discount_percentage: null,
      }
    }
    return null
  }

  const raw = row.raw_data
  let resolved: {
    beforePriceCents: number | null
    isOnSale: boolean
    discountPct: number | null
  }

  if (SALLING_STORES.has(row.store_id)) {
    resolved = resolveSallingPricing(raw, row.price_cents)
  } else if (row.store_id === 'rema-1000') {
    resolved = resolveRemaPricing(raw)
  } else {
    return null
  }

  if (
    row.before_price_cents === resolved.beforePriceCents &&
    row.is_on_sale === resolved.isOnSale &&
    row.discount_percentage === resolved.discountPct
  ) {
    return null
  }

  return {
    id: row.id,
    store_id: row.store_id,
    before_price_cents: resolved.beforePriceCents,
    is_on_sale: resolved.isOnSale,
    discount_percentage: resolved.discountPct,
  }
}

async function main() {
  const supabase = getGroceryServiceClient()
  const stores = storeFilter ? [storeFilter] : ALL_STORES

  console.log('────────────────────────────────────────')
  console.log('▶ Backfill fooddata before_price / is_on_sale')
  console.log(`  dryRun : ${dryRun}`)
  console.log(`  stores : ${stores.join(', ')}`)
  console.log(`  target : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log('────────────────────────────────────────')

  let scanned = 0
  let updated = 0
  let clearedFalseSales = 0
  let offset = 0

  const stats: Record<string, { scanned: number; updated: number; onSale: number }> = {}
  for (const store of stores) {
    stats[store] = { scanned: 0, updated: 0, onSale: 0 }
  }

  while (true) {
    const { data, error } = await supabase
      .from('product_offers')
      .select('id, store_id, price_cents, before_price_cents, is_on_sale, discount_percentage, raw_data')
      .in('store_id', stores)
      .not('raw_data', 'is', null)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) throw new Error(`Select failed: ${error.message}`)
    if (!data || data.length === 0) break

    const batchUpdates: BackfillUpdate[] = []

    for (const row of data as OfferRow[]) {
      scanned++
      stats[row.store_id] = stats[row.store_id] ?? { scanned: 0, updated: 0, onSale: 0 }
      stats[row.store_id].scanned++

      const update = computeBackfill(row)
      if (!update) continue

      batchUpdates.push(update)
      if (row.is_on_sale && !update.is_on_sale) clearedFalseSales++
      if (update.is_on_sale) stats[row.store_id].onSale++
    }

    if (batchUpdates.length > 0) {
      updated += batchUpdates.length
      for (const u of batchUpdates) {
        stats[u.store_id].updated++
      }

      if (!dryRun) {
        for (const u of batchUpdates) {
          const { error: updateError } = await supabase
            .from('product_offers')
            .update({
              before_price_cents: u.before_price_cents,
              is_on_sale: u.is_on_sale,
              discount_percentage: u.discount_percentage,
            })
            .eq('id', u.id)

          if (updateError) {
            throw new Error(`Update failed for ${u.id}: ${updateError.message}`)
          }
        }
      }
    }

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  console.log('')
  console.log(`✓ Scanned ${scanned} offers`)
  console.log(`  rows ${dryRun ? 'would update' : 'updated'}: ${updated}`)
  console.log(`  false is_on_sale cleared: ${clearedFalseSales}`)
  console.log('')
  for (const store of stores) {
    const s = stats[store]
    console.log(`  ${store}: scanned=${s.scanned}, updated=${s.updated}, on_sale=${s.onSale}`)
  }

  if (!dryRun && updated > 0) {
    console.log('')
    console.log('Verification query (run in Supabase SQL):')
    console.log(`SELECT store_id,
  COUNT(*) FILTER (WHERE is_on_sale) AS on_sale,
  COUNT(*) FILTER (WHERE before_price_cents > price_cents + 1) AS real_discount
FROM product_offers
WHERE store_id IN (${stores.map((s) => `'${s}'`).join(', ')})
GROUP BY store_id;`)
  }
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
