#!/usr/bin/env tsx
/**
 * Goma vs grocery-service: per-chain comparison.
 *
 * Goma writes to `product_offers` in the MAIN functionalfoods Supabase,
 * keyed by `store_id` matching our SourceChain convention.
 * Grocery-service has its own Supabase project with its own products +
 * product_offers tables.
 *
 *   npx tsx scripts/grocery-compare-goma.ts
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getGroceryServiceClient } from '../src/grocery/db/client'

const CHAINS = [
  'netto',
  'foetex',
  'bilka',
  'rema-1000',
  'nemlig',
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
]

async function countOffers(
  client: SupabaseClient,
  storeId: string,
  filter?: { onSaleOnly?: boolean },
): Promise<number> {
  let q = client
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
  if (filter?.onSaleOnly) q = q.eq('is_on_sale', true)
  const { count, error } = await q
  if (error) throw new Error(`count ${storeId}: ${error.message}`)
  return count ?? 0
}

async function main(): Promise<void> {
  const mainUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const mainKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!mainUrl || !mainKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  const main = createClient(mainUrl, mainKey)
  const grocery = getGroceryServiceClient()

  console.log('────────────────────────────────────────')
  console.log('▶ Goma vs grocery-service: per-chain comparison')
  console.log('  (counts from product_offers in both projects)')
  console.log('────────────────────────────────────────\n')

  // ── Aggregate sanity check ──────────────────────────────────────────
  const { count: mainOffersTotal } = await main
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
  const { count: mainOnSaleTotal } = await main
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_on_sale', true)
  const { count: groceryOffersTotal } = await grocery
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
  const { count: groceryOnSaleTotal } = await grocery
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .eq('is_on_sale', true)

  // ── Per-chain rows ──────────────────────────────────────────────────
  const rows: Array<{
    chain: string
    goma_offers: number
    goma_on_sale: number
    grocery_offers: number
    grocery_on_sale: number
    Δ_total: number
    Δ_on_sale: number
  }> = []

  for (const chain of CHAINS) {
    const [gT, gS, oT, oS] = await Promise.all([
      countOffers(main, chain),
      countOffers(main, chain, { onSaleOnly: true }),
      countOffers(grocery, chain),
      countOffers(grocery, chain, { onSaleOnly: true }),
    ])
    rows.push({
      chain,
      goma_offers: gT,
      goma_on_sale: gS,
      grocery_offers: oT,
      grocery_on_sale: oS,
      Δ_total: oT - gT,
      Δ_on_sale: oS - gS,
    })
  }

  rows.sort((a, b) => b.goma_offers - a.goma_offers)

  console.log('Per-chain comparison:')
  console.table(rows)
  console.log()

  // ── Aggregate ───────────────────────────────────────────────────────
  console.log('Aggregate totals (across all stores, including any not in our chain list):')
  console.table([
    {
      side: 'Goma (main DB)',
      total_offers: mainOffersTotal ?? 0,
      on_sale_offers: mainOnSaleTotal ?? 0,
    },
    {
      side: 'Grocery service',
      total_offers: groceryOffersTotal ?? 0,
      on_sale_offers: groceryOnSaleTotal ?? 0,
    },
  ])

  // ── Coverage gap analysis ───────────────────────────────────────────
  console.log('\nCoverage gap (what Goma has that we are missing):')
  const gaps = rows
    .filter((r) => r.Δ_on_sale < 0)
    .map((r) => ({
      chain: r.chain,
      missing_on_sale: -r.Δ_on_sale,
      goma_on_sale: r.goma_on_sale,
      grocery_on_sale: r.grocery_on_sale,
    }))
  if (gaps.length === 0) {
    console.log('  ✓ No on-sale gaps — grocery service matches or exceeds Goma per chain')
  } else {
    console.table(gaps)
  }

  // ── Discover any store_ids in Goma not in our chain list ────────────
  console.log('\nDiscovering all distinct store_ids in Goma:')
  const seen = new Set<string>()
  const pageSize = 1000
  for (let from = 0; from < 200_000; from += pageSize) {
    const { data, error } = await main
      .from('product_offers')
      .select('store_id')
      .range(from, from + pageSize - 1)
    if (error) break
    if (!data || data.length === 0) break
    for (const r of data) if (r.store_id) seen.add(r.store_id as string)
    if (data.length < pageSize) break
  }
  console.log(`  Goma has ${seen.size} distinct store_ids:`, [...seen].sort().join(', '))
  const missing = [...seen].filter((s) => !CHAINS.includes(s)).sort()
  if (missing.length > 0) {
    console.log(`  ⚠ store_ids not in our chain list: ${missing.join(', ')}`)
  }
}

main().catch((err) => {
  console.error('\n✗ Comparison failed:', err)
  process.exit(1)
})
