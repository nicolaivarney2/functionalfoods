import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

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

    // Get existing matches with ingredient and product details
    const { data: matches, error: matchesError } = await supabase
      .from('product_ingredient_matches')
      .select(`
        id,
        product_external_id,
        ingredient_id,
        confidence,
        is_manual,
        match_type,
        created_at,
        updated_at,
        supermarket_products!inner(
          external_id,
          name,
          category,
          store,
          price,
          original_price,
          is_on_sale
        ),
        ingredients!inner(
          id,
          name,
          category
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (matchesError) {
      throw new Error(`Failed to fetch matches: ${matchesError.message}`)
    }

    // Get total count
    const { count: totalMatches, error: countError } = await supabase
      .from('product_ingredient_matches')
      .select('id', { count: 'exact', head: true })

    if (countError) {
      console.warn('⚠️ Could not get total count:', countError.message)
    }

    const totalPages = totalMatches ? Math.ceil(totalMatches / limit) : 0
    const hasMore = page < totalPages

    // Transform data for frontend
    const transformedMatches = matches?.map(match => ({
      id: match.id,
      product_external_id: match.product_external_id,
      ingredient_id: match.ingredient_id,
      confidence: match.confidence,
      is_manual: match.is_manual,
      match_type: match.match_type,
      created_at: match.created_at,
      updated_at: match.updated_at,
      product_name: match.supermarket_products[0]?.name,
      product_category: match.supermarket_products[0]?.category,
      product_store: match.supermarket_products[0]?.store,
      product_price: match.supermarket_products[0]?.price,
      product_original_price: match.supermarket_products[0]?.original_price,
      product_is_on_sale: match.supermarket_products[0]?.is_on_sale,
      ingredient_name: match.ingredients[0]?.name,
      ingredient_category: match.ingredients[0]?.category
    })) || []

    console.log(`✅ Loaded ${transformedMatches.length} existing matches`)

    return NextResponse.json({
      success: true,
      message: 'Existing matches loaded',
      matches: transformedMatches,
      pagination: {
        page,
        limit,
        total: totalMatches || 0,
        totalPages,
        hasMore
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
