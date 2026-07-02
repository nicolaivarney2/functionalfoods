#!/usr/bin/env tsx
/**
 * Fuld Goma → fooddata sync for alle ikke-native kæder.
 *
 *   GOMA_IMPORT_ENABLED=true npx tsx scripts/grocery-sync-goma-full.ts
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: resolve(process.cwd(), '.env.local') })
process.env.GOMA_IMPORT_ENABLED = 'true'

import { syncGoma } from '../src/grocery/adapters/goma'
import { defaultGomaImportStoreNames } from '../src/lib/goma-import-stores'

async function main(): Promise<void> {
  for (const v of ['GOMA_API_KEY', 'GROCERY_SUPABASE_URL', 'GROCERY_SUPABASE_SECRET_KEY']) {
    if (!process.env[v]?.trim()) throw new Error(`Missing ${v}`)
  }

  const stores = defaultGomaImportStoreNames()
  console.log(`▶ Fuld Goma → fooddata sync (${stores.length} kæder)\n`, stores.join(', '))

  const t0 = Date.now()
  const result = await syncGoma({ stores: [...stores] })
  console.log('\n✅ Færdig', result, `(${(Date.now() - t0) / 1000}s)`)
  if (result.errors.length) process.exit(1)
}

main().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
