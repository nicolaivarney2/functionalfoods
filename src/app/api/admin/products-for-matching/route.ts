import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) 
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = (page - 1) * limit

    console.log(`📦 Loading products for matching - page ${page}, limit ${limit}`)

    const supabase = createSupabaseServiceClient()

    // Get products that are NOT already matched
    const { data: products, error: productsError } = await supabase
      .from('supermarket_products')
      .select(`
        external_id,
        name,
        category,
        store,
        source,
        price,
        original_price,
        is_on_sale,
        last_updated
      `)
      .not('external_id', 'in', `(
        SELECT DISTINCT product_external_id 
        FROM product_ingredient_matches 
        WHERE product_external_id IS NOT NULL
      )`)
      .order('name')
      .range(offset, offset + limit - 1)

    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`)
    }

    // Get total count of unmatched products
    const { count: totalUnmatched, error: countError } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .not('external_id', 'in', `(
        SELECT DISTINCT product_external_id 
        FROM product_ingredient_matches 
        WHERE product_external_id IS NOT NULL
      )`)

    if (countError) {
      console.warn('⚠️ Could not get total count:', countError.message)
    }

    const totalPages = totalUnmatched ? Math.ceil(totalUnmatched / limit) : 0
    const hasMore = page < totalPages

    console.log(`✅ Loaded ${products?.length || 0} products for matching`)

    return NextResponse.json({
      success: true,
      message: 'Products loaded for matching',
      data: {
        products: products || [],
        pagination: {
          page,
          limit,
          total: totalUnmatched || 0,
          totalPages,
          hasMore
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
