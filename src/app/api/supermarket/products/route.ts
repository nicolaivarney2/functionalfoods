import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Decode category parameters (they may be URL-encoded)
    const categoryParam = searchParams.get('category')
    const category = categoryParam ? decodeURIComponent(categoryParam) : undefined // Legacy support
    
    const categoriesParam = searchParams.get('categories')
    const categories = categoriesParam 
      ? categoriesParam.split(',').map(c => decodeURIComponent(c.trim())).filter(Boolean)
      : undefined
    
    const stores = searchParams.get('stores')?.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean) || undefined
    const offers = searchParams.get('offers') === 'true'
    const search = searchParams.get('search') ? decodeURIComponent(searchParams.get('search')!) : undefined
    const countsOnly = searchParams.get('counts') === 'true'
    const foodOnly = searchParams.get('foodOnly') === 'true'
    const organic = searchParams.get('organic') === 'true'
    
    
    // If only counts are requested, return optimized count data
    if (countsOnly) {
      const counts = await databaseService.getProductCounts()
      return NextResponse.json({
        success: true,
        counts: counts,
        timestamp: new Date().toISOString()
      })
    }
    
    // Get products from new global structure
    const finalCategory = categories?.length ? categories : (category ? [category] : undefined)
    const result = await databaseService.getSupermarketProductsV2(page, limit, finalCategory, offers, search, stores, foodOnly, organic)
    
    return NextResponse.json({
      success: true,
      products: result.products,
      count: result.total,
      pagination: {
        page,
        limit,
        total: result.total,
        hasMore: result.hasMore
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error fetching supermarket products:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch supermarket products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
