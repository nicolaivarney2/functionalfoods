/**
 * Dagrofa-kædernes egen tilbudsavis (ugensavis.meny.dk, ugensavis.spar.dk,
 * ugensavis.minkøbmand.dk).
 *
 * Aviserne ligger hos iPaper på kædernes egne domæner. Siden indlejrer
 * `window.staticSettings` med avisens sidetekster og links til avisens
 * "enrichments" — de klikbare varer med EAN, navn, pakning og pris.
 *
 * Vi henter kun fakta (varenavn, EAN, pris, periode) — ikke avisens billeder/layout.
 * api.meny.dk er forbudt i meny.dk/robots.txt og bruges ikke.
 */

import type { DagrofaAvisChain } from './chains'
import type { DagrofaAvis, DagrofaEnrichmentProduct } from './types'

const USER_AGENT =
  'FunctionalFoodsBot/1.0 (+https://functionalfoods.dk; hej@functionalfoods.dk)'
const REQUEST_TIMEOUT_MS = 20_000

async function fetchText(url: string, label: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`${label} ${res.status} ${url.split('?')[0]}`)
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

interface IpaperStaticSettings {
  paperId?: number
  name?: string
  paperCompleteUrl?: string
  pageTexts?: string[]
  enrichments?: { chunkUrls?: Record<string, string> }
}

const MONTHS = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
]

// "fredag 25.09.2026" · "FREDAG 25. SEPTEMBER" · "fredag den 1. oktober 2026"
const DAY = String.raw`(?:[a-zæøå]+\s+)?(?:den\s+)?(\d{1,2})\.\s*(?:(\d{1,2})\.(\d{4})|([a-zæøå]+)(?:\s+(\d{4}))?)`
const VALIDITY_RE = new RegExp(String.raw`gælder\s+fra\s+${DAY}\s+til\s+(?:og\s+med\s+)?${DAY}`, 'iu')

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function monthNumber(name: string | undefined): number | null {
  const i = MONTHS.indexOf((name ?? '').toLowerCase())
  return i >= 0 ? i + 1 : null
}

/**
 * Avisens periode fra teksten:
 *   "Avisen gælder fra fredag 25.09.2026 til og med torsdag 01.10.2026"
 *   "AVISEN GÆLDER FRA FREDAG 25. SEPTEMBER TIL OG MED TORSDAG 1. OKTOBER 2026"
 * Uden år på startdatoen bruges slutårets (året før ved december → januar).
 */
export function parseDagrofaValidity(pageTexts: string[]): { validFrom: string; validTo: string } | null {
  for (const text of pageTexts) {
    const m = text.replace(/\s+/g, ' ').match(VALIDITY_RE)
    if (!m) continue
    const [, fd, fmNum, fyNum, fmName, fyName, td, tmNum, tyNum, tmName, tyName] = m
    const toMonth = tmNum ? Number(tmNum) : monthNumber(tmName)
    const fromMonth = fmNum ? Number(fmNum) : monthNumber(fmName)
    const toYear = Number(tyNum ?? tyName)
    if (!toMonth || !fromMonth || !toYear) continue
    const fromYear = Number(fyNum ?? fyName) || (fromMonth > toMonth ? toYear - 1 : toYear)
    return { validFrom: iso(fromYear, fromMonth, Number(fd)), validTo: iso(toYear, toMonth, Number(td)) }
  }
  return null
}

export function parseDagrofaAvisPage(
  html: string,
  chain: Pick<DagrofaAvisChain, 'label' | 'avisUrl'>,
): {
  settings: Required<Pick<IpaperStaticSettings, 'paperId' | 'name' | 'pageTexts'>> & {
    url: string
    chunkUrls: string[]
  }
  validity: { validFrom: string; validTo: string } | null
} {
  const settings = extractJsonObjectAfter(html, 'window.staticSettings') as IpaperStaticSettings | null
  if (!settings?.paperId || !settings.enrichments?.chunkUrls) {
    throw new Error(`${chain.label}: kunne ikke læse avisens staticSettings`)
  }
  const pageTexts = settings.pageTexts ?? []
  return {
    settings: {
      paperId: settings.paperId,
      name: settings.name ?? `${chain.label} ${settings.paperId}`,
      url: settings.paperCompleteUrl ?? chain.avisUrl,
      pageTexts,
      chunkUrls: Object.values(settings.enrichments.chunkUrls),
    },
    validity: parseDagrofaValidity(pageTexts),
  }
}

/** Samme EAN kan stå flere gange i avisen — første forekomst vinder. */
export function collectDagrofaProducts(chunks: unknown[]): DagrofaEnrichmentProduct[] {
  const byEan = new Map<string, DagrofaEnrichmentProduct>()
  for (const chunk of chunks) {
    const list = Array.isArray(chunk)
      ? chunk
      : ((chunk as { enrichments?: unknown[] } | null)?.enrichments ?? [])
    for (const raw of list as DagrofaEnrichmentProduct[]) {
      if (raw?.type !== 13 || raw.productId == null || !raw.name?.trim()) continue
      const ean = String(raw.productId).trim()
      if (!byEan.has(ean)) byEan.set(ean, raw)
    }
  }
  return [...byEan.values()]
}

/** Aktuel avis. Kaster hvis siden ikke kan læses; `null` hvis perioden mangler. */
export async function fetchDagrofaAvis(chain: DagrofaAvisChain): Promise<DagrofaAvis | null> {
  const { settings, validity } = parseDagrofaAvisPage(await fetchText(chain.avisUrl, chain.label), chain)
  if (!validity) return null
  // chunk-URL'erne er signerede og udløber — hentes altid friske fra siden.
  const chunks: unknown[] = []
  for (const url of settings.chunkUrls) chunks.push(JSON.parse(await fetchText(url, chain.label)))
  return {
    chain,
    paperId: settings.paperId,
    name: settings.name,
    url: settings.url,
    validFrom: validity.validFrom,
    validTo: validity.validTo,
    pageTexts: settings.pageTexts,
    products: collectDagrofaProducts(chunks),
  }
}
