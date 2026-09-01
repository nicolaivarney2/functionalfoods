import type { ProductInsert, ProductOfferInsert } from '../../types'
import { isPromoOfferExpired } from '../../sync/catalog-retention'
import type { RemaDepartment, RemaPrice, RemaProduct } from './types'

const SOURCE = 'rema-1000' as const
/** REMA uses 2099-12-31 as "no end" — don't treat that as a real offer window. */
const SENTINEL_END_MS = 365 * 24 * 60 * 60 * 1000

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

function parseTs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

export function isPriceWindowActive(price: RemaPrice, nowMs: number): boolean {
  const start = parseTs(price.starting_at)
  const end = parseTs(price.ending_at)
  const startOk = start == null || start <= nowMs
  const endOk = end == null || end > nowMs
  return startOk && endOk
}

export function isSentinelOfferEnd(iso: string | null | undefined, nowMs: number): boolean {
  const t = parseTs(iso)
  return t == null || t > nowMs + SENTINEL_END_MS
}

function lowestPrice(prices: RemaPrice[]): RemaPrice {
  return prices.reduce((lowest, p) => (p.price < lowest.price ? p : lowest))
}

/**
 * Prefer an in-window campaign, then advertised leaflet price, then any
 * in-window price. If REMA leaves a 1-day gap between campaign end and the
 * next regular start, take the earliest upcoming price rather than the
 * expired campaign.
 */
export function pickCurrentPrice(
  prices: RemaPrice[] | undefined,
  nowMs: number = Date.now(),
): RemaPrice | null {
  if (!prices || prices.length === 0) return null

  const active = prices.filter((p) => isPriceWindowActive(p, nowMs))
  const pool = active.length > 0 ? active : upcomingOrAll(prices, nowMs)
  return pickPreferred(pool)
}

function upcomingOrAll(prices: RemaPrice[], nowMs: number): RemaPrice[] {
  const future = prices.filter((p) => {
    const start = parseTs(p.starting_at)
    return start != null && start > nowMs
  })
  if (future.length === 0) return prices
  const earliest = future.reduce((a, b) => {
    const as = parseTs(a.starting_at) ?? 0
    const bs = parseTs(b.starting_at) ?? 0
    return bs < as ? b : a
  })
  return [earliest]
}

function pickPreferred(pool: RemaPrice[]): RemaPrice {
  const campaigns = pool.filter((p) => p.is_campaign)
  if (campaigns.length > 0) return lowestPrice(campaigns)
  const advertised = pool.filter((p) => p.is_advertised)
  if (advertised.length > 0) return lowestPrice(advertised)
  return pool[0]
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

/**
 * Katalog: varen findes i REMA API med navn + pris.
 * Adskilt fra butiks-dækning (is_available_in_all_stores).
 */
export function isRemaProductCatalogActive(product: RemaProduct): boolean {
  if (!product.name?.trim()) return false
  return resolveRemaOfferPricing(product.prices) !== null
}

/**
 * Tilgængelig i katalog/søgning (→ Planomo is_available).
 * REMA's is_available_in_all_stores betyder "ikke i alle butikker", ikke "udgået" —
 * gemmes kun i raw_data.
 */
export function isRemaProductInStock(product: RemaProduct): boolean {
  return isRemaProductCatalogActive(product)
}

export function resolveRemaOfferPricing(
  prices: RemaPrice[] | undefined,
  nowMs: number = Date.now(),
): RemaOfferPricing | null {
  const current = pickCurrentPrice(prices, nowMs)
  if (!current) return null

  const priceCents = toCents(current.price)
  const regular = pickRegularPrice(prices, current)
  const beforePriceCents =
    regular && regular.price > current.price + 0.01
      ? toCents(regular.price)
      : null
  // Leaflet "partivarer" often have is_advertised without is_campaign or a
  // strikethrough. They still belong in ugens tilbud.
  const isOnSale =
    beforePriceCents !== null || current.is_campaign || current.is_advertised

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
    active: isRemaProductCatalogActive(product),
    last_seen_at: new Date().toISOString(),
    raw_data: {
      underline: product.underline,
      temperature_zone: product.temperature_zone,
      is_weight_item: product.is_weight_item,
      labels: product.labels,
      is_available_in_all_stores: product.is_available_in_all_stores,
    } satisfies Record<string, unknown>,
  }
}

export function mapRemaOffer(
  product: RemaProduct,
  productId: string,
  nowMs: number = Date.now(),
): ProductOfferInsert | null {
  const pricing = resolveRemaOfferPricing(product.prices, nowMs)
  if (!pricing) return null

  const { current, priceCents, beforePriceCents, isOnSale, discountPct } =
    pricing

  const offerUntil =
    isOnSale && !isSentinelOfferEnd(current.ending_at, nowMs)
      ? current.ending_at
      : null
  const promoExpired = isOnSale && isPromoOfferExpired(offerUntil)

  return {
    product_id: productId,
    store_id: SOURCE,
    price_cents: priceCents,
    before_price_cents: beforePriceCents,
    unit_price_cents: toCents(current.compare_unit_price),
    unit_price_unit: current.compare_unit ?? null,
    is_on_sale: isOnSale && !promoExpired,
    offer_from: isOnSale ? current.starting_at : null,
    offer_until: offerUntil,
    offer_description: null,
    multibuy:
      current.max_quantity && current.price_over_max_quantity
        ? `Maks ${current.max_quantity} stk pr. kunde — derover ${(current.price_over_max_quantity).toFixed(2)} kr`
        : null,
    discount_percentage: discountPct,
    in_stock: isRemaProductInStock(product) && !promoExpired,
    source: 'rema-1000-api',
    source_synced_at: new Date().toISOString(),
    raw_data: {
      prices: product.prices,
      is_available_in_all_stores: product.is_available_in_all_stores,
    } satisfies Record<string, unknown>,
  }
}
