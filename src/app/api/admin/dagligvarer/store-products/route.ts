import { NextRequest, NextResponse } from 'next/server'
import { rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting product scraping process...')
    
    // Step 1: Scrape products from REMA 1000
    const products = await rema1000Scraper.fetchAllProducts()
    
    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found during scraping' },
        { status: 400 }
      )
    }
    
    console.log(`📦 Scraped ${products.length} products from REMA 1000`)
    
    // For now, just return the scraped products without database storage
    // TODO: Implement database storage when Supabase issues are resolved
    
    return NextResponse.json({
      success: true,
      message: 'Products successfully scraped (database storage temporarily disabled)',
      scraping: {
        totalScraped: products.length,
        newProducts: products.length,
        updatedProducts: 0,
        errors: []
      },
      products: products.slice(0, 10), // Return first 10 for preview
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in product scraping process:', error)
    
    return NextResponse.json(
      { 
        error: 'Product scraping failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return mock statistics for now
    return NextResponse.json({
      success: true,
      message: 'Database storage temporarily disabled',
      statistics: {
        totalProducts: 0,
        productsOnSale: 0,
        categories: [],
        lastUpdate: null,
        averagePrice: 0
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error fetching statistics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
