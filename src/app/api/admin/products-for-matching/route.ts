import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { databaseService } from '@/lib/database-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || ''
    const ingredientId = searchParams.get('ingredient_id') || ''

    console.log(`📦 Loading products for matching - page ${page}, limit ${limit}, search: "${search}"`)

    const supabase = createSupabaseServiceClient()

    // Get existing matches for THIS ingredient only (so already-selected products don't show in dropdown)
    let matchQuery = supabase
      .from('product_ingredient_matches')
      .select('product_external_id')

    if (ingredientId) {
      matchQuery = matchQuery.eq('ingredient_id', ingredientId)
    }

    const { data: existingMatches } = await matchQuery
    
    const matchedIds = new Set(existingMatches?.map(m => m.product_external_id) || [])
    console.log(
      `📋 Found ${matchedIds.size} already matched products to exclude${ingredientId ? ` for ingredient_id=${ingredientId}` : ''}`
    )

    // We only support search-based loading here (UI already enforces min 2 chars).
    // This avoids Supabase's 1000-row cap and keeps the endpoint fast.
    if (!search || search.trim().length < 2) {
      return NextResponse.json({
        success: true,
        message: 'Search term too short',
        data: {
          products: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
        }
      })
    }

    const term = search.trim()
    const now = new Date().toISOString()

    // 1) Old structure search (supermarket_products)
    const { data: oldProducts, error: oldProductsError } = await supabase
      .from('supermarket_products')
      .select('external_id, name, category, store, source, price, original_price, is_on_sale, last_updated')
      .or(`name.ilike.%${term}%,category.ilike.%${term}%,store.ilike.%${term}%`)
      .order('name')
      .limit(300)

    if (oldProductsError) {
      console.warn('⚠️ Error loading old products:', oldProductsError.message)
    }

    const transformedOldProducts = (oldProducts || [])
      .filter((p: any) => p?.external_id && !matchedIds.has(p.external_id))
      .map((p: any) => ({
        external_id: p.external_id,
        name: p.name,
        category: p.category || 'Andre',
        store: p.store || 'REMA 1000',
        source: p.source || 'supermarket_products',
        price: p.price,
        original_price: p.original_price,
        is_on_sale: !!p.is_on_sale,
        last_updated: p.last_updated
      }))

    // 2) New structure search:
    // The grocery catalog per store lives in product_offers (name is confusing), joined with products (global attrs).
    // We find matching product_ids from:
    // - product_offers.name_store
    // - products.name_generic / brand / category / department / subcategory
    const nameQuery = supabase
      .from('product_offers')
      .select('product_id')
      .eq('is_available', true)
      .or(`name_store.ilike.%${term}%`)
      .limit(1000)

    const productsQuery = supabase
      .from('products')
      .select('id')
      .or(
        `department.ilike.%${term}%,category.ilike.%${term}%,subcategory.ilike.%${term}%,name_generic.ilike.%${term}%,brand.ilike.%${term}%`
      )
      .limit(1000)

    const [{ data: nameMatches, error: nameErr }, { data: productMatches, error: prodErr }] =
      await Promise.all([nameQuery, productsQuery])

    if (nameErr) console.warn('⚠️ Error searching product_offers by name_store:', nameErr.message)
    if (prodErr) console.warn('⚠️ Error searching products table:', prodErr.message)

    const matchingProductIds = new Set<string>()
    ;(nameMatches || []).forEach((m: any) => m?.product_id && matchingProductIds.add(String(m.product_id)))
    ;(productMatches || []).forEach((m: any) => m?.id && matchingProductIds.add(String(m.id)))

    const productIds = Array.from(matchingProductIds)
    let transformedNewProducts: any[] = []

    if (productIds.length > 0) {
      // Pull store-specific rows from product_offers for these product_ids.
      // We don't filter is_on_sale here — we want ALL items.
      const { data: offerRows, error: offersError } = await supabase
        .from('product_offers')
        .select(
          `
          product_id,
          store_id,
          store_product_id,
          name_store,
          current_price,
          normal_price,
          is_on_sale,
          discount_percentage,
          is_available,
          sale_valid_to,
          products:product_id!inner (
            name_generic,
            brand,
            category,
            subcategory,
            department,
            unit,
            amount
          )
        `,
          { count: 'exact' }
        )
        .eq('is_available', true)
        .in('product_id', productIds)
        // Filter out expired offer-rows (some stores keep stale rows)
        .or('sale_valid_to.is.null,sale_valid_to.gte.' + now)
        .order('is_on_sale', { ascending: false })
        .order('discount_percentage', { ascending: false, nullsFirst: false })
        .order('current_price', { ascending: true })
        .range(offset, offset + limit - 1)

      if (offersError) {
        console.warn('⚠️ Error loading product_offers:', offersError.message)
      } else {
        const map = new Map<string, any>()
        ;(offerRows || []).forEach((row: any) => {
          const p = Array.isArray(row.products) ? row.products[0] : row.products
          const external_id = row.store_product_id || null
          if (!external_id) return
          if (matchedIds.has(external_id)) return
          if (map.has(external_id)) return

          const storeDisplay = databaseService['mapStoreIdToDisplayName']
            ? // @ts-ignore internal helper
              databaseService['mapStoreIdToDisplayName'](row.store_id)
            : row.store_id

          map.set(external_id, {
            external_id,
            name: row.name_store || p?.name_generic,
            category: p?.category || p?.department || 'Andre',
            store: storeDisplay,
            source: 'product_offers',
            price: row.current_price,
            original_price: row.normal_price,
            is_on_sale: !!row.is_on_sale,
            last_updated: null
          })
        })

        transformedNewProducts = Array.from(map.values())
      }
    }

    // Combine and return (old + new)
    const allProducts = [...transformedOldProducts, ...transformedNewProducts]
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))

    // For search we already applied range() on new structure, but old structure is merged in.
    // Keep paging simple: slice final combined list.
    const paginatedProducts = allProducts.slice(0, limit)

    return NextResponse.json({
      success: true,
      message: 'Products loaded for matching',
      data: {
        products: paginatedProducts,
        pagination: {
          page: 1,
          limit,
          total: allProducts.length,
          totalPages: 1,
          hasMore: false
        }
      }
    })

  } catch (error) {
    console.error('❌ Error loading products for matching:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to load products: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
