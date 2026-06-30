/**
 * READ-ONLY diagnose v2 — hvorfor mangler/forkert er Goma-kæder?
 *
 *   npx tsx scripts/diagnose-goma-chains.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const GOMA_CHAINS = [
  'lidl', '365discount', 'kvickly', 'superbrugsen', 'brugsen',
  'meny', 'spar', 'loevbjerg', 'abc-lavpris', 'min-koebmand', 'nemlig',
]

function getFooddata(): SupabaseClient {
  const url = process.env.GROCERY_SUPABASE_URL!
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}
function getFf(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function cnt(c: SupabaseClient, table: string, f: (q: any) => any): Promise<number> {
  let q = c.from(table).select('id', { count: 'exact', head: true })
  q = f(q)
  const { count, error } = await q
  if (error) { console.error(`  ! ${table}:`, error.message); return -1 }
  return count ?? 0
}
const p = (s: any, n: number) => String(s).padEnd(n)
const nowIso = new Date().toISOString()

async function ffDiscountFlagBug(c: SupabaseClient) {
  console.log('\n' + '═'.repeat(90))
  console.log('▶ FF: rabat-men-ikke-on_sale (norm > cur men is_on_sale=false), kun src=goma')
  console.log('═'.repeat(90))
  console.log(p('chain', 14), p('goma', 8), p('m.rabat', 9), p('rabat&sale', 11), p('rabat&IKKE', 11), p('until_past', 11), p('until_null', 11))
  for (const ch of GOMA_CHAINS) {
    const goma = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma'))
    // rabat = normal_price > current_price (kræver begge sat). PostgREST kan ikke col>col, så filtrer i app via sample.
    const discount = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').not('normal_price', 'is', null).gt('normal_price', 0))
    const discSale = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').not('normal_price', 'is', null).gt('normal_price', 0).eq('is_on_sale', true))
    const discNo = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').not('normal_price', 'is', null).gt('normal_price', 0).eq('is_on_sale', false))
    const untilPast = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').not('sale_valid_to', 'is', null).lt('sale_valid_to', nowIso))
    const untilNull = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').is('sale_valid_to', null))
    console.log(p(ch, 14), p(goma, 8), p(discount, 9), p(discSale, 11), p(discNo, 11), p(untilPast, 11), p(untilNull, 11))
  }
}

async function fooddataGomaState(c: SupabaseClient) {
  console.log('\n' + '═'.repeat(90))
  console.log('▶ FOODDATA: Goma offers state (er de overhovedet synket + dato)')
  console.log('═'.repeat(90))
  console.log(p('chain', 14), p('goma_off', 9), p('on_sale', 9), p('until_past', 11), p('until_null', 11))
  for (const ch of GOMA_CHAINS) {
    const goma = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma'))
    const onSale = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').eq('is_on_sale', true))
    const untilPast = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').not('offer_until', 'is', null).lt('offer_until', nowIso))
    const untilNull = await cnt(c, 'product_offers', q => q.eq('store_id', ch).eq('source', 'goma').is('offer_until', null))
    console.log(p(ch, 14), p(goma, 9), p(onSale, 9), p(untilPast, 11), p(untilNull, 11))
  }
}

async function ffDepartments(c: SupabaseClient, chains: string[]) {
  console.log('\n' + '═'.repeat(90))
  console.log('▶ FF: department-fordeling for src=goma (top), tjekker food-filter')
  console.log('═'.repeat(90))
  for (const ch of chains) {
    const { data, error } = await c
      .from('product_offers')
      .select('products!inner(department, is_food)')
      .eq('store_id', ch)
      .eq('source', 'goma')
      .limit(3000)
    if (error) { console.error(`  ! ${ch}:`, error.message); continue }
    const byDept = new Map<string, number>()
    let foodTrue = 0, foodFalse = 0, foodNull = 0
    for (const r of (data ?? []) as any[]) {
      const dept = r.products?.department ?? '(null)'
      byDept.set(dept, (byDept.get(dept) ?? 0) + 1)
      const f = r.products?.is_food
      if (f === true) foodTrue++; else if (f === false) foodFalse++; else foodNull++
    }
    const top = [...byDept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    console.log(`\n  ${ch}: is_food true=${foodTrue} false=${foodFalse} null=${foodNull} (sample ${(data ?? []).length})`)
    for (const [d, n] of top) console.log(`    ${p(d, 30)} ${n}`)
  }
}

async function fooddataStoreNames(c: SupabaseClient) {
  console.log('\n' + '═'.repeat(90))
  console.log('▶ FOODDATA: raw_data.store_name pr. chain (casing-tjek for Goma)')
  console.log('═'.repeat(90))
  for (const ch of GOMA_CHAINS) {
    const { data, error } = await c
      .from('products')
      .select('raw_data')
      .eq('source_chain', ch)
      .not('raw_data', 'is', null)
      .limit(1)
    if (error) { console.error(`  ! ${ch}:`, error.message); continue }
    const sn = (data?.[0]?.raw_data as any)?.store_name ?? '(ingen)'
    console.log(`  ${p(ch, 14)} store_name=${sn}`)
  }
}

async function main() {
  const fooddata = getFooddata()
  const ff = getFf()
  await ffDiscountFlagBug(ff)
  await fooddataGomaState(fooddata)
  await ffDepartments(ff, ['spar', 'meny', 'superbrugsen', 'kvickly', 'loevbjerg', 'abc-lavpris'])
  await fooddataStoreNames(fooddata)
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
