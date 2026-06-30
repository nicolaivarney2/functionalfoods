/**
 * Dagligvarer / Planomo: hvilke product_offers.source rækker der vises.
 *
 * Når Goma-import er aktiv: source=goma for offers-only kæder, skjul gammel
 * Tjek (tilbudsavis-klip). Salling/REMA beholder fooddata-kilder.
 */

import { CHAIN_COVERAGE, type SourceChain } from '@/grocery/types'
import { GOMA_FULL_CATALOG_CHAINS } from '@/lib/goma-import-stores'
import { isGomaLegacyDataEnabled } from '@/lib/goma-sunset'

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
  or(filters: string): PostgrestFilterQuery
}

/** PostgREST-filter på product_offers (app-side queries + fallback counts). */
export function applyDagligvarerSourceFilter<T>(query: T): T {
  const q = query as PostgrestFilterQuery
  if (!isGomaLegacyDataEnabled()) {
    return q.neq('source', 'goma') as T
  }
  const salling = SALLING_FOODDATA_STORE_IDS.join(',')
  return q.or(
    `source.eq.goma,not.source.like.tjek%,and(source.like.tjek%,store_id.in.(${salling}))`,
  ) as T
}

/** Begræns Tjek-tælling i fallback når Goma er primær (kun Salling har Tjek-relevans). */
export function applyDagligvarerTjekStoreFilter<T>(query: T): T {
  if (!isGomaLegacyDataEnabled()) return query
  return (query as { in(column: string, values: readonly string[]): T }).in(
    'store_id',
    SALLING_FOODDATA_STORE_IDS,
  )
}

export function isGomaOffersOnlyStoreId(storeId?: string | null): boolean {
  if (!storeId) return false
  return (GOMA_OFFERS_ONLY_STORE_IDS as readonly string[]).includes(storeId)
}

/** PostgREST .or() til tilbuds-scan: bevist rabat, Tjek, eller Goma offers-only. */
export function dagligvarerOfferScanOrFilter(): string {
  const gomaStores = GOMA_OFFERS_ONLY_STORE_IDS.join(',')
  return `normal_price.not.is.null,source.like.tjek%,and(source.eq.goma,store_id.in.(${gomaStores}))`
}
