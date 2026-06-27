/**
 * Which chains get tilbud via Goma vs fooddata primary adapters.
 *
 * Policy (2026-06): Goma → fooddata (grocery DB) for offers-only kæder.
 * fooddata-import kopierer source=goma til FF når GOMA_IMPORT_ENABLED=true.
 * Tjek/Squid i grocery-DB er cold backup — importeres som tjek:* når Goma slås fra.
 */

import { CHAIN_COVERAGE, type SourceChain } from '@/grocery/types'

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
  | 'superbrugsen'
  | 'Brugsen'
  | 'Løvbjerg'
  | 'ABC Lavpris'

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
  'superbrugsen',
  'Brugsen',
  'Løvbjerg',
  'ABC Lavpris',
]

export function gomaStoreNameToChain(storeName: string): SourceChain | null {
  const key = String(storeName || '').trim().toLowerCase()
  return GOMA_NAME_TO_CHAIN[key] ?? null
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

/** Skip fooddata→FF copy for chains owned by Goma while import is enabled. */
export function shouldSkipFooddataChainForGoma(chain: SourceChain): boolean {
  return isGomaImportChain(chain)
}

/** Which offer `source` values to copy fooddata → FF for offers-only chains. */
export function shouldImportFooddataOfferSource(
  chain: SourceChain,
  offerSource: string,
  gomaImportEnabled: boolean,
): boolean {
  if (!isGomaImportChain(chain)) return true
  if (gomaImportEnabled) return offerSource === 'goma'
  return offerSource.startsWith('tjek')
}

/** Whether to copy a fooddata product row to FF for offers-only chains. */
export function shouldImportFooddataProduct(
  chain: SourceChain,
  fooddataProductUuid: string,
  gomaImportEnabled: boolean,
  gomaOfferProductUuids: Set<string>,
  matchedFfProductIds: Set<string>,
  ffProductId: string,
): boolean {
  if (!isGomaImportChain(chain)) return true
  if (matchedFfProductIds.has(ffProductId)) return true
  if (gomaImportEnabled) return gomaOfferProductUuids.has(fooddataProductUuid)
  return true
}
