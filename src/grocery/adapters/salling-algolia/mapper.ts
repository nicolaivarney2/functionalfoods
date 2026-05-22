import type { ProductInsert, ProductOfferInsert, SourceChain } from '../../types'
import type { AlgoliaStoreData, SallingAlgoliaHit, SallingChain } from './types'

/**
 * A product is considered "real" (and thus active) only if Algolia returned
 * something we can show to a consumer. Phantom rows (empty name + no
 * category + no image) are kept in the DB for diffing but marked inactive.
 */
function isRealProduct(hit: SallingAlgoliaHit): boolean {
  const hasName = Boolean(hit.name && hit.name.trim())
  const hasCategory =
    Boolean(hit.categories?.lvl0?.length) ||
    Boolean(hit.consumerFacingHierarchy?.lvl0?.length)
  const hasImage = Boolean(hit.images?.[0])
  return hasName && (hasCategory || hasImage)
}

const CHAIN_TO_SOURCE: Record<SallingChain, SourceChain> = {
  netto: 'netto',
  bilka: 'bilka',
  foetex: 'foetex',
}

function firstNonEmpty(arr?: string[]): string | null {
  if (!arr || arr.length === 0) return null
  const first = arr[0]
  return first && first.trim() ? first : null
}

function pickCategoryLabel(path: string | null): string | null {
  if (!path) return null
  // category strings come like "Frugt & grønt > Frugt > Bananer" — extract leaf
  const parts = path.split('>').map((s) => s.trim())
  return parts[parts.length - 1] || path
}

function pickCategoryLevel(
  hit: SallingAlgoliaHit,
  level: 'lvl0' | 'lvl1' | 'lvl2',
): string | null {
  const fromCategories = firstNonEmpty(hit.categories?.[level])
  if (fromCategories) return pickCategoryLabel(fromCategories)
  const fromCfh = firstNonEmpty(hit.consumerFacingHierarchy?.[level])
  return pickCategoryLabel(fromCfh)
}

export function mapHitToProduct(
  chain: SallingChain,
  hit: SallingAlgoliaHit,
): ProductInsert {
  const categoryPath = firstNonEmpty(hit.categories?.lvl2) ??
    firstNonEmpty(hit.categories?.lvl1) ??
    firstNonEmpty(hit.categories?.lvl0) ?? null

  return {
    gtin: hit.gtin || null,
    name: hit.name,
    brand: null, // Salling doesn't expose a separate brand field
    manufacturer: hit.manufacturer?.trim() || null,
    description: hit.description?.trim() || null,
    amount: typeof hit.units === 'number' ? hit.units : null,
    unit: hit.unitsOfMeasure || null,
    image_url: hit.images?.[0] ?? null,
    category_path: categoryPath,
    category_lvl0: pickCategoryLevel(hit, 'lvl0'),
    category_lvl1: pickCategoryLevel(hit, 'lvl1'),
    category_lvl2: pickCategoryLevel(hit, 'lvl2'),
    source_chain: CHAIN_TO_SOURCE[chain],
    source_id: hit.objectID,
    active: isRealProduct(hit),
    last_seen_at: new Date().toISOString(),
    // Slim raw_data: keep only fields we don't already extract.
    // Drop the huge _highlightResult, properties, and infos blocks.
    raw_data: {
      productType: hit.productType,
      article: hit.article,
      hierarchy_node: hit.hierarchy_node,
      isInCurrentLeaflet: hit.isInCurrentLeaflet,
      cpOffer: hit.cpOffer,
      cpOfferTitle: hit.cpOfferTitle,
      cpOfferFromDate: hit.cpOfferFromDate,
      cpOfferToDate: hit.cpOfferToDate,
      cpOriginalPrice: hit.cpOriginalPrice,
      cpDiscount: hit.cpDiscount,
      cpPercentDiscount: hit.cpPercentDiscount,
    } satisfies Record<string, unknown>,
  }
}

/**
 * Selects a representative storeData entry from the per-store map.
 * Salling returns pricing for many physical stores; we pick the first
 * available with a non-zero price as the chain's representative.
 *
 * Returns null if no usable storeData exists.
 */
function pickRepresentativeStore(
  storeData: Record<string, AlgoliaStoreData> | null,
): { storeId: string; data: AlgoliaStoreData } | null {
  if (!storeData) return null
  const entries = Object.entries(storeData)
  if (entries.length === 0) return null

  // Prefer in-stock with a price > 0
  for (const [storeId, data] of entries) {
    if (data?.inStock && data.price > 0) return { storeId, data }
  }
  // Fallback: any entry with a price
  for (const [storeId, data] of entries) {
    if (data?.price > 0) return { storeId, data }
  }
  return { storeId: entries[0][0], data: entries[0][1] }
}

/**
 * Returns the chain-level offer for a product (one per chain for MVP).
 * Returns null if the product has no pricing data we can use.
 */
export function mapHitToChainOffer(
  chain: SallingChain,
  hit: SallingAlgoliaHit,
  productId: string,
): ProductOfferInsert | null {
  const rep = pickRepresentativeStore(hit.storeData)
  const price = rep?.data.price ?? 0

  // We tolerate price=0 here because Algolia sometimes returns products
  // without per-store pricing (e.g. campaign-only items). Persist as
  // null-price offer so consumers can see availability.
  const isOnSale = Boolean(hit.cpOffer) || hit.isInCurrentLeaflet
  const beforePrice = hit.cpOriginalPrice && hit.cpOriginalPrice > 0
    ? hit.cpOriginalPrice
    : null

  let discountPct: number | null = null
  if (hit.cpPercentDiscount && hit.cpPercentDiscount > 0) {
    discountPct = hit.cpPercentDiscount
  } else if (beforePrice && price && price < beforePrice) {
    discountPct = Number(
      (((beforePrice - price) / beforePrice) * 100).toFixed(2),
    )
  }

  return {
    product_id: productId,
    store_id: CHAIN_TO_SOURCE[chain],
    price_cents: price > 0 ? Math.round(price) : null,
    before_price_cents: beforePrice !== null ? Math.round(beforePrice) : null,
    unit_price_cents:
      rep?.data.unitsOfMeasurePrice && rep.data.unitsOfMeasurePrice > 0
        ? Math.round(rep.data.unitsOfMeasurePrice)
        : null,
    unit_price_unit: rep?.data.unitsOfMeasurePriceUnit || hit.unitOfMeasurePriceUnits || null,
    is_on_sale: isOnSale,
    offer_from: hit.cpOfferFromDate ? toIsoOrNull(hit.cpOfferFromDate) : null,
    offer_until: hit.cpOfferToDate ? toIsoOrNull(hit.cpOfferToDate) : null,
    offer_description: hit.cpOfferTitle || rep?.data.offerDescription || null,
    multibuy: rep?.data.multipromo && rep.data.multipromo > 0
      ? `${rep.data.multipromo} for ${(Math.round(rep.data.multiPromoPrice) / 100).toFixed(2)} kr`
      : null,
    discount_percentage: discountPct,
    in_stock: rep?.data.inStock ?? true,
    source: `salling-algolia:${chain}`,
    source_synced_at: new Date().toISOString(),
    raw_data: rep
      ? ({ storeId: rep.storeId, storeData: rep.data } as Record<string, unknown>)
      : null,
  }
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}
