/**
 * Daily Salling avis-refresh (Netto, Føtex, Bilka).
 *
 * Kører på GitHub-runner — ikke Vercel — så vi ikke rammer 300s og ikke
 * afhænger af at production allerede har den nye cron-kode.
 *
 * Usage:
 *   npx tsx scripts/grocery-sync-salling-leaflets.ts
 *   npx tsx scripts/grocery-sync-salling-leaflets.ts --chain=netto
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { syncSallingChain } from '../src/grocery/adapters/salling-algolia'
import type { SallingChain } from '../src/grocery/adapters/salling-algolia'

const ALL: SallingChain[] = ['netto', 'foetex', 'bilka']

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=')
    args.set(k, v ?? true)
  }
}

const only = args.get('chain')
const chains: SallingChain[] =
  typeof only === 'string' && ALL.includes(only as SallingChain)
    ? [only as SallingChain]
    : ALL

async function main() {
  console.log('────────────────────────────────────────')
  console.log('▶ Salling leaflet refresh')
  console.log(`  chains: ${chains.join(', ')}`)
  console.log('────────────────────────────────────────')

  let failed = 0
  for (const chain of chains) {
    const result = await syncSallingChain(chain, { leafletRefresh: true })
    const ok = result.status !== 'failed' && result.errorsCount === 0
    console.log(
      `  ${ok ? '✓' : '✗'} ${chain}: ${result.status} ` +
        `${result.productsProcessed} leaflet, ${result.offersProcessed} offers, ` +
        `${(result.durationMs / 1000).toFixed(1)}s` +
        (result.errorMessage ? ` — ${result.errorMessage}` : ''),
    )
    if (!ok) failed++
  }

  if (failed > 0) {
    console.error(`\n${failed}/${chains.length} kæder fejlede`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
