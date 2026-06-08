/**
 * Pull fælles kurering fra fooddata → FF lokal cache.
 *
 *   npx tsx scripts/sync-fooddata-curation-to-ff.ts
 *   npx tsx scripts/sync-fooddata-curation-to-ff.ts --pull-queue
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { pullCurationFromFooddata } from '../src/lib/fooddata-import/curation-pull'

const PULL_QUEUE = process.argv.includes('--pull-queue')

function getFooddataClient(): SupabaseClient {
  const url = process.env.GROCERY_SUPABASE_URL
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error('Missing GROCERY_SUPABASE_URL or GROCERY_SUPABASE_SECRET_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
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
  })
}

async function main() {
  const ff = getFfClient()
  const fooddata = getFooddataClient()

  console.log('fooddata → FF curation pull')
  console.log(`  pull queue: ${PULL_QUEUE}`)

  const result = await pullCurationFromFooddata(ff, fooddata, {
    pullQueue: PULL_QUEUE,
  })

  console.log('\n── Results ──')
  console.log(
    `  matches:  ${result.matches.upserted} upserted (${result.matches.skipped} skipped / ${result.matches.fetched} fetched)`
  )
  console.log(
    `  tags:     ${result.tags.updated} updated (${result.tags.skipped} skipped / ${result.tags.fetched} fetched)`
  )
  console.log(
    `  organic:  ${result.organic.updated} updated (${result.organic.skipped} skipped / ${result.organic.fetched} fetched)`
  )
  if (PULL_QUEUE) {
    console.log(
      `  queue:    ${result.queue.upserted} upserted (${result.queue.skipped} skipped / ${result.queue.fetched} fetched)`
    )
  }

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
