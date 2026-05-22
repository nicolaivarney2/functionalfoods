import type { GroceryOfferDto, GroceryProductDto } from './shapes'

interface RawOffer {
  store_id: string
  price_cents: number | null
  before_price_cents: number | null
  unit_price_cents: number | null
  unit_price_unit: string | null
  is_on_sale: boolean
  in_stock: boolean
  offer_from: string | null
  offer_until: string | null
  offer_description: string | null
  multibuy: string | null
  discount_percentage: number | null
}

export interface RawProduct {
  id: string
  gtin: string | null
  name: string
  brand: string | null
  manufacturer: string | null
  description: string | null
  amount: number | null
  unit: string | null
  image_url: string | null
  category_path: string | null
  category_lvl0: string | null
  category_lvl1: string | null
  category_lvl2: string | null
  source_chain: string
  source_id: string
  product_offers?: RawOffer[] | null
}

function centsToKr(cents: number | null): number | null {
  if (cents === null || cents === undefined) return null
  return Number((cents / 100).toFixed(2))
}

export function mapOffer(row: RawOffer): GroceryOfferDto {
  return {
    store: row.store_id,
    price: centsToKr(row.price_cents),
    beforePrice: centsToKr(row.before_price_cents),
    unitPrice: centsToKr(row.unit_price_cents),
    unitPriceUnit: row.unit_price_unit,
    isOnSale: row.is_on_sale,
    inStock: row.in_stock,
    offerFrom: row.offer_from,
    offerUntil: row.offer_until,
    offerDescription: row.offer_description,
    multibuy: row.multibuy,
    discountPercentage: row.discount_percentage,
  }
}

export function mapProduct(row: RawProduct): GroceryProductDto {
  return {
    id: row.id,
    gtin: row.gtin,
    name: row.name,
    brand: row.brand,
    manufacturer: row.manufacturer,
    description: row.description,
    amount: row.amount,
    unit: row.unit,
    imageUrl: row.image_url,
    category: {
      path: row.category_path,
      lvl0: row.category_lvl0,
      lvl1: row.category_lvl1,
      lvl2: row.category_lvl2,
    },
    sourceChain: row.source_chain,
    sourceId: row.source_id,
    offers: (row.product_offers ?? []).map(mapOffer),
  }
}

export const PRODUCT_SELECT = `
  id,
  gtin,
  name,
  brand,
  manufacturer,
  description,
  amount,
  unit,
  image_url,
  category_path,
  category_lvl0,
  category_lvl1,
  category_lvl2,
  source_chain,
  source_id,
  product_offers (
    store_id,
    price_cents,
    before_price_cents,
    unit_price_cents,
    unit_price_unit,
    is_on_sale,
    in_stock,
    offer_from,
    offer_until,
    offer_description,
    multibuy,
    discount_percentage
  )
`.trim()
