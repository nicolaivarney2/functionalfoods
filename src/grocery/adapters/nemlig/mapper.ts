import type { ProductInsert, ProductOfferInsert } from '../../types'
import type { NemligCampaign, NemligCatalogEntry, NemligProduct } from './types'

const SOURCE_CHAIN = 'nemlig' as const
export const NEMLIG_OFFER_SOURCE = 'nemlig-api' as const

const formatKr = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} kr`

function toCents(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100)
}

/** Samme nøgle som Goma brugte — eksisterende rækker og ingrediens-matches opdateres på stedet. */
export function nemligSourceId(id: string | number): string {
  return `nemlig-${id}`
}

/**
 * Nemligs hovedgrupper → afdelingsnavnene Goma-rækkerne allerede har i fooddata
 * (og som FF's madvare-filter kender).
 */
const DEPARTMENT_BY_MAIN_GROUP: Record<string, string> = {
  'tørvarer': 'Kolonial',
  drikke: 'Drikkevarer',
  'vin og spiritus': 'Drikkevarer',
  'køl': 'Mejeri og køl',
  mejeri: 'Mejeri og køl',
  'kød og fisk': 'Kød og fisk',
  'frugt og grønt': 'Frugt og grønt',
  frost: 'Frost',
  'brød': 'Brød og kager',
  konfekture: 'Slik og snacks',
  kiosk: 'Kiosk',
  pleje: 'Personlig pleje',
  nonfood: 'Husholdning',
  husholdning: 'Husholdning',
  blomster: 'Blomster og have',
  'baby og børn': 'Baby og familie',
  'dyremad og tilbehør': 'Dyr',
}

const WINE_SHELF_RE =
  /(?:^|[^a-zæøå])(?:vin og spiritus|spiritus|rødvin|hvidvin|rosévin|rosevin|mousserende|champagne|hedvin|portvin)(?:$|[^a-zæøå])|^vin(?:$|[^a-zæøå])/i

/** Vin- og spiritus-hylder. Vindruer og rødvinssauce rammes ikke. */
export function isNemligWine(entry: Pick<NemligCatalogEntry, 'product' | 'department'>): boolean {
  const url = entry.product.Url ?? ''
  if (url === '/vin' || url.startsWith('/vin/')) return true
  const shelves = [
    entry.department,
    entry.product.ProductMainGroupName,
    entry.product.ProductCategoryGroupName,
    entry.product.ProductSubGroupName,
    entry.product.Category,
    entry.product.SubCategory,
  ]
  return shelves.some((shelf) => WINE_SHELF_RE.test((shelf ?? '').trim()))
}

export function nemligDepartment(product: NemligProduct, menuDepartment?: string | null): string {
  for (const name of [product.ProductMainGroupName, menuDepartment]) {
    const mapped = name ? DEPARTMENT_BY_MAIN_GROUP[name.trim().toLowerCase()] : undefined
    if (mapped) return mapped
  }
  return 'Diverse'
}

const MEASURE_UNITS: Record<string, string> = {
  g: 'g',
  gr: 'g',
  kg: 'kg',
  l: 'L',
  ltr: 'L',
  ml: 'ml',
  cl: 'cl',
}
const COUNT_UNITS = new Set([
  'stk', 'bdt', 'pk', 'ps', 'pose', 'breve', 'kapsler', 'kaffekapsler', 'par', 'rl', 'sæt', 'dele',
])

/**
 * Første led af Description: "200 g", "ca. 500 g", "400-500 g", "4 x 33 cl", "6 stk.".
 * Vin har landet her ("Frankrig") → null.
 */
export function parseNemligSize(description: string | null | undefined): {
  amount: number | null
  unit: string | null
} {
  const size = (description ?? '').split('/')[0].trim().toLowerCase()
  const m = size.match(
    /^(?:ca\.?\s*|min\.?\s*)?(?:(\d+)\s*x\s*)?(\d+(?:[.,]\d+)?)(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*([a-zæøå]+)\.?$/,
  )
  if (!m) return { amount: null, unit: null }
  const word = m[3]
  const unit = MEASURE_UNITS[word] ?? (COUNT_UNITS.has(word) ? 'stk' : null)
  if (!unit) return { amount: null, unit: null }
  const amount = Number.parseFloat(m[2].replace(',', '.')) * (m[1] ? Number(m[1]) : 1)
  return { amount: Number.isFinite(amount) ? amount : null, unit }
}

function brandFromDescription(description: string | null | undefined): string | null {
  const parts = (description ?? '').split('/')
  return parts.length > 1 ? parts.slice(1).join('/').trim() || null : null
}

/** "kr./Kg." → "kg", "kr./Ltr." → "L", "kr./Stk." → "stk", "kr./Pr. Mtr." → "m". */
export function nemligUnitPriceUnit(label: string | null | undefined): string | null {
  const unit = (label ?? '').toLowerCase().replace(/^kr\.?\s*\/\s*/, '').replace(/\.$/, '').trim()
  if (!unit) return null
  if (unit === 'kg') return 'kg'
  if (unit === 'ltr' || unit === 'l') return 'L'
  if (unit === 'stk') return 'stk'
  if (unit.includes('mtr')) return 'm'
  return unit
}

export function isNemligProductInStock(product: NemligProduct): boolean {
  const a = product.Availability
  return a ? a.IsAvailableInStock !== false && a.IsDeliveryAvailable !== false : true
}

function isCampaignLive(campaign: NemligCampaign, nowMs: number): boolean {
  const start = campaign.IntervalStart ? Date.parse(campaign.IntervalStart) : NaN
  const end = campaign.IntervalEnd ? Date.parse(campaign.IntervalEnd) : NaN
  return (!Number.isFinite(start) || start <= nowMs) && (!Number.isFinite(end) || end > nowMs)
}

export interface NemligPricing {
  priceCents: number
  beforePriceCents: number | null
  unitPriceCents: number | null
  isOnSale: boolean
  multibuy: string | null
  discountPct: number | null
  campaign: NemligCampaign | null
}

const pct = (before: number, now: number) => Number((((before - now) / before) * 100).toFixed(2))

/**
 * - Discount / DiscountPercent: ny stykpris (CampaignPrice), førpris = Price.
 * - MixOffer / BuyXForY: stykpris forbliver Price, tilbuddet står i `multibuy`
 *   ("2 for 32,00 kr") — kun tilbud hvis TotalPrice/MinQuantity < Price.
 * - FreeProduct (CampaignPrice 0) og DiscountItem uden kampagne er ikke tilbud.
 */
export function resolveNemligPricing(
  product: NemligProduct,
  nowMs: number = Date.now(),
): NemligPricing | null {
  const priceCents = toCents(product.Price)
  if (priceCents == null) return null
  const regular: NemligPricing = {
    priceCents,
    beforePriceCents: null,
    unitPriceCents: toCents(product.UnitPriceCalc),
    isOnSale: false,
    multibuy: null,
    discountPct: null,
    campaign: null,
  }

  const campaign = product.Campaign
  if (!campaign || !isCampaignLive(campaign, nowMs)) return regular

  switch (campaign.Type) {
    case 'ProductCampaignDiscount':
    case 'ProductCampaignDiscountPercent': {
      const campaignCents = toCents(campaign.CampaignPrice)
      if (campaignCents == null || campaignCents >= priceCents) return regular
      return {
        priceCents: campaignCents,
        beforePriceCents: priceCents,
        unitPriceCents: toCents(campaign.CampaignUnitPrice) ?? scaleUnitPrice(regular.unitPriceCents, campaignCents / priceCents),
        isOnSale: true,
        multibuy: null,
        discountPct: pct(priceCents, campaignCents),
        campaign,
      }
    }
    case 'ProductCampaignMixOffer':
    case 'ProductCampaignBuyXForY': {
      const qty = campaign.MinQuantity
      const totalCents = toCents(campaign.TotalPrice)
      if (!qty || qty < 2 || totalCents == null) return regular
      const perUnit = totalCents / qty
      if (perUnit >= priceCents - 0.5) return regular
      return {
        ...regular,
        isOnSale: true,
        multibuy: `${qty} for ${formatKr(totalCents)}`,
        discountPct: pct(priceCents, perUnit),
        campaign,
      }
    }
    default:
      return regular
  }
}

function scaleUnitPrice(unitCents: number | null, factor: number): number | null {
  return unitCents == null ? null : Math.round(unitCents * factor)
}

export function mapNemligProduct(
  entry: NemligCatalogEntry,
  seenAt: string = new Date().toISOString(),
): ProductInsert {
  const { product } = entry
  const size = parseNemligSize(product.Description)
  const department = nemligDepartment(product, entry.department)
  const lvl1 = product.ProductCategoryGroupName?.trim() || product.Category?.trim() || null
  const lvl2 = product.ProductSubGroupName?.trim() || product.SubCategory?.trim() || null

  return {
    gtin: null,
    name: product.Name.trim(),
    brand: product.Brand?.trim() || brandFromDescription(product.Description),
    manufacturer: null,
    description: product.Description?.trim() || null,
    amount: size.amount,
    unit: size.unit,
    image_url: product.PrimaryImage || null,
    category_path: [department, lvl1, lvl2].filter(Boolean).join(' > '),
    category_lvl0: department,
    category_lvl1: lvl1,
    category_lvl2: lvl2,
    source_chain: SOURCE_CHAIN,
    source_id: nemligSourceId(product.Id),
    active: Boolean(product.Name?.trim()) && toCents(product.Price) != null,
    last_seen_at: seenAt,
    raw_data: {
      nemlig_id: String(product.Id),
      url: product.Url ? `https://www.nemlig.com/${product.Url.replace(/^\//, '')}` : null,
      labels: product.Labels ?? [],
      main_group: product.ProductMainGroupName ?? null,
      main_group_number: product.ProductMainGroupNumber ?? null,
      category_group_number: product.ProductCategoryGroupNumber ?? null,
      sub_group_number: product.ProductSubGroupNumber ?? null,
      unit_price_text: product.UnitPrice ?? null,
    },
  }
}

export function mapNemligOffer(
  product: NemligProduct,
  productUuid: string,
  syncedAt: string = new Date().toISOString(),
  nowMs: number = Date.now(),
): ProductOfferInsert | null {
  const pricing = resolveNemligPricing(product, nowMs)
  if (!pricing) return null
  const { campaign } = pricing
  const notes = [
    pricing.isOnSale ? product.CampaignAttribute?.trim() || null : null,
    pricing.isOnSale && campaign?.MaxQuantity && campaign.MaxQuantity > 0
      ? `Maks ${campaign.MaxQuantity} stk`
      : null,
  ].filter(Boolean)

  return {
    product_id: productUuid,
    store_id: SOURCE_CHAIN,
    price_cents: pricing.priceCents,
    before_price_cents: pricing.beforePriceCents,
    unit_price_cents: pricing.unitPriceCents,
    unit_price_unit: nemligUnitPriceUnit(product.UnitPriceLabel),
    is_on_sale: pricing.isOnSale,
    offer_from: pricing.isOnSale ? campaign?.IntervalStart ?? null : null,
    offer_until: pricing.isOnSale ? campaign?.IntervalEnd ?? null : null,
    offer_description: notes.length > 0 ? notes.join(' · ') : null,
    multibuy: pricing.multibuy,
    discount_percentage: pricing.discountPct,
    in_stock: isNemligProductInStock(product),
    source: NEMLIG_OFFER_SOURCE,
    source_synced_at: syncedAt,
    raw_data: {
      campaign: product.Campaign ?? null,
      campaign_attribute: product.CampaignAttribute ?? null,
      availability: product.Availability ?? null,
    },
  }
}
