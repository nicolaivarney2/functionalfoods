/**
 * Keep Fooddata rows for Planomo sticky matches — never delete products/offers
 * when a tilbud udløber. Sleep stale offers; deactivate products only when they
 * disappear from a full primary-catalog sync.
 */

import { getGroceryServiceClient } from '../db/client'
import type { SourceChain } from '../types'

export interface CatalogRetentionResult {
  offersSlept: number
  productsDeactivated: number
}

export interface SleepStaleOffersOptions {
  /** Only sleep rows whose `source` matches, e.g. `tjek%`. */
  sourceLike?: string
  /** Never sleep rows whose `source` matches, e.g. `tjek%` (Salling/REMA overlay). */
  sourceNotLike?: string
}

/** Date-only / UTC-midnight timestamps mean the last calendar day in Denmark. */
export function endOfCopenhagenDayMs(ymd: string): number {
  const noonUtc = new Date(`${ymd}T12:00:00.000Z`)
  const hourInCph = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Copenhagen',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(noonUtc),
  )
  const offsetHours = hourInCph - 12
  const sign = offsetHours >= 0 ? '+' : '-'
  const abs = String(Math.abs(offsetHours)).padStart(2, '0')
  return Date.parse(`${ymd}T23:59:59.999${sign}${abs}:00`)
}

/** Promo tilbud past offer_until (offer row stays with last price). */
export function isPromoOfferExpired(
  offerUntil: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!offerUntil) return false
  const trimmed = offerUntil.trim()
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
  const utcMidnight = /^\d{4}-\d{2}-\d{2}T00:00:00(\.\d+)?Z$/.test(trimmed)
  if (dateOnly || utcMidnight) {
    return endOfCopenhagenDayMs(trimmed.slice(0, 10)) < nowMs
  }
  const until = Date.parse(trimmed)
  return Number.isFinite(until) && until < nowMs
}

/**
 * Offers for this chain not touched in the current sync run → sleep.
 * Preserves price_cents / before_price_cents for Planomo last_known_price.
 */
export async function sleepStaleOffersForChain(
  chain: SourceChain,
  syncStartedAt: string,
  options: SleepStaleOffersOptions = {},
): Promise<number> {
  const supabase = getGroceryServiceClient()
  let query = supabase
    .from('product_offers')
    .update({
      in_stock: false,
      is_on_sale: false,
      source_synced_at: new Date().toISOString(),
    })
    .eq('store_id', chain)
    .eq('in_stock', true)
    .lt('source_synced_at', syncStartedAt)

  if (options.sourceLike) {
    query = query.like('source', options.sourceLike)
  }
  if (options.sourceNotLike) {
    query = query.not('source', 'like', options.sourceNotLike)
  }

  const { data, error } = await query.select('id')

  if (error) {
    throw new Error(`sleepStaleOffers(${chain}): ${error.message}`)
  }
  return data?.length ?? 0
}

/**
 * Full-catalog sync only: products not seen this run (last_seen_at unchanged)
 * are treated as genuinely gone from the source API.
 *
 * Tjek overlay products share `source_chain` with Salling/REMA but are keyed
 * by leaflet offer id (`raw_data.tjek_offer_id`). Never deactivate those here.
 */
export async function deactivateProductsMissingFromCatalogSync(
  chain: SourceChain,
  syncStartedAt: string,
): Promise<number> {
  const supabase = getGroceryServiceClient()
  const { data, error } = await supabase
    .from('products')
    .update({ active: false })
    .eq('source_chain', chain)
    .eq('active', true)
    .lt('last_seen_at', syncStartedAt)
    .is('raw_data->>tjek_offer_id', null)
    .select('id')

  if (error) {
    throw new Error(`deactivateProductsMissing(${chain}): ${error.message}`)
  }
  return data?.length ?? 0
}

export async function applyCatalogRetentionAfterFullSync(
  chain: SourceChain,
  syncStartedAt: string,
  options: { deactivateMissingProducts?: boolean } = {},
): Promise<CatalogRetentionResult> {
  const offersSlept = await sleepStaleOffersForChain(chain, syncStartedAt, {
    sourceNotLike: 'tjek%',
  })
  const productsDeactivated = options.deactivateMissingProducts
    ? await deactivateProductsMissingFromCatalogSync(chain, syncStartedAt)
    : 0
  return { offersSlept, productsDeactivated }
}
