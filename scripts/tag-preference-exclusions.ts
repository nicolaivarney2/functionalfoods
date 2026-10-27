/**
 * Sæt chili, fresh-coriander og champignon på Functional Foods' ingredients.exclusions.
 *
 * Navnematch via suggestExclusionTagsFromName. Eksisterende tags bliver liggende
 * (mergeIngredientTags addFood) — gochujang kan blive ved med at være både gluten og chili.
 * Frø og stødt koriander får ikke fresh-coriander.
 *
 *   npx tsx scripts/tag-preference-exclusions.ts
 *   npx tsx scripts/tag-preference-exclusions.ts --execute
 */
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  mergeIngredientTags,
  parseIngredientTags,
  suggestExclusionTagsFromName,
  type ExclusionTagId,
} from '../src/lib/dietary-exclusions'

const EXECUTE = process.argv.includes('--execute')
const PAGE = 1000
const TAGS: ExclusionTagId[] = ['chili', 'fresh-coriander', 'champignon']

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

async function fetchIngredients(client: SupabaseClient) {
  const out: Array<{ id: string; name: string; exclusions: unknown }> = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from('ingredients')
      .select('id, name, exclusions')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    out.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

async function main() {
  const client = getFfClient()
  const rows = await fetchIngredients(client)
  const planned: Array<{
    id: string
    name: string
    add: ExclusionTagId[]
    before: string[]
    after: string[]
  }> = []

  for (const row of rows) {
    const suggested = suggestExclusionTagsFromName(row.name).filter((tag) =>
      TAGS.includes(tag)
    )
    if (!suggested.length) continue

    const before = parseIngredientTags(row.exclusions).all
    const add = suggested.filter((tag) => !before.includes(tag))
    if (!add.length) continue

    const after = mergeIngredientTags(row.exclusions, { addFood: add })
    planned.push({ id: row.id, name: row.name, add, before, after })
  }

  const counts = Object.fromEntries(TAGS.map((tag) => [tag, 0])) as Record<
    ExclusionTagId,
    number
  >
  for (const row of planned) {
    for (const tag of row.add) counts[tag]++
  }

  console.log(`ingredients: ${rows.length}`)
  console.log(`to update: ${planned.length}`)
  for (const tag of TAGS) console.log(`  ${tag}: ${counts[tag]}`)
  for (const row of planned) {
    console.log(`- ${row.name}  +${row.add.join(',')}  [${row.before.join(', ')}] → [${row.after.join(', ')}]`)
  }

  if (!EXECUTE) {
    console.log('dry-run. Kør med --execute for at gemme.')
    return
  }

  let updated = 0
  for (const row of planned) {
    const { error } = await client
      .from('ingredients')
      .update({ exclusions: row.after })
      .eq('id', row.id)
    if (error) {
      console.error(`failed ${row.id} (${row.name}): ${error.message}`)
      continue
    }
    updated++
  }
  console.log(`updated: ${updated}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
