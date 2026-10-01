/**
 * Nemlig.com fuldt katalog → fooddata (samme webapi som nemlig.com bruger).
 * Opdaterer de eksisterende rækker (source_id `nemlig-<id>`) — ingen dubletter.
 *
 * Usage:
 *   npx tsx scripts/grocery-sync-nemlig.ts --dry-run              # hele kataloget, skriver intet
 *   npx tsx scripts/grocery-sync-nemlig.ts --dry-run --pages=20   # hurtig smoke test
 *   npx tsx scripts/grocery-sync-nemlig.ts                        # skriver til fooddata
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { syncNemlig } from '../src/grocery/adapters/nemlig'

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=')
    args.set(k, v ?? true)
  }
}
const dryRun = Boolean(args.get('dry-run'))
const intArg = (name: string) => {
  const raw = args.get(name)
  return typeof raw === 'string' ? Number.parseInt(raw, 10) : undefined
}
const maxProducts = intArg('max')
const maxPages = intArg('pages')

async function main() {
  console.log('────────────────────────────────────────')
  console.log('▶ Nemlig.com katalog sync')
  console.log(`  dryRun     : ${dryRun}`)
  console.log(`  maxPages   : ${maxPages ?? 'alle'}`)
  console.log(`  maxProducts: ${maxProducts ?? 'unlimited'}`)
  if (!dryRun) console.log(`  target DB  : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log('────────────────────────────────────────')

  const result = await syncNemlig({
    dryRun,
    maxProducts,
    maxPages,
    log: (msg) => console.log(`  [${new Date().toISOString().slice(11, 19)}] ${msg}`),
  })

  console.log('')
  console.log(`✓ Nemlig sync ${result.status}`)
  console.log(`  duration          : ${(result.durationMs / 1000).toFixed(1)}s`)
  console.log(`  katalog           : ${JSON.stringify(result.catalog ?? null)}`)
  console.log(`  products processed: ${result.productsProcessed}`)
  console.log(`  products created  : ${result.productsCreated}`)
  console.log(`  products updated  : ${result.productsUpdated}`)
  console.log(`  offers processed  : ${result.offersProcessed}`)
  console.log(`  heraf tilbud      : ${result.offersOnSale}`)
  console.log(`  errors            : ${result.errorsCount}`)
  console.log(`  retention         : ${JSON.stringify(result.retention ?? null)}`)
  if (result.errorMessage) console.log(`  error             : ${result.errorMessage}`)
  if (result.syncLogId) console.log(`  sync_log id       : ${result.syncLogId}`)
  if (result.status === 'failed') process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
