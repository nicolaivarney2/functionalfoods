/**
 * Daglig sweep af udløbne tilbud i fooddata + FF.
 *
 *   npx tsx scripts/cleanup-expired-offers.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { getGroceryServiceClient } from '../src/grocery/db/client'
import { cleanupExpiredOffers } from '../src/lib/dagligvarer-offer-cleanup'

async function main() {
  const t0 = Date.now()
  const grocery = getGroceryServiceClient()
  const { data, error } = await grocery.rpc('cleanup_expired_offers', {
    p_stale_product_days: 30,
    p_batch_limit: 50000,
  })
  if (error) {
    console.error('fooddata cleanup failed:', error.message)
    process.exitCode = 1
  } else {
    console.log('fooddata cleanup:', data)
  }

  const ff = await cleanupExpiredOffers()
  console.log('FF cleanup:', {
    cleaned: ff.cleaned,
    totalFound: ff.totalFound,
    byStore: ff.byStore,
    durationMs: ff.durationMs,
  })
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
