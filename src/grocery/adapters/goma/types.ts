export type GomaProduct = {
  unit: string | null
  brand: string | null
  amount: number | null
  category: string | null
  store_id: string
  image_url: string | null
  is_on_sale: boolean
  product_id: string
  s_category: string | null
  store_logo: string | null
  store_name: string
  description: string | null
  product_url: string | null
  is_available: boolean
  normal_price: number
  product_name: string
  current_price: number
  sale_valid_to: string | null
  price_per_unit: number | null
  base_product_id: string | null
  department_name: string | null
  sale_valid_from: string | null
  price_per_kilogram: number | null
  discount_percentage: number | null
}

export type GomaSearchResponse = {
  products: GomaProduct[]
  total_count: number
  total_on_sale_count: number
}

export type GomaSearchBody = {
  p_search_term: string
  p_on_sale_only: boolean
  p_category_filter: null
  p_department_filter: null
  p_store_filter: string[]
  p_food_departments: null
  p_is_available_only: boolean
  p_my_products_only: boolean
  p_previously_bought_only: boolean
  p_labels_filter: null
  p_order_by_clause: string
  p_limit_val: number
  p_offset_val: number
  p_session_id: string
  p_log_search: boolean
  p_source: null
}
