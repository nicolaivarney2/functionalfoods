import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const sort = (searchParams.get('sort') || 'name').toLowerCase()
    const offset = (page - 1) * limit

    console.log(`🧄 Loading ingredients for matching - page ${page}, limit ${limit}`)

    const supabase = createSupabaseServiceClient()

    const selectBase = `
      id,
      name,
      category,
      is_basis,
      grams_per_unit
    `
    const selectWithCreatedAt = `${selectBase},
      created_at`

    const runQuery = async (includeCreatedAt: boolean, newest: boolean) => {
      let query = supabase
        .from('ingredients')
        .select(includeCreatedAt ? selectWithCreatedAt : selectBase)

      query = newest ? query.order('created_at', { ascending: false, nullsFirst: false }) : query.order('name')
      return query.range(offset, offset + limit - 1)
    }

    // Try requested mode first
    let { data: ingredients, error: ingredientsError } = await runQuery(true, sort === 'newest')

    // Fallback for schemas without created_at column
    if (ingredientsError && /created_at/i.test(ingredientsError.message || '')) {
      const fallback = await runQuery(false, false)
      ingredients = fallback.data
      ingredientsError = fallback.error
    }

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = String(body?.name || '').trim()
    const category = String(body?.category || 'andre').trim().toLowerCase()
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Ingredient name is required' },
        { status: 400 }
      )
    }

    const allowedCategories = new Set([
      'protein',
      'groent',
      'frugt',
      'korn',
      'mejeri',
      'fedt',
      'krydderi',
      'urter',
      'nodder',
      'fro',
      'balg',
      'forarbejdet',
      'soedstof',
      'drikke',
      'andre',
    ])

    const categoryAliases: Record<string, string> = {
      konserves: 'forarbejdet',
    }
    const mappedCategory = categoryAliases[category] || category
    const normalizedCategory = allowedCategories.has(mappedCategory) ? mappedCategory : 'andre'
    const supabase = createSupabaseServiceClient()

    const { data: existing, error: existingError } = await supabase
      .from('ingredients')
      .select('id, name')
      .ilike('name', name)
      .limit(1)

    if (existingError) {
      throw new Error(`Failed to check existing ingredient: ${existingError.message}`)
    }

    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Ingredient already exists',
        data: { ingredient: existing[0], alreadyExisted: true },
      })
    }

    const row = {
      id: crypto.randomUUID(),
      name,
      category: normalizedCategory,
    }

    const { data: inserted, error: insertError } = await supabase
      .from('ingredients')
      .insert([row])
      .select('id, name, category')
      .single()

    if (insertError) {
      throw new Error(`Failed to insert ingredient: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Ingredient added for matching',
      data: { ingredient: inserted, alreadyExisted: false },
    })
  } catch (error) {
    console.error('❌ Error adding ingredient for matching:', error)
    return NextResponse.json(
      {
        success: false,
        message: `Failed to add ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    )
  }
}
