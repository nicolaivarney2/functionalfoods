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
): Promise<number> {
  const supabase = getGroceryServiceClient()
  const { data, error } = await supabase
    .from('product_offers')
    .update({
      in_stock: false,
      is_on_sale: false,
      source_synced_at: new Date().toISOString(),
    })
    .eq('store_id', chain)
    .eq('in_stock', true)
    .lt('source_synced_at', syncStartedAt)
    .select('id')

  if (error) {
    throw new Error(`sleepStaleOffers(${chain}): ${error.message}`)
  }
  return data?.length ?? 0
}

/**
 * Full-catalog sync only: products not seen this run (last_seen_at unchanged)
 * are treated as genuinely gone from the source API.
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
  const offersSlept = await sleepStaleOffersForChain(chain, syncStartedAt)
  const productsDeactivated = options.deactivateMissingProducts
    ? await deactivateProductsMissingFromCatalogSync(chain, syncStartedAt)
    : 0
  return { offersSlept, productsDeactivated }
}
