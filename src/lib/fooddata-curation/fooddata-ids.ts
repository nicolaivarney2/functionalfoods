/**
 * Hent globale id-sæt fra fooddata — bruges ved enqueue så vi ikke duplikerer kø/matches.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE = 1000

async function fetchAllColumn(
  client: SupabaseClient,
  table: string,
  column: string,
  filter?: { column: string; value: string }
): Promise<Set<string>> {
  const ids = new Set<string>()
  let from = 0
  while (true) {
    let q = client.from(table).select(column).order(column).range(from, from + PAGE - 1)
    if (filter) q = q.eq(filter.column, filter.value)
    const { data, error } = await q
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      const v = (row as unknown as Record<string, unknown>)[column]
      if (typeof v === 'string') ids.add(v)
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return ids
}

export async function loadFooddataMatchedProductIds(
  fooddata: SupabaseClient
): Promise<Set<string>> {
  return fetchAllColumn(fooddata, 'product_ingredient_matches', 'product_external_id')
}

export async function loadFooddataMatchedIngredientIds(
  fooddata: SupabaseClient
): Promise<Set<string>> {
  const fromMatches = await fetchAllColumn(
    fooddata,
    'product_ingredient_matches',
    'ingredient_id'
  )
  try {
    const fromTags = await fetchAllColumn(
      fooddata,
      'ingredient_dietary_tags',
      'ingredient_id'
    )
    for (const id of fromTags) fromMatches.add(id)
  } catch (err) {
    console.warn('[fooddata-ids] ingredient_dietary_tags lookup failed:', err)
  }
  return fromMatches
}

/** Ingredient ids Planomo has published (source=planomo). FF-only matches stay out. */
export async function loadFooddataPlanomoIngredientIds(
  fooddata: SupabaseClient
): Promise<Set<string>> {
  const fromMatches = await fetchAllColumn(
    fooddata,
    'product_ingredient_matches',
    'ingredient_id',
    { column: 'source', value: 'planomo' }
  )
  try {
    const fromTags = await fetchAllColumn(
      fooddata,
      'ingredient_dietary_tags',
      'ingredient_id',
      { column: 'source', value: 'planomo' }
    )
    for (const id of fromTags) fromMatches.add(id)
  } catch (err) {
    console.warn('[fooddata-ids] planomo ingredient_dietary_tags lookup failed:', err)
  }
  return fromMatches
}

export type FooddataSyncedIds = {
  /** Only ingredients Planomo has matched/tagged — not FF-only partial matches. */
  ingredientIds: Set<string>
  productIds: Set<string>
}

let syncedIdsCache: { at: number; data: FooddataSyncedIds } | null = null
const SYNCED_IDS_TTL_MS = 60_000

/** Cached snapshot: Planomo ingredient ids + all matched products (for kø-filter). */
export async function loadFooddataSyncedIdsCached(
  fooddata: SupabaseClient
): Promise<FooddataSyncedIds> {
  if (syncedIdsCache && Date.now() - syncedIdsCache.at < SYNCED_IDS_TTL_MS) {
    return syncedIdsCache.data
  }
  const [ingredientIds, productIds] = await Promise.all([
    loadFooddataPlanomoIngredientIds(fooddata),
    loadFooddataMatchedProductIds(fooddata),
  ])
  const data = { ingredientIds, productIds }
  syncedIdsCache = { at: Date.now(), data }
  return data
}

export async function loadFooddataPendingQueueProductIds(
  fooddata: SupabaseClient
): Promise<Set<string>> {
  return fetchAllColumn(fooddata, 'product_ingredient_match_queue', 'product_id', {
    column: 'status',
    value: 'pending',
  })
}
