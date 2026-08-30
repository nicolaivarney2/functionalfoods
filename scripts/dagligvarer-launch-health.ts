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

import { sendDagligvarerOpsEmail } from '../src/lib/dagligvarer-ops-email'
import {
  formatLaunchHealthReport,
  runDagligvarerLaunchHealth,
} from '../src/lib/dagligvarer-launch-health'

const sendEmail = process.argv.includes('--email')

async function main() {
  const report = await runDagligvarerLaunchHealth()
  const text = formatLaunchHealthReport(report)
  console.log(text)
  if (sendEmail) {
    const subject = report.ok
      ? `[FF dagligvarer] Rapport OK (${report.warnCount} advarsler)`
      : `[FF dagligvarer] ${report.failCount} kæder røde`
    const sent = await sendDagligvarerOpsEmail({ subject, text })
    if (!sent.ok) console.warn('ops-mail fejlede:', sent.error)
  }
  if (!report.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
