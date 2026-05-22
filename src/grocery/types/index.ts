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

export type SyncSource =
  | `salling-algolia:${'netto' | 'foetex' | 'bilka'}`
  | `apify-rema`
  | `apify-nemlig`
  | `rema-1000-api`
  | `nemlig-api`
  | `tjek-offers`

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
