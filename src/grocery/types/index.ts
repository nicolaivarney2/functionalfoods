/**
 * Shared types for the grocery service.
 * Independent from the main functionalfoods type system.
 */

export type StoreType = 'chain' | 'physical'

export type SyncStatus = 'running' | 'success' | 'partial' | 'failed'

export type SourceChain =
  | 'netto'
  | 'foetex'
  | 'bilka'
  | 'rema-1000'
  | 'nemlig'
  | 'lidl'
  | '365discount'
  | 'kvickly'
  | 'superbrugsen'
  | 'brugsen'
  | 'meny'
  | 'spar'
  | 'loevbjerg'
  | 'abc-lavpris'
  | 'min-koebmand'

/**
 * How complete is our data for each chain?
 *
 *   - `full`        Direct primary-source API: full product catalog with both
 *                   regular shelf prices and current offers. (Salling Algolia,
 *                   REMA 1000 API.)
 *   - `offers-only` Only current weekly tilbud via Tjek/Squid. No regular
 *                   shelf prices, no out-of-campaign products. Treat the data
 *                   as "this week's offers" — the frontend should label these
 *                   chains so users understand the difference.
 *   - `none`        No working adapter yet. The chain is seeded in `stores`
 *                   for forward-compatibility but produces zero rows.
 *
 * Single source of truth for both the sync layer and any UI that surfaces
 * chain-level coverage badges.
 */
export type CatalogCoverage = 'full' | 'offers-only' | 'none'

export const CHAIN_COVERAGE: Record<SourceChain, CatalogCoverage> = {
  // Direct primary-source adapters
  netto: 'full',
  foetex: 'full',
  bilka: 'full',
  'rema-1000': 'full',

  // Tjek-only (no full catalog adapter yet)
  lidl: 'offers-only',
  meny: 'offers-only',
  spar: 'offers-only',
  'min-koebmand': 'offers-only',
  loevbjerg: 'offers-only',
  kvickly: 'offers-only',
  superbrugsen: 'offers-only',
  brugsen: 'offers-only',
  '365discount': 'offers-only',
  'abc-lavpris': 'offers-only',

  // Tjek has 0 offers for Nemlig (online-only chain, no tilbudsavis) and
  // we haven't built the stateful Nemlig adapter — see adapters/nemlig/TODO.md.
  nemlig: 'none',
}

/** Human-readable Danish label for the coverage status. */
export const COVERAGE_LABEL: Record<CatalogCoverage, string> = {
  full: 'Fuldt katalog',
  'offers-only': 'Kun aktuelle tilbud',
  none: 'Ingen data',
}

export type SyncSource =
  | `salling-algolia:${'netto' | 'foetex' | 'bilka'}`
  | `apify-rema`
  | `apify-nemlig`
  | `rema-1000-api`
  | `nemlig-api`
  | `tjek-offers`
  | `tjek:offers`
  | `goma`

export interface StoreRow {
  id: string
  chain: string
  name: string
  type: StoreType
  parent_chain: string | null
  city: string | null
  zipcode: string | null
  metadata: Record<string, unknown>
  active: boolean
  created_at: string
  updated_at: string
}

export interface ProductRow {
  id: string
  gtin: string | null
  name: string
  brand: string | null
  manufacturer: string | null
  description: string | null
  amount: number | null
  unit: string | null
  image_url: string | null
  category_path: string | null
  category_lvl0: string | null
  category_lvl1: string | null
  category_lvl2: string | null
  source_chain: SourceChain
  source_id: string
  active: boolean
  last_seen_at: string
  raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ProductInsert {
  gtin?: string | null
  name: string
  brand?: string | null
  manufacturer?: string | null
  description?: string | null
  amount?: number | null
  unit?: string | null
  image_url?: string | null
  category_path?: string | null
  category_lvl0?: string | null
  category_lvl1?: string | null
  category_lvl2?: string | null
  source_chain: SourceChain
  source_id: string
  active?: boolean
  last_seen_at?: string
  raw_data?: Record<string, unknown> | null
}

export interface ProductOfferInsert {
  product_id: string
  store_id: string
  price_cents?: number | null
  before_price_cents?: number | null
  unit_price_cents?: number | null
  unit_price_unit?: string | null
  is_on_sale?: boolean
  offer_from?: string | null
  offer_until?: string | null
  offer_description?: string | null
  multibuy?: string | null
  discount_percentage?: number | null
  in_stock?: boolean
  source: string
  source_synced_at?: string
  raw_data?: Record<string, unknown> | null
}

export interface SyncLogInsert {
  source: SyncSource
  status: SyncStatus
  started_at?: string
  completed_at?: string | null
  duration_ms?: number | null
  products_processed?: number
  products_created?: number
  products_updated?: number
  offers_processed?: number
  offers_created?: number
  offers_updated?: number
  errors_count?: number
  error_message?: string | null
  metadata?: Record<string, unknown>
}
