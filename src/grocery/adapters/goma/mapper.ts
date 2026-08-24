import type { ProductInsert, ProductOfferInsert, SourceChain } from '../../types'
import type { GomaProduct } from './types'
import { extractEanFromSourceId } from '@/lib/product-ean'
import { isGomaFullCatalogChain } from '@/lib/goma-import-stores'

const SYNC_SOURCE = 'goma' as const

/** Goma sender jævnligt 2037 / jul 2026 som sale_valid_to. Clamp til ~3 uger. */
export const GOMA_OFFER_MAX_HORIZON_DAYS = 21

function toCents(kr: number | null | undefined): number | null {
  if (kr == null || !Number.isFinite(kr)) return null
  return Math.round(kr * 100)
}

/**
 * Gomas sale_valid_to er upålidelig:
 *   - offers-only: ofte sidste uges udløbsdato mens p_on_sale_only stadig returnerer varen
 *   - Løvbjerg m.fl.: datoer i 2030–2037
 *
 * keepLiveSale: drop forældet udløb (null) i stedet for at slå tilbuddet fra.
 * Absurde fremtidige datoer clamps altid.
 */
export function sanitizeGomaOfferUntil(
  until: string | null | undefined,
  options: { keepLiveSale: boolean; now?: Date },
): string | null {
  if (!until) return null
  const now = options.now ?? new Date()
  const end = new Date(until)
  if (Number.isNaN(end.getTime())) return null
  if (end.getTime() < now.getTime()) {
    return options.keepLiveSale ? null : until
  }
  const maxMs = GOMA_OFFER_MAX_HORIZON_DAYS * 24 * 60 * 60 * 1000
  if (end.getTime() > now.getTime() + maxMs) {
    return new Date(now.getTime() + maxMs).toISOString()
  }
  return until
}

function resolveSaleState(
  p: GomaProduct,
  chain: SourceChain,
): {
  isOnSale: boolean
  isOfferActive: boolean
  discountPct: number | null
  offerUntil: string | null
} {
  // Stol på Gomas eget is_on_sale-flag: for offers-only kæder (Lidl, 365discount,
  // SuperBrugsen, ABC Lavpris, Løvbjerg, …) leverer Goma sjældent en førpris, men
  // varen ER ugens tilbud (total_count == total_on_sale_count). En bevist førpris
  // opgraderer kun — vi nedgraderer aldrig et Goma-tilbud bare fordi normal<=current.
  let isOnSale = p.is_on_sale

  if (p.normal_price && p.current_price && p.normal_price > p.current_price) {
    isOnSale = true
  }

  const offersOnly = !isGomaFullCatalogChain(chain)
  const nowDate = new Date()

  if (!offersOnly && isOnSale && p.sale_valid_to) {
    const saleEndDate = new Date(p.sale_valid_to)
    if (!Number.isNaN(saleEndDate.getTime()) && saleEndDate < nowDate) {
      isOnSale = false
    }
  }

  const offerUntil = sanitizeGomaOfferUntil(p.sale_valid_to, {
    keepLiveSale: offersOnly && isOnSale,
    now: nowDate,
  })
  const isOfferDateValid = !offerUntil || new Date(offerUntil) >= nowDate
  const isOfferActive = isOnSale && isOfferDateValid

  let discountPct: number | null = null
  if (isOnSale && p.normal_price && p.current_price && p.normal_price > p.current_price) {
    discountPct = Math.round(((p.normal_price - p.current_price) / p.normal_price) * 100)
  } else if (isOnSale && p.discount_percentage != null) {
    discountPct = Math.round(p.discount_percentage)
  }

  return { isOnSale, isOfferActive, discountPct, offerUntil }
}

export function mapGomaToProduct(
  p: GomaProduct,
  chain: SourceChain,
  syncedAt: string,
): ProductInsert {
  const parts = [p.department_name, p.category, p.s_category].filter(Boolean)
  return {
    gtin: extractEanFromSourceId(p.product_id),
    name: p.product_name,
    brand: p.brand,
    manufacturer: null,
    description: p.description?.trim() || null,
    amount: p.amount,
    unit: p.unit,
    image_url: p.image_url,
    category_path: parts.length ? parts.join(' > ') : null,
    category_lvl0: p.department_name,
    category_lvl1: p.category,
    category_lvl2: p.s_category,
    source_chain: chain,
    source_id: p.product_id,
    active: true,
    last_seen_at: syncedAt,
    raw_data: {
      goma_base_product_id: p.base_product_id,
      goma_store_product_id: p.product_id,
      product_url: p.product_url,
      store_name: p.store_name,
    },
  }
}

export function mapGomaToOffer(
  p: GomaProduct,
  productUuid: string,
  storeId: SourceChain,
  syncedAt: string,
): ProductOfferInsert | null {
  const priceCents = toCents(p.current_price)
  if (priceCents == null || priceCents <= 0) return null

  const beforeCents = toCents(p.normal_price)
  const { isOnSale, isOfferActive, discountPct, offerUntil } = resolveSaleState(p, storeId)
  // Shelf availability from Goma — NOT tied to sale state. Full-catalog chains
  // (Nemlig, MENY, …) must stay visible even when not on sale.
  const inStock = p.is_available !== false

  return {
    product_id: productUuid,
    store_id: storeId,
    price_cents: priceCents,
    before_price_cents: beforeCents,
    unit_price_cents: toCents(p.price_per_unit),
    unit_price_unit: p.unit,
    is_on_sale: isOfferActive,
    offer_from: p.sale_valid_from,
    offer_until: offerUntil,
    offer_description: null,
    multibuy: null,
    discount_percentage: isOfferActive ? discountPct : null,
    in_stock: inStock,
    source: SYNC_SOURCE,
    source_synced_at: syncedAt,
    raw_data: {
      goma_store_product_id: p.product_id,
      is_on_sale_raw: isOnSale,
      price_per_kilogram: p.price_per_kilogram,
    },
  }
}
