/**
 * Standalone REMA 1000 sync runner.
 * Uses REMA's public API (https://api.digital.rema1000.dk/api/v3) directly.
 *
 * Usage:
 *   npx tsx scripts/grocery-sync-rema.ts --dry-run --max=50
 *   npx tsx scripts/grocery-sync-rema.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { syncRema1000 } from '../src/grocery/adapters/rema1000'

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

async function main() {
  console.log('────────────────────────────────────────')
  console.log('▶ REMA 1000 sync')
  console.log(`  dryRun     : ${dryRun}`)
  console.log(`  maxProducts: ${maxProducts ?? 'unlimited'}`)
  console.log(`  target DB  : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log('────────────────────────────────────────')

  const t0 = Date.now()
  const result = await syncRema1000({ dryRun, maxProducts })
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

  if (result.status === 'failed') process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
