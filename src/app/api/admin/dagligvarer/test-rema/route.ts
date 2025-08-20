import { NextRequest, NextResponse } from 'next/server'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'

export async function GET(request: NextRequest) {
  try {
    console.log('🧠 Testing REMA 1000 delta update capabilities...')
    
    const scraper = new Rema1000Scraper()
    
    // Test basic product fetching first
    console.log('🔍 Testing basic product fetching...')
    const testProduct = await scraper.fetchProduct(304020) // Use known working product ID: ØKO. BANANER FAIRTRADE
    
    if (!testProduct) {
      return NextResponse.json({
        success: false,
        message: 'Could not fetch basic product - REMA API may be down',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    console.log('✅ Basic product fetch successful, investigating delta capabilities...')
    
    // Investigate delta update capabilities
    const deltaCapabilities = await scraper.investigateDeltaEndpoints()
    
    // Test conditional request with last-modified if supported
    let conditionalRequestTest = null
    if (deltaCapabilities.lastModifiedSupport) {
      console.log('📅 Testing conditional request with last-modified...')
      try {
        const testUrl = `${scraper.baseUrl}/products/304020` // Use known working product ID
        const response = await fetch(testUrl, {
          headers: {
            'If-Modified-Since': new Date(Date.now() - 24 * 60 * 60 * 1000).toUTCString(), // 24 hours ago
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        
        conditionalRequestTest = {
          status: response.status,
          supports304: response.status === 304,
          hasLastModified: !!response.headers.get('last-modified')
        }
      } catch (error) {
        console.log('⚠️ Conditional request test failed:', error)
      }
    }
    
    const result = {
      success: true,
      message: 'REMA API delta capabilities investigation complete',
      timestamp: new Date().toISOString(),
      basicApi: {
        working: true,
        testProduct: testProduct.name
      },
      deltaCapabilities,
      conditionalRequestTest,
      recommendations: generateRecommendations(deltaCapabilities)
    }
    
    console.log('🎯 REMA delta investigation complete:', result)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error testing REMA delta capabilities:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to test REMA delta capabilities',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function generateRecommendations(capabilities: any) {
  const recommendations = []
  
  if (capabilities.hasDeltaUpdates) {
    recommendations.push('🎉 Use REMA\'s native delta endpoints for efficient updates')
  }
  
  if (capabilities.lastModifiedSupport) {
    recommendations.push('📅 Use conditional requests with If-Modified-Since headers')
  }
  
  if (!capabilities.hasDeltaUpdates && !capabilities.lastModifiedSupport) {
    recommendations.push('🔄 Implement intelligent batch updates by product category priority')
    recommendations.push('⏰ Update high-priority categories (frugt, kød) more frequently')
    recommendations.push('💡 Consider implementing change detection based on price history')
  }
  
  return recommendations
}

export async function POST(request: NextRequest) {
  try {
    const { action, productId } = await request.json()
    const scraper = new Rema1000Scraper()
    
    switch (action) {
      case 'fetchProduct':
        if (!productId) {
          return NextResponse.json(
            { error: 'Product ID is required' },
            { status: 400 }
          )
        }
        
        const product = await scraper.fetchProduct(productId)
        return NextResponse.json({ success: true, product })
        
      case 'fetchAllProducts':
        console.log('🔄 Fetching all products from REMA 1000...')
        const products = await scraper.fetchAllProducts()
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
