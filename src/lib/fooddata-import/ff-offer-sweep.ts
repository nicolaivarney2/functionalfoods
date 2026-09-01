/**
 * FF product_offers sweep — rydder "zombie"-tilbud efter en Fooddata→FF-import.
 *
 * Importen er ren UPSERT og sletter aldrig. Rækker der forsvinder fra fooddata
 * (avisen sluttede, varen røg ud af kataloget) bliver derfor liggende i FF med
 * is_on_sale=true i ugevis, plus beslægtet skævhed: normal_price uden tilbud,
 * source=goma på Salling-kæder, Tjek-rækker på kæder hvor Goma er primær.
 *
 * FF's product_offers har intet index på store_id / is_on_sale / last_seen_at.
 * Brede oprydninger (`.eq('store_id', x).lt('last_seen_at', y)`) laver derfor et
 * seq scan af hele tabellen og rammer statement_timeout — det var netop dem der
 * fejlede i importloggen. Denne sweep vender problemet på hovedet: vi paginerer
 * på primærnøglen, så arbejdet pr. request er bundet af sidestørrelsen og ikke af
 * hvor selektivt filteret er. Reglerne afgøres i JS, og rettelser skrives tilbage
 * som PK-opslag (`.in('id', …)`), der altid bruger indexet.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/** Salling/REMA har fuldt katalog fra fooddata-native — aldrig source=goma. */
export const SALLING_REMA_STORE_IDS = ['netto', 'bilka', 'foetex', 'rema-1000'] as const

/** Kæder hvor Goma er primærkilde — gammel Tjek-data skal ikke vises der. */
export const GOMA_CHAIN_STORE_IDS = [
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
  'nemlig',
] as const

const SWEEP_COLS =
  'id, store_id, source, is_on_sale, normal_price, sale_valid_to, last_seen_at'

/**
 * Sider på PK: stor nok til få requests, lille nok til at ligge under timeout.
 * PostgREST's max-rows capper svaret ved 1000, så en større side giver alligevel
 * kun 1000 rækker — derfor stopper vi først når en side er helt tom.
 */
const DEFAULT_PAGE_SIZE = 1000
const MIN_PAGE_SIZE = 100
/** PostgREST `.in()` er stabil under denne størrelse. */
const ID_CHUNK = 150

type SweepRow = {
  id: string
  store_id: string | null
  source: string | null
  is_on_sale: boolean | null
  normal_price: number | null
  sale_valid_to: string | null
  last_seen_at: string | null
}

/** Rækker importen lige skrev — bruges til at udlede hvad der er forældet. */
export type FreshOfferRef = {
  store_id: string
  source?: string | null
  is_on_sale?: boolean | null
  last_seen_at?: string | null
}

export type FfOfferSweepResult = {
  scanned: number
  slept: number
  normalPriceCleared: number
  deleted: number
  deletedByReason: Record<string, number>
  sleptByReason: Record<string, number>
  durationMs: number
}

function sourceFamily(source: string | null | undefined): 'tjek' | 'native' {
  return String(source ?? '')
    .toLowerCase()
    .startsWith('tjek')
    ? 'tjek'
    : 'native'
}

/**
 * Ældste last_seen_at blandt de tilbud importen lige skrev, pr. butik og
 * kildefamilie. Salling-kæderne har to kilder (Algolia + Tjek-avisoverlay) med
 * hver sit synk-tidspunkt, så én cutoff pr. butik ville slukke den ene kildes
 * friske tilbud hver gang den anden kørte.
 */
export function buildSleepCutoffs(fresh: FreshOfferRef[]): Map<string, string> {
  const cutoffs = new Map<string, string>()
  for (const row of fresh) {
    if (!row.store_id || !row.is_on_sale || !row.last_seen_at) continue
    const key = `${row.store_id}|${sourceFamily(row.source)}`
    const current = cutoffs.get(key)
    if (!current || row.last_seen_at < current) cutoffs.set(key, row.last_seen_at)
  }
  return cutoffs
}

type SweepDecision =
  | { action: 'delete'; reason: string }
  | { action: 'sleep'; reason: string }
  | { action: 'clear-normal-price' }
  | null

function decide(
  row: SweepRow,
  ctx: {
    cutoffs: Map<string, string>
    gomaImportEnabled: boolean
    nowIso: string
    sallingRema: Set<string>
    gomaChains: Set<string>
  },
): SweepDecision {
  const storeId = row.store_id ?? ''
  const source = String(row.source ?? '').toLowerCase()
  const expired = !!row.sale_valid_to && row.sale_valid_to < ctx.nowIso

  if (ctx.gomaImportEnabled) {
    if (source === 'goma' && ctx.sallingRema.has(storeId)) {
      return { action: 'delete', reason: 'goma på Salling/REMA' }
    }
    if (source === 'goma' && expired) {
      return { action: 'delete', reason: 'udløbet goma-avis' }
    }
    if (source.startsWith('tjek') && ctx.gomaChains.has(storeId)) {
      return { action: 'delete', reason: 'Tjek på Goma-kæde' }
    }
  }

  if (row.is_on_sale) {
    if (expired) return { action: 'sleep', reason: 'udløbet tilbud' }
    const cutoff = ctx.cutoffs.get(`${storeId}|${sourceFamily(row.source)}`)
    if (cutoff && row.last_seen_at && row.last_seen_at < cutoff) {
      return { action: 'sleep', reason: 'væk fra fooddata' }
    }
    return null
  }

  if (row.normal_price != null) return { action: 'clear-normal-price' }
  return null
}

function isRetryable(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('statement timeout') ||
    m.includes('canceling statement') ||
    m.includes('fetch failed') ||
    m.includes('socket') ||
    m.includes('network') ||
    /\b(429|502|503|504)\b/.test(m)
  )
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(
  label: string,
  log: (msg: string) => void,
  run: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  maxAttempts = 4,
): Promise<T> {
  let lastError = 'unknown error'
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data, error } = await run()
      if (!error) return (data ?? []) as T
      lastError = error.message
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
    if (!isRetryable(lastError) || attempt === maxAttempts) {
      throw new Error(`${label} failed: ${lastError}`)
    }
    const delay = Math.min(8000, 400 * 2 ** (attempt - 1))
    log(`  ⚠ ${label}: ${lastError} — retry ${attempt}/${maxAttempts - 1} om ${delay}ms`)
    await sleepMs(delay)
  }
  throw new Error(`${label} failed: ${lastError}`)
}

export interface SweepFfProductOffersOptions {
  ff: SupabaseClient
  /** Fra `buildSleepCutoffs()`. Tom map = ingen "væk fra fooddata"-oprydning. */
  cutoffs?: Map<string, string>
  gomaImportEnabled: boolean
  dryRun?: boolean
  pageSize?: number
  log?: (msg: string) => void
}

export async function sweepFfProductOffers(
  options: SweepFfProductOffersOptions,
): Promise<FfOfferSweepResult> {
  const {
    ff,
    cutoffs = new Map<string, string>(),
    gomaImportEnabled,
    dryRun = false,
    log = console.log,
  } = options

  const startedAt = Date.now()
  const nowIso = new Date().toISOString()
  const ctx = {
    cutoffs,
    gomaImportEnabled,
    nowIso,
    sallingRema: new Set<string>(SALLING_REMA_STORE_IDS),
    gomaChains: new Set<string>(GOMA_CHAIN_STORE_IDS),
  }

  const result: FfOfferSweepResult = {
    scanned: 0,
    slept: 0,
    normalPriceCleared: 0,
    deleted: 0,
    deletedByReason: {},
    sleptByReason: {},
    durationMs: 0,
  }

  let pageSize = Math.max(MIN_PAGE_SIZE, options.pageSize ?? DEFAULT_PAGE_SIZE)
  let after: string | null = null

  while (true) {
    let rows: SweepRow[]
    try {
      rows = await withRetry<SweepRow[]>(`sweep-side efter ${after ?? 'start'}`, log, () => {
        let q = ff
          .from('product_offers')
          .select(SWEEP_COLS)
          .order('id', { ascending: true })
          .limit(pageSize)
        if (after !== null) q = q.gt('id', after)
        return q
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (pageSize > MIN_PAGE_SIZE && isRetryable(message)) {
        pageSize = Math.max(MIN_PAGE_SIZE, Math.floor(pageSize / 2))
        log(`  ⚠ sweep: sænker sidestørrelse til ${pageSize}`)
        continue
      }
      throw err
    }

    if (rows.length === 0) break

    const toDelete: string[] = []
    const toSleep: string[] = []
    const toClear: string[] = []

    for (const row of rows) {
      const decision = decide(row, ctx)
      if (!decision) continue
      if (decision.action === 'delete') {
        toDelete.push(row.id)
        result.deletedByReason[decision.reason] =
          (result.deletedByReason[decision.reason] ?? 0) + 1
      } else if (decision.action === 'sleep') {
        toSleep.push(row.id)
        result.sleptByReason[decision.reason] =
          (result.sleptByReason[decision.reason] ?? 0) + 1
      } else {
        toClear.push(row.id)
      }
    }

    if (!dryRun) {
      for (let i = 0; i < toDelete.length; i += ID_CHUNK) {
        const chunk = toDelete.slice(i, i + ID_CHUNK)
        await withRetry(`sweep delete ${chunk.length}`, log, () =>
          ff.from('product_offers').delete().in('id', chunk),
        )
      }
      for (let i = 0; i < toSleep.length; i += ID_CHUNK) {
        const chunk = toSleep.slice(i, i + ID_CHUNK)
        await withRetry(`sweep sleep ${chunk.length}`, log, () =>
          ff
            .from('product_offers')
            .update({
              is_on_sale: false,
              is_offer_active: false,
              normal_price: null,
              discount_percentage: null,
              sale_valid_from: null,
              sale_valid_to: null,
              updated_at: nowIso,
            })
            .in('id', chunk),
        )
      }
      for (let i = 0; i < toClear.length; i += ID_CHUNK) {
        const chunk = toClear.slice(i, i + ID_CHUNK)
        await withRetry(`sweep normal_price ${chunk.length}`, log, () =>
          ff
            .from('product_offers')
            .update({ normal_price: null, updated_at: nowIso })
            .in('id', chunk),
        )
      }
    }

    result.deleted += toDelete.length
    result.slept += toSleep.length
    result.normalPriceCleared += toClear.length
    result.scanned += rows.length

    const lastId = rows[rows.length - 1]?.id
    if (!lastId) break
    after = lastId

    if (result.scanned % 20000 < rows.length) {
      log(
        `  sweep: ${result.scanned} scannet · ${result.slept} slukket · ` +
          `${result.deleted} slettet · ${result.normalPriceCleared} normal_price ryddet`,
      )
    }
  }

  result.durationMs = Date.now() - startedAt
  return result
}

export function formatSweepSummary(result: FfOfferSweepResult): string {
  const parts = [
    `${result.scanned} rækker scannet`,
    `${result.slept} slukket`,
    `${result.deleted} slettet`,
    `${result.normalPriceCleared} normal_price ryddet`,
    `${(result.durationMs / 1000).toFixed(1)}s`,
  ]
  const reasons = [
    ...Object.entries(result.sleptByReason).map(([r, n]) => `slukket/${r}: ${n}`),
    ...Object.entries(result.deletedByReason).map(([r, n]) => `slettet/${r}: ${n}`),
  ]
  return parts.join(' · ') + (reasons.length ? ` (${reasons.join(', ')})` : '')
}
