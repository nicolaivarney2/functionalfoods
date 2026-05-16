#!/usr/bin/env node
/**
 * Testkald til Goma (samme RPC som import).
 *
 * Kør fra projektroden:
 *   node --env-file=.env.local scripts/test-goma-api.mjs
 *
 * Kræver: GOMA_API_KEY i miljøet (.env.local eller export).
 * Viser ikke din nøgle — kun HTTP-status og et kort uddrag af svaret.
 */

const key = process.env.GOMA_API_KEY
if (!key || !String(key).trim()) {
  console.error('Mangler GOMA_API_KEY. Eksempel: node --env-file=.env.local scripts/test-goma-api.mjs')
  process.exit(1)
}

const body = {
  p_search_term: 'mælk',
  p_on_sale_only: false,
  p_category_filter: null,
  p_department_filter: null,
  p_store_filter: ['REMA 1000'],
  p_food_departments: null,
  p_is_available_only: true,
  p_my_products_only: false,
  p_previously_bought_only: false,
  p_labels_filter: null,
  p_order_by_clause:
    'is_on_sale DESC, discount_percentage DESC NULLS LAST, similarity DESC',
  p_limit_val: 5,
  p_offset_val: 0,
  p_session_id: 'functionalfoods-manual-test',
  p_log_search: false,
  p_source: null,
}

// Goma migrerede 2026-05 fra search_products_advanced_v2 til
// search_products_public_v1 (samme body/respons, ny offentlig nøgle).
const url = 'https://api.goma.gg/rest/v1/rpc/search_products_public_v1'

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify(body),
})

const text = await res.text()
let parsed = null
try {
  parsed = JSON.parse(text)
} catch {
  parsed = null
}

console.log('URL:', url)
console.log('HTTP:', res.status, res.statusText)

if (!parsed) {
  console.log('Body (rå, max 400 tegn):', text.slice(0, 400))
  process.exit(res.ok ? 0 : 1)
}

if (parsed.message || parsed.code) {
  console.log('Fejl fra API:', { code: parsed.code, message: parsed.message, hint: parsed.hint })
}

const products = Array.isArray(parsed.products) ? parsed.products : []
console.log('Antal produkter i batch:', products.length)
console.log('total_count (hvis sat):', parsed.total_count)
console.log('total_on_sale_count (hvis sat):', parsed.total_on_sale_count)

if (products[0]) {
  const p = products[0]
  console.log('Første hit:', {
    product_name: p.product_name,
    store_name: p.store_name,
    current_price: p.current_price,
    is_on_sale: p.is_on_sale,
  })
}

process.exit(res.ok ? 0 : 1)
