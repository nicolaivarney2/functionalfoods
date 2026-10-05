/**
 * Which chains get tilbud via Goma vs native fooddata scrapes.
 *
 * Strategi:
 *   Egne kilder → FF: Salling, REMA, Nemlig og de fire aviser
 *     (lidl-avis, meny-avis, spar-avis, min-koebmand-avis).
 *   Goma og Tjek må ikke bruges som kilde — heller ikke som overlay,
 *   og heller ikke når GOMA_IMPORT_ENABLED er sat.
 */

import { CHAIN_COVERAGE, isOwnChainAvisSource, type SourceChain } from '@/grocery/types'

/** Goma RPC `p_store_filter` navne (exact casing from Goma API). */
export type GomaStoreName =
  | 'Netto'
  | 'REMA 1000'
  | '365discount'
  | 'Lidl'
  | 'Føtex'
  | 'Bilka'
  | 'Nemlig'
  | 'MENY'
  | 'Spar'
  | 'Kvickly'
  | 'SuperBrugsen'
  | 'Brugsen'
  | 'Løvbjerg'
  | 'ABC Lavpris'
  | 'Min Købmand'

/** Goma har fuldt katalog (ikke kun tilbudsavis) for disse kæder. */
export const GOMA_FULL_CATALOG_CHAINS = [
  'min-koebmand',
  'spar',
  'meny',
] as const satisfies readonly SourceChain[]

export type GomaFullCatalogChain = (typeof GOMA_FULL_CATALOG_CHAINS)[number]

const GOMA_NAME_TO_CHAIN: Record<string, SourceChain> = {
  netto: 'netto',
  'rema 1000': 'rema-1000',
  '365discount': '365discount',
  lidl: 'lidl',
  føtex: 'foetex',
  foetex: 'foetex',
  fotex: 'foetex',
  bilka: 'bilka',
  nemlig: 'nemlig',
  meny: 'meny',
  spar: 'spar',
  kvickly: 'kvickly',
  superbrugsen: 'superbrugsen',
  brugsen: 'brugsen',
  løvbjerg: 'loevbjerg',
  lovbjerg: 'loevbjerg',
  'abc lavpris': 'abc-lavpris',
  'min købmand': 'min-koebmand',
  'min koebmand': 'min-koebmand',
}

const CHAIN_TO_GOMA_STORE_NAME: Partial<Record<SourceChain, GomaStoreName>> = {
  'min-koebmand': 'Min Købmand',
  nemlig: 'Nemlig',
  spar: 'Spar',
  meny: 'MENY',
  lidl: 'Lidl',
  '365discount': '365discount',
  kvickly: 'Kvickly',
  superbrugsen: 'SuperBrugsen',
  brugsen: 'Brugsen',
  loevbjerg: 'Løvbjerg',
  'abc-lavpris': 'ABC Lavpris',
}

/** All Goma store names we know how to sync. */
export const ALL_GOMA_STORE_NAMES: GomaStoreName[] = [
  'Netto',
  'REMA 1000',
  '365discount',
  'Lidl',
  'Føtex',
  'Bilka',
  'Nemlig',
  'MENY',
  'Spar',
  'Kvickly',
  'SuperBrugsen',
  'Brugsen',
  'Løvbjerg',
  'ABC Lavpris',
  'Min Købmand',
]

export function gomaStoreNameToChain(storeName: string): SourceChain | null {
  const key = String(storeName || '').trim().toLowerCase()
  return GOMA_NAME_TO_CHAIN[key] ?? null
}

export function gomaChainToStoreName(chain: SourceChain): GomaStoreName | null {
  return CHAIN_TO_GOMA_STORE_NAME[chain] ?? null
}

export function isGomaFullCatalogChain(chain: SourceChain): chain is GomaFullCatalogChain {
  return (GOMA_FULL_CATALOG_CHAINS as readonly SourceChain[]).includes(chain)
}

export type GomaSyncMode = 'offers-only' | 'full-catalog'

export function getGomaSyncMode(chain: SourceChain): GomaSyncMode {
  return isGomaFullCatalogChain(chain) ? 'full-catalog' : 'offers-only'
}

/** Chains where Goma is the intended tilbud source (not Salling/REMA fooddata). */
export function isGomaImportChain(chain: SourceChain): boolean {
  const coverage = CHAIN_COVERAGE[chain]
  return coverage === 'offers-only' || coverage === 'none'
}

export function isGomaImportStoreName(storeName: string): boolean {
  const chain = gomaStoreNameToChain(storeName)
  return chain != null && isGomaImportChain(chain)
}

export function filterGomaStoresForImport(
  stores: string[],
  options: { includeFullCatalog?: boolean } = {},
): { allowed: string[]; skipped: string[] } {
  if (options.includeFullCatalog) {
    return { allowed: stores, skipped: [] }
  }

  const allowed: string[] = []
  const skipped: string[] = []
  for (const name of stores) {
    if (isGomaImportStoreName(name)) allowed.push(name)
    else skipped.push(name)
  }
  return { allowed, skipped }
}

/** Goma store names for offers-only / none chains (default import set). */
export function defaultGomaImportStoreNames(): GomaStoreName[] {
  return ALL_GOMA_STORE_NAMES.filter(isGomaImportStoreName) as GomaStoreName[]
}

/**
 * Goma cron-butikker for en given ugedag (0 = søndag … 6 = lørdag, Europe/Copenhagen).
 *
 * Første pass på kædens typiske udgivelsesdag, plus morning-after dagen efter:
 * Goma/Coop opdaterer ofte sent torsdag, så torsdagens første pass rammer
 * sidste uges udløbne datoer. Fredag fanger den nye avis.
 *
 * Nemlig hentes ikke fra Goma — FF's egen sync scraper hele kataloget dagligt
 * (adapters/nemlig).
 */
export function getGomaStoresForDanishWeekday(dayIndex: number): GomaStoreName[] {
  let stores: GomaStoreName[]
  switch (dayIndex) {
    case 1:
      stores = []
      break
    case 2:
      stores = ['ABC Lavpris']
      break
    case 3:
      stores = ['ABC Lavpris', '365discount']
      break
    case 4:
      stores = ['365discount', 'MENY', 'Spar', 'Min Købmand', 'Kvickly', 'SuperBrugsen', 'Løvbjerg']
      break
    case 5:
      stores = ['MENY', 'Spar', 'Min Købmand', 'Kvickly', 'SuperBrugsen', 'Løvbjerg', 'Brugsen']
      break
    case 6:
      stores = ['Lidl']
      break
    case 0:
      stores = ['Lidl']
      break
    default:
      stores = []
  }
  return stores
}

/** Skip fooddata→FF copy for chains owned by Goma while import is enabled. */
export function shouldSkipFooddataChainForGoma(chain: SourceChain): boolean {
  return isGomaImportChain(chain)
}

/** Goma og Tjek (også de omdøbte navne catalog/leaflet) er ikke tilladte kilder. */
export function isDisallowedUpstreamOfferSource(source?: string | null): boolean {
  const s = String(source ?? '').trim().toLowerCase()
  return s === 'goma' || s === 'catalog' || s.startsWith('tjek') || s.startsWith('leaflet')
}

function isOwnAvisProductId(ffProductId: string): boolean {
  return ffProductId.includes('-avis-')
}

/**
 * Hvilke offer-kilder der kopieres fooddata → FF.
 * `gomaImportEnabled` ændrer ikke længere beslutningen: de to kilder er lukket.
 */
export function shouldImportFooddataOfferSource(
  chain: SourceChain,
  offerSource: string,
  _gomaImportEnabled: boolean,
): boolean {
  if (isDisallowedUpstreamOfferSource(offerSource)) return false
  if (!isGomaImportChain(chain)) return true
  return isOwnChainAvisSource(offerSource)
}

/** Om en fooddata-produkttrække kopieres til FF. Kun egne kilder. */
export function shouldImportFooddataProduct(
  chain: SourceChain,
  _fooddataProductUuid: string,
  _gomaImportEnabled: boolean,
  _gomaOfferProductUuids: Set<string>,
  _matchedFfProductIds: Set<string>,
  ffProductId: string,
): boolean {
  if (!isGomaImportChain(chain)) return true
  return isOwnAvisProductId(ffProductId)
}
