/**
 * Launch watchdog — hvad /dagligvarer faktisk viser pr. kæde.
 *
 *   npm run dagligvarer:health
 *   npx tsx scripts/dagligvarer-launch-health.ts
 *
 * Exit 1 hvis en kæde er rød (tom liste, Algolia 403, absurd dato, stale > 8 dage).
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import {
  formatLaunchHealthReport,
  runDagligvarerLaunchHealth,
} from '../src/lib/dagligvarer-launch-health'

async function main() {
  const report = await runDagligvarerLaunchHealth()
  console.log(formatLaunchHealthReport(report))
  if (!report.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
