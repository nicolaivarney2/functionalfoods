#!/usr/bin/env tsx
/**
 * Clear the product_ingredient_match_queue table.
 *
 * By default deletes only pending items (preserving matched/dismissed history).
 * Pass --all to wipe everything.
 *
 *   npx tsx scripts/clear-product-match-queue.ts            # dry-run, show counts
 *   npx tsx scripts/clear-product-match-queue.ts --confirm  # actually delete pending
 *   npx tsx scripts/clear-product-match-queue.ts --confirm --all  # delete all rows
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const args = new Set(process.argv.slice(2))
const confirm = args.has('--confirm')
const wipeAll = args.has('--all')

async function main(): Promise<void> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Counts by status
  const counts: Record<string, number> = {}
  const pageSize = 1000
  let total = 0
  for (let from = 0; from < 1_000_000; from += pageSize) {
    const { data, error } = await client
      .from('product_ingredient_match_queue')
      .select('status')
      .range(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    for (const r of data) counts[r.status] = (counts[r.status] ?? 0) + 1
    total += data.length
    if (data.length < pageSize) break
  }

  console.log('────────────────────────────────────────')
  console.log('▶ product_ingredient_match_queue current state')
  console.log('────────────────────────────────────────')
  console.log(`  Total rows: ${total.toLocaleString('da-DK')}`)
  for (const [status, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${status.padEnd(12)} ${n.toLocaleString('da-DK')}`)
  }
  console.log()

  if (!confirm) {
    console.log('DRY-RUN: no rows deleted. Re-run with --confirm to actually delete.')
    console.log('  --confirm        → delete pending only')
    console.log('  --confirm --all  → delete every row')
    return
  }

  const targetStatus = wipeAll ? null : 'pending'
  const targetCount = wipeAll ? total : (counts.pending ?? 0)

  if (targetCount === 0) {
    console.log('Nothing to delete.')
    return
  }

  console.log(`Deleting ${targetCount.toLocaleString('da-DK')} rows (${wipeAll ? 'ALL' : 'pending only'})…`)

  const t0 = Date.now()
  let query = client.from('product_ingredient_match_queue').delete()
  if (targetStatus) {
    query = query.eq('status', targetStatus)
  } else {
    // Need a where clause to delete; use a tautology
    query = query.gte('queued_at', '1970-01-01')
  }
  const { error: delErr, count: deletedCount } = await query.select('*', {
    count: 'exact',
    head: true,
  })

  if (delErr) throw new Error(delErr.message)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`✓ Deleted ${(deletedCount ?? targetCount).toLocaleString('da-DK')} rows in ${elapsed}s`)
}

main().catch((err) => {
  console.error('\n✗ Clear failed:', err)
  process.exit(1)
})
