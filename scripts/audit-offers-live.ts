/**
 * Live audit: fooddata vs FF vs store APIs. Read-only.
 */
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { getGroceryServiceClient } from '../src/grocery/db/client'
import { querySalling } from '../src/grocery/adapters/salling-algolia/client'
import { isLiveSallingOfferSignal } from '../src/grocery/adapters/salling-algolia/pricing'
import { getDepartments, getDepartmentProductsPage } from '../src/grocery/adapters/rema1000/client'
import { resolveRemaOfferPricing } from '../src/grocery/adapters/rema1000/mapper'

const STORES = [
  'netto',
  'foetex',
  'fotex',
  'bilka',
  'rema-1000',
  'lidl',
  '365discount',
  'meny',
  'spar',
  'kvickly',
  'superbrugsen',
  'brugsen',
  'loevbjerg',
  'lovbjerg',
  'abc-lavpris',
  'min-koebmand',
  'nemlig',
] as const

function ffClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

function ago(iso: string | null | undefined) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.round(ms / 3600000)
  return `${iso} (${h}t siden)`
}

async function count(client: ReturnType<typeof ffClient>, table: string, apply: (q: any) => any) {
  let q = apply(client.from(table).select('id', { count: 'exact', head: true }))
  const { count: n, error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
  return n ?? 0
}

async function sample(
  client: ReturnType<typeof ffClient>,
  table: string,
  cols: string,
  apply: (q: any) => any,
  limit = 20,
) {
  const { data, error } = await apply(client.from(table).select(cols).limit(limit))
  if (error) throw new Error(`${table} sample: ${error.message}`)
  return data ?? []
}

async function main() {
  const ff = ffClient()
  const fd = getGroceryServiceClient()

  console.log('=== SYNC LOGS (fooddata) ===')
  const { data: logs } = await fd
    .from('sync_logs')
    .select('source, status, started_at, completed_at, products_processed, error_message')
    .order('started_at', { ascending: false })
    .limit(40)
  for (const l of logs ?? []) {
    console.log(
      `${(l.started_at ?? '').slice(0, 16)} ${String(l.status).padEnd(8)} ${String(l.source).padEnd(28)} n=${l.products_processed ?? ''} ${l.error_message ?? ''}`,
    )
  }

  console.log('\n=== COUNTS fooddata vs FF ===')
  console.log(
    'store'.padEnd(16),
    'fd_sale'.padStart(8),
    'ff_sale'.padStart(8),
    'ff_avail'.padStart(8),
    'fd_stale_sale'.padStart(14),
    'ff_stale_sale'.padStart(14),
  )
  const staleIso = new Date(Date.now() - 4 * 24 * 3600000).toISOString()
  const nowIso = new Date().toISOString()
  const mismatches: string[] = []

  for (const store of STORES) {
    const [fdSale, ffSale, ffAvail, fdStale, ffStale, fdExpired, ffExpired] = await Promise.all([
      count(fd as any, 'product_offers', (q) => q.eq('store_id', store).eq('is_on_sale', true)),
      count(ff, 'product_offers', (q) => q.eq('store_id', store).eq('is_on_sale', true).eq('is_available', true)),
      count(ff, 'product_offers', (q) => q.eq('store_id', store).eq('is_available', true)),
      count(fd as any, 'product_offers', (q) =>
        q.eq('store_id', store).eq('is_on_sale', true).lt('source_synced_at', staleIso),
      ),
      count(ff, 'product_offers', (q) =>
        q.eq('store_id', store).eq('is_on_sale', true).lt('last_seen_at', staleIso),
      ),
      count(fd as any, 'product_offers', (q) =>
        q.eq('store_id', store).eq('is_on_sale', true).lt('offer_until', nowIso),
      ),
      count(ff, 'product_offers', (q) =>
        q.eq('store_id', store).eq('is_on_sale', true).lt('sale_valid_to', nowIso),
      ),
    ])
    const ratio = fdSale > 0 ? ffSale / fdSale : ffSale === 0 ? 1 : 99
    const flag = ratio < 0.7 || ratio > 1.4 || ffStale > 20 || ffExpired > 0 || fdExpired > 50
    console.log(
      (flag ? '! ' : '  ') + store.padEnd(14),
      String(fdSale).padStart(8),
      String(ffSale).padStart(8),
      String(ffAvail).padStart(8),
      String(fdStale).padStart(14),
      String(ffStale).padStart(14),
      `exp fd=${fdExpired} ff=${ffExpired}`,
    )
    if (flag) mismatches.push(store)
  }

  console.log('\n=== LIVE SALLING LEAFLET vs fooddata vs FF ===')
  for (const chain of ['netto', 'foetex', 'bilka'] as const) {
    const live = await querySalling(chain, {
      filters: 'isInCurrentLeaflet:true',
      hitsPerPage: 50,
      page: 0,
    })
    const liveHits = (live.hits ?? []).filter((h) => isLiveSallingOfferSignal(h))
    console.log(
      `\n${chain} Algolia leaflet nbHits=${live.nbHits} sampled=${liveHits.length}`,
    )
    let ok = 0
    let missingFd = 0
    let missingFf = 0
    let saleMismatch = 0
    const examples: string[] = []
    for (const hit of liveHits.slice(0, 40)) {
      const sid = String(hit.id ?? hit.objectID)
      const livePrice = hit.cpOfferPrice ?? hit.storeData?.[Object.keys(hit.storeData ?? {})[0] ?? '']?.price
      const { data: fdOff } = await fd
        .from('product_offers')
        .select('price_cents, is_on_sale, source_id, product_id')
        .eq('store_id', chain)
        .eq('is_on_sale', true)
        .limit(1)
      // lookup product by source_id
      const { data: prod } = await fd
        .from('products')
        .select('id, name, source_id')
        .eq('source_chain', chain)
        .eq('source_id', sid)
        .maybeSingle()
      if (!prod) {
        missingFd++
        if (examples.length < 6) examples.push(`FD missing ${sid} ${hit.name}`)
        continue
      }
      const { data: fdOffer } = await fd
        .from('product_offers')
        .select('price_cents, is_on_sale, source')
        .eq('product_id', prod.id)
        .eq('store_id', chain)
        .maybeSingle()
      if (!fdOffer?.is_on_sale) {
        saleMismatch++
        if (examples.length < 6)
          examples.push(`FD not sale ${sid} ${hit.name} live=${livePrice} fd=${fdOffer?.price_cents}`)
      }
      const { data: ffOffer } = await ff
        .from('product_offers')
        .select('current_price, is_on_sale, name_store, store_product_id')
        .eq('store_id', chain)
        .eq('store_product_id', prod.id.includes('-') ? prod.id.split('-').slice(1).join('-') : prod.id)
        .maybeSingle()
      // FF ids are often `{chain}-{source_id}`
      let ffRow = ffOffer
      if (!ffRow) {
        const { data: byName } = await ff
          .from('product_offers')
          .select('current_price, is_on_sale, name_store, store_product_id')
          .eq('store_id', chain)
          .eq('store_product_id', sid)
          .maybeSingle()
        ffRow = byName
      }
      if (!ffRow) {
        missingFf++
        if (examples.length < 6) examples.push(`FF missing ${sid} ${hit.name}`)
        continue
      }
      if (!ffRow.is_on_sale) {
        saleMismatch++
        if (examples.length < 6)
          examples.push(`FF not sale ${sid} ${hit.name} ff=${ffRow.current_price}`)
      } else {
        ok++
      }
    }
    console.log(`  ok=${ok} missingFd=${missingFd} missingFf=${missingFf} saleMismatch=${saleMismatch}`)
    for (const e of examples) console.log('   -', e)
  }

  console.log('\n=== LIVE REMA advertised sample vs fooddata vs FF ===')
  const depts = await getDepartments()
  let remaOk = 0
  let remaMissFd = 0
  let remaMissFf = 0
  let remaMismatch = 0
  const remaEx: string[] = []
  let sampled = 0
  for (const dept of depts.slice(0, 8)) {
    const page = await getDepartmentProductsPage(dept.id, 1, 50)
    for (const p of page.data ?? []) {
      const pricing = resolveRemaOfferPricing(p.prices)
      if (!pricing?.isOnSale) continue
      sampled++
      if (sampled > 35) break
      const sid = String(p.id)
      const { data: prod } = await fd
        .from('products')
        .select('id, name, source_id')
        .eq('source_chain', 'rema-1000')
        .eq('source_id', sid)
        .maybeSingle()
      if (!prod) {
        remaMissFd++
        if (remaEx.length < 8) remaEx.push(`FD missing ${sid} ${p.name}`)
        continue
      }
      const { data: fdOffer } = await fd
        .from('product_offers')
        .select('price_cents, is_on_sale')
        .eq('product_id', prod.id)
        .eq('store_id', 'rema-1000')
        .maybeSingle()
      const { data: ffOffer } = await ff
        .from('product_offers')
        .select('current_price, is_on_sale, store_product_id')
        .eq('store_id', 'rema-1000')
        .eq('store_product_id', sid)
        .maybeSingle()
      const liveCents = pricing.priceCents
      if (!fdOffer?.is_on_sale) {
        remaMismatch++
        if (remaEx.length < 8) remaEx.push(`FD not sale ${sid} ${p.name} live=${liveCents} fd=${fdOffer?.price_cents}`)
      } else if (!ffOffer) {
        remaMissFf++
        if (remaEx.length < 8) remaEx.push(`FF missing ${sid} ${p.name}`)
      } else if (!ffOffer.is_on_sale) {
        remaMismatch++
        if (remaEx.length < 8) remaEx.push(`FF not sale ${sid} ${p.name} ff=${ffOffer.current_price}`)
      } else {
        const ffCents = Math.round(Number(ffOffer.current_price) * 100)
        if (liveCents != null && Math.abs(ffCents - liveCents) > 2) {
          remaMismatch++
          if (remaEx.length < 8)
            remaEx.push(`PRICE ${sid} ${p.name} live=${liveCents} ff=${ffCents} fd=${fdOffer.price_cents}`)
        } else {
          remaOk++
        }
      }
    }
    if (sampled > 35) break
  }
  console.log(`REMA sampled=${sampled} ok=${remaOk} missFd=${remaMissFd} missFf=${remaMissFf} mismatch=${remaMismatch}`)
  for (const e of remaEx) console.log(' -', e)

  console.log('\n=== FF zombie / leftover samples ===')
  for (const store of mismatches.length ? mismatches : ['netto', 'lidl', 'meny']) {
    const rows = await sample(
      ff,
      'product_offers',
      'name_store, current_price, normal_price, is_on_sale, source, last_seen_at, sale_valid_to',
      (q) =>
        q
          .eq('store_id', store)
          .eq('is_on_sale', true)
          .lt('last_seen_at', staleIso)
          .order('last_seen_at', { ascending: true }),
      5,
    )
    console.log(store, 'stale FF sales:')
    for (const r of rows) {
      console.log(' ', r.name_store, r.current_price, r.source, ago(r.last_seen_at), r.sale_valid_to)
    }
  }

  console.log('\n=== Public API /dagligvarer tilbud sample ===')
  const url = 'https://www.functionalfoods.dk/api/dagligvarer?limit=8&tilbud=1&stores=netto,foetex,bilka,rema-1000,lidl,meny'
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' } })
    const json = (await res.json()) as any
    const items = json.items ?? json.products ?? json.data ?? []
    console.log('status', res.status, 'items', Array.isArray(items) ? items.length : typeof items)
    if (Array.isArray(items)) {
      for (const it of items.slice(0, 12)) {
        console.log(
          ' ',
          it.store_id ?? it.storeId,
          it.name ?? it.name_store,
          it.current_price ?? it.price,
          it.is_on_sale,
        )
      }
    } else {
      console.log(JSON.stringify(json).slice(0, 400))
    }
  } catch (e) {
    console.log('API fail', e)
  }

  console.log('\n=== Sales by source ===')
  async function sourcesOf(client: any, store: string, col = 'source') {
    const sources: Record<string, number> = {}
    let from = 0
    while (true) {
      const { data, error } = await client
        .from('product_offers')
        .select(col)
        .eq('store_id', store)
        .eq('is_on_sale', true)
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      if (!data?.length) break
      for (const r of data) {
        const s = String((r as any).source ?? '(null)')
        sources[s] = (sources[s] || 0) + 1
      }
      if (data.length < 1000) break
      from += 1000
    }
    return sources
  }
  for (const store of ['netto', 'foetex', 'bilka', 'rema-1000', 'lidl']) {
    const [a, b] = await Promise.all([sourcesOf(fd, store), sourcesOf(ff, store)])
    console.log(store, 'FD', a, 'FF', b)
  }

  console.log('\n=== Netto extras vs live Algolia leaflet ===')
  const live = await querySalling('netto', {
    filters: 'isInCurrentLeaflet:true',
    hitsPerPage: 1000,
    page: 0,
  })
  const liveIds = new Set((live.hits ?? []).map((h) => h.objectID))
  console.log('live leaflet', liveIds.size, 'nbHits', live.nbHits)
  const { data: fdSale } = await fd
    .from('product_offers')
    .select('product_id, price_cents, source')
    .eq('store_id', 'netto')
    .eq('is_on_sale', true)
  const pids = [...new Set((fdSale ?? []).map((r: any) => r.product_id))]
  const products: any[] = []
  for (let i = 0; i < pids.length; i += 80) {
    const { data } = await fd
      .from('products')
      .select('id, source_id, name')
      .eq('source_chain', 'netto')
      .in('id', pids.slice(i, i + 80))
    products.push(...(data ?? []))
  }
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  let inLive = 0
  let notLive = 0
  const extras: any[] = []
  for (const o of fdSale ?? []) {
    const p = byId[(o as any).product_id]
    if (p?.source_id && liveIds.has(p.source_id)) inLive++
    else {
      notLive++
      if (extras.length < 15)
        extras.push({ name: p?.name, source_id: p?.source_id, source: (o as any).source, price: (o as any).price_cents })
    }
  }
  console.log('FD netto in live leaflet', inLive, 'not in live', notLive)
  console.log(extras)

  const { data: ffY } = await ff
    .from('product_offers')
    .select('store_product_id, name_store, current_price, is_on_sale')
    .eq('store_id', 'rema-1000')
    .ilike('name_store', '%YOGHURTBOLLER%')
    .limit(5)
  console.log('FF yoghurtboller', ffY)

  const { data: lidlLog } = await fd
    .from('sync_logs')
    .select('source,status,started_at,products_processed,error_message')
    .like('source', '%lidl%')
    .order('started_at', { ascending: false })
    .limit(8)
  console.log('Lidl logs', lidlLog)

  console.log('\nFlagged stores:', mismatches.join(', ') || 'none')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
