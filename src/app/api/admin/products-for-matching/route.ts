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
    const buildSearchVariants = (value: string) => {
      const variants = new Set<string>()
      const lower = value.toLowerCase()
      variants.add(lower)

      const ascii = lower
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'oe')
        .replace(/å/g, 'aa')
      variants.add(ascii)

      if (!/[æøå]/.test(lower)) {
        const accented = lower
          .replace(/aa/g, 'å')
          .replace(/ae/g, 'æ')
          .replace(/oe/g, 'ø')
        variants.add(accented)
      }

      return Array.from(variants).filter(Boolean)
    }

    const termVariants = buildSearchVariants(term)
    const normalizeForSearch = (value: string) =>
      value
        .toLowerCase()
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'oe')
        .replace(/å/g, 'aa')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const queryTokens = normalizeForSearch(term).split(' ').filter(Boolean)
    const rawTokens = termVariants.flatMap((v) => v.toLowerCase().split(/\s+/).filter(Boolean))
    const normalizedTokens = termVariants.flatMap((v) => normalizeForSearch(v).split(' ').filter(Boolean))
    const searchTermsForFilters = Array.from(new Set([...termVariants, ...rawTokens, ...normalizedTokens, ...queryTokens]))
      .map((t) => t.replace(/[(),]/g, ' ').trim())
      .filter((t) => t.length >= 2)

    const scoreProductRelevance = (product: {
      name?: string
      category?: string
      store?: string
      is_on_sale?: boolean
    }) => {
      const nameNorm = normalizeForSearch(product.name || '')
      const categoryNorm = normalizeForSearch(product.category || '')
      const storeNorm = normalizeForSearch(product.store || '')

      let score = 0

      // Strong signal: exact/prefix in product name
      if (nameNorm === normalizeForSearch(term)) score += 1200
      if (nameNorm.startsWith(normalizeForSearch(term))) score += 900
      if (nameNorm.includes(normalizeForSearch(term))) score += 700

      // Token-based matching (best for partial and multi-word queries)
      let tokenHits = 0
      for (const t of queryTokens) {
        if (nameNorm.includes(t)) {
          score += 220
          tokenHits++
        } else if (categoryNorm.includes(t) || storeNorm.includes(t)) {
          score += 80
        }
      }
      if (queryTokens.length > 1 && tokenHits === queryTokens.length) {
        score += 250
      }

      // Slight boost to sale products when relevance is similar
      if (product.is_on_sale) score += 20

      return score
    }
    const buildOrQuery = (fields: string[], terms: string[]) =>
      fields.flatMap((field) => terms.map((t) => `${field}.ilike.%${t}%`)).join(',')

    const mapOfferRows = (offerRows: any[]) => {
      const map = new Map<string, any>()
      offerRows.forEach((row: any) => {
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

      return Array.from(map.values())
    }
    // 1) Old structure search (supermarket_products)
    const oldOrQuery = buildOrQuery(['name', 'category', 'store'], searchTermsForFilters)
    const { data: oldProducts, error: oldProductsError } = await supabase
      .from('supermarket_products')
      .select('external_id, name, category, store, source, price, original_price, is_on_sale, last_updated')
      .or(oldOrQuery)
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
    const nameOrQuery = buildOrQuery(['name_store'], searchTermsForFilters)
    const nameQuery = supabase
      .from('product_offers')
      .select('product_id')
      .eq('is_available', true)
      .or(nameOrQuery)
      .limit(1000)

    const productsOrQuery = buildOrQuery(
      ['department', 'category', 'subcategory', 'name_generic', 'brand'],
      searchTermsForFilters
    )
    const productsQuery = supabase
      .from('products')
      .select('id')
      .or(productsOrQuery)
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
      // Avoid oversized .in(...) requests by chunking product_ids.
      const MAX_PRODUCT_IDS_TO_FETCH = 1200
      const PRODUCT_ID_CHUNK_SIZE = 150
      const prioritizedProductIds = productIds.slice(0, MAX_PRODUCT_IDS_TO_FETCH)
      if (productIds.length > MAX_PRODUCT_IDS_TO_FETCH) {
        console.log(
          `⚠️ Too many matching product ids (${productIds.length}), limiting to ${MAX_PRODUCT_IDS_TO_FETCH}`
        )
      }

      const allOfferRows: any[] = []
      for (let i = 0; i < prioritizedProductIds.length; i += PRODUCT_ID_CHUNK_SIZE) {
        const chunk = prioritizedProductIds.slice(i, i + PRODUCT_ID_CHUNK_SIZE)
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
          `
          )
          .eq('is_available', true)
          .in('product_id', chunk)
          // IMPORTANT: for matching we need all available products,
          // not only rows with non-expired sale_valid_to.
          .order('is_on_sale', { ascending: false })
          .order('discount_percentage', { ascending: false, nullsFirst: false })
          .order('current_price', { ascending: true })
          .limit(1000)

        if (offersError) {
          console.warn(
            `⚠️ Error loading product_offers chunk ${Math.floor(i / PRODUCT_ID_CHUNK_SIZE) + 1}:`,
            offersError.message
          )
          continue
        }
        if (offerRows?.length) {
          allOfferRows.push(...offerRows)
        }
      }

      transformedNewProducts = mapOfferRows(allOfferRows)
    }
    
    // Fallback: if product-id strategy yielded no rows, search directly in product_offers.name_store.
    if (transformedNewProducts.length === 0) {
      const fallbackOrQuery = buildOrQuery(
        ['name_store'],
        searchTermsForFilters
      )
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
        .or(fallbackOrQuery)
        .order('is_on_sale', { ascending: false })
        .order('discount_percentage', { ascending: false, nullsFirst: false })
        .order('current_price', { ascending: true })
        .limit(1000)

      if (offersError) {
        console.warn('⚠️ Error loading fallback product_offers:', offersError.message)
      } else {
        transformedNewProducts = mapOfferRows(offerRows || [])
      }
    }

    // Prefer the new per-store catalog results. Fall back to old structure only when needed.
    // This avoids stale/noisy "supermarket_products" rows drowning out correct store-specific matches.
    const preferredProducts =
      transformedNewProducts.length > 0 ? transformedNewProducts : transformedOldProducts

    // Dedupe by external_id
    const byExternalId = new Map<string, any>()
    for (const p of preferredProducts) {
      const key = String(p.external_id || '')
      if (!key) continue
      const existing = byExternalId.get(key)
      if (!existing) {
        byExternalId.set(key, p)
        continue
      }
      // Prefer on-sale row for same external_id
      if (!existing.is_on_sale && p.is_on_sale) {
        byExternalId.set(key, p)
      }
    }

    const allProducts = Array.from(byExternalId.values())
      .map((p) => ({ ...p, _score: scoreProductRelevance(p) }))
      .sort((a, b) => {
        // Primary: relevance score
        if (b._score !== a._score) return b._score - a._score
        // Secondary: offers first
        if (!!a.is_on_sale !== !!b.is_on_sale) return a.is_on_sale ? -1 : 1
        // Tertiary: higher discount first (if available)
        const aDiscount = Number(a.discount_percentage || 0)
        const bDiscount = Number(b.discount_percentage || 0)
        if (bDiscount !== aDiscount) return bDiscount - aDiscount
        // Then lower price and finally name
        const aPrice = Number(a.price || 0)
        const bPrice = Number(b.price || 0)
        if (aPrice !== bPrice) return aPrice - bPrice
        return String(a.name || '').localeCompare(String(b.name || ''))
      })

    const topRankedPreview = allProducts.slice(0, 10).map((p) => ({
      external_id: p.external_id,
      name: p.name,
      store: p.store,
      category: p.category,
      score: p._score
    }))

    console.log(
      `🔎 Top ranked products for "${term}" (${preferredProducts === transformedNewProducts ? 'product_offers' : 'supermarket_products'}):`,
      topRankedPreview
    )

    const paginatedProducts = allProducts.slice(0, limit).map(({ _score, ...rest }) => rest)

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
