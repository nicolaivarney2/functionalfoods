import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing simple REMA API call...')
    
    // Test with the exact product you showed me
    const response = await fetch('https://api.digital.rema1000.dk/api/v3/products/61508?include=declaration,nutrition_info,declaration,warnings,gpsr,department')
    
    console.log('📡 Response status:', response.status)
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        message: `API call failed: ${response.status} ${response.statusText}`
      })
    }
    
    const data = await response.json()
    console.log('📊 Data received:', JSON.stringify(data).substring(0, 200) + '...')
    
    return NextResponse.json({
      success: true,
      message: 'Simple test successful',
      productName: data.data?.name || 'No name',
      productPrice: data.data?.prices?.[0]?.price || 'No price',
      dataPreview: JSON.stringify(data).substring(0, 500)
    })
    
  } catch (error) {
    console.error('❌ Simple test failed:', error)
    return NextResponse.json({
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
