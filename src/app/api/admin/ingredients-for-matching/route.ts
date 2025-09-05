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

    console.log(`🧄 Loading ingredients for matching - page ${page}, limit ${limit}`)

    const supabase = createSupabaseServiceClient()

    // Get all ingredients
    const { data: ingredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select(`
        id,
        name,
        category,
        created_at,
        updated_at
      `)
      .order('name')
      .range(offset, offset + limit - 1)

    if (ingredientsError) {
      throw new Error(`Failed to fetch ingredients: ${ingredientsError.message}`)
    }

    // Get total count of ingredients
    const { count: totalIngredients, error: countError } = await supabase
      .from('ingredients')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.warn('⚠️ Could not get total count:', countError.message)
    }

    const totalPages = totalIngredients ? Math.ceil(totalIngredients / limit) : 0
    const hasMore = page < totalPages

    console.log(`✅ Loaded ${ingredients?.length || 0} ingredients for matching`)

    return NextResponse.json({
      success: true,
      message: 'Ingredients loaded for matching',
      data: {
        ingredients: ingredients || [],
        pagination: {
          page,
          limit,
          total: totalIngredients || 0,
          totalPages,
          hasMore
        }
      }
    })

  } catch (error) {
    console.error('❌ Error loading ingredients for matching:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to load ingredients: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
