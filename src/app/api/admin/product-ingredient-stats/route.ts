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
      .eq('is_active', true)

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
      // Count matched products (products that have at least one ingredient match)
      const { data: matchedData, error: matchedError } = await supabase
        .from('product_ingredient_matches')
        .select('product_external_id')
        .limit(1000) // Handle 1000 limit

      if (!matchedError && matchedData) {
        const uniqueMatchedProducts = new Set(matchedData.map(match => match.product_external_id))
        matchedProducts = uniqueMatchedProducts.size
        totalMatches = matchedData.length
      }
    }

    const unmatchedProducts = (totalProducts || 0) - matchedProducts
    const matchPercentage = totalProducts ? Math.round((matchedProducts / totalProducts) * 100) : 0

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
