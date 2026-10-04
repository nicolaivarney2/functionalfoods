import type { ProductInsert, ProductOfferInsert } from '../../types'
import type { LidlAvisItem, LidlFlyerProduct, LidlProductDetails } from './types'

const SOURCE_CHAIN = 'lidl' as const
export const LIDL_AVIS_SOURCE = 'lidl-avis' as const
/**
 * Prefix så avis-varer aldrig rammer samme (source_chain, source_id) som de
 * eksisterende Goma-rækker for Lidl — de skal ligge urørt.
 */
export const LIDL_AVIS_SOURCE_ID_PREFIX = 'avis-'

/** Lidl-kategori "Mad og mad i nærheden" (wonCategoryPrimaryPath 0/17/…). */
const FOOD_ROOT_PATH = '0/17/'
/** Under "Mad og mad i nærheden", men ikke mad. */
const NON_FOOD_LVL2_PATHS = new Set(['0/17/1745', '0/17/1747'])
const NON_FOOD_NAME_RE = /drogeri|pleje|husholdning|rengøring|dyr|kæledyr|baby(?!mad)/i
/** Hele ord. "vindruer" og "rødvinsauce" er mad; "Pinotage" er vin. */
const ALCOHOL_RE =
  /(?<![\p{L}\d])(?:vin|rødvin|hvidvin|rosévin|rosevin|prosecco|cava|champagne|portvin|øl|pilsner|cider|spiritus|whisky|whiskey|vodka|gin|rom|snaps|akvavit|pinotage|pinot|chardonnay|chenin|sauvignon|cabernet|merlot|riesling|shiraz|syrah)(?![\p{L}\d])/iu

/**
 * Lidls kategorinavne → FF's afdelingsnavne (FOOD_CATALOG_LABELS i
 * product-food-classification). Ukendte navne ville ellers blive klassificeret
 * som non-food på FF.
 */
const FF_DEPARTMENT_BY_LIDL_CATEGORY: Record<string, string> = {
  'Frugt og grøntsager': 'Frugt & grønt',
  'Kød & fjerkræ': 'Kød & fisk',
  'Fisk og skaldyr': 'Kød & fisk',
  'Ost, mejeriprodukter og æg': 'Mejeri & køl',
  Bageri: 'Brød',
  'Frosne fødevarer (Frozen food)': 'Frost',
  'Slik & snacks': 'Slik & snacks',
  Færdigretter: 'Nemt & hurtigt',
  'Kaffe, te og kakao': 'Kolonial',
  Fødevareforråd: 'Kolonial',
  'Olier, krydderier og saucer': 'Kolonial',
  'Müsli og smørbare pålæg': 'Kolonial',
  Drikkevarer: 'Drikkevarer',
}

function categoryParts(product: LidlFlyerProduct): string[] {
  // "Verdener i nød/Mad og mad i nærheden/Frugt og grøntsager/Frugt" — første
  // led er Lidls rod-node og siger intet om varen.
  return (product.wonCategoryPrimary ?? '').split('/').map((s) => s.trim()).filter(Boolean).slice(1)
}

export function isLidlFoodProduct(
  product: LidlFlyerProduct,
  details: LidlProductDetails | null,
): boolean {
  if (details?.alcoholic === true) return false
  const category = categoryParts(product).join(' ')
  if (ALCOHOL_RE.test(`${product.title ?? ''} ${category}`)) return false
  const path = product.wonCategoryPrimaryPath ?? ''
  if (!path.startsWith(FOOD_ROOT_PATH)) return false
  const lvl2Path = path.split('/').slice(0, 3).join('/')
  if (NON_FOOD_LVL2_PATHS.has(lvl2Path)) return false
  const lvl2Name = categoryParts(product)[1] ?? ''
  return !NON_FOOD_NAME_RE.test(lvl2Name)
}

function parseDanishNumber(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

const UNIT_MAP: Record<string, string> = {
  g: 'g',
  gr: 'g',
  gram: 'g',
  kg: 'kg',
  ml: 'ml',
  cl: 'cl',
  dl: 'dl',
  l: 'L',
  ltr: 'L',
  liter: 'L',
  stk: 'stk',
  pk: 'stk',
  bakke: 'stk',
  bundt: 'stk',
}

function normalizeUnit(raw: string): string | null {
  return UNIT_MAP[raw.toLowerCase().replace(/\.$/, '')] ?? null
}

/**
 * "1,5 kg" → 1.5 kg · "12 x 100 g" → 1200 g · "3 stk." → 3 stk · "Stk." → 1 stk.
 * Intervaller ("340-438 g") giver nedre grænse.
 */
export function parseLidlPackaging(text: string | null | undefined): {
  amount: number | null
  unit: string | null
} {
  const s = (text ?? '').trim()
  if (!s) return { amount: null, unit: null }

  const multi = s.match(/^(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)\.?/)
  if (multi) {
    const unit = normalizeUnit(multi[3])
    const each = parseDanishNumber(multi[2])
    if (unit && each != null) {
      return { amount: Number((Number(multi[1]) * each).toFixed(3)), unit }
    }
  }

  const single = s.match(/^(\d+(?:[.,]\d+)?)(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*([a-zA-Z]+)\.?/)
  if (single) {
    const unit = normalizeUnit(single[2])
    const amount = parseDanishNumber(single[1])
    if (unit && amount != null) return { amount, unit }
  }

  if (/^stk\.?$/i.test(s)) return { amount: 1, unit: 'stk' }
  return { amount: null, unit: null }
}

/** "Pr. kg 13,33" → 1333 øre / kg. */
export function parseLidlBasePrice(text: string | null | undefined): {
  cents: number | null
  unit: string | null
} {
  const m = (text ?? '').match(/pr\.?\s*([a-zA-Z]+)\.?\s*(\d+(?:[.,]\d+)?)/i)
  if (!m) return { cents: null, unit: null }
  const value = parseDanishNumber(m[2])
  return {
    cents: value == null ? null : Math.round(value * 100),
    unit: normalizeUnit(m[1]),
  }
}

function toCents(kr: number | null | undefined): number | null {
  if (kr == null || !Number.isFinite(kr) || kr <= 0) return null
  return Math.round(kr * 100)
}

function flyerPrice(product: LidlFlyerProduct): number | null {
  if (!product.price) return null
  const n = Number.parseFloat(String(product.price).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Midnat i København for en YYYY-MM-DD, som ISO/UTC. */
export function copenhagenMidnightIso(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const utcGuess = Date.UTC(y, m - 1, d, 0, 0, 0)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Copenhagen',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcGuess))
  const cphHour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  return new Date(utcGuess - cphHour * 60 * 60 * 1000).toISOString()
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function lidlOfferWindow(item: LidlAvisItem): { from: string; until: string } {
  const from = copenhagenMidnightIso(item.flyer.offerStartDate)
  const flyerUntil = copenhagenMidnightIso(addDays(item.flyer.offerEndDate, 1))
  const detailUntil = item.details?.endDateExclusive
    ? new Date(item.details.endDateExclusive)
    : null
  const until =
    detailUntil && !Number.isNaN(detailUntil.getTime()) && detailUntil.toISOString() <= flyerUntil
      ? detailUntil.toISOString()
      : flyerUntil
  return { from, until }
}

export function lidlAvisSourceId(productId: string): string {
  return `${LIDL_AVIS_SOURCE_ID_PREFIX}${productId}`
}

function cleanDescription(product: LidlFlyerProduct): string | null {
  return product.description?.replace(/\s+/g, ' ').trim() || null
}

export function mapLidlAvisProduct(item: LidlAvisItem, syncedAt: string): ProductInsert {
  const { product, details } = item
  const [lidlLvl1, lidlLvl2, lidlLvl3] = categoryParts(product)
  const department = FF_DEPARTMENT_BY_LIDL_CATEGORY[lidlLvl2 ?? ''] ?? lidlLvl2 ?? null
  const { amount, unit } = parseLidlPackaging(details?.packaging)

  return {
    gtin: details?.eans[0] ?? null,
    name: product.title.trim(),
    brand: product.brand?.trim() || details?.brand || null,
    manufacturer: null,
    description: cleanDescription(product),
    amount,
    unit,
    image_url: product.image ?? null,
    category_path: [lidlLvl1, lidlLvl2, lidlLvl3].filter(Boolean).join(' > ') || null,
    category_lvl0: department,
    category_lvl1: lidlLvl2 ?? null,
    category_lvl2: lidlLvl3 ?? null,
    source_chain: SOURCE_CHAIN,
    source_id: lidlAvisSourceId(product.productId),
    active: true,
    last_seen_at: syncedAt,
    raw_data: {
      lidl_product_id: product.productId,
      product_url: product.url ?? `https://www.lidl.dk${product.canonicalUrl}`,
      flyer_id: item.flyer.id,
      flyer_slug: item.flyer.slug,
      flyer_url: item.flyer.url,
      packaging: details?.packaging ?? null,
      eans: details?.eans ?? [],
    },
  }
}

/** Lidl-tekster der ikke er en reel tilbudsforklaring. */
const IGNORED_DISCOUNT_TEXT = /^(spot|kuponpris|-?\d+(?:[.,]\d+)?\s*%?)$/i
const MULTIBUY_TEXT = /^ta['`´’]?\s*\d+/i

const formatKr = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} kr`

/**
 * Produktsidens pris er den alle betaler. Avisens pris kan være Lidl Plus-
 * prisen, så den bruges kun når produktsiden ikke kunne læses.
 */
export function resolveLidlPriceCents(item: LidlAvisItem): number | null {
  return toCents(item.details?.price ?? flyerPrice(item.product))
}

export function mapLidlAvisOffer(
  item: LidlAvisItem,
  productUuid: string,
  syncedAt: string,
): ProductOfferInsert | null {
  const { details } = item
  const priceCents = resolveLidlPriceCents(item)
  if (priceCents == null) return null

  const beforeCents = toCents(details?.deletedPrice)
  const hasBefore = beforeCents != null && beforeCents > priceCents
  const discountPct = hasBefore
    ? (details?.percentageDiscount ??
      Number((((beforeCents - priceCents) / beforeCents) * 100).toFixed(2)))
    : null

  const discountText = details?.discountText?.trim() || null
  const multibuy =
    discountText && MULTIBUY_TEXT.test(discountText)
      ? `${discountText.replace(/[`´’]/g, "'").replace(/\s+for$/i, '')} for ${formatKr(priceCents)}`
      : null
  const plusCents = toCents(details?.lidlPlusPrice)
  const offerDescription = details?.requiresLidlPlus
    ? 'Kræver Lidl Plus'
    : plusCents != null
      ? `Lidl Plus: ${formatKr(plusCents)}`
      : discountText && !multibuy && !IGNORED_DISCOUNT_TEXT.test(discountText)
        ? discountText
        : null

  const { cents: unitPriceCents, unit: unitPriceUnit } = parseLidlBasePrice(details?.basePrice)
  const { from, until } = lidlOfferWindow(item)

  return {
    product_id: productUuid,
    store_id: SOURCE_CHAIN,
    price_cents: priceCents,
    before_price_cents: hasBefore ? beforeCents : null,
    unit_price_cents: unitPriceCents,
    unit_price_unit: unitPriceUnit,
    is_on_sale: true,
    offer_from: from,
    offer_until: until,
    offer_description: offerDescription,
    multibuy,
    discount_percentage: discountPct,
    in_stock: true,
    source: LIDL_AVIS_SOURCE,
    source_synced_at: syncedAt,
    raw_data: {
      flyer_id: item.flyer.id,
      flyer_title: item.flyer.title,
      flyer_name: item.flyer.name,
      discount_text: discountText,
      lidl_plus_price_cents: plusCents,
      requires_lidl_plus: details?.requiresLidlPlus ?? false,
      base_price_text: details?.basePrice ?? null,
      details_fetched: details != null,
    },
  }
}
