/**
 * READ-ONLY oversigt over data pr. butik/kæde i fooddata-DB'en.
 * Skriver intet. Brug: npx tsx scripts/fooddata-store-breakdown.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const PAGE = 1000

function client(): SupabaseClient {
  const url = process.env.GROCERY_SUPABASE_URL
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing GROCERY_SUPABASE_URL / GROCERY_SUPABASE_SECRET_KEY')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  })
}

async function fetchAll<T>(c: SupabaseClient, table: string, cols: string): Promise<T[]> {
  const out: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await c.from(table).select(cols).range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

function ago(iso: string | null): string {
  if (!iso) return '—'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return `${iso.slice(0, 10)} (${d}d)`
}

function table(rows: (string | number)[][], headers: string[]) {
  const all = [headers, ...rows.map((r) => r.map(String))]
  const widths = headers.map((_, i) => Math.max(...all.map((r) => r[i].length)))
  for (const r of all) {
    console.log('  ' + r.map((c, i) => c.padEnd(widths[i])).join('  '))
  }
}

async function main() {
  const c = client()

  const stores = await fetchAll<{ id: string; name: string }>(c, 'stores', 'id, name')
  const storeName = new Map(stores.map((s) => [s.id, s.name]))

  const products = await fetchAll<{ source_chain: string; active: boolean; last_seen_at: string | null }>(
    c, 'products', 'source_chain, active, last_seen_at',
  )
  const offers = await fetchAll<{ store_id: string; source: string; is_on_sale: boolean; source_synced_at: string | null }>(
    c, 'product_offers', 'store_id, source, is_on_sale, source_synced_at',
  )

  // 1) Produkter pr. kæde
  const byChain = new Map<string, { products: number; active: number; last: string | null }>()
  for (const p of products) {
    const e = byChain.get(p.source_chain) ?? { products: 0, active: 0, last: null }
    e.products++
    if (p.active) e.active++
    if (p.last_seen_at && (!e.last || p.last_seen_at > e.last)) e.last = p.last_seen_at
    byChain.set(p.source_chain, e)
  }
  console.log('\n══ 1) PRODUKTER pr. kæde (source_chain) ══')
  table(
    [...byChain.entries()].sort((a, b) => b[1].products - a[1].products)
      .map(([k, v]) => [k, v.products, v.active, ago(v.last)]),
    ['source_chain', 'products', 'active', 'last_seen'],
  )

  // 2) Tilbud pr. butik
  const byStore = new Map<string, { offers: number; onSale: number; last: string | null }>()
  for (const o of offers) {
    const e = byStore.get(o.store_id) ?? { offers: 0, onSale: 0, last: null }
    e.offers++
    if (o.is_on_sale) e.onSale++
    if (o.source_synced_at && (!e.last || o.source_synced_at > e.last)) e.last = o.source_synced_at
    byStore.set(o.store_id, e)
  }
  console.log('\n══ 2) TILBUD pr. butik (store_id) ══')
  table(
    [...byStore.entries()].sort((a, b) => b[1].offers - a[1].offers)
      .map(([k, v]) => [k, storeName.get(k) ?? '?', v.offers, v.onSale, ago(v.last)]),
    ['store_id', 'name', 'offers', 'on_sale', 'last_sync'],
  )

  // 3) Tilbud pr. datakilde
  const bySource = new Map<string, { offers: number; last: string | null }>()
  for (const o of offers) {
    const e = bySource.get(o.source) ?? { offers: 0, last: null }
    e.offers++
    if (o.source_synced_at && (!e.last || o.source_synced_at > e.last)) e.last = o.source_synced_at
    bySource.set(o.source, e)
  }
  console.log('\n══ 3) TILBUD pr. datakilde (source/adapter) ══')
  table(
    [...bySource.entries()].sort((a, b) => b[1].offers - a[1].offers)
      .map(([k, v]) => [k, v.offers, ago(v.last)]),
    ['source', 'offers', 'last_sync'],
  )

  // 4) Seneste sync-kørsler
  const { data: logs } = await c
    .from('sync_logs')
    .select('source, status, started_at')
    .order('started_at', { ascending: false })
    .limit(20)
  console.log('\n══ 4) SENESTE SYNC-KØRSLER ══')
  for (const l of logs ?? []) {
    console.log(`  ${String(l.started_at).slice(0, 19)}  [${l.status}]  ${l.source}`)
  }

  console.log('\n(intet blev skrevet)')
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
