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
      // Normalize common Danish unit spellings
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

function pickCurrentPrice(prices: RemaPrice[] | undefined): RemaPrice | null {
  if (!prices || prices.length === 0) return null
  // Prefer campaign if active, otherwise the first listed price.
  const campaign = prices.find((p) => p.is_campaign)
  return campaign ?? prices[0]
}

function pickRegularPrice(prices: RemaPrice[] | undefined): RemaPrice | null {
  if (!prices || prices.length === 0) return null
  return prices.find((p) => !p.is_campaign) ?? null
}

export function mapRemaProduct(
  product: RemaProduct,
  department: RemaDepartment,
): ProductInsert {
  const parsed = parseUnderline(product.underline)
  const sourceId = String(product.id)

  return {
    gtin: null, // REMA API doesn't expose EAN
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
  const current = pickCurrentPrice(product.prices)
  if (!current) return null

  const regular = pickRegularPrice(product.prices)
  const isOnSale = current.is_campaign || current.is_advertised

  const priceCents = toCents(current.price)
  const beforePriceCents = isOnSale && regular ? toCents(regular.price) : null

  let discountPct: number | null = null
  if (beforePriceCents && priceCents && beforePriceCents > priceCents) {
    discountPct = Number(
      (((beforePriceCents - priceCents) / beforePriceCents) * 100).toFixed(2),
    )
  }

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
    in_stock: true, // REMA API doesn't expose stock state
    source: 'rema-1000-api',
    source_synced_at: new Date().toISOString(),
    raw_data: {
      prices: product.prices,
    } satisfies Record<string, unknown>,
  }
}
