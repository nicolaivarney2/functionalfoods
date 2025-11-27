import { createClient } from '@supabase/supabase-js'

type GomaProduct = {
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
  base_product_id: string
  department_name: string | null
  sale_valid_from: string | null
  price_per_kilogram: number | null
  discount_percentage: number | null
}

type GomaSearchResponse = {
  products: GomaProduct[]
  total_count: number
  total_on_sale_count: number
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient(url, serviceKey)
}

function getGomaApiKey() {
  const key = process.env.GOMA_API_KEY
  if (!key) {
    throw new Error('GOMA_API_KEY is not set in environment variables')
  }
  return key
}

export type ImportOptions = {
  stores: string[]
  limit?: number
  pages?: number
  onProgress?: (info: { store: string; page: number; imported: number; total: number }) => void
}

export async function importGomaProducts(options: ImportOptions) {
  const supabase = getSupabaseAdminClient()
  const apiKey = getGomaApiKey()

  const limit = options.limit ?? 100
  const pages = options.pages ?? 1

  let totalImported = 0

  for (const storeName of options.stores) {
    // Upsert store row
    await supabase
      .from('stores')
      .upsert(
        {
          id: storeName.toLowerCase().replace(/\s+/g, '-'),
          name: storeName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )

    for (let page = 0; page < pages; page++) {
      const offset = page * limit

      const body = {
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
        p_order_by_clause: 'is_on_sale DESC, discount_percentage DESC NULLS LAST, similarity DESC',
        p_limit_val: limit,
        p_offset_val: offset,
        p_session_id: 'functionalfoods-internal-import',
        p_log_search: false,
        p_source: null,
      }

      const res = await fetch('https://api.goma.gg/rest/v1/rpc/search_products_advanced_v2', {
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

      const data = (await res.json()) as GomaSearchResponse
      const products = data.products || []

      if (products.length === 0) {
        break
      }

      // Upsert global products (dedupe by base_product_id to avoid ON CONFLICT issues)
      const productMap = new Map<string, GomaProduct>()
      for (const p of products) {
        if (!p.base_product_id) continue
        if (!productMap.has(p.base_product_id)) {
          productMap.set(p.base_product_id, p)
        }
      }

      const nowIso = new Date().toISOString()

      const productRows = Array.from(productMap.values()).map((p) => ({
        id: p.base_product_id,
        name_generic: p.product_name,
        brand: p.brand,
        category: p.category,
        subcategory: p.s_category,
        department: p.department_name,
        unit: p.unit,
        amount: p.amount,
        image_url: p.image_url,
        metadata: {
          goma_store_product_id: p.product_id,
        } as unknown as Record<string, unknown>,
        updated_at: nowIso,
      }))

      const { error: productError } = await supabase.from('products').upsert(productRows, {
        onConflict: 'id',
      })

      if (productError) {
        throw productError
      }

      // Upsert offers (dedupe by store_id + store_product_id within this batch)
      const storeId = storeName.toLowerCase().replace(/\s+/g, '-')
      const offerMap = new Map<string, GomaProduct>()
      for (const p of products) {
        // Skip products without a global/base id – we can't link them korrekt til products-tabellen
        if (!p.base_product_id) continue
        const key = `${storeId}:${p.product_id}`
        if (!offerMap.has(key)) {
          offerMap.set(key, p)
        }
      }

      const offerRows = Array.from(offerMap.values()).map((p) => ({
        product_id: p.base_product_id,
        store_id: storeId,
        store_product_id: p.product_id,
        name_store: p.product_name,
        product_url: p.product_url,
        current_price: p.current_price,
        normal_price: p.normal_price,
        is_on_sale: p.is_on_sale,
        discount_percentage: p.discount_percentage,
        price_per_unit: p.price_per_unit,
        price_per_kilogram: p.price_per_kilogram,
        amount: p.amount,
        unit: p.unit,
        is_available: p.is_available,
        sale_valid_from: p.sale_valid_from,
        sale_valid_to: p.sale_valid_to,
        source: 'goma',
        last_seen_at: nowIso,
        updated_at: nowIso,
      }))

      const { error: offerError } = await supabase.from('product_offers').upsert(offerRows, {
        onConflict: 'store_id,store_product_id',
      })

      if (offerError) {
        throw offerError
      }

      totalImported += products.length

      if (options.onProgress) {
        options.onProgress({
          store: storeName,
          page,
          imported: products.length,
          total: data.total_count,
        })
      }

      if (products.length < limit) {
        break
      }
    }
  }

  return { totalImported }
}


