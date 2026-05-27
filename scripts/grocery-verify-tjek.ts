#!/usr/bin/env tsx
/**
 * Quick post-sync verification script for Tjek-sourced offers.
 *
 * Run after `grocery-sync-tjek.ts` to confirm DB landed as expected:
 * counts per chain, sample top-discount offers, freshness, sync_logs.
 *
 *   npx tsx scripts/grocery-verify-tjek.ts
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { getGroceryServiceClient } from '../src/grocery/db/client'

const TJEK_SOURCE = 'tjek:offers'
const TJEK_CHAINS = [
  'lidl',
  'meny',
  'spar',
  'min-koebmand',
  'loevbjerg',
  'kvickly',
  'superbrugsen',
  'brugsen',
  '365discount',
  'abc-lavpris',
]

async function main(): Promise<void> {
  const supabase = getGroceryServiceClient()

  console.log('────────────────────────────────────────')
  console.log('▶ Tjek post-sync verification')
  console.log('────────────────────────────────────────\n')

  console.log('1) Latest sync_logs for source=tjek:offers (last 3)')
  const { data: logs, error: logErr } = await supabase
    .from('sync_logs')
    .select(
      'id, status, started_at, completed_at, duration_ms, offers_processed, offers_created, offers_updated, errors_count, error_message',
    )
    .eq('source', TJEK_SOURCE)
    .order('started_at', { ascending: false })
    .limit(3)

  if (logErr) {
    console.error('  ✗', logErr.message)
  } else {
    console.table(
      (logs ?? []).map((l) => ({
        status: l.status,
        started: l.started_at,
        dur_s: l.duration_ms ? Math.round(l.duration_ms / 1000) : null,
        offers_processed: l.offers_processed,
        created: l.offers_created,
        updated: l.offers_updated,
        errors: l.errors_count,
      })),
    )
  }
  console.log()

  console.log('2) Total Tjek-sourced products + offers')
  const { count: tjekProducts } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .in('source_chain', TJEK_CHAINS)

  const { count: tjekOffers } = await supabase
    .from('product_offers')
    .select('id', { count: 'exact', head: true })
    .eq('source', TJEK_SOURCE)

  console.log(`   products (Tjek chains): ${tjekProducts ?? 0}`)
  console.log(`   product_offers (Tjek):  ${tjekOffers ?? 0}\n`)

  console.log('3) Products per chain (from Tjek source)')
  const { data: byChain, error: chainErr } = await supabase
    .from('products')
    .select('source_chain')
    .in('source_chain', TJEK_CHAINS)

  if (chainErr) {
    console.error('  ✗', chainErr.message)
  } else {
    const counts: Record<string, number> = {}
    for (const row of byChain ?? []) {
      counts[row.source_chain] = (counts[row.source_chain] ?? 0) + 1
    }
    console.table(
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([chain, count]) => ({ chain, count })),
    )
  }
  console.log()

  console.log('4) Sample top-discount offers (top 10)')
  const { data: topOffers, error: topErr } = await supabase
    .from('product_offers')
    .select(
      'store_id, price_cents, before_price_cents, discount_percentage, offer_until, products!inner(name, source_chain)',
    )
    .eq('source', TJEK_SOURCE)
    .not('discount_percentage', 'is', null)
    .order('discount_percentage', { ascending: false })
    .limit(10)

  if (topErr) {
    console.error('  ✗', topErr.message)
  } else {
    console.table(
      (topOffers ?? []).map((o) => ({
        chain: (o as { products?: { source_chain?: string } }).products?.source_chain ?? '?',
        name: ((o as { products?: { name?: string } }).products?.name ?? '').slice(0, 50),
        price_kr: ((o.price_cents ?? 0) / 100).toFixed(2),
        before_kr:
          o.before_price_cents != null
            ? (o.before_price_cents / 100).toFixed(2)
            : '—',
        discount_pct: o.discount_percentage,
        ends: o.offer_until?.slice(0, 10),
      })),
    )
  }
  console.log()

  console.log('5) Average discount per chain (only offers WITH before-price)')
  const { data: allOffers, error: avgErr } = await supabase
    .from('product_offers')
    .select('discount_percentage, products!inner(source_chain)')
    .eq('source', TJEK_SOURCE)
    .not('discount_percentage', 'is', null)

  if (avgErr) {
    console.error('  ✗', avgErr.message)
  } else {
    const buckets: Record<string, { sum: number; count: number }> = {}
    for (const row of allOffers ?? []) {
      const chain =
        (row as { products?: { source_chain?: string } }).products?.source_chain ?? '?'
      const pct = Number(row.discount_percentage ?? 0)
      if (!buckets[chain]) buckets[chain] = { sum: 0, count: 0 }
      buckets[chain].sum += pct
      buckets[chain].count += 1
    }
    console.table(
      Object.entries(buckets)
        .sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)
        .map(([chain, { sum, count }]) => ({
          chain,
          offers_with_discount: count,
          avg_discount_pct: Math.round(sum / count),
        })),
    )
  }
  console.log()

  console.log('6) Freshness check — newest offer_until per chain')
  for (const chain of TJEK_CHAINS) {
    const { data: fresh, error } = await supabase
      .from('product_offers')
      .select('offer_from, offer_until, products!inner(source_chain)')
      .eq('source', TJEK_SOURCE)
      .eq('products.source_chain', chain)
      .order('offer_until', { ascending: false })
      .limit(1)
    if (error) {
      console.log(`   ${chain.padEnd(15)} ✗ ${error.message}`)
      continue
    }
    const row = fresh?.[0]
    if (!row) {
      console.log(`   ${chain.padEnd(15)} (no rows)`)
      continue
    }
    console.log(
      `   ${chain.padEnd(15)} from ${row.offer_from?.slice(0, 10) ?? '?'} → until ${row.offer_until?.slice(0, 10) ?? '?'}`,
    )
  }
  console.log()

  console.log('7) Sanity check: any Tjek-offers without is_on_sale=true?')
  const { count: notOnSale } = await supabase
    .from('product_offers')
    .select('id', { count: 'exact', head: true })
    .eq('source', TJEK_SOURCE)
    .eq('is_on_sale', false)
  console.log(`   product_offers with source=tjek:offers AND is_on_sale=false: ${notOnSale ?? 0}`)
  console.log(`   (expected: 0 — Tjek catalogs are inherently sale-only)\n`)

  console.log('8) Top 5 categories captured from Tjek')
  const { data: categories, error: catErr } = await supabase
    .from('products')
    .select('category_lvl0')
    .in('source_chain', TJEK_CHAINS)
    .not('category_lvl0', 'is', null)

  if (catErr) {
    console.error('  ✗', catErr.message)
  } else {
    const catCounts: Record<string, number> = {}
    for (const row of categories ?? []) {
      const c = row.category_lvl0 ?? '?'
      catCounts[c] = (catCounts[c] ?? 0) + 1
    }
    console.table(
      Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
    )
  }
}

main().catch((err) => {
  console.error('\n✗ Verification failed:', err)
  process.exit(1)
})
