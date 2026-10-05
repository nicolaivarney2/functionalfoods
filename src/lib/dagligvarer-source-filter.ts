/**
 * Dagligvarer: hvilke product_offers.source rækker der vises.
 *
 * Egne kilder: Salling, REMA, Nemlig og kædernes egne aviser.
 * Goma og Tjek (også catalog/leaflet) vises ikke.
 */

import { CHAIN_COVERAGE, TJEK_LEAFLET_OVERLAY_CHAINS, type SourceChain } from '@/grocery/types'
import { GOMA_FULL_CATALOG_CHAINS, isDisallowedUpstreamOfferSource } from '@/lib/goma-import-stores'

export { isDisallowedUpstreamOfferSource }

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

/**
 * Avis-overlay hedder `tjek…` indtil migrationen, derefter `leaflet…`.
 * Begge skal matche, så listen virker før og efter kildenavnet er skjult.
 */
export function isLeafletOfferSource(source?: string | null): boolean {
  const s = String(source ?? '').trim().toLowerCase()
  return s.startsWith('tjek') || s.startsWith('leaflet')
}

/** Katalogkilden hedder `goma` indtil migrationen, derefter `catalog`. */
export function isCatalogOfferSource(source?: string | null): boolean {
  const s = String(source ?? '').trim().toLowerCase()
  return s === 'goma' || s === 'catalog'
}

/** PostgREST .or() der fanger både det gamle og det neutrale avis-kildenavn. */
export function leafletSourceOrFilter(): string {
  return 'source.like.tjek%,source.like.leaflet%'
}

/** Tjek-rækker der må vises når Goma er primær (Salling papiravis-overlay). */
export function dagligvarerTjekOverlayOrFilter(): string {
  const overlay = TJEK_OVERLAY_STORE_IDS.join(',')
  return [
    'and(source.not.like.tjek%,source.not.like.leaflet%)',
    `and(source.like.tjek%,store_id.in.(${overlay}))`,
    `and(source.like.leaflet%,store_id.in.(${overlay}))`,
  ].join(',')
}

/** PostgREST-filter: Goma og Tjek er ikke med, uanset kæde. */
export function applyDagligvarerSourceFilter<T>(query: T): T {
  const q = query as PostgrestFilterQuery
  return q
    .not('source', 'in', '(goma,catalog)')
    .not('source', 'like', 'tjek%')
    .not('source', 'like', 'leaflet%') as T
}

export function isGomaOffersOnlyStoreId(storeId?: string | null): boolean {
  if (!storeId) return false
  return (GOMA_OFFERS_ONLY_STORE_IDS as readonly string[]).includes(storeId)
}

/** PostgREST .or() til tilbuds-scan. Kun rækker kilden selv har markeret som tilbud. */
export function dagligvarerOfferScanOrFilter(): string {
  return 'is_on_sale.eq.true'
}
