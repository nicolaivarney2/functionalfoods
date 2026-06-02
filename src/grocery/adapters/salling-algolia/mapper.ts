import type { ProductInsert, ProductOfferInsert, SourceChain } from '../../types'
import { pickRepresentativeStore } from './pricing'
import type { SallingAlgoliaHit, SallingChain } from './types'

/**
 * A product is considered "real" (and thus active) only if Algolia returned
 * something we can show to a consumer. Phantom rows (empty name + no
 * category + no image) are kept in the DB for diffing but marked inactive.
 */
function isRealProduct(hit: SallingAlgoliaHit): boolean {
  const hasName = Boolean(
    (hit.name && hit.name.trim()) || (hit.article && hit.article.trim()),
  )
  const hasCategory =
    Boolean(hit.consumerFacingHierarchy?.lvl0?.length) ||
    Boolean(hit.categories?.lvl0?.length)
  const hasImage = Boolean(hit.images?.[0])
  return hasName && (hasCategory || hasImage)
}

const CHAIN_TO_SOURCE: Record<SallingChain, SourceChain> = {
  netto: 'netto',
  bilka: 'bilka',
  foetex: 'foetex',
}

const DEPARTMENT_LABEL_MAP: Record<string, string> = {
  'frugt & grønt': 'Frugt og grønt',
  'frugt og grønt': 'Frugt og grønt',
  'brød & kager': 'Brød og kager',
  'brød og kager': 'Brød og kager',
  'drikkevarer': 'Drikkevarer',
  'kød, fisk & fjerkræ': 'Kød og fisk',
  'kød og fisk': 'Kød og fisk',
  'kolonial': 'Kolonial',
  'mejeri': 'Mejeri og køl',
  'mejeri & køl': 'Mejeri og køl',
  'mejeri og køl': 'Mejeri og køl',
  'ost & mejeri': 'Mejeri og køl',
  'nemt & hurtigt': 'Nemt og hurtigt',
  'nemt og hurtigt': 'Nemt og hurtigt',
  'snacks & slik': 'Slik og snacks',
  'slik og snacks': 'Slik og snacks',
  'frost': 'Frost',
  'køl': 'Køl',
}

function firstNonEmpty(arr?: string[]): string | null {
  if (!arr || arr.length === 0) return null
  const first = arr[0]
  return first && first.trim() ? first : null
}

function pickCategoryLabel(path: string | null): string | null {
  if (!path) return null
  const parts = path.split('>').map((s) => s.trim())
  return parts[parts.length - 1] || path
}

function normalizeDepartmentLabel(label: string | null): string | null {
  if (!label) return null
  const trimmed = label.trim()
  return DEPARTMENT_LABEL_MAP[trimmed.toLowerCase()] ?? trimmed
}

function pickCategoryLevel(
  hit: SallingAlgoliaHit,
  level: 'lvl0' | 'lvl1' | 'lvl2',
): string | null {
  const fromCfh = firstNonEmpty(hit.consumerFacingHierarchy?.[level])
  if (fromCfh) {
    const label = pickCategoryLabel(fromCfh)
    return level === 'lvl0' ? normalizeDepartmentLabel(label) : label
  }
  const fromCategories = firstNonEmpty(hit.categories?.[level])
  if (fromCategories) {
    const label = pickCategoryLabel(fromCategories)
    return level === 'lvl0' ? normalizeDepartmentLabel(label) : label
  }
  return null
}

function pickCategoryPath(hit: SallingAlgoliaHit): string | null {
  return (
    firstNonEmpty(hit.consumerFacingHierarchy?.lvl2) ??
    firstNonEmpty(hit.consumerFacingHierarchy?.lvl1) ??
    firstNonEmpty(hit.consumerFacingHierarchy?.lvl0) ??
    firstNonEmpty(hit.categories?.lvl2) ??
    firstNonEmpty(hit.categories?.lvl1) ??
    firstNonEmpty(hit.categories?.lvl0) ??
    null
  )
}

export function mapHitToProduct(
  chain: SallingChain,
  hit: SallingAlgoliaHit,
): ProductInsert {
  const name =
    hit.name?.trim() || hit.article?.trim() || `Vare ${hit.objectID}`

  return {
    gtin: hit.gtin || null,
    name,
    brand: null,
    manufacturer: hit.manufacturer?.trim() || null,
    description: hit.description?.trim() || null,
    amount: typeof hit.units === 'number' ? hit.units : null,
    unit: hit.unitsOfMeasure || null,
    image_url: hit.images?.[0] ?? null,
    category_path: pickCategoryPath(hit),
    category_lvl0: pickCategoryLevel(hit, 'lvl0'),
    category_lvl1: pickCategoryLevel(hit, 'lvl1'),
    category_lvl2: pickCategoryLevel(hit, 'lvl2'),
    source_chain: CHAIN_TO_SOURCE[chain],
    source_id: hit.objectID,
    active: isRealProduct(hit),
    last_seen_at: new Date().toISOString(),
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
 * Returns the chain-level offer for a product (one per chain for MVP).
 * Returns null if the product has no pricing data we can use.
 */
export function mapHitToChainOffer(
  chain: SallingChain,
  hit: SallingAlgoliaHit,
  productId: string,
): ProductOfferInsert | null {
  const rep = pickRepresentativeStore(hit.storeData, hit)
  const price = rep?.data.price ?? 0
  const beforePriceCents = rep?.beforePriceCents ?? null
  const isOnSale = beforePriceCents !== null

  let discountPct: number | null = null
  if (beforePriceCents && price > 0 && beforePriceCents > price) {
    discountPct = Number(
      (((beforePriceCents - price) / beforePriceCents) * 100).toFixed(2),
    )
  }

  return {
    product_id: productId,
    store_id: CHAIN_TO_SOURCE[chain],
    price_cents: price > 0 ? Math.round(price) : null,
    before_price_cents: beforePriceCents,
    unit_price_cents:
      rep?.data.unitsOfMeasurePrice && rep.data.unitsOfMeasurePrice > 0
        ? Math.round(rep.data.unitsOfMeasurePrice)
        : null,
    unit_price_unit:
      rep?.data.unitsOfMeasurePriceUnit || hit.unitOfMeasurePriceUnits || null,
    is_on_sale: isOnSale,
    offer_from: hit.cpOfferFromDate ? toIsoOrNull(hit.cpOfferFromDate) : null,
    offer_until: hit.cpOfferToDate ? toIsoOrNull(hit.cpOfferToDate) : null,
    offer_description: hit.cpOfferTitle || rep?.data.offerDescription || null,
    multibuy:
      rep?.data.multipromo && rep.data.multipromo > 0
        ? `${rep.data.multipromo} for ${(Math.round(rep.data.multiPromoPrice) / 100).toFixed(2)} kr`
        : null,
    discount_percentage: discountPct,
    in_stock: rep?.data.inStock ?? true,
    source: `salling-algolia:${chain}`,
    source_synced_at: new Date().toISOString(),
    raw_data: rep
      ? ({
          storeId: rep.storeId,
          storeData: rep.data,
          isInCurrentLeaflet: hit.isInCurrentLeaflet,
          cpOriginalPrice: hit.cpOriginalPrice,
        } as Record<string, unknown>)
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
