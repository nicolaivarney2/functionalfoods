import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function transformProduct(productData: any): any {
  try {
    // Handle REMA's API structure: { data: { ... } }
    const product = productData.data || productData
    
    if (!product.id && !product.name) {
      return null
    }

    const externalId = String(product.id)
    
    // 🔥 FIXED: REMA has 2 prices - [0] = campaign, [1] = regular
    let currentPrice = 0
    let originalPrice = 0
    let onSale = false
    
    if (product.prices && product.prices.length >= 2) {
      // Two prices: campaign price (index 0) and regular price (index 1)
      const campaignPrice = product.prices[0]
      const regularPrice = product.prices[1]
      
      if (campaignPrice.is_campaign) {
        currentPrice = campaignPrice.price
        originalPrice = regularPrice.price
        onSale = true
      } else {
        // No campaign, use regular price
        currentPrice = regularPrice.price
        originalPrice = regularPrice.price
        onSale = false
      }
    } else if (product.prices && product.prices.length === 1) {
      // Only one price - check if it's a campaign
      const price = product.prices[0]
      currentPrice = price.price
      originalPrice = price.price
      onSale = price.is_campaign || false
    }

    return {
      external_id: `python-${externalId}`, // Use same format as existing products
      name: product.name || 'Unknown Product',
      description: product.declaration || product.description || null,
      category: product.department?.name || 'Uncategorized',
      price: currentPrice || null,
      original_price: originalPrice || null,
      is_on_sale: onSale,
      image_url: product.images?.[0]?.large || product.images?.[0]?.medium || null,
      available: product.is_available_in_all_stores || true,
      last_updated: new Date().toISOString(),
      source: 'rema1000',
      store: 'rema1000'
    }
  } catch (error) {
    console.error('Error transforming product:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 8000 // 8 seconds per batch
  
  try {
    const { departmentId, page = 1, limit = 100 } = await req.json()
    
    console.log(`🚀 Starting batch scrape for department ${departmentId}, page ${page}`)
    
    const supabase = createSupabaseServiceClient()
    
    // Fetch products from specific department and page
    const url = `https://api.digital.rema1000.dk/api/v3/departments/${departmentId}/products?page=${page}&limit=${limit}`
    console.log(`📡 Fetching: ${url}`)
    
    const response = await fetch(url)
    console.log(`📡 Response status: ${response.status}`)
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }
    
    const data = await response.json()
    console.log(`📊 Response data keys:`, Object.keys(data))
    console.log(`📦 Products in response:`, data.data?.length || 0)
    
    if (!data.data || data.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No more products found',
        productsFound: 0,
        productsAdded: 0,
        productsUpdated: 0,
        hasMore: false,
        executionTime: Date.now() - startTime
      })
    }
    
    // Transform products
    const discoveredProducts = []
    for (const productData of data.data) {
      const transformedProduct = transformProduct(productData)
      if (transformedProduct) {
        discoveredProducts.push(transformedProduct)
      }
    }
    
    console.log(`📦 Discovered ${discoveredProducts.length} products`)
    
    // Process products in database
    let productsAdded = 0
    let productsUpdated = 0
    
    for (const product of discoveredProducts) {
      // Check timeout
      if (Date.now() - startTime > maxTimeMs) {
        console.log(`⏰ Timeout reached, stopping processing`)
        break
      }
      
      try {
        // Check if product already exists BEFORE upsert
        const { data: existingProduct } = await supabase
          .from('supermarket_products')
          .select('id, price')
          .eq('external_id', product.external_id)
          .single()
        
        // Use upsert to insert or update product
        const { data: upsertedProduct, error: upsertError } = await supabase
          .from('supermarket_products')
          .upsert({
            external_id: product.external_id,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            original_price: product.original_price,
            is_on_sale: product.is_on_sale,
            image_url: product.image_url,
            available: product.available,
            last_updated: product.last_updated,
            source: product.source,
            store: product.store
          }, {
            onConflict: 'external_id'
          })
          .select('id, price')
          .single()
        
        if (upsertError) {
          console.error(`❌ Failed to upsert product ${product.external_id}:`, upsertError)
          console.error(`❌ Product data:`, JSON.stringify(product, null, 2))
        } else {
          if (existingProduct) {
            // Product existed before - this was an update
            productsUpdated++
            console.log(`🔄 Updated product: ${product.name}`)
          } else {
            // Product didn't exist before - this was an insert
            productsAdded++
            console.log(`➕ Added product: ${product.name}`)
          }
        }
      } catch (error) {
        console.error(`❌ Error processing product ${product.external_id}:`, error)
      }
    }
    
    const executionTime = Date.now() - startTime
    const hasMore = data.meta?.pagination && page < data.meta.pagination.last_page
    
    console.log(`✅ Batch completed!`)
    console.log(`📊 Products found: ${discoveredProducts.length}`)
    console.log(`➕ Products added: ${productsAdded}`)
    console.log(`🔄 Products updated: ${productsUpdated}`)
    console.log(`⏱️ Execution time: ${executionTime}ms`)
    console.log(`📄 Has more pages: ${hasMore}`)
    
    return NextResponse.json({
      success: true,
      message: 'Batch scrape completed successfully',
      productsFound: discoveredProducts.length,
      productsAdded,
      productsUpdated,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      executionTime
    })
    
  } catch (error) {
    console.error('❌ Batch scrape error:', error)
    return NextResponse.json({
      success: false,
      message: `Batch scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}
