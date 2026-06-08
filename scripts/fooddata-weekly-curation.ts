/**
 * Ugentlig kurations-ritual — pull fælles sandhed + reconcile.
 *
 * Enqueue sker IKKE her — kun ved katalog-sync når NYE mad-varer dukker op.
 *
 * Planomo: kør hver torsdag
 * FF:      kør hver onsdag (automatisk via GitHub Actions + /api/admin/fooddata/weekly-curation)
 *
 *   npx tsx scripts/fooddata-weekly-curation.ts
 *   npx tsx scripts/fooddata-weekly-curation.ts --app=ff
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CURATION_WEEKDAY_LABEL } from '../src/lib/fooddata-curation/rules'
import { runWeeklyCuration } from '../src/lib/fooddata-curation/weekly-run'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const appArg = args.find((a) => a.startsWith('--app='))
const APP = appArg?.split('=')[1] === 'ff' ? 'ff' : 'planomo'

function getLocalClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

function getFooddataClient(): SupabaseClient {
  const url = process.env.GROCERY_SUPABASE_URL
  const key = process.env.GROCERY_SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Missing GROCERY_SUPABASE_URL or GROCERY_SUPABASE_SECRET_KEY')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function main() {
  const local = getLocalClient()
  const fooddata = getFooddataClient()

  console.log('═'.repeat(60))
  console.log(`Ugentlig kuration — ${APP.toUpperCase()}`)
  console.log(`  Dag:       ${CURATION_WEEKDAY_LABEL[APP]}`)
  console.log(`  dry-run:   ${DRY_RUN}`)
  console.log('═'.repeat(60))

  console.log('\n▶ 1/3 Pull kurering fra fooddata (matches, tags, øko, kø)')
  console.log('\n▶ 2/3 Reconcile lokal kø mod matches')
  console.log('\n▶ 3/3 Status')

  const result = await runWeeklyCuration({ local, fooddata, dryRun: DRY_RUN })

  if (DRY_RUN) {
    console.log('  (pull + reconcile skipped in dry-run)')
  } else if (result.pull) {
    console.log(`  matches: ${result.pull.matches.upserted} upserted`)
    console.log(`  tags:    ${result.pull.tags.updated} updated`)
    console.log(`  organic: ${result.pull.organic.updated} updated`)
    console.log(`  queue:   ${result.pull.queue.upserted} rows synced`)
    console.log(`  reconcile: ${result.reconcile?.resolved ?? 0} pending lukket`)
  }

  console.log('  (enqueue: kun NYE mad-varer ved katalog-sync — ikke i weekly script)')
  const fd = result.stats.fooddata
  const loc = result.stats.local
  console.log('\n  FOODDATA (fælles sandhed):')
  console.log(`    pending kø:     ${fd.pending}`)
  console.log(`    matches total:  ${fd.matches}`)
  console.log('\n  LOKALT (din app — hvad mangler dig?):')
  console.log(`    pending kø:              ${loc.queuePending}  ← fælles liste (mad only i UI)`)
  console.log(`    ingredienser uden match:   ${loc.ingredientsWithoutMatch} / ${loc.totalIngredients}`)
  console.log(`    matches total:             ${loc.totalMatches}`)
  console.log('\n  HUSK:')
  console.log('    • ÉN kø i fooddata — FF onsdag, Planomo torsdag')
  console.log('    • Match/tag gemt ét sted → fooddata → begge puller')
  console.log('    • Kø: kun NYE mad-varer efter katalog-sync (non-food aldrig med)')
  console.log('    • App-specifikke ingredienser = lokale matches (ignoreres af den anden app)')

  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
