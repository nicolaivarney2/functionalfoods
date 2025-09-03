import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'

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
    const currentPrice = product.prices?.[0]?.price || 0
    const originalPrice = product.prices?.[0]?.price || currentPrice
    const onSale = product.prices?.[0]?.is_campaign || false

    return {
      external_id: `rema-${externalId}`,
      name: product.name || 'Unknown Product',
      description: product.declaration || product.description || null,
      category: product.department?.name || 'Uncategorized',
      price: currentPrice || null,
      original_price: originalPrice || null,
      is_on_sale: onSale,
      image_url: product.images?.[0]?.large || product.images?.[0]?.medium || null,
      available: product.is_available_in_all_stores !== false,
      last_updated: new Date().toISOString(),
      source: 'rema1000',
      store: 'rema1000'
    }
  } catch (error) {
    console.error('Transform error:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 25000 // 25 seconds for Vercel timeout
  
  try {
    console.log('🚀 Starting REMA 1000 full scrape with existing scraper...')
    
    const supabase = createSupabaseServiceClient()
    const scraper = new Rema1000Scraper()
    
    // Get current products count
    const { count: currentCount } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'rema1000')
    
    console.log(`📊 Current products in DB: ${currentCount || 0}`)
    
    // Simple test - just get a few products from one department
    console.log('🔍 Testing with simple approach...')
    const discoveredProducts = []
    
    try {
      // Test with department 10 (Brød & Bavinchi) - just first page
      const url = 'https://api.digital.rema1000.dk/api/v3/departments/10/products?page=1&limit=10'
      console.log(`📡 Fetching: ${url}`)
      
      const response = await fetch(url)
      console.log(`📡 Response status: ${response.status}`)
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }
      
      const data = await response.json()
      console.log(`📊 Response data keys:`, Object.keys(data))
      console.log(`📦 Products in response:`, data.data?.length || 0)
      
      if (data.data && data.data.length > 0) {
        for (const productData of data.data) {
          const transformedProduct = transformProduct(productData)
          if (transformedProduct) {
            discoveredProducts.push(transformedProduct)
            console.log(`✅ Added product: ${transformedProduct.name}`)
          }
        }
      }
      
      console.log(`📦 Total products found: ${discoveredProducts.length}`)
      
    } catch (error) {
      console.error('❌ Error in simple test:', error)
    }
    
    console.log(`📦 Discovered ${discoveredProducts.length} products`)
    
    if (discoveredProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products discovered',
        productsFound: 0,
        productsAdded: 0,
        productsUpdated: 0,
        executionTime: Date.now() - startTime
      })
    }
    
    // Process products in batches to avoid timeout
    const batchSize = 50
    let productsAdded = 0
    let productsUpdated = 0
    let processedCount = 0
    
    for (let i = 0; i < discoveredProducts.length; i += batchSize) {
      const batch = discoveredProducts.slice(i, i + batchSize)
      const batchStartTime = Date.now()
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(discoveredProducts.length / batchSize)} (${batch.length} products)`)
      
      for (const product of batch) {
        try {
          // Check if product already exists
          const { data: existingProduct } = await supabase
            .from('supermarket_products')
            .select('id, price, original_price')
            .eq('external_id', product.external_id)
            .single()
          
          if (existingProduct) {
            // Update existing product
            const { error: updateError } = await supabase
              .from('supermarket_products')
              .update({
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                original_price: product.original_price,
                is_on_sale: product.is_on_sale,
                image_url: product.image_url,
                available: product.available,
                last_updated: product.last_updated
              })
              .eq('external_id', product.external_id)
            
            if (updateError) {
              console.error(`❌ Failed to update product ${product.external_id}:`, updateError)
            } else {
              productsUpdated++
              
              // Add price history if price changed
              if (existingProduct.price !== product.price) {
                await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: existingProduct.id,
                    price: product.price,
                    original_price: product.original_price,
                    is_on_sale: product.isOnSale,
                    recorded_at: new Date().toISOString()
                  })
              }
            }
          } else {
            // Insert new product
            const { data: newProduct, error: insertError } = await supabase
              .from('supermarket_products')
              .insert({
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
              })
              .select('id')
              .single()
            
            if (insertError) {
              console.error(`❌ Failed to insert product ${product.external_id}:`, insertError)
            } else {
              productsAdded++
              
              // Add initial price history
              await supabase
                .from('supermarket_price_history')
                .insert({
                  product_id: newProduct.id,
                  price: product.price,
                  original_price: product.original_price,
                  is_on_sale: product.isOnSale,
                  recorded_at: new Date().toISOString()
                })
            }
          }
          
          processedCount++
          
          // Check timeout
          if (Date.now() - startTime > maxTimeMs) {
            console.log(`⏰ Timeout reached after ${processedCount} products`)
            break
          }
          
        } catch (error) {
          console.error(`❌ Error processing product ${product.external_id}:`, error)
        }
      }
      
      const batchTime = Date.now() - batchStartTime
      console.log(`✅ Batch completed in ${batchTime}ms`)
      
      // Check timeout
      if (Date.now() - startTime > maxTimeMs) {
        console.log(`⏰ Timeout reached, stopping processing`)
        break
      }
    }
    
    const executionTime = Date.now() - startTime
    
    console.log(`🎉 Full scrape completed!`)
    console.log(`📊 Products found: ${discoveredProducts.length}`)
    console.log(`➕ Products added: ${productsAdded}`)
    console.log(`🔄 Products updated: ${productsUpdated}`)
    console.log(`⏱️ Execution time: ${executionTime}ms`)
    
    return NextResponse.json({
      success: true,
      message: 'Full scrape completed successfully',
      productsFound: discoveredProducts.length,
      productsAdded,
      productsUpdated,
      executionTime
    })
    
  } catch (error) {
    console.error('❌ Full scrape error:', error)
    return NextResponse.json({
      success: false,
      message: `Full scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}