/**
 * Hold lokal kø synkron med fælles sandhed (fooddata matches + queue).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const PAGE = 1000

/** Luk lokale pending rækker hvor produktet allerede har match (lokal eller fooddata-pull). */
export async function reconcileLocalQueueWithMatches(
  supabase: SupabaseClient
): Promise<{ resolved: number }> {
  const matchedIds = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .select('product_external_id')
      .order('product_external_id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      if (row.product_external_id) matchedIds.add(String(row.product_external_id))
    }
    if (data.length < PAGE) break
    from += PAGE
  }

  if (matchedIds.size === 0) return { resolved: 0 }

  const now = new Date().toISOString()
  let resolved = 0

  const pendingIds = Array.from(matchedIds)
  for (let i = 0; i < pendingIds.length; i += 100) {
    const chunk = pendingIds.slice(i, i + 100)
    const { data, error } = await supabase
      .from('product_ingredient_match_queue')
      .update({ status: 'matched', resolved_at: now })
      .eq('status', 'pending')
      .in('product_id', chunk)
      .select('id')
    if (error) throw error
    resolved += data?.length ?? 0
  }

  return { resolved }
}

export type LocalCurationStats = {
  queuePending: number
  queuePendingFood: number
  ingredientsWithoutMatch: number
  totalIngredients: number
  totalMatches: number
  matchesShareableIngredient: number
}

/** Tal til ugentlig dashboard — "hvad mangler lokalt?" */
export async function loadLocalCurationStats(
  supabase: SupabaseClient,
  options: { countFoodOnlyQueue?: boolean } = {}
): Promise<LocalCurationStats> {
  const { countFoodOnlyQueue = true } = options

  const { count: queuePending } = await supabase
    .from('product_ingredient_match_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  let queuePendingFood = queuePending ?? 0
  if (countFoodOnlyQueue) {
    // API filtrerer non-food ved visning; tæl konservativt via samme pending count
    // ( præcis food-only count sker i admin API — her bruges pending total som upper bound )
    queuePendingFood = queuePending ?? 0
  }

  const { count: totalMatches } = await supabase
    .from('product_ingredient_matches')
    .select('id', { count: 'exact', head: true })

  const { count: totalIngredients } = await supabase
    .from('ingredients')
    .select('id', { count: 'exact', head: true })

  const matchedIngredientIds = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .select('ingredient_id')
      .order('ingredient_id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      if (row.ingredient_id) matchedIngredientIds.add(String(row.ingredient_id))
    }
    if (data.length < PAGE) break
    from += PAGE
  }

  const allIngredientIds: string[] = []
  from = 0
  while (true) {
    const { data, error } = await supabase
      .from('ingredients')
      .select('id')
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) allIngredientIds.push(String(row.id))
    if (data.length < PAGE) break
    from += PAGE
  }

  const ingredientsWithoutMatch = allIngredientIds.filter((id) => !matchedIngredientIds.has(id)).length

  const shareableRegex =
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|ingredient-\d+-[a-z0-9]+)$/i
  let matchesShareableIngredient = 0
  from = 0
  while (true) {
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .select('ingredient_id')
      .order('ingredient_id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      if (row.ingredient_id && shareableRegex.test(String(row.ingredient_id))) {
        matchesShareableIngredient++
      }
    }
    if (data.length < PAGE) break
    from += PAGE
  }

  return {
    queuePending: queuePending ?? 0,
    queuePendingFood,
    ingredientsWithoutMatch,
    totalIngredients: totalIngredients ?? 0,
    totalMatches: totalMatches ?? 0,
    matchesShareableIngredient,
  }
}
