import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const { ean, storeId } = await req.json()
    
    if (!ean || !storeId) {
      return NextResponse.json({
        success: false,
        message: 'Both EAN and storeId are required'
      }, { status: 400 })
    }

    console.log(`🔍 Looking up EAN ${ean} in Netto store ${storeId}`)
    
    // Get API token from environment variables
    const apiToken = process.env.SALLING_GROUP_API_TOKEN
    if (!apiToken) {
      return NextResponse.json({
        success: false,
        message: 'Salling Group API token not configured. Please add SALLING_GROUP_API_TOKEN to your environment variables.'
      }, { status: 500 })
    }

    // Call Salling Group API with Bearer token authentication
    const url = `https://api.sallinggroup.com/v2/products/${ean}?storeId=${storeId}`
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
    
    if (response.status === 404) {
      return NextResponse.json({
        success: false,
        message: 'Product not found'
      }, { status: 404 })
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
    console.log(`📦 Netto product data:`, JSON.stringify(data, null, 2))
    
    // Transform Salling Group data to our format
    const transformedProduct = transformNettoProduct(data, ean, storeId)
    
    return NextResponse.json({
      success: true,
      message: 'Netto product found',
      data: {
        original: data,
        transformed: transformedProduct
      }
    })
    
  } catch (error) {
    console.error('❌ Netto lookup error:', error)
    return NextResponse.json({
      success: false,
      message: `Lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

function transformNettoProduct(data: any, ean: string, storeId: string) {
  try {
    const product = data.instore
    
    if (!product) {
      return null
    }

    // Calculate pricing
    let currentPrice = product.price || 0
    let originalPrice = product.price || 0
    let onSale = false
    
    if (product.campaign) {
      // Product is on campaign
      currentPrice = product.campaign.unitPrice || product.price || 0
      originalPrice = product.price || 0
      onSale = true
    }

    return {
      external_id: `netto-${ean}`,
      name: product.name || 'Unknown Product',
      description: product.description || null,
      category: 'Ukategoriseret', // Salling Group doesn't provide category
      price: currentPrice,
      original_price: originalPrice,
      is_on_sale: onSale,
      image_url: null, // Salling Group doesn't provide images
      available: true,
      last_updated: new Date().toISOString(),
      source: 'netto',
      store: 'Netto',
      ean: ean,
      unit: product.unit || null,
      unit_price: product.unitPrice || currentPrice,
      campaign: product.campaign ? {
        display_text: product.campaign.displayText,
        from_date: product.campaign.fromDate,
        to_date: product.campaign.toDate,
        quantity: product.campaign.quantity,
        price: product.campaign.price
      } : null,
      deposit: product.deposit ? {
        price: product.deposit.price,
        text: product.deposit.text
      } : null
    }
  } catch (error) {
    console.error('Error transforming Netto product:', error)
    return null
  }
}
