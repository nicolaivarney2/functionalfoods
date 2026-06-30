/**
 * READ-ONLY probe: hvilke store-navne genkender Goma? (casing-tjek)
 *   npx tsx scripts/probe-goma-stores.ts
 */
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { searchGomaProducts } from '../src/grocery/adapters/goma/client'

const VARIANTS = [
  'superbrugsen', 'SuperBrugsen', 'Superbrugsen', 'Super Brugsen', 'SUPERBRUGSEN',
  'Brugsen', 'brugsen',
  'ABC Lavpris', 'ABC lavpris', 'abc lavpris', 'ABC',
  'Løvbjerg', 'Lovbjerg', 'løvbjerg',
  '365discount', '365 discount', '365 Discount',
  'Spar', 'SPAR',
]

async function probe(storeName: string, onSaleOnly: boolean) {
  try {
    const data = await searchGomaProducts({
      p_search_term: '',
      p_on_sale_only: onSaleOnly,
      p_category_filter: null,
      p_department_filter: null,
      p_store_filter: [storeName],
      p_food_departments: null,
      p_is_available_only: true,
      p_my_products_only: false,
      p_previously_bought_only: false,
      p_labels_filter: null,
      p_order_by_clause: 'is_on_sale DESC',
      p_limit_val: 5,
      p_offset_val: 0,
      p_session_id: 'ff-probe',
      p_log_search: false,
      p_source: null,
    })
    return { total: data.total_count, onSale: data.total_on_sale_count }
  } catch (e) {
    return { error: (e as Error).message.slice(0, 80) }
  }
}

async function main() {
  console.log('store_name'.padEnd(20), 'total'.padEnd(8), 'on_sale')
  for (const v of VARIANTS) {
    const r = await probe(v, false)
    if ('error' in r) console.log(v.padEnd(20), 'ERR', r.error)
    else console.log(v.padEnd(20), String(r.total).padEnd(8), r.onSale)
  }
}
main().catch(e => { console.error('FATAL', e); process.exit(1) })
