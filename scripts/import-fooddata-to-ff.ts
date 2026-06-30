/**
 * Import fooddata → FF Supabase (main app DB) — CLI wrapper.
 *
 * Core logic lives in src/lib/fooddata-import/run-import.ts (shared with the
 * nightly cron at /api/grocery/import-to-ff/cron). This file only parses CLI
 * flags + builds the two Supabase clients.
 *
 * Usage:
 *   npx tsx scripts/import-fooddata-to-ff.ts            # full import
 *   npx tsx scripts/import-fooddata-to-ff.ts --dry-run  # show counts only
 *   npx tsx scripts/import-fooddata-to-ff.ts --skip-history  # skip price_history
 *   npx tsx scripts/import-fooddata-to-ff.ts --history-days=90  # backfill (default: 7)
 *   npx tsx scripts/import-fooddata-to-ff.ts --limit=100    # smoke test
 *   npx tsx scripts/import-fooddata-to-ff.ts --enqueue-unmatched  # fill match queue (all unmatched)
 *   npx tsx scripts/import-fooddata-to-ff.ts --skip-queue   # no queue writes
 *   npx tsx scripts/import-fooddata-to-ff.ts --pull-curation  # pull matches/tags fra fooddata
 *   npx tsx scripts/import-fooddata-to-ff.ts --curation-only  # kun pull (ingen katalog-import)
 *
 * SAFETY: Reads from fooddata (READ-only). Writes ONLY to Planomo/FF.
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { runFooddataImport } from '../src/lib/fooddata-import/run-import'

const args = new Set(process.argv.slice(2))
const limitArg = process.argv.slice(2).find((a) => a.startsWith('--limit='))
const historyDaysArg = process.argv.slice(2).find((a) => a.startsWith('--history-days='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : null
const HISTORY_DAYS = historyDaysArg ? parseInt(historyDaysArg.split('=')[1], 10) : undefined

function getFooddataClient(): SupabaseClient {
  const url = process.env.GROCERY_SUPABASE_URL
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error('Missing GROCERY_SUPABASE_URL or GROCERY_SUPABASE_SECRET_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  })
}

function getFfClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' },
  })
}

function bar(label: string) {
  console.log('\n' + '═'.repeat(60))
  console.log(`▶ ${label}`)
  console.log('═'.repeat(60))
}

async function main() {
  const fooddata = getFooddataClient()
  const ff = getFfClient()

  const dryRun = args.has('--dry-run')

  bar('Pre-flight check')
  console.log(`  fooddata URL : ${process.env.GROCERY_SUPABASE_URL}`)
  console.log(`  ff URL  : ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`  dry-run      : ${dryRun}`)
  console.log(`  limit        : ${LIMIT ?? 'none'}`)
  console.log(`  skip-history : ${args.has('--skip-history')}`)
  console.log(`  history-days : ${HISTORY_DAYS ?? '7 (default)'}`)
  console.log(`  pull-curation: ${args.has('--pull-curation') || args.has('--curation-only')}`)
  console.log(`  curation-only: ${args.has('--curation-only')}`)

  const result = await runFooddataImport({
    ff,
    fooddata,
    dryRun,
    limit: LIMIT,
    skipProducts: args.has('--skip-products'),
    skipOffers: args.has('--skip-offers'),
    skipHistory: args.has('--skip-history'),
    historyDays: HISTORY_DAYS,
    skipQueue: args.has('--skip-queue'),
    enqueueUnmatched: args.has('--enqueue-unmatched'),
    pullCuration: args.has('--pull-curation'),
    curationOnly: args.has('--curation-only'),
    pullQueue: args.has('--pull-queue'),
    log: (msg) => console.log(msg),
  })

  bar('DONE')
  console.log(dryRun ? '  Dry-run finished — no writes performed.' : '  Import complete.')
  console.log(`  Duration: ${(result.durationMs / 1000).toFixed(1)}s`)
}

main().catch((err) => {
  console.error('\nFATAL', err)
  process.exit(1)
})
