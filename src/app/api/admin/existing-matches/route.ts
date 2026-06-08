import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { mapStoreIdToDisplayName } from '@/lib/fooddata-stores'
import { snapshotToResolvedProduct } from '@/lib/product-match-snapshots'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ResolvedProduct = {
  name: string
  category: string
  store: string
  price: number
  originalPrice: number | null
  isOnSale: boolean
}

function mapStoreId(storeId: string | null | undefined): string {
  return mapStoreIdToDisplayName(storeId)
}

/** Prefer offer whose store matches chain-prefix in product id (e.g. bilka-104327). */
function preferredStoreFromProductId(productId: string): string | null {
  const dash = productId.indexOf('-')
  if (dash <= 0) return null
  return productId.slice(0, dash).toLowerCase()
}

function pickBestOffer(
  offers: Array<{
    store_id: string
    store_product_id: string | null
    name_store: string | null
    current_price: number | null
    normal_price: number | null
    is_on_sale: boolean | null
    products?: { name_generic?: string; category?: string; department?: string } | Array<{
      name_generic?: string
      category?: string
      department?: string
    }>
  }>,
  matchExternalId: string
): ResolvedProduct | null {
  if (!offers.length) return null

  const preferredStore = preferredStoreFromProductId(matchExternalId)
  const sorted = [...offers].sort((a, b) => {
    const score = (o: typeof a) => {
      let s = 0
      if (o.store_product_id === matchExternalId) s += 1000
      if (preferredStore && String(o.store_id).toLowerCase() === preferredStore) s += 500
      if (o.is_on_sale) s += 50
      return s
    }
    return score(b) - score(a)
  })

  const offer = sorted[0]
  const prod = Array.isArray(offer.products) ? offer.products[0] : offer.products
  return {
    name: offer.name_store || prod?.name_generic || 'Unknown Product',
    category: prod?.category || prod?.department || 'Andre',
    store: mapStoreId(offer.store_id),
    price: offer.current_price || 0,
    originalPrice: offer.normal_price,
    isOnSale: !!offer.is_on_sale
  }
}

function productRowToResolved(
  row: {
    name_generic: string
    category?: string | null
    department?: string | null
    brand?: string | null
  },
  store = 'Katalog'
): ResolvedProduct {
  return {
    name: row.name_generic,
    category: row.category || row.department || 'Andre',
    store,
    price: 0,
    originalPrice: null,
    isOnSale: false
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    // const offset = (page - 1) * limit // Not used

    console.log(`🔍 Loading existing matches - page ${page}, limit ${limit}`)

    const supabase = createSupabaseServiceClient()

    // Get existing matches WITHOUT joins first (joins can fail if foreign keys don't match)
    // Supabase/PostgREST defaults to 1000 rows, so we fetch in batches.
    console.log('🔍 Fetching all matches from product_ingredient_matches...')
    const allMatches: any[] = []
    const batchSize = 1000
    let offset = 0

    while (true) {
      const { data: batch, error: matchesError } = await supabase
        .from('product_ingredient_matches')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + batchSize - 1)

      if (matchesError) {
        console.error('❌ Error fetching matches:', matchesError)
        throw new Error(`Failed to fetch matches: ${matchesError.message}`)
      }

      if (!batch || batch.length === 0) {
        break
      }

      allMatches.push(...batch)
      offset += batchSize

      if (batch.length < batchSize) {
        break
      }
    }

    const matches = allMatches
    console.log(`📦 Found ${matches.length} raw matches in database`)

    const chunk = <T,>(items: T[], size: number) => {
      const chunks: T[][] = []
      for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size))
      }
      return chunks
    }

    const ingredientIds = Array.from(new Set((matches || []).map(m => m.ingredient_id).filter(Boolean)))
    const productExternalIds = Array.from(new Set((matches || []).map(m => m.product_external_id).filter(Boolean)))

    const ingredientMap = new Map<string, { name: string; category: string }>()
    for (const ids of chunk(ingredientIds, 500)) {
      const { data: ingredients, error } = await supabase
        .from('ingredients')
        .select('id, name, category')
        .in('id', ids)
      if (error) {
        console.warn('⚠️ Error loading ingredients batch:', error.message)
        continue
      }
      for (const ing of ingredients || []) {
        ingredientMap.set(String(ing.id), {
          name: ing.name || 'Unknown Ingredient',
          category: ing.category || 'Andre'
        })
      }
    }

    const supermarketProductMap = new Map<string, ResolvedProduct>()

    for (const ids of chunk(productExternalIds, 500)) {
      const { data: products, error } = await supabase
        .from('supermarket_products')
        .select('external_id, name, category, store, price, original_price, is_on_sale')
        .in('external_id', ids)
      if (error) {
        console.warn('⚠️ Error loading supermarket_products batch:', error.message)
        continue
      }
      for (const product of products || []) {
        supermarketProductMap.set(String(product.external_id), {
          name: product.name || 'Unknown Product',
          category: product.category || 'Andre',
          store: product.store || 'Unknown Store',
          price: product.price || 0,
          originalPrice: product.original_price,
          isOnSale: product.is_on_sale || false
        })
      }
    }

    const offerByStoreProductId = new Map<string, ResolvedProduct>()

    for (const ids of chunk(productExternalIds, 200)) {
      const { data: offers, error } = await supabase
        .from('product_offers')
        .select(
          `
          store_product_id,
          store_id,
          name_store,
          current_price,
          normal_price,
          is_on_sale,
          products:product_id (
            name_generic,
            category,
            department
          )
        `
        )
        .in('store_product_id', ids)
      if (error) {
        console.warn('⚠️ Error loading product_offers by store_product_id:', error.message)
        continue
      }
      for (const offer of offers || []) {
        if (!offer.store_product_id) continue
        const resolved = pickBestOffer([offer], String(offer.store_product_id))
        if (resolved) {
          offerByStoreProductId.set(String(offer.store_product_id), resolved)
        }
      }
    }

    // New fooddata catalog: products.id often equals match product_external_id (e.g. bilka-110606)
    const catalogProductMap = new Map<string, ResolvedProduct>()
    const catalogProductIds: string[] = []

    for (const ids of chunk(productExternalIds, 500)) {
      const { data: catalogRows, error } = await supabase
        .from('products')
        .select('id, name_generic, brand, category, department, metadata')
        .in('id', ids)
      if (error) {
        console.warn('⚠️ Error loading products catalog batch:', error.message)
        continue
      }
      for (const row of catalogRows || []) {
        const id = String(row.id)
        catalogProductIds.push(id)
        const chainStore = preferredStoreFromProductId(id)
        catalogProductMap.set(
          id,
          productRowToResolved(row, chainStore ? mapStoreId(chainStore) : 'Katalog')
        )
      }
    }

    // Enrich catalog hits with live prices from product_offers
    const offerRowsByProductId = new Map<string, any[]>()

    for (const ids of chunk(catalogProductIds, 150)) {
      const { data: offers, error } = await supabase
        .from('product_offers')
        .select(
          `
          product_id,
          store_product_id,
          store_id,
          name_store,
          current_price,
          normal_price,
          is_on_sale,
          products:product_id (
            name_generic,
            category,
            department
          )
        `
        )
        .in('product_id', ids)
      if (error) {
        console.warn('⚠️ Error loading product_offers by product_id:', error.message)
        continue
      }
      for (const offer of offers || []) {
        const pid = String(offer.product_id)
        const list = offerRowsByProductId.get(pid) || []
        list.push(offer)
        offerRowsByProductId.set(pid, list)
      }
    }

    for (const externalId of catalogProductIds) {
      const offerList = offerRowsByProductId.get(externalId)
      if (!offerList?.length) continue
      const resolved = pickBestOffer(offerList, externalId)
      if (resolved) catalogProductMap.set(externalId, resolved)
    }

    // Legacy FF ids stored in products.metadata.goma_store_product_id
    const unresolvedForMetadata = productExternalIds.filter(
      (id) =>
        !supermarketProductMap.has(id) &&
        !offerByStoreProductId.has(id) &&
        !catalogProductMap.has(id)
    )

    for (const ids of chunk(unresolvedForMetadata, 40)) {
      const orFilter = ids
        .map((id) => `metadata->>goma_store_product_id.eq.${id}`)
        .join(',')
      if (!orFilter) continue

      const { data: linked, error } = await supabase
        .from('products')
        .select('id, name_generic, brand, category, department, metadata')
        .or(orFilter)
      if (error) {
        console.warn('⚠️ Error loading products by goma_store_product_id:', error.message)
        continue
      }

      const linkedIds: string[] = []
      for (const row of linked || []) {
        const legacyId = row.metadata?.goma_store_product_id
        if (!legacyId || catalogProductMap.has(String(legacyId))) continue
        linkedIds.push(String(row.id))
        const chainStore = preferredStoreFromProductId(String(row.id))
        catalogProductMap.set(
          String(legacyId),
          productRowToResolved(row, chainStore ? mapStoreId(chainStore) : 'Katalog')
        )
      }

      for (const ids2 of chunk(linkedIds, 150)) {
        const { data: offers, error: offerErr } = await supabase
          .from('product_offers')
          .select(
            `
            product_id,
            store_product_id,
            store_id,
            name_store,
            current_price,
            normal_price,
            is_on_sale,
            products:product_id (
              name_generic,
              category,
              department
            )
          `
          )
          .in('product_id', ids2)
        if (offerErr) continue

        const byPid = new Map<string, any[]>()
        for (const offer of offers || []) {
          const pid = String(offer.product_id)
          const list = byPid.get(pid) || []
          list.push(offer)
          byPid.set(pid, list)
        }

        for (const row of linked || []) {
          const legacyId = String(row.metadata?.goma_store_product_id || '')
          const offerList = byPid.get(String(row.id))
          if (!legacyId || !offerList?.length) continue
          const resolved = pickBestOffer(offerList, legacyId)
          if (resolved) catalogProductMap.set(legacyId, resolved)
        }
      }
    }

    const transformedMatches = (matches || []).map((match) => {
      const ingredient = ingredientMap.get(String(match.ingredient_id)) || {
        name: 'Unknown Ingredient',
        category: 'Andre'
      }

      const externalId = String(match.product_external_id)
      const supermarketProduct = supermarketProductMap.get(externalId)
      const offerProduct = offerByStoreProductId.get(externalId)
      const catalogProduct = catalogProductMap.get(externalId)
      // Prefer fooddata catalog (products.id) over legacy store_product_id hits on raw numeric ids
      let product = catalogProduct || supermarketProduct || offerProduct
      if (!product) {
        product =
          snapshotToResolvedProduct(
            {
              product_name_snapshot: match.product_name_snapshot,
              product_store_snapshot: match.product_store_snapshot,
              last_known_price: match.last_known_price,
            },
            ingredient.category,
          ) ?? undefined
      }

      const productName = product?.name || 'Unknown Product'
      const productCategory = product?.category || 'Andre'
      const productStore = product?.store || 'Unknown Store'
      const productPrice = product?.price || 0
      const productOriginalPrice = product?.originalPrice ?? null
      const productIsOnSale = product?.isOnSale || false

      if (productName === 'Unknown Product') {
        console.error(`❌ Could not find product for match ${match.id} with product_external_id: ${match.product_external_id}`)
      }

      return {
        id: match.id,
        product_external_id: match.product_external_id,
        ingredient_id: match.ingredient_id,
        confidence: match.confidence,
        is_manual: match.is_manual,
        match_type: match.match_type,
        created_at: match.created_at,
        updated_at: match.updated_at,
        product_name: productName,
        product_category: productCategory,
        product_store: productStore,
        product_price: productPrice,
        product_original_price: productOriginalPrice,
        product_is_on_sale: productIsOnSale,
        ingredient_name: ingredient.name,
        ingredient_category: ingredient.category
      }
    })

    const unknownCount = transformedMatches.filter(m => m.product_name === 'Unknown Product').length
    const resolvedCount = transformedMatches.length - unknownCount
    console.log(
      `✅ Loaded ${transformedMatches.length} matches — ${resolvedCount} resolved, ${unknownCount} unknown`
    )
    if (unknownCount > 0) {
      const unknownIds = transformedMatches
        .filter(m => m.product_name === 'Unknown Product')
        .map(m => m.product_external_id)
      console.warn(`⚠️ Sample unknown product_external_ids:`, unknownIds.slice(0, 10))
    }

    return NextResponse.json({
      success: true,
      message: 'Existing matches loaded',
      matches: transformedMatches,
      stats: {
        total: transformedMatches.length,
        resolvedProducts: resolvedCount,
        unknownProducts: unknownCount
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ Error loading existing matches:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to load matches: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
