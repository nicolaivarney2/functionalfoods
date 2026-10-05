/**
 * Scrape-status for seneste natlige grocery-sync.
 *
 *   npm run dagligvarer:health
 *   npx tsx scripts/dagligvarer-launch-health.ts
 *
 * Exit 1 hvis en scrape i vinduet fejlede eller ikke kørte.
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { sendDagligvarerOpsEmail } from '../src/lib/dagligvarer-ops-email'
import {
  formatLaunchHealthReport,
  launchHealthEmailSubject,
  runDagligvarerLaunchHealth,
} from '../src/lib/dagligvarer-launch-health'

const sendEmail = process.argv.includes('--email')

async function main() {
  const report = await runDagligvarerLaunchHealth()
  const text = formatLaunchHealthReport(report)
  console.log(text)
  if (sendEmail) {
    const subject = launchHealthEmailSubject(report)
    const sent = await sendDagligvarerOpsEmail({ subject, text })
    if (!sent.ok) console.warn('ops-mail fejlede:', sent.error)
  }
  if (!report.ok) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
