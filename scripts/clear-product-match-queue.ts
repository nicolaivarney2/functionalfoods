#!/usr/bin/env tsx
/**
 * Clear pending rows in product_ingredient_match_queue (FF local + fooddata).
 *
 *   npx tsx scripts/clear-product-match-queue.ts            # dry-run
 *   npx tsx scripts/clear-product-match-queue.ts --confirm  # delete pending in both DBs
 *   npx tsx scripts/clear-product-match-queue.ts --confirm --all  # all statuses
 */

import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const args = new Set(process.argv.slice(2))
const confirm = args.has('--confirm')
const wipeAll = args.has('--all')
const BATCH = 500

function client(urlEnv: string, keyEnv: string, label: string): SupabaseClient {
  const url = process.env[urlEnv]
  const key = process.env[keyEnv]
  if (!url || !key) throw new Error(`Missing ${urlEnv} / ${keyEnv} (${label})`)
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function countRows(db: SupabaseClient, all: boolean): Promise<number> {
  let q = db.from('product_ingredient_match_queue').select('id', { count: 'exact', head: true })
  if (!all) q = q.eq('status', 'pending')
  const { count, error } = await q
  if (error) {
    if (error.code === '42P01') return 0
    throw error
  }
  return count ?? 0
}

async function deleteBatch(db: SupabaseClient, all: boolean): Promise<number> {
  let selectQ = db.from('product_ingredient_match_queue').select('id').limit(BATCH)
  if (!all) selectQ = selectQ.eq('status', 'pending')
  const { data, error } = await selectQ
  if (error) throw error
  if (!data?.length) return 0
  const ids = data.map((r) => r.id)
  const { error: delErr } = await db.from('product_ingredient_match_queue').delete().in('id', ids)
  if (delErr) throw delErr
  return ids.length
}

async function clearTable(db: SupabaseClient, label: string, all: boolean): Promise<number> {
  const before = await countRows(db, all)
  console.log(`  ${label}: ${before.toLocaleString('da-DK')} rows${all ? ' (all statuses)' : ' (pending)'}`)
  if (!confirm || before === 0) return before

  let deleted = 0
  while (true) {
    const n = await deleteBatch(db, all)
    if (n === 0) break
    deleted += n
    process.stdout.write(`\r  ${label}: deleted ${deleted.toLocaleString('da-DK')}/${before.toLocaleString('da-DK')}...`)
  }
  console.log(`\r  ${label}: deleted ${deleted.toLocaleString('da-DK')} rows`)
  return deleted
}

async function main(): Promise<void> {
  const ff = client('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FF')
  const fooddata = client('GROCERY_SUPABASE_URL', 'GROCERY_SUPABASE_SECRET_KEY', 'fooddata')

  console.log('Clear product_ingredient_match_queue')
  console.log(`  mode:  ${confirm ? 'EXECUTE' : 'DRY-RUN (add --confirm)'}`)
  console.log(`  scope: ${wipeAll ? 'all statuses' : 'pending only'}`)

  console.log('\n▶ fooddata (fælles sandhed)')
  await clearTable(fooddata, 'fooddata', wipeAll)

  console.log('\n▶ FF (lokal cache)')
  await clearTable(ff, 'FF', wipeAll)

  if (!confirm) {
    console.log('\nDRY-RUN: no rows deleted. Re-run with --confirm to actually delete.')
    return
  }

  const fdLeft = await countRows(fooddata, wipeAll)
  const ffLeft = await countRows(ff, wipeAll)
  console.log(`\n✓ Remaining — fooddata: ${fdLeft}, FF: ${ffLeft}`)
}

main().catch((err) => {
  console.error('\n✗ Clear failed:', err)
  process.exit(1)
})
