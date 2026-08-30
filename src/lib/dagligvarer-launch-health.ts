/**
 * Launch watchdog for /dagligvarer + fooddata vs kilde (Algolia/REMA).
 *
 * Bruges af:
 *   - `npm run dagligvarer:health`
 *   - GitHub Action / Vercel cron efter fooddata-import
 *   - `/api/admin/dagligvarer/launch-health`
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { querySalling } from '@/grocery/adapters/salling-algolia/client'
import { storedPriceMatchesAlgolia } from '@/grocery/adapters/salling-algolia/pricing'
import { getGroceryServiceClient } from '@/grocery/db/client'
import type { SourceChain } from '@/grocery/types'
import {
  NATIVE_CRON_WEEKDAY,
  NATIVE_SYNC_LOG_SOURCES,
  missedLastScheduledSync,
  type NativeCronChain,
} from '@/lib/grocery/sync-schedule'

export type LaunchHealthLevel = 'ok' | 'warn' | 'fail'

export type LaunchHealthChain = {
  chain: SourceChain
  label: string
  rpcCount: number
  sample: string[]
  lastSeenAt: string | null
  daysSinceSeen: number | null
  fooddataLastSeenAt: string | null
  fooddataOnSale: number | null
  sourceLeafletCount: number | null
  samplePriceMismatches: number | null
  missedScheduledSlot: boolean
  absurdUntilCount: number
  algoliaError: string | null
  level: LaunchHealthLevel
  reason: string
}

export type LaunchHealthReport = {
  generatedAt: string
  ok: boolean
  failCount: number
  warnCount: number
  chains: LaunchHealthChain[]
}

type ChainSpec = {
  chain: SourceChain
  label: string
  warnBelow: number
  maxStaleDays: number
  algolia?: 'netto' | 'foetex' | 'bilka'
  native?: NativeCronChain
}

const CHAINS: ChainSpec[] = [
  { chain: 'netto', label: 'Netto', warnBelow: 20, maxStaleDays: 8, algolia: 'netto', native: 'netto' },
  { chain: 'foetex', label: 'Føtex', warnBelow: 20, maxStaleDays: 8, algolia: 'foetex', native: 'foetex' },
  { chain: 'bilka', label: 'Bilka', warnBelow: 20, maxStaleDays: 8, algolia: 'bilka', native: 'bilka' },
  { chain: 'rema-1000', label: 'REMA 1000', warnBelow: 20, maxStaleDays: 8, native: 'rema-1000' },
  { chain: 'lidl', label: 'Lidl', warnBelow: 20, maxStaleDays: 8 },
  { chain: '365discount', label: '365discount', warnBelow: 15, maxStaleDays: 8 },
  { chain: 'abc-lavpris', label: 'ABC Lavpris', warnBelow: 10, maxStaleDays: 8 },
  { chain: 'kvickly', label: 'Kvickly', warnBelow: 20, maxStaleDays: 8 },
  { chain: 'superbrugsen', label: 'SuperBrugsen', warnBelow: 20, maxStaleDays: 8 },
  { chain: 'brugsen', label: 'Brugsen', warnBelow: 15, maxStaleDays: 8 },
  { chain: 'loevbjerg', label: 'Løvbjerg', warnBelow: 20, maxStaleDays: 8 },
  { chain: 'meny', label: 'MENY', warnBelow: 20, maxStaleDays: 8 },
  { chain: 'spar', label: 'Spar', warnBelow: 20, maxStaleDays: 8 },
  { chain: 'min-koebmand', label: 'Min Købmand', warnBelow: 20, maxStaleDays: 8 },
  { chain: 'nemlig', label: 'Nemlig', warnBelow: 20, maxStaleDays: 2 },
]

const RPC_LIMIT = 51
const ABSURD_UNTIL_MS = 60 * 24 * 60 * 60 * 1000

function ffClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / 86_400_000
}

async function rpcOffers(
  ff: SupabaseClient,
  chain: SourceChain,
): Promise<{ count: number; sample: string[]; absurdUntilCount: number }> {
  const { data, error } = await ff.rpc('get_food_offers_v2', {
    p_offers_only: true,
    p_limit: RPC_LIMIT,
    p_offset: 0,
    p_stores: [chain],
    p_organic_only: false,
    p_goma_primary: true,
  })
  if (error) {
    throw new Error(`${chain} RPC: ${error.message}`)
  }
  const rows = Array.isArray(data) ? data : []
  const now = Date.now()
  let absurdUntilCount = 0
  const sample: string[] = []
  for (const row of rows) {
    const name = String((row as { name_store?: string }).name_store ?? '').trim()
    if (name && sample.length < 3) sample.push(name.slice(0, 40))
    const until = (row as { sale_valid_to?: string | null }).sale_valid_to
    if (until) {
      const t = new Date(until).getTime()
      if (Number.isFinite(t) && t > now + ABSURD_UNTIL_MS) absurdUntilCount++
    }
  }
  return { count: rows.length, sample, absurdUntilCount }
}

async function lastSeen(
  client: SupabaseClient,
  chain: SourceChain,
  column: 'last_seen_at' | 'source_synced_at' = 'last_seen_at',
): Promise<string | null> {
  const { data } = await client
    .from('product_offers')
    .select(column)
    .eq('store_id', chain)
    .not(column, 'is', null)
    .order(column, { ascending: false })
    .limit(1)
  const value = data?.[0]?.[column]
  return typeof value === 'string' ? value : null
}

async function countOnSale(client: SupabaseClient, chain: SourceChain): Promise<number | null> {
  const { count, error } = await client
    .from('product_offers')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', chain)
    .eq('is_on_sale', true)
  if (error) return null
  return count ?? 0
}

async function lastSyncLogSuccess(
  grocery: SupabaseClient,
  chain: NativeCronChain,
): Promise<string | null> {
  const { data } = await grocery
    .from('sync_logs')
    .select('completed_at')
    .in('source', [...NATIVE_SYNC_LOG_SOURCES[chain]])
    .in('status', ['success', 'partial'])
    .order('completed_at', { ascending: false })
    .limit(1)
  return data?.[0]?.completed_at ?? null
}

async function probeAlgoliaLeaflet(chain: 'netto' | 'foetex' | 'bilka'): Promise<{
  error: string | null
  leafletCount: number | null
  mismatches: number | null
}> {
  try {
    const res = await querySalling(chain, {
      hitsPerPage: 8,
      page: 0,
      filters: 'isInCurrentLeaflet:true',
    })
    return {
      error: null,
      leafletCount: typeof res.nbHits === 'number' ? res.nbHits : null,
      mismatches: null,
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
      leafletCount: null,
      mismatches: null,
    }
  }
}

async function sampleAlgoliaPriceMismatches(
  grocery: SupabaseClient,
  chain: 'netto' | 'foetex' | 'bilka',
): Promise<number | null> {
  try {
    const res = await querySalling(chain, {
      hitsPerPage: 8,
      page: 0,
      filters: 'isInCurrentLeaflet:true',
    })
    const hits = res.hits ?? []
    if (hits.length === 0) return 0
    const sourceIds = hits.map((h) => h.objectID)
    const { data: products } = await grocery
      .from('products')
      .select('id, source_id')
      .eq('source_chain', chain)
      .in('source_id', sourceIds)
    const idBySource = new Map((products ?? []).map((p) => [String(p.source_id), String(p.id)]))
    const productIds = [...idBySource.values()]
    if (productIds.length === 0) return hits.length
    const { data: offers } = await grocery
      .from('product_offers')
      .select('product_id, price_cents')
      .eq('store_id', chain)
      .in('product_id', productIds)
    const priceByProduct = new Map(
      (offers ?? []).map((o) => [String(o.product_id), o.price_cents as number | null]),
    )
    let mismatches = 0
    for (const hit of hits) {
      const productId = idBySource.get(hit.objectID)
      const ours = productId ? priceByProduct.get(productId) : null
      // Ét repræsentativt storeId skifter mellem scrape og health-check.
      // Match hvis fooddata-prisen stadig findes på en Algolia-butik.
      if (!storedPriceMatchesAlgolia(hit.storeData, hit, ours)) {
        mismatches++
      }
    }
    return mismatches
  } catch {
    return null
  }
}

function classify(
  spec: ChainSpec,
  input: {
    rpcCount: number
    daysSinceSeen: number | null
    absurdUntilCount: number
    algoliaError: string | null
    missedScheduledSlot: boolean
    sourceLeafletCount: number | null
    fooddataOnSale: number | null
    samplePriceMismatches: number | null
  },
): { level: LaunchHealthLevel; reason: string } {
  if (input.algoliaError) {
    return { level: 'fail', reason: `Algolia: ${input.algoliaError.slice(0, 80)}` }
  }
  if (input.missedScheduledSlot) {
    return {
      level: 'fail',
      reason: 'Missede seneste planlagte scrape — fooddata har ikke den aktuelle avis',
    }
  }
  if (input.rpcCount === 0) {
    const isNative = Boolean(spec.native || spec.algolia)
    // Goma-kæder (fx ABC): tom kilde ≠ nede site. Kun rød hvis fooddata HAR tilbud, FF ikke.
    if (!isNative && (input.fooddataOnSale == null || input.fooddataOnSale === 0)) {
      return {
        level: 'warn',
        reason:
          input.fooddataOnSale === 0
            ? 'Ingen madtilbud — Goma/fooddata er også tom'
            : 'Ingen madtilbud (fooddata ikke tjekket)',
      }
    }
    const fd =
      input.fooddataOnSale != null ? ` (fooddata har ${input.fooddataOnSale})` : ''
    return { level: 'fail', reason: `Ingen madtilbud på /dagligvarer${fd}` }
  }
  if (input.absurdUntilCount > 0) {
    return {
      level: 'fail',
      reason: `${input.absurdUntilCount} tilbud med slutdato > 60 dage (fx 2037/jul)`,
    }
  }
  if (
    input.sourceLeafletCount != null &&
    input.sourceLeafletCount >= 50 &&
    input.fooddataOnSale != null &&
    (input.fooddataOnSale < input.sourceLeafletCount * 0.5 ||
      input.fooddataOnSale > input.sourceLeafletCount * 1.35)
  ) {
    return {
      level: 'fail',
      reason: `Algolia avis ${input.sourceLeafletCount} vs fooddata on_sale ${input.fooddataOnSale}`,
    }
  }
  if (input.samplePriceMismatches != null && input.samplePriceMismatches >= 3) {
    // Butikspriser i Algolia varierer; missed cron er allerede rød ovenfor.
    return {
      level: 'warn',
      reason: `${input.samplePriceMismatches}/8 stikprøver afviger fra Algolia (butiksvariance)`,
    }
  }
  if (input.daysSinceSeen != null && input.daysSinceSeen > spec.maxStaleDays) {
    return {
      level: 'fail',
      reason: `Sidst set for ${Math.round(input.daysSinceSeen)} dage siden`,
    }
  }
  if (input.daysSinceSeen == null) {
    return { level: 'warn', reason: 'Ingen last_seen_at' }
  }
  if (input.rpcCount < spec.warnBelow) {
    return {
      level: 'warn',
      reason: `Kun ${input.rpcCount} madtilbud (tynd avis eller filter)`,
    }
  }
  if (input.samplePriceMismatches != null && input.samplePriceMismatches > 0) {
    return {
      level: 'warn',
      reason: `${input.samplePriceMismatches}/8 stikprøver afviger fra Algolia`,
    }
  }
  return { level: 'ok', reason: 'OK' }
}

export async function runDagligvarerLaunchHealth(
  ff: SupabaseClient = ffClient(),
): Promise<LaunchHealthReport> {
  let grocery: SupabaseClient | null = null
  try {
    grocery = getGroceryServiceClient()
  } catch {
    grocery = null
  }

  const chains: LaunchHealthChain[] = []

  for (const spec of CHAINS) {
    const [{ count: rpcCount, sample, absurdUntilCount }, lastSeenAt] = await Promise.all([
      rpcOffers(ff, spec.chain),
      lastSeen(ff, spec.chain),
    ])

    let algoliaError: string | null = null
    let sourceLeafletCount: number | null = null
    let samplePriceMismatches: number | null = null
    let fooddataLastSeenAt: string | null = null
    let fooddataOnSale: number | null = null
    let missedScheduledSlot = false

    if (spec.algolia) {
      const probe = await probeAlgoliaLeaflet(spec.algolia)
      algoliaError = probe.error
      sourceLeafletCount = probe.leafletCount
    }

    if (grocery) {
      // fooddata.product_offers bruger source_synced_at (ikke last_seen_at).
      fooddataLastSeenAt = await lastSeen(grocery, spec.chain, 'source_synced_at')
      fooddataOnSale = await countOnSale(grocery, spec.chain)
      if (spec.native) {
        const logAt = await lastSyncLogSuccess(grocery, spec.native)
        missedScheduledSlot = missedLastScheduledSync(logAt, NATIVE_CRON_WEEKDAY[spec.native])
      }
      if (spec.algolia && !algoliaError) {
        samplePriceMismatches = await sampleAlgoliaPriceMismatches(grocery, spec.algolia)
      }
    }

    const daysSinceSeen = daysAgo(lastSeenAt)
    const { level, reason } = classify(spec, {
      rpcCount,
      daysSinceSeen,
      absurdUntilCount,
      algoliaError,
      missedScheduledSlot,
      sourceLeafletCount,
      fooddataOnSale,
      samplePriceMismatches,
    })
    chains.push({
      chain: spec.chain,
      label: spec.label,
      rpcCount,
      sample,
      lastSeenAt,
      daysSinceSeen: daysSinceSeen != null ? Math.round(daysSinceSeen * 10) / 10 : null,
      fooddataLastSeenAt,
      fooddataOnSale,
      sourceLeafletCount,
      samplePriceMismatches,
      missedScheduledSlot,
      absurdUntilCount,
      algoliaError,
      level,
      reason,
    })
  }

  const failCount = chains.filter((c) => c.level === 'fail').length
  const warnCount = chains.filter((c) => c.level === 'warn').length
  return {
    generatedAt: new Date().toISOString(),
    ok: failCount === 0,
    failCount,
    warnCount,
    chains,
  }
}

export function formatLaunchHealthReport(report: LaunchHealthReport): string {
  const pad = (s: unknown, n: number) => String(s ?? '').padEnd(n)
  const lines = [
    `Dagligvarer launch-health  ${report.generatedAt}`,
    pad('kæde', 16) +
      pad('rpc', 5) +
      pad('avis', 6) +
      pad('fd', 6) +
      pad('alder', 8) +
      pad('status', 6) +
      'årsag',
  ]
  for (const c of report.chains) {
    const age = c.daysSinceSeen == null ? '-' : `${c.daysSinceSeen}d`
    const avis = c.sourceLeafletCount == null ? '-' : String(c.sourceLeafletCount)
    const fd = c.fooddataOnSale == null ? '-' : String(c.fooddataOnSale)
    lines.push(
      pad(c.label, 16) +
        pad(c.rpcCount, 5) +
        pad(avis, 6) +
        pad(fd, 6) +
        pad(age, 8) +
        pad(c.level, 6) +
        c.reason,
    )
  }
  lines.push('')
  lines.push(
    report.ok
      ? `OK — ${report.warnCount} advarsler`
      : `FAIL — ${report.failCount} kæder røde, ${report.warnCount} advarsler`,
  )
  return lines.join('\n')
}
