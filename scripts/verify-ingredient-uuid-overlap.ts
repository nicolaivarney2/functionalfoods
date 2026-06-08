/**
 * Spot-check at core-ingredienser har samme UUID i FF (og valgfrit Planomo).
 *
 *   npx tsx scripts/verify-ingredient-uuid-overlap.ts
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CORE_NAMES = [
  'agurk',
  'tomat',
  'mælk',
  'løg',
  'kyllingebryst',
  'hakket oksekød',
  'pasta',
  'ris',
  'æg',
  'kartofler',
  'gulerødder',
  'broccoli',
  'spinat',
  'peberfrugt',
  'olivenolie',
]

function normalizeName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getClient(urlEnv: string, keyEnv: string, label: string): SupabaseClient | null {
  const url = process.env[urlEnv]
  const key = process.env[keyEnv]
  if (!url || !key) {
    console.log(`  ⊘ ${label}: ${urlEnv} / ${keyEnv} not set — skipped`)
    return null
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function loadIngredientNameMap(client: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  let from = 0
  while (true) {
    const { data, error } = await client
      .from('ingredients')
      .select('id, name')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      const key = normalizeName(row.name)
      if (key && !map.has(key)) map.set(key, row.id)
    }
    if (data.length < 1000) break
    from += 1000
  }
  return map
}

async function main() {
  const ff = getClient('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'FF')
  if (!ff) throw new Error('FF credentials required (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)')

  const planomo = getClient(
    'PLANOMO_SUPABASE_URL',
    'PLANOMO_SUPABASE_SERVICE_ROLE_KEY',
    'Planomo'
  )

  console.log('Ingredient UUID overlap check\n')

  const ffMap = await loadIngredientNameMap(ff)
  console.log(`  FF ingredients:      ${ffMap.size}`)

  let planomoMap: Map<string, string> | null = null
  if (planomo) {
    planomoMap = await loadIngredientNameMap(planomo)
    console.log(`  Planomo ingredients: ${planomoMap.size}`)
  }

  let same = 0
  let mismatch = 0
  let planomoOnly = 0
  let ffOnly = 0

  for (const name of CORE_NAMES) {
    const key = normalizeName(name)
    const ffId = ffMap.get(key)
    const pmId = planomoMap?.get(key)

    if (pmId && ffId) {
      if (pmId === ffId) {
        same++
        console.log(`  ✓ ${name}: ${ffId}`)
      } else {
        mismatch++
        console.log(`  ✗ ${name}: planomo=${pmId}  ff=${ffId}`)
      }
    } else if (ffId && !pmId) {
      ffOnly++
      console.log(`  ~ ${name}: kun FF (${ffId})`)
    } else if (!ffId && pmId) {
      planomoOnly++
      console.log(`  ~ ${name}: kun Planomo (${pmId})`)
    } else {
      console.log(`  ? ${name}: findes i ingen DB`)
    }
  }

  console.log('\n── Summary ──')
  console.log(`  Core sample:     ${CORE_NAMES.length}`)
  console.log(`  Same UUID:       ${same}`)
  console.log(`  UUID mismatch:   ${mismatch}`)
  console.log(`  Planomo only:    ${planomoOnly}`)
  console.log(`  FF only:         ${ffOnly}`)

  if (mismatch > 0) {
    console.log('\n⚠️  Forskellige UUID for samme ingrediens — fælles matches i fooddata virker ikke for disse.')
    process.exit(1)
  }

  if (!planomo) {
    console.log('\nTip: Sæt PLANOMO_SUPABASE_URL + PLANOMO_SUPABASE_SERVICE_ROLE_KEY for fuld sammenligning.')
  } else if (same >= CORE_NAMES.length * 0.8) {
    console.log('\n✅ Core-ingredienser deler UUID mellem FF og Planomo.')
  }

  console.log('\n✅ FF verify complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
