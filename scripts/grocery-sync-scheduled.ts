/**
 * Native grocery cron (Salling + REMA) — GitHub Actions, ikke Vercel.
 *
 *   npx tsx scripts/grocery-sync-scheduled.ts
 *   npx tsx scripts/grocery-sync-scheduled.ts --only=netto,bilka
 *   npx tsx scripts/grocery-sync-scheduled.ts --full
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { runScheduledGrocerySync } from '../src/lib/grocery/run-scheduled-sync'

const args = new Map<string, string | boolean>()
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--')) {
    const [k, v] = arg.replace(/^--/, '').split('=')
    args.set(k, v ?? true)
  }
}

async function main() {
  const only = typeof args.get('only') === 'string' ? String(args.get('only')) : null
  const summary = await runScheduledGrocerySync({
    only,
    fullSync: Boolean(args.get('full')),
    skipSnapshot: Boolean(args.get('skip-snapshot')),
  })
  console.log(JSON.stringify(summary, null, 2))
  if (summary.totalErrors > 0) process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
