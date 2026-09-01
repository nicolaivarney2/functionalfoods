/**
 * Ryd zombie-tilbud i FF's product_offers uden at køre en fuld import.
 *
 * Samme regler som importens sweep (src/lib/fooddata-import/ff-offer-sweep.ts):
 * udløbne/forsvundne tilbud slukkes, goma-på-Salling og Tjek-på-Goma-kæder
 * slettes, orphan normal_price ryddes. Cutoffs for "væk fra fooddata" udledes
 * fra fooddatas egne on-sale synk-tidspunkter pr. butik + kildefamilie.
 *
 *   npx tsx scripts/ff-offers-sweep.ts --dry-run
 *   npx tsx scripts/ff-offers-sweep.ts
 *   npx tsx scripts/ff-offers-sweep.ts --no-cutoffs   # kun strukturel oprydning
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  buildSleepCutoffs,
  formatSweepSummary,
  sweepFfProductOffers,
  type FreshOfferRef,
} from '../src/lib/fooddata-import/ff-offer-sweep'
import { isGomaImportEnabled } from '../src/lib/goma-sunset'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const noCutoffs = args.includes('--no-cutoffs')
const pageSizeArg = args.find((a) => a.startsWith('--page-size='))
const pageSize = pageSizeArg ? Number(pageSizeArg.split('=')[1]) : undefined

function getFfClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getFooddataClient(): SupabaseClient {
  const url = process.env.GROCERY_SUPABASE_URL
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error('Missing GROCERY_SUPABASE_URL or GROCERY_SUPABASE_SECRET_KEY')
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/** Fooddatas aktive tilbud = sandheden om hvor friske FF's rækker burde være. */
async function fetchFooddataOfferRefs(fd: SupabaseClient): Promise<FreshOfferRef[]> {
  const refs: FreshOfferRef[] = []
  const PAGE = 1000
  let from = 0
  while (true) {
    const { data, error } = await fd
      .from('product_offers')
      .select('store_id, source, source_synced_at')
      .eq('is_on_sale', true)
      .eq('in_stock', true)
      .order('store_id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`fooddata offers: ${error.message}`)
    if (!data?.length) break
    for (const row of data as Array<Record<string, unknown>>) {
      refs.push({
        store_id: String(row.store_id ?? ''),
        source: (row.source as string | null) ?? null,
        is_on_sale: true,
        last_seen_at: (row.source_synced_at as string | null) ?? null,
      })
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return refs
}

async function main() {
  const ff = getFfClient()
  const gomaImportEnabled = isGomaImportEnabled()

  console.log('── FF product_offers sweep ──')
  console.log(`  ff URL      : ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`  dry-run     : ${dryRun}`)
  console.log(`  goma primær : ${gomaImportEnabled}`)

  let cutoffs = new Map<string, string>()
  if (!noCutoffs) {
    const refs = await fetchFooddataOfferRefs(getFooddataClient())
    cutoffs = buildSleepCutoffs(refs)
    console.log(`  cutoffs     : ${cutoffs.size} (butik|kilde) fra ${refs.length} fooddata-tilbud`)
  } else {
    console.log('  cutoffs     : slået fra (kun strukturel oprydning)')
  }

  const result = await sweepFfProductOffers({
    ff,
    cutoffs,
    gomaImportEnabled,
    dryRun,
    pageSize,
  })

  console.log('──')
  console.log(formatSweepSummary(result))
  if (dryRun) console.log('Dry-run — ingen ændringer skrevet.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
