#!/usr/bin/env tsx
/**
 * Smoke test: Goma → fooddata for one store.
 *
 *   npx tsx scripts/grocery-sync-goma-test.ts
 *   npx tsx scripts/grocery-sync-goma-test.ts --store="MENY" --limit=10 --pages=1
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { syncGoma, GOMA_SYNC_DEFAULTS, GOMA_CATALOG_SYNC_DEFAULTS } from '../src/grocery/adapters/goma'
import { getGroceryServiceClient } from '../src/grocery/db/client'
import {
  getGomaSyncMode,
  gomaStoreNameToChain,
} from '../src/lib/goma-import-stores'

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : null
}

async function main(): Promise<void> {
  const store = arg('store') ?? 'Lidl'
  const limitArg = arg('limit')
  const pagesArg = arg('pages')

  for (const v of ['GOMA_API_KEY', 'GROCERY_SUPABASE_URL', 'GROCERY_SUPABASE_SECRET_KEY']) {
    if (!process.env[v]?.trim()) {
      throw new Error(`Missing ${v} — sæt i .env.local`)
    }
  }

  const storeId = gomaStoreNameToChain(store)
  if (!storeId) {
    throw new Error(`Ukendt Goma-butik: ${store}`)
  }

  const mode = getGomaSyncMode(storeId)
  const defaults =
    mode === 'full-catalog' ? GOMA_CATALOG_SYNC_DEFAULTS : GOMA_SYNC_DEFAULTS
  const limit = limitArg ? Number(limitArg) : defaults.limit
  const pages = pagesArg ? Number(pagesArg) : defaults.pages

  const grocery = getGroceryServiceClient()

  console.log(
    `▶ Goma → fooddata test: ${store} → ${storeId} [${mode}] (${pages}×${limit})\n`,
  )

  const t0 = Date.now()

  const { count: before } = await grocery
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('source', 'goma')

  console.log(`Før: ${before ?? 0} goma-tilbud i fooddata`)

  const syncOptions =
    mode === 'full-catalog'
      ? { stores: [store], catalogLimit: limit, catalogPages: pages }
      : { stores: [store], limit, pages }

  const result = await syncGoma(syncOptions)
  console.log('\nResultat:', result)

  const { count: after } = await grocery
    .from('product_offers')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('source', 'goma')

  const { data: sample } = await grocery
    .from('product_offers')
    .select('price_cents, is_on_sale, source_synced_at, products(name, source_id)')
    .eq('store_id', storeId)
    .eq('source', 'goma')
    .order('source_synced_at', { ascending: false })
    .limit(3)

  console.log(`\nEfter: ${after ?? 0} goma-tilbud i fooddata (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  console.log('Seneste 3:')
  for (const row of sample ?? []) {
    const p = row.products as { name?: string; source_id?: string } | null
    console.log(
      `  · ${(p?.name ?? '?').slice(0, 55)} | ${((row.price_cents ?? 0) / 100).toFixed(2)} kr | tilbud: ${row.is_on_sale}`,
    )
  }

  if (result.errors.length) {
    throw new Error(result.errors.join('; '))
  }
  if (result.totalImported <= 0) {
    throw new Error('Ingen produkter importeret')
  }
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err)
  process.exit(1)
})
