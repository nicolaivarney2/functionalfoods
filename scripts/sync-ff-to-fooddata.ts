/**
 * FF → fooddata fælles kurering (push / merge).
 *
 * Union upsert — overskriver ikke den anden apps rader ved delete (source-aware).
 * Brug --queue=pending for at undgå at pushe 60k+ historiske kø-rækker.
 *
 *   npx tsx scripts/sync-ff-to-fooddata.ts
 *   npx tsx scripts/sync-ff-to-fooddata.ts --dry-run
 *   npx tsx scripts/sync-ff-to-fooddata.ts --only=matches,tags
 *   npx tsx scripts/sync-ff-to-fooddata.ts --queue=pending
 *   npx tsx scripts/sync-ff-to-fooddata.ts --matches=resolved-only
 */

import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'
loadEnv({ path: resolve(process.cwd(), '.env.local') })

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  filterQueueForPublish,
  getFooddataPublishClient,
  isFooddataPublishConfigured,
  isFooddataShareableIngredientId,
  upsertIngredientTagsBatchInFooddata,
  upsertMatchesBatchInFooddata,
  upsertProductOrganicTagsBatchInFooddata,
  upsertQueueBatchInFooddata,
} from '../src/lib/fooddata-publish'
import { isFooddataProductExternalId } from '../src/lib/product-match-snapshots'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const ONLY = onlyArg
  ? new Set(onlyArg.split('=')[1].split(',').map((s) => s.trim()))
  : null
const queueArg = process.argv.find((a) => a.startsWith('--queue='))
const QUEUE_MODE: 'pending' | 'all' =
  queueArg?.split('=')[1] === 'all' ? 'all' : 'pending'
const MATCHES_RESOLVED_ONLY = args.has('--matches=resolved-only')

const PAGE = 1000

function getFfClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function fetchAll<T>(
  client: SupabaseClient,
  table: string,
  select: string,
  orderCol = 'id'
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

async function loadLocalProductIds(ff: SupabaseClient): Promise<Set<string>> {
  const ids = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await ff
      .from('products')
      .select('id')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) ids.add(row.id)
    if (data.length < PAGE) break
    from += PAGE
  }
  return ids
}

async function fetchAllIngredientsWithTags(client: SupabaseClient) {
  const out: Array<{ id: string; exclusions: unknown }> = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from('ingredients')
      .select('id, exclusions')
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

async function fetchAllProductsWithOrganicTags(client: SupabaseClient) {
  const out: Array<{ id: string; organic_tags: unknown }> = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from('products')
      .select('id, organic_tags')
      .not('organic_tags', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      const tags = row.organic_tags
      if (Array.isArray(tags) && tags.length > 0) {
        out.push({ id: row.id, organic_tags: tags })
      }
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

function shouldRun(section: string): boolean {
  return !ONLY || ONLY.has(section)
}

async function main() {
  if (!isFooddataPublishConfigured()) {
    throw new Error('Missing GROCERY_SUPABASE_URL or GROCERY_SUPABASE_SECRET_KEY')
  }

  const ff = getFfClient()
  const fooddata = getFooddataPublishClient()
  const localProductIds = await loadLocalProductIds(ff)

  console.log('FF → fooddata shared curation push')
  console.log(`  dry-run:           ${DRY_RUN}`)
  console.log(`  queue mode:        ${QUEUE_MODE}`)
  console.log(`  matches filter:    ${MATCHES_RESOLVED_ONLY ? 'resolved products only' : 'all'}`)
  console.log(`  fooddata:          ${process.env.GROCERY_SUPABASE_URL}`)

  if (shouldRun('matches')) {
    console.log('\n▶ Matches')
    const matches = await fetchAll<any>(ff, 'product_ingredient_matches', '*')
    let valid = matches.filter((m) => m.ingredient_id && m.product_external_id)
    if (MATCHES_RESOLVED_ONLY) {
      const before = valid.length
      valid = valid.filter((m) => localProductIds.has(String(m.product_external_id)))
      console.log(`  ${valid.length} rows (${before - valid.length} orphan product ids skipped)`)
    } else {
      console.log(`  ${valid.length} rows`)
    }
    const shareable = valid.filter((m) => isFooddataShareableIngredientId(m.ingredient_id))
    const fooddataKeys = shareable.filter((m) =>
      isFooddataProductExternalId(String(m.product_external_id))
    )
    const legacySkipped = shareable.length - fooddataKeys.length
    const nonShareable = valid.length - shareable.length
    if (nonShareable > 0) {
      console.log(`  ${shareable.length} shareable ingredient ids (${nonShareable} local-only ingredient ids skipped)`)
    }
    if (legacySkipped > 0) {
      console.log(`  ${fooddataKeys.length} fooddata product keys (${legacySkipped} goma/legacy product ids skipped)`)
    }
    if (!DRY_RUN && fooddataKeys.length > 0) {
      const n = await upsertMatchesBatchInFooddata(fooddata, fooddataKeys)
      console.log(`  ✓ upserted ${n}`)
    }
  }

  if (shouldRun('queue')) {
    console.log('\n▶ Match queue')
    const queue = await fetchAll<any>(ff, 'product_ingredient_match_queue', '*')
    const filtered = filterQueueForPublish(queue, QUEUE_MODE).filter((row) =>
      isFooddataProductExternalId(String(row.product_id))
    )
    const queueLegacySkipped = filterQueueForPublish(queue, QUEUE_MODE).length - filtered.length
    console.log(`  ${filtered.length} rows (from ${queue.length} total, mode=${QUEUE_MODE})`)
    if (queueLegacySkipped > 0) {
      console.log(`  ${queueLegacySkipped} goma/legacy queue rows skipped`)
    }
    if (!DRY_RUN && filtered.length > 0) {
      const n = await upsertQueueBatchInFooddata(fooddata, filtered)
      console.log(`  ✓ upserted ${n}`)
    }
  }

  if (shouldRun('tags')) {
    console.log('\n▶ Ingredient dietary tags')
    const ingredients = await fetchAllIngredientsWithTags(ff)
    const tagged = ingredients.filter((row) => {
      const ex = row.exclusions
      return Array.isArray(ex) && ex.length > 0
    })
    const shareableTagged = tagged.filter((row) => isFooddataShareableIngredientId(row.id))
    console.log(
      `  ${shareableTagged.length} shareable ingredients with tags (${tagged.length - shareableTagged.length} local-only ids skipped, ${ingredients.length} total)`
    )
    if (!DRY_RUN && shareableTagged.length > 0) {
      const n = await upsertIngredientTagsBatchInFooddata(
        fooddata,
        shareableTagged.map((row) => ({ ingredient_id: row.id, exclusions: row.exclusions }))
      )
      console.log(`  ✓ upserted ${n}`)
    }
  }

  if (shouldRun('organic')) {
    console.log('\n▶ Product organic tags')
    const products = await fetchAllProductsWithOrganicTags(ff)
    const resolved = products.filter(
      (p) => localProductIds.has(p.id) && isFooddataProductExternalId(p.id)
    )
    const organicLegacySkipped =
      products.filter((p) => localProductIds.has(p.id)).length - resolved.length
    console.log(`  ${resolved.length} products with organic_tags (${products.length - resolved.length} orphan skipped)`)
    if (organicLegacySkipped > 0) {
      console.log(`  ${organicLegacySkipped} goma/legacy organic product ids skipped`)
    }
    if (!DRY_RUN && resolved.length > 0) {
      const n = await upsertProductOrganicTagsBatchInFooddata(
        fooddata,
        resolved.map((row) => ({
          product_external_id: row.id,
          organic_tags: row.organic_tags,
        }))
      )
      console.log(`  ✓ upserted ${n}`)
    }
  }

  console.log('\nDone.')
  console.log('Tip: pull FF kurering tilbage med npm run fooddata:pull-curation')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
