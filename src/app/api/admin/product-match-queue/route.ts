import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { FOODDATA_STORE_IDS, isFooddataStoreId, mapStoreIdToDisplayName } from '@/lib/fooddata-stores'
import { isFoodCatalogProduct } from '@/lib/product-food-classification'
import { loadFooddataSyncedIdsCached } from '@/lib/fooddata-curation/fooddata-ids'
import {
  getFooddataPublishClient,
  isFooddataPublishConfigured,
} from '@/lib/fooddata-publish/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100
const SCAN_BATCH = 100
const MAX_SCAN_ROWS = 5000

type QueueRow = {
  id: string
  product_id: string
  store_product_id: string
  store_id: string
  product_name_snapshot: string | null
  queued_at: string
  products?:
    | {
        name_generic?: string | null
        brand?: string | null
        category?: string | null
        department?: string | null
        subcategory?: string | null
      }
    | Array<{
        name_generic?: string | null
        brand?: string | null
        category?: string | null
        department?: string | null
        subcategory?: string | null
      }>
    | null
}

type QueueItem = {
  id: string
  product_id: string
  store_product_id: string
  store_id: string
  store_label: string
  product_name_snapshot: string | null
  name_generic: string | null
  brand: string | null
  category: string | null
  department: string | null
  subcategory: string | null
  queued_at: string
  current_price: number | null
  normal_price: number | null
  name_store: string | null
  existing_matches: Array<{ id: string; ingredient_id: string; name: string }>
}

function missingTableResponse(limit: number) {
  return NextResponse.json({
    success: true,
    data: {
      items: [],
      count: 0,
      queueTableMissing: true,
      pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false },
    },
  })
}

async function loadOffersByProduct(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  productIds: string[]
) {
  const offerByProduct = new Map<
    string,
    { current_price: number | null; normal_price: number | null; name_store: string | null }
  >()

  for (let i = 0; i < productIds.length; i += 150) {
    const chunk = productIds.slice(i, i + 150)
    const { data: offers } = await supabase
      .from('product_offers')
      .select('product_id, current_price, normal_price, name_store')
      .in('product_id', chunk)
      .in('store_id', [...FOODDATA_STORE_IDS])
      .eq('is_available', true)
    offers?.forEach((o) => {
      const pid = o.product_id ? String(o.product_id) : ''
      if (!pid || offerByProduct.has(pid)) return
      offerByProduct.set(pid, {
        current_price: o.current_price,
        normal_price: o.normal_price,
        name_store: o.name_store,
      })
    })
  }

  return offerByProduct
}

function mapAndFilterRows(
  rows: QueueRow[],
  offerByProduct: Map<
    string,
    { current_price: number | null; normal_price: number | null; name_store: string | null }
  >,
  search: string,
  excludeProductIds: Set<string>
): QueueItem[] {
  return rows
    .map((r) => {
      const p = Array.isArray(r.products) ? r.products[0] : r.products
      const offer = offerByProduct.get(r.product_id)
      return {
        id: r.id,
        product_id: r.product_id,
        store_product_id: r.store_product_id,
        store_id: r.store_id,
        store_label: mapStoreIdToDisplayName(r.store_id),
        product_name_snapshot: r.product_name_snapshot,
        name_generic: p?.name_generic ?? r.product_name_snapshot ?? null,
        brand: p?.brand ?? null,
        category: p?.category ?? null,
        department: p?.department ?? null,
        subcategory: p?.subcategory ?? null,
        queued_at: r.queued_at,
        current_price: offer?.current_price ?? null,
        normal_price: offer?.normal_price ?? null,
        name_store: offer?.name_store ?? null,
        existing_matches: [],
      }
    })
    .filter((item) => !excludeProductIds.has(item.product_id))
    .filter((item) =>
      isFoodCatalogProduct({
        department: item.department,
        category: item.category,
        subcategory: item.subcategory,
        name: item.name_store || item.name_generic || item.product_name_snapshot,
      })
    )
    .filter((item) => {
      if (search.length < 2) return true
      const hay = [
        item.name_store,
        item.name_generic,
        item.product_name_snapshot,
        item.brand,
        item.category,
        item.product_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(search)
    })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('countOnly') === '1'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
    )
    const storeFilter = (searchParams.get('store') || '').trim().toLowerCase()
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const excludePlanomo =
      searchParams.get('excludePlanomo') === '1' || searchParams.get('excludePlanomo') === 'true'

    const supabase = createSupabaseServiceClient()

    let excludeProductIds = new Set<string>()
    if (excludePlanomo && isFooddataPublishConfigured()) {
      try {
        const synced = await loadFooddataSyncedIdsCached(getFooddataPublishClient())
        excludeProductIds = synced.productIds
      } catch (err) {
        console.warn('[product-match-queue] fooddata synced ids failed:', err)
      }
    }

    let countQuery = supabase
      .from('product_ingredient_match_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('store_id', [...FOODDATA_STORE_IDS])

    if (storeFilter && isFooddataStoreId(storeFilter)) {
      countQuery = countQuery.eq('store_id', storeFilter)
    }

    const { count: totalCount, error: countErr } = await countQuery

    if (countErr) {
      if (countErr.code === '42P01' || countErr.message?.includes('does not exist')) {
        return missingTableResponse(limit)
      }
      throw countErr
    }

    const totalUnfiltered = totalCount ?? 0

    if (countOnly) {
      return NextResponse.json({
        success: true,
        data: { count: totalUnfiltered, queueTableMissing: false },
      })
    }

    const QUEUE_SELECT = `
      id,
      product_id,
      store_product_id,
      store_id,
      product_name_snapshot,
      queued_at,
      products:product_id (
        name_generic,
        brand,
        category,
        department,
        subcategory
      )
    `

    const skip = (page - 1) * limit
    const kept: QueueItem[] = []
    let passed = 0
    let from = 0
    let scannedAll = false

    while (kept.length < limit && from < MAX_SCAN_ROWS) {
      let listQuery = supabase
        .from('product_ingredient_match_queue')
        .select(QUEUE_SELECT)
        .eq('status', 'pending')
        .in('store_id', [...FOODDATA_STORE_IDS])
        .order('queued_at', { ascending: true })
      if (storeFilter && isFooddataStoreId(storeFilter)) {
        listQuery = listQuery.eq('store_id', storeFilter)
      }
      const { data: queueRows, error: qErr } = await listQuery.range(
        from,
        from + SCAN_BATCH - 1
      )
      if (qErr) throw qErr

      const rows = (queueRows || []) as QueueRow[]
      if (rows.length === 0) {
        scannedAll = true
        break
      }

      const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))]
      const offerByProduct = await loadOffersByProduct(supabase, productIds)
      const filtered = mapAndFilterRows(rows, offerByProduct, search, excludeProductIds)

      for (const item of filtered) {
        if (passed < skip) {
          passed++
          continue
        }
        kept.push(item)
        if (kept.length >= limit) break
      }

      if (rows.length < SCAN_BATCH) {
        scannedAll = true
        break
      }
      from += SCAN_BATCH

      // Without exclude/search, one batch of `limit` is enough for the page.
      if (!excludePlanomo && search.length < 2 && from >= skip + limit) {
        break
      }
    }

    let visibleTotal = totalUnfiltered
    if (excludePlanomo && excludeProductIds.size > 0) {
      let remaining = 0
      let idFrom = 0
      while (true) {
        let idQuery = supabase
          .from('product_ingredient_match_queue')
          .select('product_id')
          .eq('status', 'pending')
          .in('store_id', [...FOODDATA_STORE_IDS])
          .order('queued_at', { ascending: true })
        if (storeFilter && isFooddataStoreId(storeFilter)) {
          idQuery = idQuery.eq('store_id', storeFilter)
        }
        const { data: idRows, error: idErr } = await idQuery.range(idFrom, idFrom + 999)
        if (idErr) throw idErr
        if (!idRows?.length) break
        for (const row of idRows) {
          if (row.product_id && !excludeProductIds.has(String(row.product_id))) remaining++
        }
        if (idRows.length < 1000) break
        idFrom += 1000
      }
      visibleTotal = remaining
    }

    const totalPages = Math.ceil(visibleTotal / limit) || 0
    const hasMore = !scannedAll ? kept.length >= limit : page * limit < visibleTotal

    const productIds = [...new Set(kept.map((k) => k.product_id).filter(Boolean))]
    if (productIds.length > 0) {
      const { data: matchRows } = await supabase
        .from('product_ingredient_matches')
        .select('id, ingredient_id, product_external_id, ingredients(name)')
        .in('product_external_id', productIds)
      const byProduct = new Map<string, QueueItem['existing_matches']>()
      for (const row of matchRows ?? []) {
        const pid = String(row.product_external_id ?? '')
        const ing = row.ingredients as { name?: string } | { name?: string }[] | null
        const name = Array.isArray(ing) ? ing[0]?.name : ing?.name
        const list = byProduct.get(pid) ?? []
        list.push({
          id: String(row.id),
          ingredient_id: String(row.ingredient_id),
          name: name || 'ingrediens',
        })
        byProduct.set(pid, list)
      }
      for (const item of kept) {
        item.existing_matches = byProduct.get(item.product_id) ?? []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items: kept,
        count: kept.length,
        totalPending: visibleTotal,
        totalPendingUnfiltered: totalUnfiltered,
        excludedPlanomo: excludePlanomo,
        queueTableMissing: false,
        pagination: {
          page,
          limit,
          total: visibleTotal,
          totalPages,
          hasMore: hasMore || page < totalPages,
        },
      },
    })
  } catch (error) {
    console.error('❌ product-match-queue GET:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
