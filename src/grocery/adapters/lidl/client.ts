/**
 * Lidl Danmarks egen tilbudsavis.
 *
 * Kilder (begge ejet af Lidl/Schwarz-koncernen — ingen tredjepart):
 *   - lidl.dk/c/tilbudsavis  → hvilke aviser er ude lige nu
 *   - endpoints.leaflets.schwarz/v4/flyer → avisens varer (titel, pris, kategori)
 *   - lidl.dk/p/<id>          → pakning, enhedspris, førpris, EAN
 *
 * Vi henter kun fakta (varenavn, pris, periode) — ikke avisens billeder/layout.
 */

import type {
  LidlFlyer,
  LidlFlyerResponse,
  LidlProductDetails,
} from './types'

export const LIDL_BASE_URL = 'https://www.lidl.dk'
export const LIDL_AVIS_OVERVIEW_PATH = '/c/tilbudsavis/s10013730'
const LEAFLET_API = 'https://endpoints.leaflets.schwarz/v4/flyer'
const USER_AGENT =
  'FunctionalFoodsBot/1.0 (+https://functionalfoods.dk; hej@functionalfoods.dk)'
const REQUEST_TIMEOUT_MS = 20_000

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Lidl ${res.status} ${url}`)
  return res.text()
}

export interface LidlFlyerRef {
  slug: string
  regionId: string
  url: string
}

/** Avis-links fra oversigtssiden, fx `/l/da/tilbudsavis/d-27-03-okt/ar/0`. */
export function parseFlyerRefs(html: string): LidlFlyerRef[] {
  const refs = new Map<string, LidlFlyerRef>()
  const re = /\/l\/da\/tilbudsavis\/([a-z0-9-]+)\/ar\/(\d+)/g
  for (const m of html.matchAll(re)) {
    const [path, slug, regionId] = m
    if (!refs.has(slug)) refs.set(slug, { slug, regionId, url: `${LIDL_BASE_URL}${path}` })
  }
  return [...refs.values()]
}

export async function listLidlFlyerRefs(): Promise<LidlFlyerRef[]> {
  return parseFlyerRefs(await fetchText(`${LIDL_BASE_URL}${LIDL_AVIS_OVERVIEW_PATH}`))
}

export async function fetchLidlFlyer(ref: LidlFlyerRef): Promise<LidlFlyer | null> {
  const url = `${LEAFLET_API}?flyer_identifier=${encodeURIComponent(ref.slug)}&region_id=${encodeURIComponent(ref.regionId)}`
  const body = JSON.parse(await fetchText(url)) as LidlFlyerResponse
  if (!body.success || !body.flyer) return null
  return body.flyer
}

const DEVALUE_SPECIAL = new Set([
  'Reactive',
  'ShallowReactive',
  'Ref',
  'ShallowRef',
  'EmptyRef',
  'EmptyShallowRef',
])

/**
 * Nuxt `__NUXT_DATA__` er devalue-serialiseret: et fladt array hvor objekter
 * og arrays refererer til andre indeks. Negative indeks er undefined/NaN o.l.
 */
export function hydrateNuxtPayload(payload: unknown[]): unknown {
  const memo = new Map<number, unknown>()
  const visit = (index: number): unknown => {
    if (index < 0) return undefined
    if (memo.has(index)) return memo.get(index)
    const raw = payload[index]
    if (raw === null || typeof raw !== 'object') {
      memo.set(index, raw)
      return raw
    }
    if (Array.isArray(raw)) {
      if (typeof raw[0] === 'string') {
        const [type, ...rest] = raw as [string, ...unknown[]]
        if (DEVALUE_SPECIAL.has(type)) {
          const value = typeof rest[0] === 'number' ? visit(rest[0]) : undefined
          memo.set(index, value)
          return value
        }
        if (type === 'Date') {
          memo.set(index, rest[0])
          return rest[0]
        }
        memo.set(index, null)
        return null
      }
      const out: unknown[] = []
      memo.set(index, out)
      for (const ref of raw) out.push(typeof ref === 'number' ? visit(ref) : ref)
      return out
    }
    const out: Record<string, unknown> = {}
    memo.set(index, out)
    for (const [key, ref] of Object.entries(raw as Record<string, unknown>)) {
      out[key] = typeof ref === 'number' ? visit(ref) : ref
    }
    return out
  }
  return visit(0)
}

function findProductNode(root: unknown, productId: string): Record<string, unknown> | null {
  const stack: unknown[] = [root]
  const seen = new Set<unknown>()
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || typeof node !== 'object' || seen.has(node)) continue
    seen.add(node)
    if (!Array.isArray(node)) {
      const obj = node as Record<string, unknown>
      if ('erpNumber' in obj && 'eans' in obj && String(obj.productId ?? obj.erpNumber) === productId) {
        return obj
      }
    }
    for (const child of Object.values(node as Record<string, unknown>)) stack.push(child)
  }
  return null
}

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null
const asNumber = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null
const textOf = (v: unknown): string | null =>
  v && typeof v === 'object' ? asString((v as Record<string, unknown>).text) : null

export function parseLidlProductPage(html: string, productId: string): LidlProductDetails | null {
  const m = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  const root = hydrateNuxtPayload(JSON.parse(m[1]) as unknown[])
  const node = findProductNode(root, productId)
  if (!node) return null

  const regionPrices = node.regionsPrices as Record<string, unknown> | undefined
  const regionPrice = regionPrices
    ? (Object.values(regionPrices).find(Boolean) as Record<string, unknown> | undefined)
    : undefined
  const regular = regionPrice?.currentPrice as Record<string, unknown> | undefined
  const plus = (regionPrice?.currentLidlPlusPrice as Record<string, unknown> | undefined)?.price as
    | Record<string, unknown>
    | undefined
  const price = (regular ?? plus ?? node.price) as Record<string, unknown> | undefined
  const discount = price?.discount as Record<string, unknown> | undefined
  const regularPrice = asNumber(regular?.price)
  const plusPrice = asNumber(plus?.price)
  const info = node.info as Record<string, unknown> | undefined
  const eans = Array.isArray(node.eans)
    ? node.eans.map((e) => String(e ?? '').trim()).filter((e) => /^\d{8,14}$/.test(e))
    : []

  return {
    eans,
    alcoholic: typeof node.alcoholic === 'boolean' ? node.alcoholic : null,
    brand: textOf(info?.brand) ?? asString((info?.brand as Record<string, unknown>)?.name),
    price: asNumber(price?.price),
    lidlPlusPrice:
      regularPrice != null && plusPrice != null && plusPrice < regularPrice ? plusPrice : null,
    requiresLidlPlus: regularPrice == null && plusPrice != null,
    packaging: textOf(price?.packaging) ?? textOf(plus?.packaging),
    basePrice: textOf(price?.basePrice),
    deletedPrice: asNumber(discount?.deletedPrice) ?? asNumber(price?.oldPrice),
    discountText: asString(discount?.discountText),
    percentageDiscount: asNumber(discount?.percentageDiscount),
    startDate: asString(price?.startDate),
    endDateExclusive: asString(price?.endDateExclusive),
  }
}

export async function fetchLidlProductDetails(
  canonicalUrl: string,
  productId: string,
): Promise<LidlProductDetails | null> {
  const url = canonicalUrl.startsWith('http') ? canonicalUrl : `${LIDL_BASE_URL}${canonicalUrl}`
  return parseLidlProductPage(await fetchText(url), productId)
}
