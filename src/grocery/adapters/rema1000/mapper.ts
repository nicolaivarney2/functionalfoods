import type { ProductInsert, ProductOfferInsert } from '../../types'
import type { RemaDepartment, RemaPrice, RemaProduct } from './types'

const SOURCE = 'rema-1000' as const

/**
 * Parses underline-fields like "285 GR. / EASIS" or "500 ML. / JACOBS"
 * into amount/unit/brand. Returns nulls if unparseable.
 */
function parseUnderline(underline: string): {
  amount: number | null
  unit: string | null
  brand: string | null
} {
  if (!underline) return { amount: null, unit: null, brand: null }
  const [sizePart, brandPart] = underline.split('/').map((s) => s.trim())
  let amount: number | null = null
  let unit: string | null = null
  if (sizePart) {
    const match = sizePart.match(/^(\d+(?:[.,]\d+)?)\s*([A-Za-zØøÆæÅå]+)/)
    if (match) {
      amount = Number.parseFloat(match[1].replace(',', '.'))
      unit = match[2].toLowerCase().replace(/\.$/, '')
      const unitMap: Record<string, string> = {
        gr: 'g',
        gram: 'g',
        kgr: 'kg',
        kg: 'kg',
        liter: 'L',
        l: 'L',
        ltr: 'L',
        ml: 'ml',
        cl: 'cl',
        stk: 'stk',
        pk: 'stk',
      }
      unit = unitMap[unit] ?? unit
    }
  }
  return {
    amount,
    unit,
    brand: brandPart || null,
  }
}

function toCents(decimal: number | null | undefined): number | null {
  if (decimal === null || decimal === undefined) return null
  return Math.round(decimal * 100)
}

export function pickCurrentPrice(
  prices: RemaPrice[] | undefined,
): RemaPrice | null {
  if (!prices || prices.length === 0) return null

  const campaigns = prices.filter((p) => p.is_campaign)
  if (campaigns.length > 0) {
    return campaigns.reduce((lowest, p) =>
      p.price < lowest.price ? p : lowest,
    )
  }

  return prices[0]
}

export function pickRegularPrice(
  prices: RemaPrice[] | undefined,
  current: RemaPrice,
): RemaPrice | null {
  if (!prices || prices.length === 0) return null

  const nonCampaign = prices.filter((p) => !p.is_campaign)
  if (nonCampaign.length > 0) {
    return nonCampaign.reduce((highest, p) =>
      p.price > highest.price ? p : highest,
    )
  }

  const higherThanCurrent = prices.filter(
    (p) => p.price > current.price + 0.01,
  )
  if (higherThanCurrent.length > 0) {
    return higherThanCurrent.reduce((highest, p) =>
      p.price > highest.price ? p : highest,
    )
  }

  return null
}

export interface RemaOfferPricing {
  current: RemaPrice
  priceCents: number | null
  beforePriceCents: number | null
  isOnSale: boolean
  discountPct: number | null
}

export function resolveRemaOfferPricing(
  prices: RemaPrice[] | undefined,
): RemaOfferPricing | null {
  const current = pickCurrentPrice(prices)
  if (!current) return null

  const priceCents = toCents(current.price)
  const regular = pickRegularPrice(prices, current)
  const beforePriceCents =
    regular && regular.price > current.price + 0.01
      ? toCents(regular.price)
      : null
  const isOnSale = beforePriceCents !== null

  let discountPct: number | null = null
  if (beforePriceCents && priceCents && beforePriceCents > priceCents) {
    discountPct = Number(
      (((beforePriceCents - priceCents) / beforePriceCents) * 100).toFixed(2),
    )
  }

  return {
    current,
    priceCents,
    beforePriceCents,
    isOnSale,
    discountPct,
  }
}

export function mapRemaProduct(
  product: RemaProduct,
  department: RemaDepartment,
): ProductInsert {
  const parsed = parseUnderline(product.underline)
  const sourceId = String(product.id)

  return {
    gtin: null,
    name: product.name,
    brand: parsed.brand,
    manufacturer: null,
    description: product.description?.trim() || null,
    amount: parsed.amount,
    unit: parsed.unit,
    image_url: product.images?.[0]?.medium ?? product.images?.[0]?.large ?? null,
    category_path: department.name,
    category_lvl0: department.name,
    category_lvl1: null,
    category_lvl2: null,
    source_chain: SOURCE,
    source_id: sourceId,
    active: Boolean(product.name && product.is_available_in_all_stores !== false),
    last_seen_at: new Date().toISOString(),
    raw_data: {
      underline: product.underline,
      temperature_zone: product.temperature_zone,
      is_weight_item: product.is_weight_item,
      labels: product.labels,
    } satisfies Record<string, unknown>,
  }
}

export function mapRemaOffer(
  product: RemaProduct,
  productId: string,
): ProductOfferInsert | null {
  const pricing = resolveRemaOfferPricing(product.prices)
  if (!pricing) return null

  const { current, priceCents, beforePriceCents, isOnSale, discountPct } =
    pricing

  return {
    product_id: productId,
    store_id: SOURCE,
    price_cents: priceCents,
    before_price_cents: beforePriceCents,
    unit_price_cents: toCents(current.compare_unit_price),
    unit_price_unit: current.compare_unit ?? null,
    is_on_sale: isOnSale,
    offer_from: isOnSale ? current.starting_at : null,
    offer_until: isOnSale ? current.ending_at : null,
    offer_description: null,
    multibuy:
      current.max_quantity && current.price_over_max_quantity
        ? `Maks ${current.max_quantity} stk pr. kunde — derover ${(current.price_over_max_quantity).toFixed(2)} kr`
        : null,
    discount_percentage: discountPct,
    in_stock: true,
    source: 'rema-1000-api',
    source_synced_at: new Date().toISOString(),
    raw_data: {
      prices: product.prices,
    } satisfies Record<string, unknown>,
  }
}
