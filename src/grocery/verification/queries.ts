/**
 * Verification queries: aggregate health + per-canary time-series data.
 *
 * Used by `/dev/grocery-verify` to give us a daily-by-daily view of whether
 * the grocery sync infrastructure stays consistent over 14 days.
 */

import { getGroceryServiceClient } from '../db/client'

const TRACKED_CHAINS = ['netto', 'foetex', 'bilka', 'rema-1000'] as const
export type TrackedChain = (typeof TRACKED_CHAINS)[number]

export interface ChainHealth {
  chain: TrackedChain
  productsActive: number
  productsTotal: number
  offersTotal: number
  offersOnSale: number
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncDurationMs: number | null
  lastSyncErrors: number | null
}

export interface CanaryProduct {
  gtin: string
  /** Best display name (shortest non-empty). */
  name: string
  /** Chains where this GTIN currently exists. */
  chainsToday: TrackedChain[]
}

export interface CanaryCell {
  chain: TrackedChain
  date: string // YYYY-MM-DD
  priceKr: number | null
  isOnSale: boolean
  /** True if we found a snapshot row for this (chain, date). */
  present: boolean
}

export interface CanaryHistory {
  canary: CanaryProduct
  dates: string[] // 14 dates, oldest first
  /** cells[chain][date] */
  cells: Record<TrackedChain, Record<string, CanaryCell>>
  /** Drift summary across the window. */
  status: 'stable' | 'price-changed' | 'missing-today' | 'first-day'
  priceSpreadPct: number | null // diff between max and min cell price as %
}

/**
 * Returns the last N calendar dates (oldest first), YYYY-MM-DD strings.
 */
export function lastNDates(days: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export async function getChainHealth(): Promise<ChainHealth[]> {
  const supabase = getGroceryServiceClient()

  // Latest sync_logs per chain (sources may have multiple per chain, take latest)
  const sourceToChain: Record<string, TrackedChain> = {
    'salling-algolia:netto': 'netto',
    'salling-algolia:foetex': 'foetex',
    'salling-algolia:bilka': 'bilka',
    'apify-rema': 'rema-1000',
    'rema-1000-api': 'rema-1000',
  }
  const sources = Object.keys(sourceToChain)
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('source, status, started_at, completed_at, duration_ms, errors_count')
    .in('source', sources)
    .order('started_at', { ascending: false })
    .limit(200)

  const latestByChain = new Map<TrackedChain, NonNullable<typeof logs>[number]>()
  for (const row of logs ?? []) {
    const chain = sourceToChain[row.source as string]
    if (chain && !latestByChain.has(chain)) {
      latestByChain.set(chain, row)
    }
  }

  const health: ChainHealth[] = []
  for (const chain of TRACKED_CHAINS) {
    const [productActiveR, productTotalR, offerTotalR, offerOnSaleR] = await Promise.all([
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('source_chain', chain)
        .eq('active', true)
        .not('name', 'eq', ''),
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('source_chain', chain),
      supabase
        .from('product_offers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', chain),
      supabase
        .from('product_offers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', chain)
        .eq('is_on_sale', true),
    ])

    const latest = latestByChain.get(chain)
    health.push({
      chain,
      productsActive: productActiveR.count ?? 0,
      productsTotal: productTotalR.count ?? 0,
      offersTotal: offerTotalR.count ?? 0,
      offersOnSale: offerOnSaleR.count ?? 0,
      lastSyncAt: (latest?.completed_at as string) ?? (latest?.started_at as string) ?? null,
      lastSyncStatus: (latest?.status as string) ?? null,
      lastSyncDurationMs: (latest?.duration_ms as number) ?? null,
      lastSyncErrors: (latest?.errors_count as number) ?? null,
    })
  }

  return health
}

export async function pickCanaries(count: number): Promise<CanaryProduct[]> {
  const supabase = getGroceryServiceClient()

  // Supabase REST has a default 1000-row max-rows cap even with service role.
  // We paginate explicitly via .range() until the result is shorter than the
  // page size.
  const PAGE = 1000
  const byGtin = new Map<
    string,
    { chains: Set<TrackedChain>; names: string[] }
  >()

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('products')
      .select('gtin, name, source_chain')
      .not('gtin', 'is', null)
      .not('name', 'eq', '')
      .eq('active', true)
      .in('source_chain', TRACKED_CHAINS as unknown as string[])
      .order('gtin') // deterministic ordering for stable pagination
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    for (const row of data) {
      const gtin = row.gtin as string
      const chain = row.source_chain as TrackedChain
      const name = (row.name as string) ?? ''
      let entry = byGtin.get(gtin)
      if (!entry) {
        entry = { chains: new Set(), names: [] }
        byGtin.set(gtin, entry)
      }
      entry.chains.add(chain)
      entry.names.push(name)
    }

    if (data.length < PAGE) break
  }

  const ranked = Array.from(byGtin.entries())
    .filter(([, v]) => v.chains.size >= 3)
    .sort((a, b) => {
      const sizeDiff = b[1].chains.size - a[1].chains.size
      if (sizeDiff !== 0) return sizeDiff
      return a[0].localeCompare(b[0])
    })
    .slice(0, count)

  return ranked.map(([gtin, v]) => ({
    gtin,
    name:
      [...v.names].sort((a, b) => a.length - b.length || a.localeCompare(b))[0] ?? '(unnamed)',
    chainsToday: Array.from(v.chains).sort(),
  }))
}

export async function getCanaryHistory(
  canaries: CanaryProduct[],
  days: number,
): Promise<CanaryHistory[]> {
  if (canaries.length === 0) return []
  const supabase = getGroceryServiceClient()
  const gtins = canaries.map((c) => c.gtin)
  const dates = lastNDates(days)
  const firstDate = dates[0]

  // 1) Resolve product_id → (gtin, source_chain)
  const { data: productRows, error: prodErr } = await supabase
    .from('products')
    .select('id, gtin, source_chain')
    .in('gtin', gtins)
    .in('source_chain', TRACKED_CHAINS as unknown as string[])
  if (prodErr) throw new Error(prodErr.message)

  const productMap = new Map<
    string,
    { gtin: string; chain: TrackedChain }
  >()
  const productIds: string[] = []
  for (const r of productRows ?? []) {
    productMap.set(r.id as string, {
      gtin: r.gtin as string,
      chain: r.source_chain as TrackedChain,
    })
    productIds.push(r.id as string)
  }

  // 2) Snapshot rows in date window
  const { data: snapshots, error: snapErr } = await supabase
    .from('price_history')
    .select('product_id, store_id, price_cents, is_on_sale, snapshot_date')
    .in('product_id', productIds)
    .gte('snapshot_date', firstDate)
  if (snapErr) throw new Error(snapErr.message)

  // 3) Build per-canary grid
  const empty = (): Record<TrackedChain, Record<string, CanaryCell>> => {
    const r = {} as Record<TrackedChain, Record<string, CanaryCell>>
    for (const c of TRACKED_CHAINS) {
      r[c] = {}
      for (const d of dates) {
        r[c][d] = { chain: c, date: d, priceKr: null, isOnSale: false, present: false }
      }
    }
    return r
  }

  const byGtin = new Map<string, CanaryHistory>()
  for (const canary of canaries) {
    byGtin.set(canary.gtin, {
      canary,
      dates,
      cells: empty(),
      status: 'first-day',
      priceSpreadPct: null,
    })
  }

  for (const row of snapshots ?? []) {
    const prod = productMap.get(row.product_id as string)
    if (!prod) continue
    const hist = byGtin.get(prod.gtin)
    if (!hist) continue
    const cell = hist.cells[prod.chain]?.[row.snapshot_date as string]
    if (!cell) continue
    cell.present = true
    cell.priceKr = row.price_cents != null ? (row.price_cents as number) / 100 : null
    cell.isOnSale = Boolean(row.is_on_sale)
  }

  // 4) Compute drift status per canary
  const todayStr = dates[dates.length - 1]
  for (const hist of byGtin.values()) {
    const allPrices: number[] = []
    let presentToday = 0
    for (const chain of TRACKED_CHAINS) {
      const today = hist.cells[chain][todayStr]
      if (today.present) presentToday++
      for (const d of dates) {
        const c = hist.cells[chain][d]
        if (c.present && c.priceKr != null) allPrices.push(c.priceKr)
      }
    }
    if (presentToday === 0) {
      hist.status = 'missing-today'
    } else if (allPrices.length >= 2) {
      const min = Math.min(...allPrices)
      const max = Math.max(...allPrices)
      const spread = ((max - min) / min) * 100
      hist.priceSpreadPct = Number(spread.toFixed(1))
      hist.status = spread > 25 ? 'price-changed' : 'stable'
    } else {
      hist.status = 'first-day'
    }
  }

  return Array.from(byGtin.values())
}

// =====================================================================
// Source coverage: spørger hver kæde's officielle API hvor mange produkter
// der findes, og sammenligner med vores DB. 100% = vi har alt der kan
// trækkes. Drop'er det under et threshold = sync er regresseret.
// =====================================================================

export interface SourceCoverage {
  chain: TrackedChain
  /** Hvad kilde-API'et siger findes. null hvis probe fejlede. */
  sourceCount: number | null
  /** Hvad vi har lagret (total inkl. inaktive). */
  ourCount: number
  /** ourCount / sourceCount × 100. null hvis sourceCount er null/0. */
  coveragePct: number | null
  /** Status: 'ok' (≥98%), 'warn' (90-97%), 'fail' (<90% eller probe-fejl). */
  status: 'ok' | 'warn' | 'fail'
  /** Fejlmeddelelse fra probe hvis status === 'fail' pga. probe-issue. */
  probeError?: string
}

const ALGOLIA_APP_ID = 'F9VBJLR1BK'
const ALGOLIA_KEY = '1deaf41c87e729779f7695c00f190cc9'
const SALLING_INDEX: Record<Exclude<TrackedChain, 'rema-1000'>, string> = {
  netto: 'prod_NETTO_PRODUCTS',
  foetex: 'prod_FOETEX_PRODUCTS',
  bilka: 'prod_BILKATOGO_PRODUCTS',
}

async function probeSallingNbHits(chain: 'netto' | 'foetex' | 'bilka'): Promise<number> {
  const index = SALLING_INDEX[chain]
  const url = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${index}/query`
  const key = process.env.SALLING_ALGOLIA_SEARCH_KEY?.trim() || ALGOLIA_KEY
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ params: 'hitsPerPage=1&page=0' }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Algolia ${chain} probe ${res.status}`)
  const data = (await res.json()) as { nbHits?: number }
  if (typeof data.nbHits !== 'number') throw new Error(`Algolia ${chain} probe: nbHits missing`)
  return data.nbHits
}

async function probeRemaTotal(): Promise<number> {
  const BASE = 'https://api.digital.rema1000.dk/api/v3'
  const headers = { 'User-Agent': 'functionalfoods-grocery-verify/1.0', Accept: 'application/json' }
  const deptRes = await fetch(`${BASE}/departments`, { headers, cache: 'no-store' })
  if (!deptRes.ok) throw new Error(`REMA departments ${deptRes.status}`)
  const deptData = (await deptRes.json()) as { data: Array<{ id: number }> }

  let total = 0
  for (const dept of deptData.data) {
    const r = await fetch(`${BASE}/departments/${dept.id}/products?per_page=1&page=1`, {
      headers,
      cache: 'no-store',
    })
    if (!r.ok) throw new Error(`REMA dept ${dept.id} ${r.status}`)
    const d = (await r.json()) as { meta?: { pagination?: { total?: number } } }
    total += d.meta?.pagination?.total ?? 0
  }
  return total
}

function classify(coveragePct: number | null, probeError?: string): SourceCoverage['status'] {
  if (probeError) return 'fail'
  if (coveragePct == null) return 'fail'
  if (coveragePct >= 98) return 'ok'
  if (coveragePct >= 90) return 'warn'
  return 'fail'
}

export async function getSourceCoverage(): Promise<SourceCoverage[]> {
  const grocery = getGroceryServiceClient()
  const results: SourceCoverage[] = []

  for (const chain of TRACKED_CHAINS) {
    const { count: ourCount } = await grocery
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('source_chain', chain)
    const ours = ourCount ?? 0

    let sourceCount: number | null = null
    let probeError: string | undefined
    try {
      sourceCount =
        chain === 'rema-1000' ? await probeRemaTotal() : await probeSallingNbHits(chain)
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err)
    }

    const coveragePct =
      sourceCount != null && sourceCount > 0
        ? Number(((ours / sourceCount) * 100).toFixed(1))
        : null

    results.push({
      chain,
      sourceCount,
      ourCount: ours,
      coveragePct,
      status: classify(coveragePct, probeError),
      probeError,
    })
  }

  return results
}
