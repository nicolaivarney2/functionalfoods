/**
 * Standalone Netto sync runner.
 *
 * Usage:
 *   npx tsx scripts/grocery-sync-netto.ts --dry-run --max=50
 *   npx tsx scripts/grocery-sync-netto.ts --max=200
 *   npx tsx scripts/grocery-sync-netto.ts                  # full sync (~4453)
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

// Import AFTER env vars are loaded so the Supabase client picks them up.
import { syncSallingChain } from '../src/grocery/adapters/salling-algolia'

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=')
    args.set(k, v ?? true)
  }
}

const dryRun = Boolean(args.get('dry-run'))
const maxRaw = args.get('max')
const maxProducts = typeof maxRaw === 'string' ? Number.parseInt(maxRaw, 10) : undefined
const chain = (args.get('chain') as 'netto' | 'bilka' | 'foetex' | undefined) ?? 'netto'

async function main() {
  console.log('────────────────────────────────────────')
  console.log(`▶ Grocery sync (Salling Algolia)`)
  console.log(`  chain      : ${chain}`)
  console.log(`  dryRun     : ${dryRun}`)
  console.log(`  maxProducts: ${maxProducts ?? 'unlimited'}`)
  console.log(`  target DB  : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log('────────────────────────────────────────')

  const t0 = Date.now()
  const result = await syncSallingChain(chain, { dryRun, maxProducts })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('')
  console.log(`✓ Sync ${result.status}`)
  console.log(`  duration         : ${elapsed}s`)
  console.log(`  products processed: ${result.productsProcessed}`)
  console.log(`  products created : ${result.productsCreated}`)
  console.log(`  products updated : ${result.productsUpdated}`)
  console.log(`  offers processed : ${result.offersProcessed}`)
  console.log(`  errors           : ${result.errorsCount}`)
  if (result.errorMessage) console.log(`  error message    : ${result.errorMessage}`)
  if (result.syncLogId) console.log(`  sync_log id      : ${result.syncLogId}`)
  if (result.sampleProductIds.length) {
    console.log(`  sample product ids: ${result.sampleProductIds.join(', ')}`)
  }

  if (result.status === 'failed') process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
