/**
 * Enqueue unmatched food catalog products into the ingredient match queue.
 * Skips non-food and excluded shelves (slik/chokolade, vin, energidrik, …).
 *
 *   npx tsx scripts/backfill-fooddata-match-queue.ts --dry-run
 *   npx tsx scripts/backfill-fooddata-match-queue.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { enqueueUnmatchedFooddataProducts } from '../src/lib/product-match-queue'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

  const ff = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const result = await enqueueUnmatchedFooddataProducts(ff, { dryRun: DRY_RUN })
  console.log(DRY_RUN ? 'DRY-RUN' : 'DONE', result)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
