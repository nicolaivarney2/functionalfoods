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

/** Promo tilbud past offer_until (offer row stays with last price). */
export function isPromoOfferExpired(offerUntil: string | null | undefined): boolean {
  if (!offerUntil) return false
  const until = Date.parse(offerUntil)
  return Number.isFinite(until) && until < Date.now()
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
