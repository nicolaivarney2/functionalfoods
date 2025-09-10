import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log(`🏪 Fetching Netto stores from Salling Group API`)
    
    // Call Salling Group Stores API (no token required for granted access)
    const url = 'https://api.sallinggroup.com/v1/stores'
    console.log(`📡 Fetching: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
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
    console.log(`📦 Stores data:`, JSON.stringify(data, null, 2))
    
    // Filter for Netto stores only
    const nettoStores = data.filter((store: any) => 
      store.brand && store.brand.toLowerCase().includes('netto')
    )
    
    console.log(`🏪 Found ${nettoStores.length} Netto stores`)
    
    return NextResponse.json({
      success: true,
      message: 'Netto stores loaded',
      data: {
        stores: nettoStores,
        total: nettoStores.length
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
