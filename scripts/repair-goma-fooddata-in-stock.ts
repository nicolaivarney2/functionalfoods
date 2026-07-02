/**
 * Engangs-repair: sæt in_stock=true på Goma-tilbud i fooddata hvor pris > 0.
 *
 * Rodårsag: mapper sat in_stock = is_available && isOfferActive, så fuldt-katalog
 * (Nemlig) og ikke-tilbudsvarer blev markeret utilgængelige.
 *
 * Kør EFTER deploy af mapper-fix, FØR fooddata-import:
 *   npx tsx scripts/repair-goma-fooddata-in-stock.ts
 *   npx tsx scripts/repair-goma-fooddata-in-stock.ts --dry-run
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')

async function main() {
  const url = process.env.GROCERY_SUPABASE_URL
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing GROCERY_SUPABASE_* env')

  const fd = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const { count: before } = await fd
    .from('product_offers')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'goma')
    .eq('in_stock', false)
    .gt('price_cents', 0)

  console.log(`Goma offers med in_stock=false og pris>0: ${before ?? '?'}`)

  if (dryRun) {
    console.log('Dry-run — ingen ændringer.')
    return
  }

  const { error } = await fd
    .from('product_offers')
    .update({ in_stock: true })
    .eq('source', 'goma')
    .eq('in_stock', false)
    .gt('price_cents', 0)

  if (error) throw error

  const { count: after } = await fd
    .from('product_offers')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'goma')
    .eq('in_stock', false)
    .gt('price_cents', 0)

  console.log(`Efter repair: ${after ?? 0} tilbage med in_stock=false`)
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
