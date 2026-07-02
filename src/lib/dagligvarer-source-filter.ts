/**
 * Dagligvarer / Planomo: hvilke product_offers.source rækker der vises.
 *
 * Strategi (jul 2026):
 *   - Native: Netto, Bilka, Føtex, REMA (Salling/REMA scrapes → fooddata)
 *   - Goma: alle øvrige kæder (source=goma i fooddata)
 *   - Tjek: udfaset — skjules når GOMA_IMPORT_ENABLED=true
 */

import { CHAIN_COVERAGE, type SourceChain } from '@/grocery/types'
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

type PostgrestFilterQuery = {
  neq(column: string, value: string): PostgrestFilterQuery
  not(column: string, operator: string, value: string): PostgrestFilterQuery
  or(filters: string): PostgrestFilterQuery
}

/** PostgREST-filter på product_offers (app-side queries + fallback counts). */
export function applyDagligvarerSourceFilter<T>(query: T): T {
  const q = query as PostgrestFilterQuery
  if (isGomaImportEnabled()) {
    // Goma-primary: ingen Tjek — kun native + source=goma
    return q.not('source', 'like', 'tjek%') as T
  }
  // Legacy/nød: skjul goma, behold Tjek + native
  return q.neq('source', 'goma') as T
}

/** Begræns Tjek-tælling i fallback — kun relevant når Goma ikke er primær. */
export function applyDagligvarerTjekStoreFilter<T>(query: T): T {
  if (isGomaImportEnabled()) return query
  return (query as { in(column: string, values: readonly string[]): T }).in(
    'store_id',
    SALLING_FOODDATA_STORE_IDS,
  )
}

export function isGomaOffersOnlyStoreId(storeId?: string | null): boolean {
  if (!storeId) return false
  return (GOMA_OFFERS_ONLY_STORE_IDS as readonly string[]).includes(storeId)
}

/** PostgREST .or() til tilbuds-scan. */
export function dagligvarerOfferScanOrFilter(): string {
  if (isGomaImportEnabled()) {
    const gomaOffers = GOMA_OFFERS_ONLY_STORE_IDS.join(',')
    const gomaFull = GOMA_FULL_CATALOG_STORE_IDS.join(',')
    return `normal_price.not.is.null,and(source.eq.goma,store_id.in.(${gomaOffers})),and(source.eq.goma,store_id.in.(${gomaFull}),is_on_sale.eq.true)`
  }
  const gomaStores = GOMA_OFFERS_ONLY_STORE_IDS.join(',')
  return `normal_price.not.is.null,source.like.tjek%,and(source.eq.goma,store_id.in.(${gomaStores}))`
}
