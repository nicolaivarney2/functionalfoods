/**
 * Tjek (Squid) API types.
 * Endpoint: https://squid-api.tjek.com/v2
 *
 * Tjek aggregates weekly tilbudsaviser (leaflets) via OCR + manual curation
 * from all major DK chains. We use the offers endpoint to extract structured
 * offer data for chains we cannot reach via a primary catalog (Lidl, MENY,
 * Spar, Coop chains, Løvbjerg, …) and to cross-check tilbud for chains we
 * already cover via direct APIs (Salling, REMA).
 *
 * IMPORTANT — operational guardrails:
 *   - Limit 100 per page (verified: > 100 returns PAGINATION_INVALID_LIMIT).
 *   - Dealers endpoint allows up to 200.
 *   - Pagination via `offset`; iterate until response length < limit.
 *   - No auth header; standard browser headers are sufficient.
 */

import type { SourceChain } from '../../types'

export interface TjekDealer {
  id: string
  ern: string
  name: string
  website: string | null
  description: string | null
  logo: string | null
  color: string | null
  country: { id: string }
}

export interface TjekCatalog {
  id: string
  ern: string
  label: string | null
  dealer_id: string
  dealer_url: string
  store_id: string | null
  page_count: number
  offer_count: number
  run_from: string
  run_till: string
  publish: string
  pdf_url: string | null
  images: Record<string, string> | null
}

export interface TjekPricing {
  /** Decimal kr, e.g. 18.95. */
  price: number
  /** "Before" / striked price. Decimal kr. Null when no discount displayed. */
  pre_price: number | null
  currency: string
}

export interface TjekQuantity {
  unit: {
    symbol: string
    si: { symbol: string; factor: number } | null
  } | null
  size: { from: number; to: number } | null
  pieces: { from: number; to: number } | null
}

export interface TjekImages {
  thumb?: string
  view?: string
  zoom?: string
}

export interface TjekOffer {
  id: string
  ern: string
  heading: string
  description: string | null
  catalog_page: number | null
  catalog_view_id: string | null
  pricing: TjekPricing
  quantity: TjekQuantity | null
  images: TjekImages | null
  links: { webshop: string | null } | null
  run_from: string
  run_till: string
  display_run_till: boolean
  publish: string
  dealer_id: string
  dealer_url: string
  dealer?: Partial<TjekDealer>
}

/**
 * Tjek dealer ID → our internal SourceChain id.
 *
 * Verified live against /v2/dealers?country=dk on 27. May 2026.
 * Dealers not in this map are silently ignored by the sync (e.g. "Coop.dk MAD"
 * vs "Coop.dk" — we only sync the one that maps to our stores seed).
 */
export const TJEK_DEALER_TO_CHAIN: Record<string, SourceChain> = {
  DWZE1w: '365discount',
  '70d42L': 'abc-lavpris',
  '93f13': 'bilka',
  d311fg: 'brugsen',
  c1edq: 'kvickly',
  '71c90': 'lidl',
  '65caN': 'loevbjerg',
  '267e1m': 'meny',
  '603dfL': 'min-koebmand',
  '9ba51': 'netto',
  '11deC': 'rema-1000',
  '88ddE': 'spar',
  '0b1e8': 'superbrugsen',
  bdf5A: 'foetex',
  '7Rwpw5': 'nemlig',
}

/** Reverse map for "give me the Tjek dealer_id for this chain". */
export const CHAIN_TO_TJEK_DEALER: Partial<Record<SourceChain, string>> =
  Object.fromEntries(
    Object.entries(TJEK_DEALER_TO_CHAIN).map(([dealerId, chain]) => [chain, dealerId]),
  ) as Partial<Record<SourceChain, string>>

/**
 * Chains where we already have a full primary-source catalog. By default the
 * Tjek sync skips these so we don't pollute their canonical products table
 * with leaflet-only entries — Tjek offers for these chains can still be useful
 * for *enriching* offer prices, which is handled by a separate enrichment
 * pass (not yet implemented; flagged in TODO).
 */
export const CHAINS_WITH_PRIMARY_CATALOG: ReadonlySet<SourceChain> = new Set([
  'netto',
  'foetex',
  'bilka',
  'rema-1000',
])
