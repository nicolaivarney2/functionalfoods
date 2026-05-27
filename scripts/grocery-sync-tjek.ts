/**
 * Tjek (Squid) sync runner.
 *
 * Pulls weekly tilbud-offers from squid-api.tjek.com for the chains we do
 * NOT have a primary-source adapter for (Lidl, MENY, Spar, Coop chains,
 * Løvbjerg, …). Goal: replace Goma's offer feed.
 *
 * Usage:
 *   # Dry-run, preview a handful of offers (no DB writes)
 *   npx tsx scripts/grocery-sync-tjek.ts --dry-run --max=10
 *
 *   # Sync only Lidl
 *   npx tsx scripts/grocery-sync-tjek.ts --chains=lidl
 *
 *   # Sync all non-primary chains (default)
 *   npx tsx scripts/grocery-sync-tjek.ts
 *
 *   # Include the primary-source chains too (overwrites canonical products!)
 *   npx tsx scripts/grocery-sync-tjek.ts --include-primary
 *
 * Kill-switch:
 *   GROCERY_TJEK_DISABLED=true   # immediately aborts all requests
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { syncTjek } from '../src/grocery/adapters/tjek'
import type { SourceChain } from '../src/grocery/types'

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) continue
  const [k, v] = arg.replace(/^--/, '').split('=')
  args.set(k, v ?? true)
}

const dryRun = Boolean(args.get('dry-run'))
const includePrimary = Boolean(args.get('include-primary'))
const maxRaw = args.get('max')
const maxOffers = typeof maxRaw === 'string' ? Number.parseInt(maxRaw, 10) : undefined

const chainsRaw = args.get('chains')
const chains: SourceChain[] | undefined =
  typeof chainsRaw === 'string'
    ? (chainsRaw.split(',').map((c) => c.trim()) as SourceChain[])
    : undefined

async function main() {
  console.log('────────────────────────────────────────')
  console.log('▶ Tjek (squid-api) sync')
  console.log(`  dryRun        : ${dryRun}`)
  console.log(`  maxOffers     : ${maxOffers ?? 'unlimited'}`)
  console.log(`  chains        : ${chains ? chains.join(', ') : '(all non-primary)'}`)
  console.log(`  includePrimary: ${includePrimary}`)
  if (!dryRun) {
    console.log(`  target DB     : ${process.env.GROCERY_SUPABASE_URL}`)
  }
  console.log('────────────────────────────────────────')

  const t0 = Date.now()
  const result = await syncTjek({
    dryRun,
    maxOffers,
    chains,
    includePrimary,
    collectPreview: dryRun,
  })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('')
  console.log(`✓ Sync ${result.status}`)
  console.log(`  duration         : ${elapsed}s`)
  console.log(`  dealers processed: ${result.dealersProcessed}`)
  console.log(`  offers processed : ${result.offersProcessed}`)
  console.log(`  products created : ${result.productsCreated}`)
  console.log(`  products updated : ${result.productsUpdated}`)
  console.log(`  offers upserted  : ${result.offersUpserted}`)
  console.log(`  errors           : ${result.errorsCount}`)
  if (result.errorMessage) console.log(`  error message    : ${result.errorMessage}`)
  if (result.syncLogId) console.log(`  sync_log id      : ${result.syncLogId}`)

  if (dryRun && result.preview && result.preview.length > 0) {
    console.log('')
    console.log(`▶ Preview (${Math.min(result.preview.length, 10)} of ${result.preview.length}):`)
    for (const p of result.preview.slice(0, 10)) {
      const pre = p.preKr ? `was ${p.preKr.toFixed(2)} kr` : ''
      const pct = p.discountPct ? `(-${p.discountPct}%)` : ''
      const qty = p.amount && p.unit ? `${p.amount} ${p.unit}` : ''
      console.log(
        `  [${p.chain}] ${p.heading.padEnd(36)} ${p.priceKr.toFixed(2).padStart(7)} kr  ${pre} ${pct}  ${qty}`,
      )
    }
  }

  if (result.status === 'failed' || result.status === 'paused') process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
