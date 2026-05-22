/**
 * Salling Group Algolia index types.
 *
 * Shared index `F9VBJLR1BK` indexes:
 *   - prod_NETTO_PRODUCTS
 *   - prod_BILKA_PRODUCTS
 *   - prod_FOETEX_PRODUCTS
 *
 * Prices in storeData are in øre (integer). 250 = 2,50 kr.
 */

export type SallingChain = 'netto' | 'bilka' | 'foetex'

export const SALLING_INDEX_BY_CHAIN: Record<SallingChain, string> = {
  netto: 'prod_NETTO_PRODUCTS',
  bilka: 'prod_BILKATOGO_PRODUCTS',
  foetex: 'prod_FOETEX_PRODUCTS',
}

/** A single store's pricing for a product. */
export interface AlgoliaStoreData {
  inStock: boolean
  multipromo: number
  offerDescription: string
  price: number
  multiPromoPrice: number
  unitsOfMeasurePrice: number
  unitsOfMeasurePriceUnit: string
  unitsOfMeasureOfferPrice: number
  unitsOfMeasureShowPrice: number
}

/** Categories hierarchy (Algolia facet structure) */
export interface AlgoliaCategoriesHierarchy {
  lvl0?: string[]
  lvl1?: string[]
  lvl2?: string[]
}

/** Full Algolia hit for a Salling product. */
export interface SallingAlgoliaHit {
  objectID: string
  id: number
  article: string
  gtin: string | null
  name: string
  description: string
  manufacturer: string
  ageCode: number
  productType: string
  units: number
  unitsOfMeasure: string
  unitOfMeasurePriceUnits: string
  images: string[]
  categories: AlgoliaCategoriesHierarchy
  consumerFacingHierarchy: AlgoliaCategoriesHierarchy
  searchHierachy?: string[]
  hierarchy_node: string
  properties: Record<string, unknown>
  infos: unknown[]
  storeData: Record<string, AlgoliaStoreData> | null
  isInCurrentLeaflet: boolean
  isInOffer: unknown[]
  targetOffer: number
  // Customer Personalized Offer (CP*) fields
  cpOffer: boolean
  cpOfferFromDate: string
  cpOfferToDate: string
  cpOfferTitle: string
  cpOfferPrice: number
  cpOfferAmount: number
  cpDiscount: number
  cpPercentDiscount: number
  cpOriginalPrice: number
  cpOfferId: number
}

export interface AlgoliaQueryResponse<T> {
  hits: T[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
  exhaustiveNbHits: boolean
  query: string
  params: string
  processingTimeMS: number
  facets?: Record<string, Record<string, number>>
}
