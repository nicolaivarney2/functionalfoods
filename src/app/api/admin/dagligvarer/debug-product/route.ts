import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json()
    
    if (!productId) {
      return NextResponse.json({
        success: false,
        message: 'Product ID is required'
      }, { status: 400 })
    }

    const url = `https://api.digital.rema1000.dk/api/v3/products/${productId}?include=declaration,nutrition_info,declaration,warnings,gpsr,department`
    
    console.log(`📡 Fetching product data: ${url}`)
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('📊 Product data:', data)
    
    const product = data.data || data
    const departmentName = product.department?.name
    const departmentId = product.department?.id
    
    return NextResponse.json({
      success: true,
      message: 'Product data fetched successfully',
      product: {
        id: product.id,
        name: product.name,
        department: {
          id: departmentId,
          name: departmentName
        },
        category: departmentName || 'Uncategorized',
        price: product.prices?.[0]?.price || 0,
        rawData: data
      }
    })
  } catch (error: any) {
    console.error('❌ Debug product failed:', error)
    return NextResponse.json({
      success: false,
      message: error.message || 'Unknown error during product debug'
    }, { status: 500 })
  }
}
