/**
 *   npx tsx scripts/price-alert-notify.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { runPriceAlertNotify } from '../src/lib/price-alerts/run-price-alert-notify'

async function main() {
  const result = await runPriceAlertNotify()
  console.log(result)
  if (!result.ok) process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
