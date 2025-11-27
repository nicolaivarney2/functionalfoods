import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export async function GET(request: NextRequest) {
  try {
    console.log('🛒 Fetching supermarket products...')
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const category = searchParams.get('category') || undefined // Legacy support
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || undefined
    const stores = searchParams.get('stores')?.split(',').filter(Boolean) || undefined
    const offers = searchParams.get('offers') === 'true'
    const search = searchParams.get('search') || undefined
    const countsOnly = searchParams.get('counts') === 'true'
    
    console.log(`📋 Query params: page=${page}, limit=${limit}, categories=${categories}, stores=${stores}, offers=${offers}, search=${search}, countsOnly=${countsOnly}`)
    if (search) {
      console.log(`🔍 Search term details: "${search}" (length: ${search.length}, char codes: ${search.split('').map(c => c.charCodeAt(0)).join(',')})`)
    }
    
    // If only counts are requested, return optimized count data
    if (countsOnly) {
      const counts = await databaseService.getProductCounts()
      console.log(`✅ Retrieved product counts: total=${counts.total}`)
      
      return NextResponse.json({
        success: true,
        counts: counts,
        timestamp: new Date().toISOString()
      })
    }
    
    // Get products from new global structure
    const finalCategory = categories?.length ? categories : (category ? [category] : undefined)
    const result = await databaseService.getSupermarketProductsV2(page, limit, finalCategory, offers, search, stores)
    
    console.log(`✅ Found ${result.products.length} supermarket products (V2, total: ${result.total})`)
    
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
