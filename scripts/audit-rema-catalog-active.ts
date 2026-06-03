/**
 * Audit: how many REMA API products were wrongly inactive under the old
 * is_available_in_all_stores → products.active rule.
 *
 * Usage:
 *   npx tsx scripts/audit-rema-catalog-active.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { iterateAllRemaProducts } from '../src/grocery/adapters/rema1000/client'
import { isRemaProductCatalogActive } from '../src/grocery/adapters/rema1000/mapper'

async function main() {
  let total = 0
  let catalogActive = 0
  let oldActive = 0
  let newlyActive: string[] = []

  for await (const { product } of iterateAllRemaProducts()) {
    total++
    const catalog = isRemaProductCatalogActive(product)
    const inAllStores = product.is_available_in_all_stores !== false
    const oldActiveRule = Boolean(product.name && inAllStores)

    if (catalog) catalogActive++
    if (oldActiveRule) oldActive++
    if (catalog && !oldActiveRule) {
      newlyActive.push(`${product.id} ${product.name}`)
    }
  }

  console.log('REMA catalog active audit')
  console.log('  total products in API     :', total)
  console.log('  catalog (name + price)    :', catalogActive)
  console.log('  active (old: all stores)  :', oldActive)
  console.log('  newly active vs old rule  :', newlyActive.length)
  console.log('  in_stock now = catalog    :', catalogActive, '(was all-stores only:', oldActive, ')')
  if (newlyActive.length > 0 && newlyActive.length <= 30) {
    for (const line of newlyActive) console.log('   -', line)
  } else if (newlyActive.length > 30) {
    for (const line of newlyActive.slice(0, 20)) console.log('   -', line)
    console.log(`   ... +${newlyActive.length - 20} more`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
