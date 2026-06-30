import type { ProductInsert, ProductOfferInsert, SourceChain } from '../../types'
import type { GomaProduct } from './types'
import { extractEanFromSourceId } from '@/lib/product-ean'

const SYNC_SOURCE = 'goma' as const

function toCents(kr: number | null | undefined): number | null {
  if (kr == null || !Number.isFinite(kr)) return null
  return Math.round(kr * 100)
}

function resolveSaleState(p: GomaProduct): {
  isOnSale: boolean
  isOfferActive: boolean
  discountPct: number | null
} {
  // Stol på Gomas eget is_on_sale-flag: for offers-only kæder (Lidl, 365discount,
  // SuperBrugsen, ABC Lavpris, Løvbjerg, …) leverer Goma sjældent en førpris, men
  // varen ER ugens tilbud (total_count == total_on_sale_count). En bevist førpris
  // opgraderer kun — vi nedgraderer aldrig et Goma-tilbud bare fordi normal<=current.
  let isOnSale = p.is_on_sale

  if (p.normal_price && p.current_price && p.normal_price > p.current_price) {
    isOnSale = true
  }

  if (isOnSale && p.sale_valid_to) {
    const saleEndDate = new Date(p.sale_valid_to)
    if (saleEndDate < new Date()) {
      isOnSale = false
    }
  }

  const nowDate = new Date()
  const isOfferDateValid = !p.sale_valid_to || new Date(p.sale_valid_to) >= nowDate
  const isOfferActive = isOnSale && isOfferDateValid

  let discountPct: number | null = null
  if (isOnSale && p.normal_price && p.current_price && p.normal_price > p.current_price) {
    discountPct = Math.round(((p.normal_price - p.current_price) / p.normal_price) * 100)
  } else if (isOnSale && p.discount_percentage != null) {
    discountPct = Math.round(p.discount_percentage)
  }

  return { isOnSale, isOfferActive, discountPct }
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
  const { isOnSale, isOfferActive, discountPct } = resolveSaleState(p)

  return {
    product_id: productUuid,
    store_id: storeId,
    price_cents: priceCents,
    before_price_cents: beforeCents,
    unit_price_cents: toCents(p.price_per_unit),
    unit_price_unit: p.unit,
    is_on_sale: isOfferActive,
    offer_from: p.sale_valid_from,
    offer_until: p.sale_valid_to,
    offer_description: null,
    multibuy: null,
    discount_percentage: isOfferActive ? discountPct : null,
    in_stock: p.is_available && isOfferActive,
    source: SYNC_SOURCE,
    source_synced_at: syncedAt,
    raw_data: {
      goma_store_product_id: p.product_id,
      is_on_sale_raw: isOnSale,
      price_per_kilogram: p.price_per_kilogram,
    },
  }
}
