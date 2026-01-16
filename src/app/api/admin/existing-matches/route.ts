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

    console.log(`🔍 Loading existing matches - page ${page}, limit ${limit}`)

    const supabase = createSupabaseServiceClient()

    // Get existing matches WITHOUT joins first (joins can fail if foreign keys don't match)
    // Load ALL matches (not paginated) since we need to show all for each ingredient
    console.log('🔍 Fetching all matches from product_ingredient_matches...')
    const { data: matches, error: matchesError } = await supabase
      .from('product_ingredient_matches')
      .select('*')
      .order('created_at', { ascending: false })

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError)
      throw new Error(`Failed to fetch matches: ${matchesError.message}`)
    }

    console.log(`📦 Found ${matches?.length || 0} raw matches in database`)

    // Transform data for frontend
    // Manually load product and ingredient data for each match
    const transformedMatches = await Promise.all((matches || []).map(async (match) => {
      // Load ingredient data
      let ingredientName = 'Unknown Ingredient'
      let ingredientCategory = 'Andre'
      
      try {
        const { data: ingredient, error: ingredientError } = await supabase
          .from('ingredients')
          .select('id, name, category')
          .eq('id', match.ingredient_id)
          .single()
        
        if (!ingredientError && ingredient) {
          ingredientName = ingredient.name || 'Unknown Ingredient'
          ingredientCategory = ingredient.category || 'Andre'
        }
      } catch (err) {
        console.warn(`⚠️ Could not load ingredient ${match.ingredient_id}:`, err)
      }
      
      // Load product data using standardized format
      let productName = 'Unknown Product'
      let productCategory = 'Andre'
      let productStore = 'Unknown Store'
      let productPrice = 0
      let productOriginalPrice: number | null = null
      let productIsOnSale = false
      
      console.log(`🔍 Loading product for match ${match.id}: product_external_id="${match.product_external_id}"`)

      // Strategy:
      // 1) Try old structure: supermarket_products.external_id === product_external_id
      // 2) Try new structure: product_offers.store_product_id === product_external_id
      try {
        const { data: products, error: productError } = await supabase
          .from('supermarket_products')
          .select('external_id, name, category, store, price, original_price, is_on_sale')
          .eq('external_id', match.product_external_id)
          .limit(1)

        if (!productError && products && products.length > 0) {
          const product = products[0]
          productName = product.name || 'Unknown Product'
          productCategory = product.category || 'Andre'
          productStore = product.store || 'Unknown Store'
          productPrice = product.price || 0
          productOriginalPrice = product.original_price
          productIsOnSale = product.is_on_sale || false
          console.log(`✅ Found product in supermarket_products: ${productName} (${productStore})`)
        }
      } catch (err) {
        console.warn(`⚠️ Exception loading supermarket_products product:`, err)
      }

      if (productName === 'Unknown Product') {
        try {
          const { data: offerRows, error: offerError } = await supabase
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
            .eq('store_product_id', match.product_external_id)
            .limit(1)

          if (offerError) {
            console.warn(`⚠️ Error loading product_offers:`, offerError.message)
          }

          if (!offerError && offerRows && offerRows.length > 0) {
            const offer = offerRows[0]
            const prod = Array.isArray(offer.products) ? offer.products[0] : offer.products

            const storeDisplay = databaseService['mapStoreIdToDisplayName']
              ? // @ts-ignore internal helper
                databaseService['mapStoreIdToDisplayName'](offer.store_id)
              : offer.store_id

            productName = offer.name_store || prod?.name_generic || 'Unknown Product'
            productCategory = prod?.category || prod?.department || 'Andre'
            productStore = storeDisplay || 'Unknown Store'
            productPrice = offer.current_price || 0
            productOriginalPrice = offer.normal_price
            productIsOnSale = offer.is_on_sale || false
            console.log(`✅ Found product in product_offers: ${productName} (${productStore})`)
          }
        } catch (err) {
          console.warn(`⚠️ Exception loading product_offers product:`, err)
        }
      }
      
      // If still unknown, log it for debugging
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
        ingredient_name: ingredientName,
        ingredient_category: ingredientCategory
      }
    }))

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
