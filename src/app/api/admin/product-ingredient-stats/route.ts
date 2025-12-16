import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Getting product-ingredient matching stats...')
    
    const supabase = createSupabaseServiceClient()
    
    // Count total products
    const { count: totalProducts, error: productsError } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .eq('available', true)

    if (productsError) {
      throw new Error(`Failed to count products: ${productsError.message}`)
    }

    // Count total ingredients
    const { count: totalIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })

    if (ingredientsError) {
      throw new Error(`Failed to count ingredients: ${ingredientsError.message}`)
    }

    // Check if product_ingredient_matches table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('product_ingredient_matches')
      .select('id')
      .limit(1)

    let matchedProducts = 0
    let totalMatches = 0

    if (!tableError && tableExists !== null) {
      // Count total matches
      const { count: totalMatchesCount, error: totalMatchesError } = await supabase
        .from('product_ingredient_matches')
        .select('id', { count: 'exact', head: true })

      if (!totalMatchesError) {
        totalMatches = totalMatchesCount || 0
      }

      // Count unique matched products using a proper SQL query
      const { data: matchedProductsData, error: matchedError } = await supabase
        .rpc('count_unique_matched_products')

      if (!matchedError && matchedProductsData !== null) {
        matchedProducts = matchedProductsData
      } else {
        // Fallback: count manually with pagination
        const allMatchedProducts = new Set()
        let offset = 0
        const limit = 1000
        let hasMore = true
        
        while (hasMore) {
          const { data: batch, error: batchError } = await supabase
            .from('product_ingredient_matches')
            .select('product_external_id')
            .range(offset, offset + limit - 1)
          
          if (batchError) {
            console.error('Error fetching matches batch:', batchError)
            break
          }
          
          if (batch && batch.length > 0) {
            batch.forEach(match => allMatchedProducts.add(match.product_external_id))
            offset += limit
            hasMore = batch.length === limit
          } else {
            hasMore = false
          }
        }
        
        matchedProducts = allMatchedProducts.size
      }
    }

    const unmatchedProducts = (totalProducts || 0) - matchedProducts
    const matchPercentage = totalProducts ? ((matchedProducts / totalProducts) * 100).toFixed(2) : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts: totalProducts || 0,
        totalIngredients: totalIngredients || 0,
        matchedProducts,
        unmatchedProducts,
        totalMatches,
        matchPercentage,
        tableExists: !tableError
      }
    })

  } catch (error) {
    console.error('❌ Error getting product-ingredient stats:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
