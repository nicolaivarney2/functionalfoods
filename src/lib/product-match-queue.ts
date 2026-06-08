import type { SupabaseClient } from '@supabase/supabase-js'
import { FOODDATA_STORE_IDS, mapStoreIdToDisplayName } from './fooddata-stores'
import { isFoodCatalogProduct } from './product-food-classification'
import {
  getFooddataPublishClient,
  isFooddataPublishConfigured,
  upsertQueueBatchInFooddata,
} from './fooddata-publish'
import {
  loadFooddataMatchedProductIds,
  loadFooddataPendingQueueProductIds,
} from './fooddata-curation/fooddata-ids'

export type EnqueueFooddataQueueResult = {
  candidates: number
  inserted: number
  skippedAlreadyQueued: number
  skippedAlreadyMatched: number
  skippedNonFood: number
}

export async function enqueueUnmatchedFooddataProducts(
  supabase: SupabaseClient,
  options: { productIds?: string[]; dryRun?: boolean } = {}
): Promise<EnqueueFooddataQueueResult> {
  const dryRun = options.dryRun ?? false
  const targetIds = options.productIds?.length ? new Set(options.productIds) : null

  const matchedIds = new Set<string>()
  let matchFrom = 0
  while (true) {
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .select('product_external_id')
      .order('product_external_id', { ascending: true })
      .range(matchFrom, matchFrom + 999)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) {
      if (row.product_external_id) matchedIds.add(String(row.product_external_id))
    }
    if (data.length < 1000) break
    matchFrom += 1000
  }

  const pendingIds = new Set<string>()
  let queueFrom = 0
  while (true) {
    const { data, error } = await supabase
      .from('product_ingredient_match_queue')
      .select('product_id')
      .eq('status', 'pending')
      .order('product_id', { ascending: true })
      .range(queueFrom, queueFrom + 999)
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          candidates: 0,
          inserted: 0,
          skippedAlreadyQueued: 0,
          skippedAlreadyMatched: 0,
          skippedNonFood: 0,
        }
      }
      throw error
    }
    if (!data?.length) break
    for (const row of data) {
      if (row.product_id) pendingIds.add(String(row.product_id))
    }
    if (data.length < 1000) break
    queueFrom += 1000
  }

  const offerByProduct = new Map<string, { store_id: string; name_store: string | null }>()

  for (const storeId of FOODDATA_STORE_IDS) {
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('product_offers')
        .select('product_id, store_id, name_store')
        .eq('store_id', storeId)
        .eq('is_available', true)
        .order('product_id', { ascending: true })
        .range(from, from + 999)
      if (error) throw error
      if (!data?.length) break
      for (const row of data) {
        const pid = row.product_id ? String(row.product_id) : ''
        if (!pid) continue
        if (targetIds && !targetIds.has(pid)) continue
        if (!offerByProduct.has(pid)) {
          offerByProduct.set(pid, {
            store_id: row.store_id,
            name_store: row.name_store ?? null,
          })
        }
      }
      if (data.length < 1000) break
      from += 1000
    }
  }

  const productIds = targetIds
    ? Array.from(targetIds).filter((id) => offerByProduct.has(id))
    : Array.from(offerByProduct.keys())

  const candidateIds: string[] = []
  let skippedAlreadyMatched = 0
  let skippedAlreadyQueued = 0

  for (const pid of productIds) {
    if (matchedIds.has(pid)) {
      skippedAlreadyMatched++
      continue
    }
    if (pendingIds.has(pid)) {
      skippedAlreadyQueued++
      continue
    }
    candidateIds.push(pid)
  }

  if (isFooddataPublishConfigured() && candidateIds.length > 0) {
    try {
      const fooddata = getFooddataPublishClient()
      const [fdMatched, fdPending] = await Promise.all([
        loadFooddataMatchedProductIds(fooddata),
        loadFooddataPendingQueueProductIds(fooddata),
      ])
      const stillCandidates: string[] = []
      for (const pid of candidateIds) {
        if (fdMatched.has(pid)) {
          skippedAlreadyMatched++
          continue
        }
        if (fdPending.has(pid)) {
          skippedAlreadyQueued++
          continue
        }
        stillCandidates.push(pid)
      }
      candidateIds.length = 0
      candidateIds.push(...stillCandidates)
    } catch (err) {
      console.warn('[product-match-queue] fooddata dedup check failed:', err)
    }
  }

  if (candidateIds.length === 0) {
    return {
      candidates: 0,
      inserted: 0,
      skippedAlreadyQueued,
      skippedAlreadyMatched,
      skippedNonFood: 0,
    }
  }

  const catalogById = new Map<
    string,
    { name: string; department: string | null; category: string | null; subcategory: string | null }
  >()
  for (let i = 0; i < candidateIds.length; i += 150) {
    const chunk = candidateIds.slice(i, i + 150)
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name_generic, brand, department, category, subcategory')
      .in('id', chunk)
    if (prodErr) throw prodErr
    for (const p of products || []) {
      const label = [p.name_generic, p.brand].filter(Boolean).join(' · ') || p.id
      catalogById.set(p.id, {
        name: label,
        department: p.department ?? null,
        category: p.category ?? null,
        subcategory: p.subcategory ?? null,
      })
    }
  }

  const toEnqueue: string[] = []
  let skippedNonFood = 0
  for (const pid of candidateIds) {
    const offer = offerByProduct.get(pid)
    const catalog = catalogById.get(pid)
    const isFood = isFoodCatalogProduct({
      department: catalog?.department,
      category: catalog?.category,
      subcategory: catalog?.subcategory,
      name: offer?.name_store || catalog?.name,
    })
    if (!isFood) {
      skippedNonFood++
      continue
    }
    toEnqueue.push(pid)
  }

  if (dryRun || toEnqueue.length === 0) {
    return {
      candidates: toEnqueue.length,
      inserted: 0,
      skippedAlreadyQueued,
      skippedAlreadyMatched,
      skippedNonFood,
    }
  }

  const rows = toEnqueue.map((productId) => {
    const offer = offerByProduct.get(productId)!
    return {
      product_id: productId,
      store_product_id: productId,
      store_id: offer.store_id,
      product_name_snapshot:
        offer.name_store ||
        catalogById.get(productId)?.name ||
        mapStoreIdToDisplayName(offer.store_id),
      status: 'pending' as const,
    }
  })

  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error: insErr } = await supabase.from('product_ingredient_match_queue').insert(chunk)
    if (insErr) {
      if (insErr.code === '23505') {
        inserted += chunk.length
        continue
      }
      throw insErr
    }
    inserted += chunk.length
  }

  if (rows.length > 0 && isFooddataPublishConfigured()) {
    try {
      const fooddata = getFooddataPublishClient()
      await upsertQueueBatchInFooddata(fooddata, rows)
    } catch (err) {
      console.warn('[product-match-queue] fooddata queue publish failed:', err)
    }
  }

  return {
    candidates: toEnqueue.length,
    inserted,
    skippedAlreadyQueued,
    skippedAlreadyMatched,
    skippedNonFood,
  }
}
