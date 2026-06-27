import type { GomaProduct, GomaSearchBody, GomaSearchResponse } from './types'

const GOMA_RPC_URL = 'https://api.goma.gg/rest/v1/rpc/search_products_public_v1'

export function getGomaApiKey(): string {
  const key = process.env.GOMA_API_KEY
  if (!key) {
    throw new Error('GOMA_API_KEY is not set in environment variables')
  }
  return key
}

export async function searchGomaProducts(
  body: GomaSearchBody,
): Promise<GomaSearchResponse> {
  const apiKey = getGomaApiKey()
  const res = await fetch(GOMA_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Goma API error (${res.status}): ${text}`)
  }

  return (await res.json()) as GomaSearchResponse
}

export async function fetchGomaCatalogPage(
  storeName: string,
  page: number,
  limit: number,
  sessionId: string,
): Promise<{ products: GomaProduct[]; totalCount: number; isLastPage: boolean }> {
  const data = await searchGomaProducts({
    p_search_term: '',
    p_on_sale_only: false,
    p_category_filter: null,
    p_department_filter: null,
    p_store_filter: [storeName],
    p_food_departments: null,
    p_is_available_only: true,
    p_my_products_only: false,
    p_previously_bought_only: false,
    p_labels_filter: null,
    p_order_by_clause:
      'is_on_sale DESC, discount_percentage DESC NULLS LAST, similarity DESC',
    p_limit_val: limit,
    p_offset_val: page * limit,
    p_session_id: sessionId,
    p_log_search: false,
    p_source: null,
  })

  const products = data.products || []
  return {
    products,
    totalCount: data.total_count,
    isLastPage: products.length < limit,
  }
}

/** Lightweight pass: only products Goma still reports as on sale. */
export async function fetchGomaActiveOfferProductIds(
  storeName: string,
  limit = 200,
  maxPages = 10,
): Promise<Set<string>> {
  const ids = new Set<string>()

  for (let page = 0; page < maxPages; page++) {
    const data = await searchGomaProducts({
      p_search_term: '',
      p_on_sale_only: true,
      p_category_filter: null,
      p_department_filter: null,
      p_store_filter: [storeName],
      p_food_departments: null,
      p_is_available_only: true,
      p_my_products_only: false,
      p_previously_bought_only: false,
      p_labels_filter: null,
      p_order_by_clause:
        'is_on_sale DESC, discount_percentage DESC NULLS LAST, similarity DESC',
      p_limit_val: limit,
      p_offset_val: page * limit,
      p_session_id: 'functionalfoods-goma-verify',
      p_log_search: false,
      p_source: null,
    })

    const products = data.products || []
    for (const p of products) {
      if (p.product_id) ids.add(p.product_id)
    }
    if (products.length < limit) break
  }

  return ids
}
