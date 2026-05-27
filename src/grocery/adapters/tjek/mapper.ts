/**
 * Tjek offer → ProductInsert + ProductOfferInsert mapping.
 *
 * Tjek's offers are leaflet entries (OCR + manual curation), not canonical
 * SKUs. Each weekly offer gets a fresh Tjek offer ID, so we store each one
 * as its own row keyed on `(source_chain, source_id = offer.id)`. The result:
 * a "product" in Tjek's world is really an "offer event"; the same physical
 * item across two weeks appears as two rows with two source_ids. That keeps
 * upsert semantics simple — when the offer expires (run_till < now), the
 * is_on_sale flag flips false on the offer row but the product stays around
 * until cleaned up.
 *
 * Image policy: we deliberately do NOT populate `image_url` on the product
 * row. Tjek's image-transformer-api.tjek.com URLs would otherwise be
 * hotlinked from our UI, which is exactly the visible signal we want to
 * avoid (see operational notes in TjekClient). The full URL is preserved in
 * `raw_data.images` for sync verification only. Future enhancement: mirror
 * images to our own Supabase Storage at sync time.
 */

import type { ProductInsert, ProductOfferInsert, SourceChain } from '../../types'
import { TJEK_DEALER_TO_CHAIN, type TjekOffer } from './types'

const SYNC_SOURCE = 'tjek:offers' as const

/** Resolve a Tjek dealer_id to our internal SourceChain, or null if unknown. */
export function resolveChain(dealerId: string): SourceChain | null {
  return TJEK_DEALER_TO_CHAIN[dealerId] ?? null
}

/** Decimal kr → cents (rounded). */
function toCents(decimal: number | null | undefined): number | null {
  if (decimal == null || Number.isNaN(decimal)) return null
  return Math.round(decimal * 100)
}

/**
 * Normalize Tjek's quantity object to (amount, unit). Tjek uses SI conversion
 * factors: e.g. `unit.symbol = "g"`, `unit.si = { symbol: "kg", factor: 0.001 }`.
 * For our purposes we keep the leaflet-native unit + size, and only fall
 * through to SI when the native is missing.
 */
export function parseQuantity(q: TjekOffer['quantity']): {
  amount: number | null
  unit: string | null
} {
  if (!q) return { amount: null, unit: null }
  const unit = q.unit?.symbol ?? null

  // Prefer size if it's a real range we can resolve to a single number.
  if (q.size && Number.isFinite(q.size.from)) {
    return {
      amount: q.size.to && q.size.to !== q.size.from ? q.size.from : q.size.from,
      unit,
    }
  }
  // Pieces fallback (e.g. "6 stk") — only relevant if no size.
  if (q.pieces && Number.isFinite(q.pieces.from) && q.pieces.from > 0) {
    return { amount: q.pieces.from, unit: 'stk' }
  }
  return { amount: null, unit }
}

/**
 * Compute discount percentage from current/pre price. Returns null if either
 * is missing or the math doesn't show a real discount.
 */
function discountPct(priceCents: number, beforeCents: number | null): number | null {
  if (!beforeCents || beforeCents <= priceCents) return null
  return Number((((beforeCents - priceCents) / beforeCents) * 100).toFixed(2))
}

/**
 * Map a Tjek offer to a product row. Returns null when the dealer is not in
 * our chain whitelist (e.g. "MENY Vin" — a sub-dealer we don't track).
 */
export function mapTjekOfferToProduct(offer: TjekOffer): ProductInsert | null {
  const chain = resolveChain(offer.dealer_id)
  if (!chain) return null

  const { amount, unit } = parseQuantity(offer.quantity)
  const sourceId = offer.id

  const dealerName = offer.dealer?.name ?? null

  return {
    gtin: null, // Tjek offers don't carry GTIN/EAN
    name: offer.heading,
    brand: null, // Sometimes embedded in description; not reliably extractable
    manufacturer: null,
    description: offer.description?.trim() || null,
    amount,
    unit,
    // Intentionally null — see "Image policy" note at top of file.
    image_url: null,
    category_path: dealerName, // Tjek has no taxonomy beyond dealer + page
    category_lvl0: dealerName,
    category_lvl1: null,
    category_lvl2: null,
    source_chain: chain,
    source_id: sourceId,
    active: true,
    last_seen_at: new Date().toISOString(),
    raw_data: {
      tjek_offer_id: offer.id,
      catalog_page: offer.catalog_page,
      catalog_view_id: offer.catalog_view_id,
      webshop_url: offer.links?.webshop ?? null,
      images: offer.images ?? null,
      run_from: offer.run_from,
      run_till: offer.run_till,
    } satisfies Record<string, unknown>,
  }
}

/**
 * Map a Tjek offer to an offer row. Returns null when:
 *   - dealer isn't whitelisted (defensive — caller usually skipped already)
 *   - the offer has expired (run_till < now)
 *
 * Tjek doesn't give us "regular price" explicitly: `pricing.pre_price` is the
 * leaflet's striked-through price. If absent, we treat the offer as
 * "advertised" (still on sale) but with no before-price. is_on_sale is true
 * whenever the offer is currently in its run window — Tjek catalogs are
 * inherently sale-only.
 */
export function mapTjekOfferToOffer(
  offer: TjekOffer,
  productId: string,
): ProductOfferInsert | null {
  const chain = resolveChain(offer.dealer_id)
  if (!chain) return null

  const now = Date.now()
  const until = Date.parse(offer.run_till)
  if (Number.isFinite(until) && until < now) return null

  const priceCents = toCents(offer.pricing.price)
  if (priceCents == null) return null

  const beforeCents = toCents(offer.pricing.pre_price)
  const pct = discountPct(priceCents, beforeCents)

  return {
    product_id: productId,
    store_id: chain, // chains-as-stores in our seed
    price_cents: priceCents,
    before_price_cents: beforeCents,
    unit_price_cents: null, // Tjek puts kg/liter price in description text, not structured
    unit_price_unit: null,
    is_on_sale: true,
    offer_from: offer.run_from,
    offer_until: offer.run_till,
    offer_description: offer.description?.trim() || null,
    multibuy: null,
    discount_percentage: pct,
    in_stock: true, // Tjek doesn't expose stock; assume in-stock during run window
    source: SYNC_SOURCE,
    source_synced_at: new Date().toISOString(),
    raw_data: {
      tjek_offer_id: offer.id,
      catalog_page: offer.catalog_page,
      pricing: offer.pricing,
    } satisfies Record<string, unknown>,
  }
}
