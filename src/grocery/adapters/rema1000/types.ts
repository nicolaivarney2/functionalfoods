/**
 * REMA 1000 public digital API types.
 * Endpoint: https://api.digital.rema1000.dk/api/v3
 *
 * Note: REMA's API does NOT expose GTIN/EAN. Cross-store matching will rely
 * on name-based fuzzy match instead.
 */

export interface RemaImage {
  small: string
  medium: string
  large: string
}

export interface RemaPrice {
  /** Price in DKK (decimal, e.g. 23.95). */
  price: number
  price_over_max_quantity: number | null
  max_quantity: number | null
  is_advertised: boolean
  is_campaign: boolean
  starting_at: string
  ending_at: string
  deposit: number | null
  compare_unit: string
  compare_unit_price: number
  consumption_unit: string | null
  consumption_quantity: number | null
}

export interface RemaLabel {
  id?: number
  name: string
  image?: string
}

export interface RemaProduct {
  id: number
  name: string
  /** Often contains "<amount> <unit>. / <brand>", e.g. "285 GR. / EASIS". */
  underline: string
  age_limit: number | null
  hazard_precaution_statements: unknown[]
  labels: Array<RemaLabel | string>
  description: string | null
  info: string
  images: RemaImage[]
  prices: RemaPrice[]
  temperature_zone: string | null
  is_self_scale_item: boolean
  is_weight_item: boolean
  is_available_in_all_stores: boolean
  is_batch_item: boolean
}

export interface RemaDepartment {
  id: number
  name: string
  products_last_modified_at: string
}

export interface RemaListResponse<T> {
  data: T[]
  meta: {
    pagination: {
      total: number
      count: number
      per_page: number
      current_page: number
      last_page: number
      links: {
        first: string
        last: string
        prev: string | null
        next: string | null
      }
    }
  }
}

export interface RemaSingleResponse<T> {
  data: T
}
