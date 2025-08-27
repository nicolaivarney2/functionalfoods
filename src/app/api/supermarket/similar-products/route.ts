import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productName = searchParams.get('name')
    const excludeStore = searchParams.get('excludeStore')

    if (!productName) {
      return NextResponse.json(
        { success: false, message: 'Product name is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Finding similar products for: "${productName}"`)
    
    const similarProducts = await databaseService.getSimilarProductsAcrossStores(
      productName, 
      excludeStore || undefined
    )

    console.log(`✅ Found ${similarProducts.length} similar products across stores`)

    return NextResponse.json({
      success: true,
      products: similarProducts,
      total: similarProducts.length
    })

  } catch (error: any) {
    console.error('❌ Error fetching similar products:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
