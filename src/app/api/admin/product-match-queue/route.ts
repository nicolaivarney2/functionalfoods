import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { FOODDATA_STORE_IDS, isFooddataStoreId, mapStoreIdToDisplayName } from '@/lib/fooddata-stores'
import { isFoodCatalogProduct } from '@/lib/product-food-classification'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

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

    const supabase = createSupabaseServiceClient()

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
      throw countErr
    }

    const total = totalCount ?? 0

    if (countOnly) {
      return NextResponse.json({
        success: true,
        data: { count: total, queueTableMissing: false },
      })
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    let listQuery = supabase
      .from('product_ingredient_match_queue')
      .select(
        `
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
      )
      .eq('status', 'pending')
      .in('store_id', [...FOODDATA_STORE_IDS])
      .order('queued_at', { ascending: true })
      .range(from, to)

    if (storeFilter && isFooddataStoreId(storeFilter)) {
      listQuery = listQuery.eq('store_id', storeFilter)
    }

    const { data: queueRows, error: qErr } = await listQuery
    if (qErr) throw qErr

    const rows = queueRows || []
    const productIds = [...new Set(rows.map((r) => r.product_id).filter(Boolean))]

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

    let items = rows
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
          name_generic: p?.name_generic ?? r.product_name_snapshot,
          brand: p?.brand ?? null,
          category: p?.category ?? null,
          department: p?.department ?? null,
          subcategory: p?.subcategory ?? null,
          queued_at: r.queued_at,
          current_price: offer?.current_price ?? null,
          normal_price: offer?.normal_price ?? null,
          name_store: offer?.name_store ?? null,
        }
      })
      .filter((item) =>
        isFoodCatalogProduct({
          department: item.department,
          category: item.category,
          subcategory: item.subcategory,
          name: item.name_store || item.name_generic || item.product_name_snapshot,
        })
      )

    if (search.length >= 2) {
      items = items.filter((item) => {
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

    const totalPages = Math.ceil(total / limit) || 0

    return NextResponse.json({
      success: true,
      data: {
        items,
        count: items.length,
        totalPending: total,
        queueTableMissing: false,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages,
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
