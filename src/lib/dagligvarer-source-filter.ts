/**
 * Dagligvarer / Planomo: hvilke product_offers.source rækker der vises.
 *
 * Strategi:
 *   - Native: Netto, Bilka, Føtex, REMA (Salling/REMA scrapes → fooddata)
 *   - Goma: alle øvrige kæder (source=goma i fooddata)
 *   - Tjek overlay: Salling papiravis (slagter/vejevarer som Algolia mangler)
 *   - Tjek øvrigt: udfaset når GOMA_IMPORT_ENABLED=true
 */

import { CHAIN_COVERAGE, TJEK_LEAFLET_OVERLAY_CHAINS, type SourceChain } from '@/grocery/types'
import { GOMA_FULL_CATALOG_CHAINS } from '@/lib/goma-import-stores'
import { isGomaImportEnabled } from '@/lib/goma-sunset'

/** store_id hvor Goma erstatter Tjek som primær tilbudskilde. */
export const GOMA_PRIMARY_STORE_IDS: SourceChain[] = (
  Object.entries(CHAIN_COVERAGE) as [SourceChain, (typeof CHAIN_COVERAGE)[SourceChain]][]
)
  .filter(([, coverage]) => coverage === 'offers-only' || coverage === 'none')
  .map(([chain]) => chain)

export const GOMA_FULL_CATALOG_STORE_IDS: SourceChain[] = [...GOMA_FULL_CATALOG_CHAINS]

/** Goma-sync med p_on_sale_only — hele rækken er et tilbud uden bevist førpris. */
export const GOMA_OFFERS_ONLY_STORE_IDS: SourceChain[] = GOMA_PRIMARY_STORE_IDS.filter(
  (id) => !(GOMA_FULL_CATALOG_STORE_IDS as readonly SourceChain[]).includes(id),
)

export const SALLING_FOODDATA_STORE_IDS = ['netto', 'bilka', 'foetex', 'rema-1000'] as const

export const TJEK_OVERLAY_STORE_IDS = TJEK_LEAFLET_OVERLAY_CHAINS

type PostgrestFilterQuery = {
  neq(column: string, value: string): PostgrestFilterQuery
  not(column: string, operator: string, value: string): PostgrestFilterQuery
  or(filters: string): PostgrestFilterQuery
}

/** Tjek-rækker der må vises når Goma er primær (Salling papiravis-overlay). */
export function dagligvarerTjekOverlayOrFilter(): string {
  const overlay = TJEK_OVERLAY_STORE_IDS.join(',')
  return `source.not.like.tjek%,and(source.like.tjek%,store_id.in.(${overlay}))`
}

/** PostgREST-filter på product_offers (app-side queries + fallback counts). */
export function applyDagligvarerSourceFilter<T>(query: T): T {
  const q = query as PostgrestFilterQuery
  if (isGomaImportEnabled()) {
    return q.or(dagligvarerTjekOverlayOrFilter()) as T
  }
  // Legacy/nød: skjul goma, behold Tjek + native
  return q.neq('source', 'goma') as T
}

/** Begræns Tjek-tælling i fallback til overlay-kæder (Goma) eller Salling+REMA (legacy). */
export function applyDagligvarerTjekStoreFilter<T>(query: T): T {
  const stores = isGomaImportEnabled()
    ? TJEK_OVERLAY_STORE_IDS
    : SALLING_FOODDATA_STORE_IDS
  return (query as { in(column: string, values: readonly string[]): T }).in(
    'store_id',
    stores,
  )
}

export function isGomaOffersOnlyStoreId(storeId?: string | null): boolean {
  if (!storeId) return false
  return (GOMA_OFFERS_ONLY_STORE_IDS as readonly string[]).includes(storeId)
}

/** PostgREST .or() til tilbuds-scan. */
export function dagligvarerOfferScanOrFilter(): string {
  const overlay = TJEK_OVERLAY_STORE_IDS.join(',')
  const tjekOverlay = `and(source.like.tjek%,store_id.in.(${overlay}))`
  if (isGomaImportEnabled()) {
    const gomaOffers = GOMA_OFFERS_ONLY_STORE_IDS.join(',')
    return `is_on_sale.eq.true,${tjekOverlay},and(source.eq.goma,store_id.in.(${gomaOffers}))`
  }
  const gomaStores = GOMA_OFFERS_ONLY_STORE_IDS.join(',')
  return `is_on_sale.eq.true,source.like.tjek%,and(source.eq.goma,store_id.in.(${gomaStores}))`
}
