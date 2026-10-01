/**
 * Nemlig.com webapi (samme kald som nemlig.com selv bruger).
 *
 * - robots.txt tillader /webapi/ (undtagen /webapi/order/) og blokerer kun
 *   axios/Scrapy som User-Agent.
 * - Produktlister kræver en `Referer` fra nemlig.com — uden den svarer
 *   GetByProductGroupId 500/400. Ingen login, cookies eller token.
 * - Katalog: menuens bladsider → `?GetAsJson=1` giver sidens ProductGroupId'er
 *   → `Products/GetByProductGroupId`. Varer i produkt-sitemap'et, som ingen
 *   liste viste, hentes enkeltvis med `Products/Get?id=`.
 */

import type {
  NemligCatalogEntry,
  NemligCategoryPage,
  NemligMenuItem,
  NemligProduct,
} from './types'

const BASE = 'https://www.nemlig.com'
const USER_AGENT = 'functionalfoods-grocery-sync/1.0 (+https://functionalfoods.dk)'
const REQUEST_TIMEOUT_MS = 30_000
const CONCURRENCY = 4
const DELAY_MS = 100
const PAGE_SIZE = 200
const MAX_RETRIES = 3
/** Inspirationssider gentager varer fra de rigtige afdelinger. */
const SKIPPED_MENU_PREFIXES = ['/dagligvarer/nye-varer-inspiration']
const CATALOG_ROOTS = ['/dagligvarer', '/vin']

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class NemligHttpError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`Nemlig ${status} ${path}`)
  }
}

async function request(path: string, accept: string): Promise<string> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1))
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: accept, Referer: `${BASE}/` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (res.ok) return await res.text()
      lastError = new NemligHttpError(res.status, path.split('?')[0])
      if (res.status !== 429 && res.status < 500) break
    } catch (err) {
      lastError = err
    }
  }
  throw lastError
}

async function getJson<T>(path: string): Promise<T> {
  return JSON.parse(await request(path, 'application/json, text/plain, */*')) as T
}

/** Kører `fn` over `items` med fast parallelitet og pause mellem kald. */
export async function mapPolitely<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = CONCURRENCY,
  delayMs = DELAY_MS,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
      if (delayMs) await sleep(delayMs)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

export interface NemligSession {
  /** `CombinedProductsAndSitecoreTimestamp` til lister, `ProductsImportedTimestamp` til enkeltvarer. */
  listStamp: string
  productStamp: string
  /** `{TimeslotUtc}/{DeliveryZoneId}` — standard-leveringstid for en anonym kurv. */
  timeslot: string
}

export async function openNemligSession(): Promise<NemligSession> {
  const settings = await getJson<{
    CombinedProductsAndSitecoreTimestamp?: string
    ProductsImportedTimestamp?: string
  }>('/webapi/v2/AppSettings/Website')
  if (!settings.CombinedProductsAndSitecoreTimestamp || !settings.ProductsImportedTimestamp) {
    throw new Error('Nemlig: AppSettings mangler timestamps')
  }
  const basket = await getJson<{ TimeslotUtc?: string; DeliveryZoneId?: number }>(
    '/webapi/basket/GetBasket',
  )
  if (!basket.TimeslotUtc || basket.DeliveryZoneId == null) {
    throw new Error('Nemlig: kurven mangler TimeslotUtc/DeliveryZoneId')
  }
  return {
    listStamp: settings.CombinedProductsAndSitecoreTimestamp,
    productStamp: settings.ProductsImportedTimestamp,
    timeslot: `${basket.TimeslotUtc}/${basket.DeliveryZoneId}`,
  }
}

/** Bladsider under Dagligvarer og Vin, med topafdelingen de hører til. */
export function nemligCategoryPages(menu: NemligMenuItem[]): NemligCategoryPage[] {
  const pages = new Map<string, NemligCategoryPage>()
  const walk = (node: NemligMenuItem, department: string) => {
    if (SKIPPED_MENU_PREFIXES.some((p) => node.Url?.startsWith(p))) return
    const children = node.Children ?? []
    if (children.length === 0) {
      if (node.Url?.startsWith('/') && !pages.has(node.Url)) pages.set(node.Url, { url: node.Url, department })
      return
    }
    for (const child of children) walk(child, department)
  }
  for (const root of menu) {
    if (!CATALOG_ROOTS.includes(root.Url)) continue
    if (root.Url === '/vin') walk(root, root.Text)
    else for (const dept of root.Children ?? []) walk(dept, dept.Text.trim())
  }
  return [...pages.values()]
}

export async function fetchNemligMenu(session: NemligSession): Promise<NemligMenuItem[]> {
  return getJson<NemligMenuItem[]>(
    `/webapi/${session.listStamp}/${session.timeslot}/0/Menu/main?navigationDepth=6`,
  )
}

/** Alle ProductGroupId'er i en sides JSON (produktlister ligger også i bånd/ribbons). */
export function productGroupIdsFromPage(page: unknown): string[] {
  const ids = new Set<string>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const n of node) walk(n)
    } else if (node && typeof node === 'object') {
      const obj = node as Record<string, unknown>
      if (typeof obj.ProductGroupId === 'string' && obj.ProductGroupId) ids.add(obj.ProductGroupId)
      for (const v of Object.values(obj)) if (v && typeof v === 'object') walk(v)
    }
  }
  walk((page as { content?: unknown } | null)?.content)
  return [...ids]
}

export async function fetchNemligPageGroups(url: string): Promise<string[]> {
  const sep = url.includes('?') ? '&' : '?'
  return productGroupIdsFromPage(await getJson(`${url}${sep}GetAsJson=1`))
}

export async function fetchNemligGroupProducts(
  session: NemligSession,
  groupId: string,
): Promise<NemligProduct[]> {
  const products: NemligProduct[] = []
  for (let pageIndex = 0; ; pageIndex++) {
    const page = await getJson<{ Products?: NemligProduct[]; NumFound?: number }>(
      `/webapi/${session.listStamp}/${session.timeslot}/0/Products/GetByProductGroupId?productGroupId=${encodeURIComponent(groupId)}&pageIndex=${pageIndex}&pagesize=${PAGE_SIZE}`,
    )
    const batch = page.Products ?? []
    products.push(...batch)
    if (batch.length < PAGE_SIZE || products.length >= (page.NumFound ?? 0)) break
    await sleep(DELAY_MS)
  }
  return products
}

export async function fetchNemligProduct(
  session: NemligSession,
  id: string,
): Promise<NemligProduct | null> {
  try {
    const product = await getJson<NemligProduct | null>(
      `/webapi/${session.productStamp}/${session.timeslot}/0/Products/Get?id=${encodeURIComponent(id)}`,
    )
    return product?.Id ? product : null
  } catch (err) {
    if (err instanceof NemligHttpError && err.status === 404) return null
    throw err
  }
}

/** "https://www.nemlig.com/solbaermarmelade-5604565" → "5604565". */
export function nemligIdsFromSitemap(xml: string): string[] {
  const ids = new Set<string>()
  for (const m of xml.matchAll(/<loc>\s*https:\/\/www\.nemlig\.com\/[^<]*?-(\d+)\s*<\/loc>/g)) ids.add(m[1])
  return [...ids]
}

export async function fetchNemligSitemapIds(): Promise<string[]> {
  return nemligIdsFromSitemap(await request('/googleproductsitemap', 'application/xml, text/xml'))
}

export interface NemligCatalog {
  entries: NemligCatalogEntry[]
  pages: number
  groups: number
  sitemapIds: number
  fetchedSingly: number
  /** Kald der fejlede efter retries — katalogen er så ufuldstændig. */
  failures: string[]
}

/**
 * Hele kataloget. Varer i flere afdelinger tæller én gang (første afdeling vinder).
 * Fejl i enkelte sider/grupper stopper ikke kørslen, men står i `failures`.
 */
export async function fetchNemligCatalog(
  options: { log?: (msg: string) => void; maxPages?: number; skipSitemap?: boolean } = {},
): Promise<NemligCatalog> {
  const log = options.log ?? (() => {})
  const failures: string[] = []
  const session = await openNemligSession()
  log(`session: ${session.listStamp} · ${session.timeslot}`)

  let pages = nemligCategoryPages(await fetchNemligMenu(session))
  if (options.maxPages) pages = pages.slice(0, options.maxPages)
  log(`kategorisider: ${pages.length}`)

  const groupDepartment = new Map<string, string>()
  await mapPolitely(pages, async (page) => {
    try {
      for (const id of await fetchNemligPageGroups(page.url)) {
        if (!groupDepartment.has(id)) groupDepartment.set(id, page.department)
      }
    } catch (err) {
      failures.push(`side ${page.url}: ${err instanceof Error ? err.message : err}`)
    }
  })
  log(`produktgrupper: ${groupDepartment.size}`)

  const byId = new Map<string, NemligCatalogEntry>()
  await mapPolitely([...groupDepartment.entries()], async ([groupId, department]) => {
    try {
      for (const product of await fetchNemligGroupProducts(session, groupId)) {
        const id = String(product.Id)
        if (!byId.has(id)) byId.set(id, { product, department })
      }
    } catch (err) {
      failures.push(`gruppe ${groupId}: ${err instanceof Error ? err.message : err}`)
    }
  })
  log(`varer fra lister: ${byId.size}`)

  let sitemapIds = 0
  let fetchedSingly = 0
  if (!options.skipSitemap) {
    const ids = await fetchNemligSitemapIds()
    sitemapIds = ids.length
    const missing = ids.filter((id) => !byId.has(id))
    log(`sitemap: ${ids.length} varer, ${missing.length} ikke i listerne — hentes enkeltvis`)
    await mapPolitely(missing, async (id) => {
      try {
        const product = await fetchNemligProduct(session, id)
        if (product && !byId.has(String(product.Id))) {
          byId.set(String(product.Id), { product, department: product.ProductMainGroupName ?? '' })
          fetchedSingly++
        }
      } catch (err) {
        failures.push(`vare ${id}: ${err instanceof Error ? err.message : err}`)
      }
    })
  }

  return {
    entries: [...byId.values()],
    pages: pages.length,
    groups: groupDepartment.size,
    sitemapIds,
    fetchedSingly,
    failures,
  }
}
