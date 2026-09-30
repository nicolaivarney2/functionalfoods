/**
 * Lidl tilbudsavis → fooddata (kun madvarer).
 * Læser Lidls egen avis (lidl.dk + endpoints.leaflets.schwarz) og varens side på lidl.dk.
 *
 * Usage:
 *   npx tsx scripts/grocery-sync-lidl.ts --dry-run
 *   npx tsx scripts/grocery-sync-lidl.ts --dry-run --max=10
 *   npx tsx scripts/grocery-sync-lidl.ts            # skriver til fooddata
 *   npx tsx scripts/grocery-sync-lidl.ts --force    # også selvom avisen er uændret
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { mapLidlAvisOffer, mapLidlAvisProduct, syncLidlAvis } from '../src/grocery/adapters/lidl'

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=')
    args.set(k, v ?? true)
  }
}
const dryRun = Boolean(args.get('dry-run'))
const force = Boolean(args.get('force'))
const maxRaw = args.get('max')
const maxProducts = typeof maxRaw === 'string' ? Number.parseInt(maxRaw, 10) : undefined

const kr = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',')

async function main() {
  console.log('────────────────────────────────────────')
  console.log('▶ Lidl tilbudsavis sync')
  console.log(`  dryRun     : ${dryRun}`)
  console.log(`  force      : ${force}`)
  console.log(`  maxProducts: ${maxProducts ?? 'unlimited'}`)
  if (!dryRun) console.log(`  target DB  : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log('────────────────────────────────────────')

  const result = await syncLidlAvis({
    dryRun,
    force,
    maxProducts,
    log: (msg) => console.log(`  ${msg}`),
  })

  if (dryRun && result.items) {
    const syncedAt = new Date().toISOString()
    console.log('')
    console.log('pris   | før    | enhedspris     | pakning     | afdeling       | vare')
    for (const item of result.items) {
      const p = mapLidlAvisProduct(item, syncedAt)
      const o = mapLidlAvisOffer(item, 'dry-run', syncedAt)
      const unitPrice = o?.unit_price_cents ? `${kr(o.unit_price_cents)}/${o.unit_price_unit ?? '?'}` : ''
      const pack = p.amount != null ? `${p.amount} ${p.unit}` : ''
      const extra = [o?.multibuy, o?.offer_description].filter(Boolean).join(' · ')
      console.log(
        `${kr(o?.price_cents).padStart(6)} | ${kr(o?.before_price_cents).padStart(6)} | ${unitPrice.padEnd(14)} | ${pack.padEnd(11)} | ${(p.category_lvl0 ?? '').padEnd(14)} | ${p.name}${extra ? `  (${extra})` : ''}`,
      )
    }
    const first = result.items[0]
    if (first) {
      const o = mapLidlAvisOffer(first, 'dry-run', syncedAt)
      console.log('')
      console.log(`  periode: ${o?.offer_from} → ${o?.offer_until}`)
    }
  }

  console.log('')
  console.log(`✓ Sync ${result.status}${result.skippedUnchanged ? ' (uændret avis — sprunget over)' : ''}`)
  console.log(`  duration          : ${(result.durationMs / 1000).toFixed(1)}s`)
  console.log(`  madvarer          : ${result.productsProcessed}`)
  console.log(`  sorteret fra      : ${result.nonFoodSkipped} (non-food/alkohol), ${result.noPriceSkipped} uden pris`)
  console.log(`  produktside-fejl  : ${result.detailErrors}`)
  console.log(`  products created  : ${result.productsCreated}`)
  console.log(`  products updated  : ${result.productsUpdated}`)
  console.log(`  offers processed  : ${result.offersProcessed}`)
  if (result.errorMessage) console.log(`  error             : ${result.errorMessage}`)
  if (result.syncLogId) console.log(`  sync_log id       : ${result.syncLogId}`)

  if (result.status === 'failed') process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
