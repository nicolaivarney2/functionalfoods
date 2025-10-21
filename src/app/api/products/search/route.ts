import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('supermarket_products')
      .select('id, name, category, price, unit, image_url, store, is_on_sale, original_price')
      .eq('available', true)
      .order('name')

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Search by name if provided
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: products, error } = await query

    if (error) {
      console.error('Error searching products:', error)
      return NextResponse.json({ error: 'Failed to search products' }, { status: 500 })
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error in GET /api/products/search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get available categories
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    
    const { data: categories, error } = await supabase
      .from('supermarket_products')
      .select('category')
      .eq('available', true)
      .not('category', 'is', null)

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Get unique categories
    const uniqueCategories = [...new Set(categories.map(item => item.category))]
      .sort()
      .map(category => ({
        name: category,
        slug: category.toLowerCase().replace(/\s+/g, '-')
      }))

    return NextResponse.json({ categories: uniqueCategories })
  } catch (error) {
    console.error('Error in POST /api/products/search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
