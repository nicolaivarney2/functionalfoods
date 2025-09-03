import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 25000 // 25 seconds for Vercel timeout
  
  try {
    console.log('💰 Starting REMA 1000 price scrape...')
    
    const supabase = createSupabaseServiceClient()
    const scraper = new Rema1000Scraper()
    
    // Get existing products
    const { data: existingProducts, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('id, external_id, name, price, original_price')
      .eq('source', 'rema1000')
      .eq('available', true)
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing products: ${fetchError.message}`)
    }
    
    if (!existingProducts || existingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No existing products found. Run full scrape first.',
        productsUpdated: 0,
        executionTime: Date.now() - startTime
      })
    }
    
    console.log(`📊 Found ${existingProducts.length} existing products to update`)
    
    let productsUpdated = 0
    let priceChanges = 0
    let processedCount = 0
    
    // Process products in batches
    const batchSize = 25
    for (let i = 0; i < existingProducts.length; i += batchSize) {
      const batch = existingProducts.slice(i, i + batchSize)
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(existingProducts.length / batchSize)} (${batch.length} products)`)
      
      for (const existingProduct of batch) {
        try {
          // Extract product ID from external_id (format: "rema-12345")
          const productId = existingProduct.external_id.replace('rema-', '')
          
          // Get updated product data from REMA API
          const updatedProduct = await scraper.getProductById(parseInt(productId))
          
          if (updatedProduct) {
            const oldPrice = existingProduct.price
            const newPrice = updatedProduct.price
            const oldOriginalPrice = existingProduct.original_price
            const newOriginalPrice = updatedProduct.original_price
            
            // Check if price changed
            if (oldPrice !== newPrice || oldOriginalPrice !== newOriginalPrice) {
              // Update product
              const { error: updateError } = await supabase
                .from('supermarket_products')
                .update({
                  price: newPrice,
                  original_price: newOriginalPrice,
                  is_on_sale: updatedProduct.isOnSale,
                  lastUpdated: updatedProduct.lastUpdated
                })
                .eq('id', existingProduct.id)
              
              if (updateError) {
                console.error(`❌ Failed to update product ${existingProduct.external_id}:`, updateError)
              } else {
                productsUpdated++
                
                // Add price history
                await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: existingProduct.id,
                    price: newPrice,
                    original_price: newOriginalPrice,
                    is_on_sale: updatedProduct.isOnSale,
                    recorded_at: new Date().toISOString()
                  })
                
                priceChanges++
                console.log(`💰 Price changed for ${existingProduct.name}: ${oldPrice} → ${newPrice}`)
              }
            }
          }
          
          processedCount++
          
          // Check timeout
          if (Date.now() - startTime > maxTimeMs) {
            console.log(`⏰ Timeout reached after ${processedCount} products`)
            break
          }
          
        } catch (error) {
          console.error(`❌ Error updating product ${existingProduct.external_id}:`, error)
        }
      }
      
      // Check timeout
      if (Date.now() - startTime > maxTimeMs) {
        console.log(`⏰ Timeout reached, stopping processing`)
        break
      }
    }
    
    const executionTime = Date.now() - startTime
    
    console.log(`🎉 Price scrape completed!`)
    console.log(`📊 Products processed: ${processedCount}`)
    console.log(`🔄 Products updated: ${productsUpdated}`)
    console.log(`💰 Price changes: ${priceChanges}`)
    console.log(`⏱️ Execution time: ${executionTime}ms`)
    
    return NextResponse.json({
      success: true,
      message: 'Price scrape completed successfully',
      productsProcessed: processedCount,
      productsUpdated,
      priceChanges,
      executionTime
    })
    
  } catch (error) {
    console.error('❌ Price scrape error:', error)
    return NextResponse.json({
      success: false,
      message: `Price scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}