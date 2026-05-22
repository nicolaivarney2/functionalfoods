/**
 * Wipe all products (and cascading offers/history) for a chain.
 *
 * Uses the truncate_chain RPC which runs with `statement_timeout = '5min'`
 * to handle large chains (Bilka has ~40k rows).
 *
 * Usage:
 *   npx tsx scripts/grocery-truncate-chain.ts --chain=bilka
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { getGroceryServiceClient } from '../src/grocery/db/client'

async function main() {
  const chain = process.argv.slice(2).find((a) => a.startsWith('--chain='))?.split('=')[1]
  if (!chain) {
    console.error('Usage: --chain=<netto|bilka|foetex|...>')
    process.exit(1)
  }

  const supabase = getGroceryServiceClient()
  console.log(`▶ Truncating chain: ${chain}`)
  const t0 = Date.now()
  const { data, error } = await supabase.rpc('truncate_chain', { p_chain: chain })
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  if (error) {
    console.error(`✗ Failed: ${error.message}`)
    process.exit(1)
  }
  console.log(`✓ Deleted ${data} rows in ${elapsed}s`)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
