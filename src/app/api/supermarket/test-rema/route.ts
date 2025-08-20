import { NextRequest, NextResponse } from 'next/server'
import { rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing REMA 1000 scraper...')
    
    // Test the scraper with a known product ID
    const testProductId = 304020 // ØKO. BANANER FAIRTRADE
    const product = await rema1000Scraper.fetchProduct(testProductId)
    
    if (!product) {
      return NextResponse.json(
        { error: 'Failed to fetch test product' },
        { status: 500 }
      )
    }
    
    // Get scraping result
    const result = await rema1000Scraper.getScrapingResult()
    
    return NextResponse.json({
      success: true,
      message: 'REMA 1000 scraper test completed',
      testProduct: product,
      scrapingResult: result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error testing REMA scraper:', error)
    
    return NextResponse.json(
      { 
        error: 'Scraper test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, productId } = await request.json()
    
    switch (action) {
      case 'fetchProduct':
        if (!productId) {
          return NextResponse.json(
            { error: 'Product ID is required' },
            { status: 400 }
          )
        }
        
        const product = await rema1000Scraper.fetchProduct(productId)
        return NextResponse.json({ success: true, product })
        
      case 'fetchAllProducts':
        console.log('🔄 Fetching all products from REMA 1000...')
        const products = await rema1000Scraper.fetchAllProducts()
        return NextResponse.json({ 
          success: true, 
          productsCount: products.length,
          products: products.slice(0, 10) // Return first 10 for testing
        })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: fetchProduct, fetchAllProducts' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('❌ Error in REMA scraper POST:', error)
    
    return NextResponse.json(
      { 
        error: 'Request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
