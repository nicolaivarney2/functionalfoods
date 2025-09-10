import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log(`🏪 Fetching Netto stores from Salling Group API`)
    
    // Get API token from environment variables
    const apiToken = process.env.SALLING_GROUP_API_TOKEN
    console.log(`🔑 API Token check:`, {
      hasToken: !!apiToken,
      tokenLength: apiToken?.length,
      tokenStart: apiToken?.substring(0, 10) + '...',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('SALLING'))
    })
    
    if (!apiToken) {
      return NextResponse.json({
        success: false,
        message: 'Salling Group API token not configured. Please add SALLING_GROUP_API_TOKEN to your environment variables.',
        debug: {
          hasToken: !!apiToken,
          envKeys: Object.keys(process.env).filter(key => key.includes('SALLING'))
        }
      }, { status: 500 })
    }

    // Call Salling Group Product Suggestions API to get products (we can't access stores API)
    // We'll use a generic search to find products and extract store info from them
    const url = `https://api.sallinggroup.com/v1/product-suggestions/relevant-products?q=mælk&limit=1`
    console.log(`📡 Fetching: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    if (response.status === 401) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized - check API token'
      }, { status: 401 })
    }
    
    if (response.status === 403) {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - insufficient permissions'
      }, { status: 403 })
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json({
        success: false,
        message: `API error: ${response.status}`,
        error: errorData
      }, { status: response.status })
    }
    
    const data = await response.json()
    console.log(`📦 Product data:`, JSON.stringify(data, null, 2))
    
    // Since we can't access stores API, we'll return a mock store list
    // In a real implementation, you'd need to request access to the stores API
    const mockStores = [
      {
        id: 'netto-1',
        name: 'Netto (Mock Store)',
        brand: 'Netto',
        address: 'Mock Address',
        city: 'Copenhagen',
        zipCode: '1000',
        country: 'Denmark'
      }
    ]
    
    console.log(`🏪 Using mock Netto store (API key only has access to Product Suggestions)`)
    
    return NextResponse.json({
      success: true,
      message: 'Mock Netto store loaded (API key limited to Product Suggestions)',
      data: {
        stores: mockStores,
        total: mockStores.length,
        note: 'API key only has access to Product Suggestions API, not Stores API'
      }
    })
    
  } catch (error) {
    console.error('❌ Netto stores error:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to load stores: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
