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

export async function loadFooddataPendingQueueProductIds(
  fooddata: SupabaseClient
): Promise<Set<string>> {
  return fetchAllColumn(fooddata, 'product_ingredient_match_queue', 'product_id', {
    column: 'status',
    value: 'pending',
  })
}
