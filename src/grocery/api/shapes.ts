/**
 * Public DTO shapes exposed by /api/grocery/*.
 *
 * Stable — consumers (functionalfoods, planomo) depend on these.
 * Keep changes additive; bump shape version if breaking.
 */

export interface GroceryOfferDto {
  /** Chain identifier — e.g. "netto", "bilka", "foetex" */
  store: string
  /** Current price in DKK (decimal, 2 places). Null if unknown. */
  price: number | null
  /** Pre-discount price in DKK if on sale. */
  beforePrice: number | null
  /** Price per unit (e.g. 19 = kr/kg). */
  unitPrice: number | null
  unitPriceUnit: string | null
  isOnSale: boolean
  inStock: boolean
  offerFrom: string | null
  offerUntil: string | null
  offerDescription: string | null
  multibuy: string | null
  discountPercentage: number | null
}

export interface GroceryProductDto {
  id: string
  gtin: string | null
  name: string
  brand: string | null
  manufacturer: string | null
  description: string | null
  amount: number | null
  unit: string | null
  imageUrl: string | null
  category: {
    path: string | null
    lvl0: string | null
    lvl1: string | null
    lvl2: string | null
  }
  sourceChain: string
  sourceId: string
  offers: GroceryOfferDto[]
}

export interface GroceryCategoryNode {
  name: string
  productCount: number
  children?: GroceryCategoryNode[]
}
