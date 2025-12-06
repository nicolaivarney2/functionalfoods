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
    
    console.log(`[API] Fetching products - page: ${page}, limit: ${limit}, categories: ${finalCategory?.join(', ') || 'none'}, offers: ${offers}, stores: ${stores?.join(', ') || 'none'}, organic: ${organic}`)
    
    const result = await databaseService.getSupermarketProductsV2(page, limit, finalCategory, offers, search, stores, foodOnly, organic)
    
    console.log(`[API] Returning ${result.products.length} products (total: ${result.total})`)
    
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
    console.error('❌ [API] Error fetching supermarket products:', error)
    
    // Log full error details for Vercel debugging
    if (error instanceof Error) {
      console.error(`❌ [API] Error message: ${error.message}`)
      console.error(`❌ [API] Error stack: ${error.stack}`)
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch supermarket products',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
