/**
 * Dagrofa-kædernes tilbudsavis (MENY, SPAR, Min Købmand) → fooddata (kun madvarer).
 * Læser kædens egen avis på ugensavis.<kæde>.dk (varer, EAN, pris, periode).
 *
 * Usage:
 *   npx tsx scripts/grocery-sync-dagrofa.ts --chain=meny --dry-run
 *   npx tsx scripts/grocery-sync-dagrofa.ts --chain=spar          # skriver til fooddata
 *   npx tsx scripts/grocery-sync-dagrofa.ts --chain=all --force   # alle tre, også selvom avisen er uændret
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import {
  DAGROFA_AVIS_CHAINS,
  DAGROFA_CHAIN_IDS,
  isDagrofaChainId,
  mapDagrofaAvisOffer,
  mapDagrofaAvisProduct,
  syncDagrofaAvis,
  type DagrofaChainId,
} from '../src/grocery/adapters/dagrofa'

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
const chainArg = typeof args.get('chain') === 'string' ? String(args.get('chain')) : 'all'

const kr = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',')

async function syncChain(chainId: DagrofaChainId): Promise<boolean> {
  const chain = DAGROFA_AVIS_CHAINS[chainId]
  console.log('────────────────────────────────────────')
  console.log(`▶ ${chain.label} tilbudsavis sync (${chain.avisUrl})`)
  console.log(`  dryRun     : ${dryRun}`)
  console.log(`  force      : ${force}`)
  console.log(`  maxProducts: ${maxProducts ?? 'unlimited'}`)
  if (!dryRun) console.log(`  target DB  : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log('────────────────────────────────────────')

  const result = await syncDagrofaAvis(chainId, {
    dryRun,
    force,
    maxProducts,
    log: (msg) => console.log(`  ${msg}`),
  })

  if (dryRun && result.items) {
    const syncedAt = new Date().toISOString()
    console.log('')
    console.log('pris   | enhedspris     | pakning     | afdeling       | vare')
    for (const item of result.items) {
      const p = mapDagrofaAvisProduct(item, syncedAt)
      const o = mapDagrofaAvisOffer(item, 'dry-run', syncedAt)
      const unitPrice = o?.unit_price_cents ? `${kr(o.unit_price_cents)}/${o.unit_price_unit ?? '?'}` : ''
      const pack = p.amount != null ? `${p.amount} ${p.unit}` : ''
      const extra = [o?.multibuy, o?.offer_description].filter(Boolean).join(' · ')
      console.log(
        `${kr(o?.price_cents).padStart(6)} | ${unitPrice.padEnd(14)} | ${pack.padEnd(11)} | ${(p.category_lvl0 ?? '').padEnd(14)} | ${p.name}${p.gtin ? '' : ' [intet gtin]'}${extra ? `  (${extra})` : ''}`,
      )
    }
    const first = result.items[0]
    if (first) {
      const o = mapDagrofaAvisOffer(first, 'dry-run', syncedAt)
      console.log('')
      console.log(`  periode: ${o?.offer_from} → ${o?.offer_until}`)
    }
  }

  console.log('')
  console.log(`✓ ${chain.label} sync ${result.status}${result.skippedUnchanged ? ' (uændret avis — sprunget over)' : ''}`)
  console.log(`  duration          : ${(result.durationMs / 1000).toFixed(1)}s`)
  console.log(`  avis              : ${result.avis ? `${result.avis.name} ${result.avis.validFrom} → ${result.avis.validTo} (${result.avis.products} varer)` : '-'}`)
  console.log(`  madvarer          : ${result.productsProcessed}`)
  console.log(`  sorteret fra      : ${result.alcoholSkipped} alkohol, ${result.nonFoodSkipped} non-food, ${result.noPriceSkipped} uden pris`)
  console.log(`  katalog-match     : ${result.nativeMatched}`)
  console.log(`  products created  : ${result.productsCreated}`)
  console.log(`  products updated  : ${result.productsUpdated}`)
  console.log(`  offers processed  : ${result.offersProcessed}`)
  if (result.errorMessage) console.log(`  error             : ${result.errorMessage}`)
  if (result.syncLogId) console.log(`  sync_log id       : ${result.syncLogId}`)
  console.log('')
  return result.status !== 'failed'
}

async function main() {
  if (chainArg !== 'all' && !isDagrofaChainId(chainArg)) {
    console.error(`Ukendt --chain=${chainArg}. Brug ${DAGROFA_CHAIN_IDS.join(' | ')} | all`)
    process.exit(2)
  }
  const chains = chainArg === 'all' ? [...DAGROFA_CHAIN_IDS] : [chainArg as DagrofaChainId]
  let ok = true
  for (const chainId of chains) ok = (await syncChain(chainId)) && ok
  if (!ok) process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
