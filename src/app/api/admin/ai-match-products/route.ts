import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    console.log(`🤖 Starting AI matching - page ${page}, limit ${limit}`)

    const supabase = createSupabaseServiceClient()

    // Get unmatched products
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
        is_on_sale
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

    if (!products || products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No more products to match',
        data: {
          matches: [],
          pagination: { page, limit, total: 0, totalPages: 0, hasMore: false }
        }
      })
    }

    // Get all ingredients for matching
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('id, name, category')
      .order('name')

    if (ingredientsError) {
      throw new Error(`Failed to fetch ingredients: ${ingredientsError.message}`)
    }

    if (!ingredients || ingredients.length === 0) {
      throw new Error('No ingredients available for matching')
    }

    console.log(`🔍 Matching ${products.length} products against ${ingredients.length} ingredients`)

    // Simple keyword matching algorithm
    const matches = []
    
    for (const product of products) {
      const productMatches = []
      const productName = product.name.toLowerCase()
      const productCategory = product.category?.toLowerCase() || ''

      for (const ingredient of ingredients) {
        const ingredientName = ingredient.name.toLowerCase()
        const ingredientCategory = ingredient.category?.toLowerCase() || ''
        
        let confidence = 0
        let matchType = 'keyword'

        // Exact name match (highest confidence)
        if (productName === ingredientName) {
          confidence = 100
          matchType = 'exact'
        }
        // Contains match (high confidence) - but only if ingredient is a complete word
        else if (ingredientName.trim().length > 3) {
          const ingredientWord = ingredientName.trim()
          // Only match if ingredient is a complete word in product name
          const wordBoundaryRegex = new RegExp(`\\b${ingredientWord}\\b`, 'i')
          if (wordBoundaryRegex.test(productName)) {
            confidence = 80
            matchType = 'contains'
          }
        }
        // Category match (medium confidence)
        else if (productCategory === ingredientCategory && productCategory !== '') {
          confidence = 60
          matchType = 'category'
        }
        // Partial word match (lower confidence) - only for meaningful words
        else if (ingredientName.trim().length > 3) {
          const ingredientWord = ingredientName.trim()
          const wordBoundaryRegex = new RegExp(`\\b${ingredientWord}\\b`, 'i')
          if (wordBoundaryRegex.test(productName)) {
            confidence = 40
            matchType = 'partial'
          }
        }

        // Only add matches with confidence >= 40
        if (confidence >= 40) {
          productMatches.push({
            product_external_id: product.external_id,
            ingredient_id: ingredient.id,
            confidence,
            is_manual: false,
            match_type: matchType
          })
        }
      }

      // Sort by confidence and take top 3 matches per product
      productMatches.sort((a, b) => b.confidence - a.confidence)
      matches.push(...productMatches.slice(0, 3))
    }

    console.log(`🎯 Found ${matches.length} potential matches`)

    // Insert matches into database
    if (matches.length > 0) {
      const { error: insertError } = await supabase
        .from('product_ingredient_matches')
        .insert(matches)

      if (insertError) {
        console.error('❌ Failed to insert matches:', insertError)
        // Continue even if some inserts fail
      } else {
        console.log(`✅ Inserted ${matches.length} matches into database`)
      }
    }

    // Get total count for pagination
    const { count: totalUnmatched, error: countError } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .not('external_id', 'in', `(
        SELECT DISTINCT product_external_id 
        FROM product_ingredient_matches 
        WHERE product_external_id IS NOT NULL
      )`)

    const totalPages = totalUnmatched ? Math.ceil(totalUnmatched / limit) : 0
    const hasMore = page < totalPages

    return NextResponse.json({
      success: true,
      message: 'AI matching completed',
      data: {
        matches: matches.slice(0, 10), // Return first 10 for preview
        totalMatches: matches.length,
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
    console.error('❌ Error in AI matching:', error)
    return NextResponse.json({
      success: false,
      message: `AI matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
