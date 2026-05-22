/**
 * Apply pending grocery DB migrations.
 *
 * Usage:
 *   npx tsx scripts/grocery-migrate.ts             # apply pending
 *   npx tsx scripts/grocery-migrate.ts --status    # show status, no changes
 *   npx tsx scripts/grocery-migrate.ts --dry-run   # show what would run
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { runMigrations } from '../src/grocery/db/migrate'

const args = new Set(process.argv.slice(2))

async function main() {
  console.log('────────────────────────────────────────')
  console.log('▶ Grocery migrations')
  console.log(`  target DB: ${process.env.GROCERY_SUPABASE_URL ?? '<from GROCERY_DATABASE_URL>'}`)
  console.log('────────────────────────────────────────')

  const result = await runMigrations({
    dryRun: args.has('--dry-run'),
    statusOnly: args.has('--status'),
  })

  console.log('')
  if (args.has('--status') || args.has('--dry-run')) {
    console.log(`  Already applied (${result.alreadyApplied.length}):`)
    for (const id of result.alreadyApplied) console.log(`    ✓ ${id}`)
    console.log(`  Pending (${result.pending.length}):`)
    for (const id of result.pending) console.log(`    → ${id}`)
    if (result.skipped.length > 0) {
      console.log(`  Skipped (${result.skipped.length}):`)
      for (const s of result.skipped) console.log(`    ⚠ ${s.id} — ${s.reason}`)
    }
  } else {
    console.log(`  Applied this run (${result.applied.length}):`)
    for (const a of result.applied) console.log(`    ✓ ${a.id}  ${a.durationMs}ms`)
    console.log(`  Already up-to-date: ${result.alreadyApplied.length}`)
    if (result.skipped.length > 0) {
      console.log(`  Skipped (${result.skipped.length}):`)
      for (const s of result.skipped) console.log(`    ⚠ ${s.id} — ${s.reason}`)
    }
  }
}

main().catch((err) => {
  console.error('')
  console.error('FATAL', err.message ?? err)
  process.exit(1)
})
