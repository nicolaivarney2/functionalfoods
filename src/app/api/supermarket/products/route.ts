import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export async function GET(request: NextRequest) {
  try {
    console.log('🛒 Fetching supermarket products...')
    
    const products = await databaseService.getSupermarketProducts()
    
    console.log(`✅ Found ${products.length} supermarket products`)
    
    return NextResponse.json({
      success: true,
      products,
      count: products.length,
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
