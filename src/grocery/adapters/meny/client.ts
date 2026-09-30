/**
 * MENYs egen tilbudsavis (ugensavis.meny.dk).
 *
 * Avisen ligger hos iPaper på MENYs eget domæne. Siden indlejrer
 * `window.staticSettings` med avisens sidetekster og links til avisens
 * "enrichments" — de klikbare varer med EAN, navn, pakning og pris.
 *
 * Vi henter kun fakta (varenavn, EAN, pris, periode) — ikke avisens billeder/layout.
 * api.meny.dk er forbudt i meny.dk/robots.txt og bruges ikke.
 */

import type { MenyAvis, MenyEnrichmentProduct } from './types'

export const MENY_AVIS_URL = 'https://ugensavis.meny.dk/'
const USER_AGENT =
  'FunctionalFoodsBot/1.0 (+https://functionalfoods.dk; hej@functionalfoods.dk)'
const REQUEST_TIMEOUT_MS = 20_000

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`MENY ${res.status} ${url.split('?')[0]}`)
  return res.text()
}

/** Første JSON-objekt efter `marker` — tæller klammer uden for strenge. */
export function extractJsonObjectAfter(html: string, marker: string): unknown {
  const at = html.indexOf(marker)
  if (at < 0) return null
  const start = html.indexOf('{', at)
  if (start < 0) return null
  let depth = 0
  let inString = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return JSON.parse(html.slice(start, i + 1))
  }
  return null
}

interface MenyStaticSettings {
  paperId?: number
  name?: string
  paperCompleteUrl?: string
  pageTexts?: string[]
  enrichments?: { chunkUrls?: Record<string, string> }
}

const VALIDITY_RE =
  /gælder\s+fra\s+(?:[a-zæøå]+\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})\s+til\s+(?:og\s+med\s+)?(?:[a-zæøå]+\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/i

const isoDate = (d: string, m: string, y: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`

/** "Avisen gælder fra fredag 25.09.2026 til og med torsdag 01.10.2026" → datoer. */
export function parseMenyValidity(pageTexts: string[]): { validFrom: string; validTo: string } | null {
  for (const text of pageTexts) {
    const m = text.match(VALIDITY_RE)
    if (m) return { validFrom: isoDate(m[1], m[2], m[3]), validTo: isoDate(m[4], m[5], m[6]) }
  }
  return null
}

export function parseMenyAvisPage(html: string): {
  settings: Required<Pick<MenyStaticSettings, 'paperId' | 'name' | 'pageTexts'>> & {
    url: string
    chunkUrls: string[]
  }
  validity: { validFrom: string; validTo: string } | null
} {
  const settings = extractJsonObjectAfter(html, 'window.staticSettings') as MenyStaticSettings | null
  if (!settings?.paperId || !settings.enrichments?.chunkUrls) {
    throw new Error('MENY: kunne ikke læse avisens staticSettings')
  }
  const pageTexts = settings.pageTexts ?? []
  return {
    settings: {
      paperId: settings.paperId,
      name: settings.name ?? `MENY ${settings.paperId}`,
      url: settings.paperCompleteUrl ?? MENY_AVIS_URL,
      pageTexts,
      chunkUrls: Object.values(settings.enrichments.chunkUrls),
    },
    validity: parseMenyValidity(pageTexts),
  }
}

/** Samme EAN kan stå flere gange i avisen — første forekomst vinder. */
export function collectMenyProducts(chunks: unknown[]): MenyEnrichmentProduct[] {
  const byEan = new Map<string, MenyEnrichmentProduct>()
  for (const chunk of chunks) {
    const list = Array.isArray(chunk)
      ? chunk
      : ((chunk as { enrichments?: unknown[] } | null)?.enrichments ?? [])
    for (const raw of list as MenyEnrichmentProduct[]) {
      if (raw?.type !== 13 || raw.productId == null || !raw.name?.trim()) continue
      const ean = String(raw.productId).trim()
      if (!byEan.has(ean)) byEan.set(ean, raw)
    }
  }
  return [...byEan.values()]
}

/** Aktuel avis. Kaster hvis siden ikke kan læses; `null` hvis perioden mangler. */
export async function fetchMenyAvis(): Promise<MenyAvis | null> {
  const { settings, validity } = parseMenyAvisPage(await fetchText(MENY_AVIS_URL))
  if (!validity) return null
  // chunk-URL'erne er signerede og udløber — hentes altid friske fra siden.
  const chunks: unknown[] = []
  for (const url of settings.chunkUrls) chunks.push(JSON.parse(await fetchText(url)))
  return {
    paperId: settings.paperId,
    name: settings.name,
    url: settings.url,
    validFrom: validity.validFrom,
    validTo: validity.validTo,
    pageTexts: settings.pageTexts,
    products: collectMenyProducts(chunks),
  }
}
