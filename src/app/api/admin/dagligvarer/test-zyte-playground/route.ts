import { NextRequest, NextResponse } from 'next/server'

// Zyte API configuration
const ZYTE_API_KEY = process.env.ZYTE_API_KEY
const ZYTE_API_URL = 'https://api.zyte.com/v1/extract'

if (!ZYTE_API_KEY) {
  console.error('❌ ZYTE_API_KEY environment variable is required')
}

// Zyte API helper functions
async function zyteRequest(payload: any): Promise<any> {
  if (!ZYTE_API_KEY) {
    throw new Error('Zyte API key not configured')
  }

  const response = await fetch(ZYTE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${ZYTE_API_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Zyte API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function POST(req: NextRequest) {
  try {
    if (!ZYTE_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Zyte API key not configured'
      }, { status: 500 })
    }

    console.log('🧪 Testing Zyte API with different approaches...')
    
    const testResults = []

    // Test 1: Try automatic product extraction from main page
    console.log('🔍 Test 1: Automatic product extraction from main page')
    try {
      const productPayload = {
        url: 'https://shop.rema1000.dk/',
        productList: true,
        geolocation: 'DK'
      }

      const productResult = await zyteRequest(productPayload)
      
      testResults.push({
        test: 'Automatic Product Extraction',
        url: 'https://shop.rema1000.dk/',
        success: !!productResult.productList,
        productsFound: productResult.productList?.products?.length || 0,
        data: productResult.productList ? {
          products: productResult.productList.products?.slice(0, 3), // First 3 products
          totalProducts: productResult.productList.products?.length,
          categoryName: productResult.productList.categoryName,
          breadcrumbs: productResult.productList.breadcrumbs
        } : null
      })
      
    } catch (error: any) {
      testResults.push({
        test: 'Automatic Product Extraction',
        url: 'https://shop.rema1000.dk/',
        success: false,
        error: error?.message || 'Unknown error'
      })
    }

    // Test 2: Try browser HTML extraction
    console.log('🔍 Test 2: Browser HTML extraction')
    try {
      const browserPayload = {
        url: 'https://shop.rema1000.dk/',
        browserHtml: true,
        geolocation: 'DK',
        actions: [
          { action: 'wait', seconds: 3 },
          { action: 'scrollBottom' }
        ]
      }

      const browserResult = await zyteRequest(browserPayload)
      
      const htmlLength = browserResult.browserHtml?.length || 0
      const hasProducts = htmlLength > 0 && (
        browserResult.browserHtml?.includes('product') ||
        browserResult.browserHtml?.includes('price') ||
        browserResult.browserHtml?.includes('kr')
      )
      
      testResults.push({
        test: 'Browser HTML Extraction',
        url: 'https://shop.rema1000.dk/',
        success: htmlLength > 0,
        htmlLength,
        hasProducts,
        preview: browserResult.browserHtml?.substring(0, 500) + '...'
      })
      
    } catch (error: any) {
      testResults.push({
        test: 'Browser HTML Extraction',
        url: 'https://shop.rema1000.dk/',
        success: false,
        error: error?.message || 'Unknown error'
      })
    }

    // Test 3: Try specific product category page
    console.log('🔍 Test 3: Product category page')
    try {
      const categoryPayload = {
        url: 'https://shop.rema1000.dk/frugt-groent',
        productList: true,
        geolocation: 'DK'
      }

      const categoryResult = await zyteRequest(categoryPayload)
      
      testResults.push({
        test: 'Category Page Extraction',
        url: 'https://shop.rema1000.dk/frugt-groent',
        success: !!categoryResult.productList,
        productsFound: categoryResult.productList?.products?.length || 0,
        data: categoryResult.productList ? {
          products: categoryResult.productList.products?.slice(0, 3),
          totalProducts: categoryResult.productList.products?.length,
          categoryName: categoryResult.productList.categoryName
        } : null
      })
      
    } catch (error: any) {
      testResults.push({
        test: 'Category Page Extraction',
        url: 'https://shop.rema1000.dk/frugt-groent',
        success: false,
        error: error?.message || 'Unknown error'
      })
    }

    // Test 4: Try search page
    console.log('🔍 Test 4: Search page')
    try {
      const searchPayload = {
        url: 'https://shop.rema1000.dk/search?q=mælk',
        productList: true,
        geolocation: 'DK'
      }

      const searchResult = await zyteRequest(searchPayload)
      
      testResults.push({
        test: 'Search Page Extraction',
        url: 'https://shop.rema1000.dk/search?q=mælk',
        success: !!searchResult.productList,
        productsFound: searchResult.productList?.products?.length || 0,
        data: searchResult.productList ? {
          products: searchResult.productList.products?.slice(0, 3),
          totalProducts: searchResult.productList.products?.length
        } : null
      })
      
    } catch (error: any) {
      testResults.push({
        test: 'Search Page Extraction',
        url: 'https://shop.rema1000.dk/search?q=mælk',
        success: false,
        error: error?.message || 'Unknown error'
      })
    }

    console.log('✅ Zyte playground tests completed')
    
    return NextResponse.json({
      success: true,
      message: 'Zyte playground tests completed',
      results: testResults,
      summary: {
        totalTests: testResults.length,
        successfulTests: testResults.filter(r => r.success).length,
        totalProductsFound: testResults.reduce((sum, r) => sum + (r.productsFound || 0), 0)
      }
    })

  } catch (error: any) {
    console.error('❌ Zyte playground test failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Zyte playground test failed',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
