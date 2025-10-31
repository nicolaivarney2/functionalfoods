import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Testing REMA 1000 endpoints...')
    
    const testResults: any = {
      endpoints: [],
      timestamp: new Date().toISOString()
    }
    
    // Test different possible endpoints
    const endpointsToTest = [
      'https://shop.rema1000.dk/api/products',
      'https://shop.rema1000.dk/api/categories',
      'https://shop.rema1000.dk/api/graphql',
      'https://shop.rema1000.dk/api/v1/products',
      'https://shop.rema1000.dk/api/v2/products',
      'https://shop.rema1000.dk/webapi/products',
      'https://shop.rema1000.dk/webapi/categories',
      'https://api.rema1000.dk/products',
      'https://api.rema1000.dk/categories',
    ]
    
    for (const endpoint of endpointsToTest) {
      try {
        console.log(`Testing: ${endpoint}`)
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
            'Referer': 'https://shop.rema1000.dk/',
            'Origin': 'https://shop.rema1000.dk',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin'
          }
        })
        
        const result: any = {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          contentType: response.headers.get('content-type'),
          ok: response.ok
        }
        
        if (response.ok) {
          try {
            const text = await response.text()
            result.responseLength = text.length
            
            // Try to parse as JSON
            if (text.startsWith('{') || text.startsWith('[')) {
              const json = JSON.parse(text)
              result.responseType = 'json'
              result.responsePreview = JSON.stringify(json).substring(0, 500)
            } else {
              result.responseType = 'text'
              result.responsePreview = text.substring(0, 500)
            }
          } catch (parseError: any) {
            result.parseError = parseError.message
          }
        }
        
        testResults.endpoints.push(result)
        
      } catch (error: any) {
        testResults.endpoints.push({
          endpoint,
          error: error?.message || 'Unknown error',
          status: 'failed'
        })
      }
      
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Also test the main page to see what it returns
    try {
      console.log('Testing main page...')
      const mainPageResponse = await fetch('https://shop.rema1000.dk/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })
      
      if (mainPageResponse.ok) {
        const html = await mainPageResponse.text()
        testResults.mainPage = {
          status: mainPageResponse.status,
          contentLength: html.length,
          hasJavaScript: html.includes('<script'),
          hasReact: html.includes('react') || html.includes('React'),
          hasAPI: html.includes('api/') || html.includes('/api'),
          preview: html.substring(0, 1000)
        }
      }
    } catch (error: any) {
      testResults.mainPage = { error: error?.message || 'Unknown error' }
    }
    
    console.log('✅ Endpoint testing completed')
    
    return NextResponse.json({
      success: true,
      message: 'REMA 1000 endpoint testing completed',
      results: testResults
    })
    
  } catch (error) {
    console.error('❌ Debug test failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Debug test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
