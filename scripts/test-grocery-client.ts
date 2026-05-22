/**
 * Smoke test for the GroceryClient.
 * Usage: npx tsx scripts/test-grocery-client.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { getGroceryClient } from '../src/lib/grocery-client'

async function main() {
  const client = getGroceryClient()

  console.log('1. Search "banan" across all chains')
  const search = await client.search({ q: 'banan', limit: 3 })
  for (const p of search.data) {
    const o = p.offers[0]
    console.log(`   ${p.name.padEnd(30)} (${p.sourceChain}) — ${o?.price ?? '—'} kr`)
  }

  console.log('\n2. GTIN lookup (banan, cross-chain comparison)')
  const gtin = await client.search({ q: '5712873461653' })
  for (const p of gtin.data) {
    const o = p.offers[0]
    console.log(`   ${p.name.padEnd(30)} (${p.sourceChain}) — ${o?.price ?? '—'} kr`)
  }

  console.log('\n3. List 3 REMA products')
  const rema = await client.listProducts({ chain: 'rema-1000', limit: 3 })
  for (const p of rema.data) {
    const o = p.offers[0]
    console.log(`   ${p.name.padEnd(30)} ${p.brand || '—'} — ${o?.price ?? '—'} kr`)
  }
  console.log(`   (total in chain: ${rema.meta.total})`)

  console.log('\n4. Current offers — top 3 by discount')
  const offers = await client.listOffers({ limit: 3 })
  for (const p of offers.data) {
    const o = p.offers[0]
    console.log(`   ${p.name.padEnd(30)} (${p.sourceChain}) — ${o?.price} kr (${o?.discountPercentage ?? '?'}%)`)
  }

  console.log('\n5. Category tree (Netto)')
  const cats = await client.getCategoryTree({ chain: 'netto' })
  for (const c of cats.data.slice(0, 5)) {
    console.log(`   ${c.name.padEnd(25)} ${c.productCount}`)
  }

  console.log('\n6. Single product by GTIN')
  const banana = await client.getProduct('5712873461653')
  console.log(`   Found: ${banana?.name} (chains: ${banana?.sourceChain})`)

  console.log('\n7. Error handling: 404')
  const missing = await client.getProduct('00000000000')
  console.log(`   Result: ${missing === null ? 'null (404 handled)' : 'unexpected'}`)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
