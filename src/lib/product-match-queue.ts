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
  skippedAlreadyMatched: number
  skippedAlreadyQueued: number
  skippedNonFood: number
}

const PAGE = 1000
/** PostgREST `.in()` stays reliable under this size. */
const ID_CHUNK = 150
const MIN_PAGE = 100

function isStatementTimeout(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false
  if (err.code === '57014') return true
  const m = (err.message ?? '').toLowerCase()
  return m.includes('statement timeout') || m.includes('canceling statement')
}

async function selectPaged(
  run: (from: number, pageSize: number) => Promise<{ data: unknown[] | null; error: { message?: string; code?: string } | null }>,
): Promise<unknown[]> {
  const all: unknown[] = []
  let from = 0
  let pageSize = PAGE

  while (true) {
    const { data, error } = await run(from, pageSize)
    if (error) {
      if (isStatementTimeout(error) && pageSize > MIN_PAGE) {
        pageSize = Math.floor(pageSize / 2)
        continue
      }
      throw error
    }
    if (!data?.length) break
    all.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

async function loadMatchedIdsForProducts(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Set<string>> {
  const matched = new Set<string>()
  for (let i = 0; i < productIds.length; i += ID_CHUNK) {
    const chunk = productIds.slice(i, i + ID_CHUNK)
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .select('product_external_id')
      .in('product_external_id', chunk)
    if (error) throw error
    for (const row of data || []) {
      if (row.product_external_id) matched.add(String(row.product_external_id))
    }
  }
  return matched
}

/** Any queue row blocks re-insert (UNIQUE on product_id). */
async function loadQueuedIdsForProducts(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Set<string>> {
  const queued = new Set<string>()
  for (let i = 0; i < productIds.length; i += ID_CHUNK) {
    const chunk = productIds.slice(i, i + ID_CHUNK)
    const { data, error } = await supabase
      .from('product_ingredient_match_queue')
      .select('product_id')
      .in('product_id', chunk)
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return queued
      }
      throw error
    }
    for (const row of data || []) {
      if (row.product_id) queued.add(String(row.product_id))
    }
  }
  return queued
}

async function loadOffersForProducts(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Map<string, { store_id: string; name_store: string | null }>> {
  const offerByProduct = new Map<string, { store_id: string; name_store: string | null }>()
  for (let i = 0; i < productIds.length; i += ID_CHUNK) {
    const chunk = productIds.slice(i, i + ID_CHUNK)
    const { data, error } = await supabase
      .from('product_offers')
      .select('product_id, store_id, name_store')
      .in('product_id', chunk)
      .eq('is_available', true)
    if (error) throw error
    for (const row of data || []) {
      const pid = row.product_id ? String(row.product_id) : ''
      if (!pid || offerByProduct.has(pid)) continue
      offerByProduct.set(pid, {
        store_id: row.store_id,
        name_store: row.name_store ?? null,
      })
    }
  }
  return offerByProduct
}

async function loadAllMatchedIds(supabase: SupabaseClient): Promise<Set<string>> {
  const matchedIds = new Set<string>()
  const rows = await selectPaged(async (from, pageSize) => {
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .select('product_external_id')
      .order('product_external_id', { ascending: true })
      .range(from, from + pageSize - 1)
    return { data, error }
  })
  for (const row of rows as { product_external_id?: string }[]) {
    if (row.product_external_id) matchedIds.add(String(row.product_external_id))
  }
  return matchedIds
}

async function loadAllPendingQueueIds(supabase: SupabaseClient): Promise<Set<string>> {
  const pendingIds = new Set<string>()
  try {
    const rows = await selectPaged(async (from, pageSize) => {
      const { data, error } = await supabase
        .from('product_ingredient_match_queue')
        .select('product_id')
        .eq('status', 'pending')
        .order('product_id', { ascending: true })
        .range(from, from + pageSize - 1)
      return { data, error }
    })
    for (const row of rows as { product_id?: string }[]) {
      if (row.product_id) pendingIds.add(String(row.product_id))
    }
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string }
    if (e.code === '42P01' || e.message?.includes('does not exist')) {
      return pendingIds
    }
    throw err
  }
  return pendingIds
}

async function loadAllAvailableOffers(
  supabase: SupabaseClient,
): Promise<Map<string, { store_id: string; name_store: string | null }>> {
  const offerByProduct = new Map<string, { store_id: string; name_store: string | null }>()

  for (const storeId of FOODDATA_STORE_IDS) {
    const rows = await selectPaged(async (from, pageSize) => {
      const { data, error } = await supabase
        .from('product_offers')
        .select('product_id, store_id, name_store')
        .eq('store_id', storeId)
        .eq('is_available', true)
        .order('product_id', { ascending: true })
        .range(from, from + pageSize - 1)
      return { data, error }
    })
    for (const row of rows as {
      product_id?: string
      store_id: string
      name_store?: string | null
    }[]) {
      const pid = row.product_id ? String(row.product_id) : ''
      if (!pid || offerByProduct.has(pid)) continue
      offerByProduct.set(pid, {
        store_id: row.store_id,
        name_store: row.name_store ?? null,
      })
    }
  }

  return offerByProduct
}

export async function enqueueUnmatchedFooddataProducts(
  supabase: SupabaseClient,
  options: { productIds?: string[]; dryRun?: boolean } = {}
): Promise<EnqueueFooddataQueueResult> {
  const dryRun = options.dryRun ?? false
  const targetIds = options.productIds?.length ? Array.from(new Set(options.productIds)) : null

  let matchedIds: Set<string>
  let pendingIds: Set<string>
  let offerByProduct: Map<string, { store_id: string; name_store: string | null }>

  if (targetIds) {
    // Daily import path: only touch the new product ids — never full-table scans.
    ;[matchedIds, pendingIds, offerByProduct] = await Promise.all([
      loadMatchedIdsForProducts(supabase, targetIds),
      loadQueuedIdsForProducts(supabase, targetIds),
      loadOffersForProducts(supabase, targetIds),
    ])
  } else {
    matchedIds = await loadAllMatchedIds(supabase)
    pendingIds = await loadAllPendingQueueIds(supabase)
    offerByProduct = await loadAllAvailableOffers(supabase)
  }

  const productIds = targetIds
    ? targetIds.filter((id) => offerByProduct.has(id))
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
      if (targetIds) {
        // Scoped dedup against fooddata — same chunked .in() style.
        const [fdMatched, fdQueued] = await Promise.all([
          loadMatchedIdsForProducts(fooddata, candidateIds),
          loadQueuedIdsForProducts(fooddata, candidateIds),
        ])
        const stillCandidates: string[] = []
        for (const pid of candidateIds) {
          if (fdMatched.has(pid)) {
            skippedAlreadyMatched++
            continue
          }
          if (fdQueued.has(pid)) {
            skippedAlreadyQueued++
            continue
          }
          stillCandidates.push(pid)
        }
        candidateIds.length = 0
        candidateIds.push(...stillCandidates)
      } else {
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
      }
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
  for (let i = 0; i < candidateIds.length; i += ID_CHUNK) {
    const chunk = candidateIds.slice(i, i + ID_CHUNK)
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
        // Already queued/matched/dismissed — UNIQUE(product_id) hit.
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
