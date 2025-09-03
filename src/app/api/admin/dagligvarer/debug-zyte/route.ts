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

function decodeBase64Response(body: string): any {
  try {
    const decoded = Buffer.from(body, 'base64').toString('utf-8')
    return {
      success: true,
      data: JSON.parse(decoded),
      rawLength: decoded.length,
      preview: decoded.substring(0, 500) + '...'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      rawLength: body.length,
      preview: body.substring(0, 500) + '...'
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!ZYTE_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Zyte API key not configured'
      }, { status: 500 })
    }

    console.log('🔍 Starting Zyte debug session...')
    
    const testUrls = [
      'https://shop.rema1000.dk/api/products',
      'https://shop.rema1000.dk/api/products?page=1&limit=50',
      'https://shop.rema1000.dk/api/v1/products',
      'https://shop.rema1000.dk/api/v2/products',
      'https://shop.rema1000.dk/webapi/products',
      'https://shop.rema1000.dk/api/categories',
      'https://shop.rema1000.dk/'
    ]

    const results = []

    for (const url of testUrls) {
      console.log(`🔍 Testing: ${url}`)
      
      try {
        const payload = {
          url,
          httpResponseBody: true,
          geolocation: 'DK'
        }

        const zyteResult = await zyteRequest(payload)
        
        const decoded = decodeBase64Response(zyteResult.httpResponseBody)
        
        results.push({
          url,
          status: 'success',
          zyteResponse: {
            hasResponseBody: !!zyteResult.httpResponseBody,
            responseLength: zyteResult.httpResponseBody?.length || 0
          },
          decoded: decoded,
          isJSON: decoded.success && typeof decoded.data === 'object',
          hasProducts: decoded.success && (
            Array.isArray(decoded.data) || 
            decoded.data?.products || 
            decoded.data?.items ||
            decoded.data?.data
          )
        })
        
      } catch (error: any) {
        results.push({
          url,
          status: 'error',
          error: error?.message || 'Unknown error'
        })
      }
    }

    // Also test network capture
    console.log('🔍 Testing network capture...')
    try {
      const networkPayload = {
        url: 'https://shop.rema1000.dk/',
        geolocation: 'DK',
        networkCapture: [
          {
            filterType: 'url',
            matchType: 'contains', 
            value: 'api',
            httpResponseBody: true
          }
        ],
        actions: [
          { action: 'waitForResponse', url: { matchType: 'contains', value: 'api' } },
          { action: 'scrollBottom' },
          { action: 'wait', seconds: 3 }
        ]
      }

      const networkResult = await zyteRequest(networkPayload)
      
      const networkEndpoints = []
      for (const capture of networkResult.networkCapture || []) {
        const decoded = decodeBase64Response(capture.httpResponseBody)
        networkEndpoints.push({
          url: capture.url,
          status: capture.status,
          contentType: capture.headers?.['content-type'],
          decoded: decoded,
          hasProducts: decoded.success && (
            Array.isArray(decoded.data) || 
            decoded.data?.products || 
            decoded.data?.items ||
            decoded.data?.data
          )
        })
      }

      results.push({
        type: 'networkCapture',
        endpoints: networkEndpoints
      })

    } catch (error: any) {
      results.push({
        type: 'networkCapture',
        status: 'error',
        error: error?.message || 'Unknown error'
      })
    }

    console.log('✅ Zyte debug completed')
    
    return NextResponse.json({
      success: true,
      message: 'Zyte debug completed',
      results
    })

  } catch (error: any) {
    console.error('❌ Zyte debug failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Zyte debug failed',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
