/**
 * Pull fælles kurering fra fooddata → FF lokal cache.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mergeIngredientTags,
  normalizeExclusionTags,
  parseIngredientTags,
} from '@/lib/dietary-exclusions'
import { mergeOrganicTagArrays } from '@/lib/fooddata-publish/product-organic-tags'
import { normalizeProductOrganicTags } from '@/lib/madbudget/organic-preference'

const PAGE = 1000

async function fetchAllFooddata<T>(
  client: SupabaseClient,
  table: string,
  select: string
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`fetchAllFooddata(${table}): ${error.message}`)
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

async function loadIdSet(
  client: SupabaseClient,
  table: string,
  idColumn = 'id'
): Promise<Set<string>> {
  const ids = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await client
      .from(table)
      .select(idColumn)
      .order(idColumn)
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      const v = (row as unknown as Record<string, unknown>)[idColumn]
      if (typeof v === 'string') ids.add(v)
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return ids
}

export type CurationPullResult = {
  matches: { fetched: number; upserted: number; skipped: number }
  tags: { fetched: number; updated: number; skipped: number }
  organic: { fetched: number; updated: number; skipped: number }
  queue: { fetched: number; upserted: number; skipped: number }
}

export async function pullCurationFromFooddata(
  localDb: SupabaseClient,
  fooddata: SupabaseClient,
  options: { pullQueue?: boolean } = {}
): Promise<CurationPullResult> {
  const result: CurationPullResult = {
    matches: { fetched: 0, upserted: 0, skipped: 0 },
    tags: { fetched: 0, updated: 0, skipped: 0 },
    organic: { fetched: 0, updated: 0, skipped: 0 },
    queue: { fetched: 0, upserted: 0, skipped: 0 },
  }

  const localIngredientIds = await loadIdSet(localDb, 'ingredients')
  const localProductIds = await loadIdSet(localDb, 'products')

  const remoteMatches = await fetchAllFooddata<Record<string, unknown>>(
    fooddata,
    'product_ingredient_matches',
    'ingredient_id, product_external_id, confidence, match_type, is_manual, product_name_snapshot, product_store_snapshot, last_known_price, source'
  )
  result.matches.fetched = remoteMatches.length

  const matchRows = remoteMatches.filter((m) => {
    if (!localIngredientIds.has(String(m.ingredient_id))) {
      result.matches.skipped++
      return false
    }
    if (!localProductIds.has(String(m.product_external_id))) {
      result.matches.skipped++
      return false
    }
    return true
  })

  const mapMatchChunk = (rows: Record<string, unknown>[], withSnapshots: boolean) =>
    rows.map((m) => {
      const base = {
        ingredient_id: m.ingredient_id,
        product_external_id: m.product_external_id,
        confidence: m.confidence ?? 100,
        match_type: m.match_type ?? 'manual',
        is_manual: m.is_manual ?? true,
      }
      if (!withSnapshots) return base
      return {
        ...base,
        product_name_snapshot: m.product_name_snapshot ?? null,
        product_store_snapshot: m.product_store_snapshot ?? null,
        last_known_price: m.last_known_price ?? null,
      }
    })

  let useSnapshots = true
  for (let i = 0; i < matchRows.length; i += 200) {
    const slice = matchRows.slice(i, i + 200)
    let chunk = mapMatchChunk(slice, useSnapshots)
    let { error } = await localDb
      .from('product_ingredient_matches')
      .upsert(chunk, { onConflict: 'product_external_id,ingredient_id' })

    if (error?.message?.includes('last_known_price') || error?.message?.includes('product_name_snapshot')) {
      useSnapshots = false
      chunk = mapMatchChunk(slice, false)
      const retry = await localDb
        .from('product_ingredient_matches')
        .upsert(chunk, { onConflict: 'product_external_id,ingredient_id' })
      error = retry.error
    }

    if (error) throw new Error(`pull matches upsert: ${error.message}`)
    result.matches.upserted += chunk.length
  }

  const remoteTags = await fetchAllFooddata<Record<string, unknown>>(
    fooddata,
    'ingredient_dietary_tags',
    'ingredient_id, food_exclusions, source, updated_at'
  )
  result.tags.fetched = remoteTags.length

  for (const row of remoteTags) {
    const ingId = String(row.ingredient_id)
    if (!localIngredientIds.has(ingId)) {
      result.tags.skipped++
      continue
    }

    const { data: existing, error: fetchErr } = await localDb
      .from('ingredients')
      .select('id, exclusions')
      .eq('id', ingId)
      .maybeSingle()
    if (fetchErr || !existing) {
      result.tags.skipped++
      continue
    }

    const parsed = parseIngredientTags(existing.exclusions)
    const remoteFood = normalizeExclusionTags(row.food_exclusions)
    const mergedFood = Array.from(new Set([...parsed.foodExclusions, ...remoteFood]))
    const next = mergeIngredientTags(existing.exclusions, {
      setFoodExclusions: mergedFood,
    })

    const { error: updErr } = await localDb
      .from('ingredients')
      .update({ exclusions: next })
      .eq('id', ingId)
    if (updErr) {
      result.tags.skipped++
      continue
    }
    result.tags.updated++
  }

  const remoteOrganic = await fetchAllFooddata<Record<string, unknown>>(
    fooddata,
    'product_organic_tags',
    'product_external_id, organic_tags, source, updated_at'
  )
  result.organic.fetched = remoteOrganic.length

  let organicTagsSupported = true
  for (const row of remoteOrganic) {
    if (!organicTagsSupported) {
      result.organic.skipped++
      continue
    }

    const pid = String(row.product_external_id)
    if (!localProductIds.has(pid)) {
      result.organic.skipped++
      continue
    }

    const remoteTags = normalizeProductOrganicTags(row.organic_tags)
    const { data: existing, error: fetchErr } = await localDb
      .from('products')
      .select('id, organic_tags')
      .eq('id', pid)
      .maybeSingle()
    if (fetchErr) {
      if (fetchErr.message?.includes('organic_tags')) organicTagsSupported = false
      result.organic.skipped++
      continue
    }
    if (!existing) {
      result.organic.skipped++
      continue
    }

    const localTags = normalizeProductOrganicTags(existing.organic_tags)
    const merged = mergeOrganicTagArrays(localTags, remoteTags)

    const { error: updErr } = await localDb
      .from('products')
      .update({ organic_tags: merged })
      .eq('id', pid)
    if (updErr) {
      if (updErr.message?.includes('organic_tags')) organicTagsSupported = false
      result.organic.skipped++
      continue
    }
    result.organic.updated++
  }

  if (options.pullQueue) {
    const remoteQueue = await fetchAllFooddata<Record<string, unknown>>(
      fooddata,
      'product_ingredient_match_queue',
      'product_id, store_product_id, store_id, product_name_snapshot, status, queued_at, resolved_at'
    )
    result.queue.fetched = remoteQueue.length

    const queueRows = remoteQueue.filter((q) => {
      if (!localProductIds.has(String(q.product_id))) {
        result.queue.skipped++
        return false
      }
      return true
    })

    for (let i = 0; i < queueRows.length; i += 100) {
      const chunk = queueRows.slice(i, i + 100).map((q) => ({
        product_id: q.product_id,
        store_product_id: q.store_product_id,
        store_id: q.store_id,
        product_name_snapshot: q.product_name_snapshot ?? null,
        status: q.status,
        queued_at: q.queued_at,
        resolved_at: q.resolved_at ?? null,
      }))
      const { error } = await localDb
        .from('product_ingredient_match_queue')
        .upsert(chunk, { onConflict: 'product_id' })
      if (error && error.code !== '23505') {
        throw new Error(`pull queue upsert: ${error.message}`)
      }
      result.queue.upserted += chunk.length
    }
  }

  return result
}
