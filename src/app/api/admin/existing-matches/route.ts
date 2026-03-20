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

    const supermarketProductMap = new Map<string, {
      name: string
      category: string
      store: string
      price: number
      originalPrice: number | null
      isOnSale: boolean
    }>()

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

    const offerProductMap = new Map<string, {
      name: string
      category: string
      store: string
      price: number
      originalPrice: number | null
      isOnSale: boolean
    }>()

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
        console.warn('⚠️ Error loading product_offers batch:', error.message)
        continue
      }
      for (const offer of offers || []) {
        const prod = Array.isArray(offer.products) ? offer.products[0] : offer.products
        const storeDisplay = databaseService['mapStoreIdToDisplayName']
          ? // @ts-ignore internal helper
            databaseService['mapStoreIdToDisplayName'](offer.store_id)
          : offer.store_id
        offerProductMap.set(String(offer.store_product_id), {
          name: offer.name_store || prod?.name_generic || 'Unknown Product',
          category: prod?.category || prod?.department || 'Andre',
          store: storeDisplay || 'Unknown Store',
          price: offer.current_price || 0,
          originalPrice: offer.normal_price,
          isOnSale: offer.is_on_sale || false
        })
      }
    }

    const transformedMatches = (matches || []).map((match) => {
      const ingredient = ingredientMap.get(String(match.ingredient_id)) || {
        name: 'Unknown Ingredient',
        category: 'Andre'
      }

      const supermarketProduct = supermarketProductMap.get(String(match.product_external_id))
      const offerProduct = offerProductMap.get(String(match.product_external_id))
      const product = supermarketProduct || offerProduct

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

    // Count how many matches have unknown products
    const unknownCount = transformedMatches.filter(m => m.product_name === 'Unknown Product').length
    if (unknownCount > 0) {
      console.warn(`⚠️ ${unknownCount} out of ${transformedMatches.length} matches have unknown products`)
      const unknownIds = transformedMatches
        .filter(m => m.product_name === 'Unknown Product')
        .map(m => m.product_external_id)
      console.warn(`⚠️ Unknown product_external_ids:`, unknownIds.slice(0, 10)) // Show first 10
    }
    
    console.log(`✅ Loaded ${transformedMatches.length} existing matches`)

    return NextResponse.json({
      success: true,
      message: 'Existing matches loaded',
      matches: transformedMatches,
      stats: {
        total: transformedMatches.length,
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
