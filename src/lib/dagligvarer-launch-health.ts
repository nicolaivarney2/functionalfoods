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
  /** Aktive tilbud fra Tjek-avisoverlayet (Salling-kæder). */
  fooddataTjekOnSale: number | null
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
  /** Kædens egen avis. Health kigger på den kilde, ikke gamle Goma-rækker. */
  avisSource?: string
}

const CHAINS: ChainSpec[] = [
  { chain: 'netto', label: 'Netto', warnBelow: 20, maxStaleDays: 8, algolia: 'netto', native: 'netto' },
  { chain: 'foetex', label: 'Føtex', warnBelow: 20, maxStaleDays: 8, algolia: 'foetex', native: 'foetex' },
  { chain: 'bilka', label: 'Bilka', warnBelow: 20, maxStaleDays: 8, algolia: 'bilka', native: 'bilka' },
  { chain: 'rema-1000', label: 'REMA 1000', warnBelow: 20, maxStaleDays: 8, native: 'rema-1000' },
  { chain: 'nemlig', label: 'Nemlig', warnBelow: 20, maxStaleDays: 2 },
  { chain: 'lidl', label: 'Lidl', warnBelow: 20, maxStaleDays: 8, avisSource: 'lidl-avis' },
  { chain: 'meny', label: 'MENY', warnBelow: 20, maxStaleDays: 8, avisSource: 'meny-avis' },
  { chain: 'spar', label: 'Spar', warnBelow: 20, maxStaleDays: 8, avisSource: 'spar-avis' },
  { chain: 'min-koebmand', label: 'Min Købmand', warnBelow: 15, maxStaleDays: 8, avisSource: 'min-koebmand-avis' },
]

const RPC_LIMIT = 51
/** Goma satte slutdatoer i 2037. Årets kampagner (fx blomster til 31/12) er ikke absurde. */
const ABSURD_UNTIL_MS = 400 * 24 * 60 * 60 * 1000

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
  sourceEq?: string,
): Promise<string | null> {
  let query = client
    .from('product_offers')
    .select(column)
    .eq('store_id', chain)
    .not(column, 'is', null)
    .order(column, { ascending: false })
    .limit(1)
  if (sourceEq) query = query.eq('source', sourceEq)
  const { data } = await query
  const row = data?.[0] as Record<string, unknown> | undefined
  const value = row?.[column]
  return typeof value === 'string' ? value : null
}

async function countOnSale(
  client: SupabaseClient,
  chain: SourceChain,
  source?: { like?: string; notLike?: string; eq?: string },
): Promise<number | null> {
  let query = client
    .from('product_offers')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', chain)
    .eq('is_on_sale', true)
  if (source?.eq) query = query.eq('source', source.eq)
  if (source?.like) query = query.like('source', source.like)
  if (source?.notLike) query = query.not('source', 'like', source.notLike)
  const { count, error } = await query
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
    /** Kun primærkilden (Algolia) — uden Tjek-avisoverlay. */
    fooddataNativeOnSale: number | null
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
  if (spec.avisSource) {
    if (input.fooddataOnSale == null) {
      return { level: 'warn', reason: 'Fooddata ikke tjekket' }
    }
    if (input.fooddataOnSale === 0) {
      return { level: 'fail', reason: 'Ingen aktuelle avis-tilbud i fooddata' }
    }
    if (input.daysSinceSeen != null && input.daysSinceSeen > spec.maxStaleDays) {
      return {
        level: 'fail',
        reason: `Avis sidst set for ${Math.round(input.daysSinceSeen)} dage siden`,
      }
    }
    if (input.rpcCount === 0) {
      return {
        level: 'fail',
        reason: `Fooddata har ${input.fooddataOnSale} avis-tilbud, men /dagligvarer viser ingen`,
      }
    }
    if (input.rpcCount < spec.warnBelow) {
      return { level: 'warn', reason: `Kun ${input.rpcCount} madtilbud på /dagligvarer` }
    }
    return { level: 'ok', reason: 'OK' }
  }
  if (input.rpcCount === 0) {
    const fd =
      input.fooddataOnSale != null ? ` (fooddata har ${input.fooddataOnSale})` : ''
    return { level: 'fail', reason: `Ingen madtilbud på /dagligvarer${fd}` }
  }
  if (input.absurdUntilCount > 0) {
    return {
      level: 'fail',
      reason: `${input.absurdUntilCount} tilbud med slutdato mere end et år ude (fx 2037)`,
    }
  }
  // Sammenlign kun Algolia-avisen med Algolia-kilden. Tjek-overlayet (papiravisens
  // slagtervarer) ligger på samme butik, men findes ikke i Algolia — regnes det med,
  // sprænger loftet og kæden bliver rød selvom begge kilder er sunde.
  const algoliaOnSale = input.fooddataNativeOnSale ?? input.fooddataOnSale
  if (
    input.sourceLeafletCount != null &&
    input.sourceLeafletCount >= 50 &&
    algoliaOnSale != null &&
    (algoliaOnSale < input.sourceLeafletCount * 0.5 ||
      algoliaOnSale > input.sourceLeafletCount * 1.35)
  ) {
    return {
      level: 'fail',
      reason: `Algolia avis ${input.sourceLeafletCount} vs fooddata on_sale ${algoliaOnSale}`,
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
    let fooddataTjekOnSale: number | null = null
    let missedScheduledSlot = false

    if (spec.algolia) {
      const probe = await probeAlgoliaLeaflet(spec.algolia)
      algoliaError = probe.error
      sourceLeafletCount = probe.leafletCount
    }

    if (grocery) {
      // fooddata.product_offers bruger source_synced_at (ikke last_seen_at).
      fooddataLastSeenAt = await lastSeen(
        grocery,
        spec.chain,
        'source_synced_at',
        spec.avisSource,
      )
      fooddataOnSale = await countOnSale(
        grocery,
        spec.chain,
        spec.avisSource ? { eq: spec.avisSource } : undefined,
      )
      if (spec.algolia) {
        fooddataTjekOnSale = await countOnSale(grocery, spec.chain, { like: 'tjek%' })
      }
      if (spec.native) {
        const logAt = await lastSyncLogSuccess(grocery, spec.native)
        // Samme evidens som grocery-cron catch-up: log ELLER sidst sete række.
        const lastOk = [logAt, fooddataLastSeenAt, lastSeenAt]
          .filter((v): v is string => typeof v === 'string')
          .sort()
          .at(-1)
        missedScheduledSlot = missedLastScheduledSync(
          lastOk,
          NATIVE_CRON_WEEKDAY[spec.native],
        )
      }
      if (spec.algolia && !algoliaError) {
        samplePriceMismatches = await sampleAlgoliaPriceMismatches(grocery, spec.algolia)
      }
    }

    const daysSinceSeen = daysAgo(spec.avisSource ? fooddataLastSeenAt : lastSeenAt)
    const { level, reason } = classify(spec, {
      rpcCount,
      daysSinceSeen,
      absurdUntilCount,
      algoliaError,
      missedScheduledSlot,
      sourceLeafletCount,
      fooddataOnSale,
      fooddataNativeOnSale:
        fooddataOnSale != null && fooddataTjekOnSale != null
          ? fooddataOnSale - fooddataTjekOnSale
          : fooddataOnSale,
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
      fooddataTjekOnSale,
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
      pad('tjek', 6) +
      pad('alder', 8) +
      pad('status', 6) +
      'årsag',
  ]
  for (const c of report.chains) {
    const age = c.daysSinceSeen == null ? '-' : `${c.daysSinceSeen}d`
    const avis = c.sourceLeafletCount == null ? '-' : String(c.sourceLeafletCount)
    const fd = c.fooddataOnSale == null ? '-' : String(c.fooddataOnSale)
    const tjek = c.fooddataTjekOnSale == null ? '-' : String(c.fooddataTjekOnSale)
    lines.push(
      pad(c.label, 16) +
        pad(c.rpcCount, 5) +
        pad(avis, 6) +
        pad(fd, 6) +
        pad(tjek, 6) +
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
