import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// interface ScrapedProduct { // Not used
//   external_id: string
//   name: string
//   category: string
//   price?: number
//   original_price?: number
//   on_sale: boolean
//   description?: string
//   brand?: string
//   image_url?: string
//   available: boolean
//   last_updated: string
//   source: string
// }

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    const { products, replaceAll = false } = body
    
    if (!Array.isArray(products)) {
      return NextResponse.json({
        success: false,
        message: 'Products must be an array'
      }, { status: 400 })
    }
    
    if (products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products provided'
      }, { status: 400 })
    }
    
    console.log(`📤 Processing upload of ${products.length} products...`)
    console.log(`🔄 Replace all mode: ${replaceAll}`)
    
    let inserted = 0
    let updated = 0
    let errors = 0
    let priceHistoryAdded = 0
    
    // If replaceAll is true, clear existing REMA products first
    if (replaceAll) {
      console.log('🗑️ Clearing existing REMA 1000 products...')
      const { error: deleteError } = await supabase
        .from('supermarket_products')
        .delete()
        .eq('source', 'rema1000')
      
      if (deleteError) {
        console.error('Error clearing existing products:', deleteError)
        return NextResponse.json({
          success: false,
          message: 'Failed to clear existing products',
          error: deleteError.message
        }, { status: 500 })
      }
      
      console.log('✅ Existing products cleared')
    }
    
    // Process products in batches to avoid timeout
    const BATCH_SIZE = 20
    const MAX_TIME_MS = 8000 // Leave 2 seconds buffer for response
    
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_TIME_MS) {
        console.log(`⏰ Time limit reached. Processed ${i} of ${products.length} products`)
        break
      }
      
      const batch = products.slice(i, i + BATCH_SIZE)
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: products ${i + 1}-${Math.min(i + BATCH_SIZE, products.length)}`)
      
      for (const productData of batch) {
        try {
          // Validate required fields
          if (!productData.external_id || !productData.name) {
            console.warn('Skipping product with missing required fields:', productData)
            errors++
            continue
          }
          
          // Transform product data to match our schema
          const productToSave = {
            external_id: String(productData.external_id),
            name: productData.name,
            category: productData.category || 'Uncategorized',
            price: productData.price || null,
            original_price: productData.original_price || null,
            on_sale: Boolean(productData.on_sale),
            description: productData.description || null,
            brand: productData.brand || null,
            image_url: productData.image_url || null,
            available: Boolean(productData.available),
            last_updated: new Date().toISOString(),
            source: 'rema1000'
          }
          
          if (!replaceAll) {
            // Check if product exists
            const { data: existingProduct } = await supabase
              .from('supermarket_products')
              .select('id, price, on_sale')
              .eq('external_id', productToSave.external_id)
              .eq('source', 'rema1000')
              .single()
            
            if (existingProduct) {
              // Product exists, update it
              const { error: updateError } = await supabase
                .from('supermarket_products')
                .update(productToSave)
                .eq('id', existingProduct.id)
              
              if (updateError) {
                console.error('Error updating product:', updateError)
                errors++
                continue
              }
              
              updated++
              
              // Add price history if price changed
              if (productToSave.price !== null && 
                  (existingProduct.price !== productToSave.price || 
                   existingProduct.on_sale !== productToSave.on_sale)) {
                
                const { error: historyError } = await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: existingProduct.id,
                    price: productToSave.price,
                    original_price: productToSave.original_price,
                    on_sale: productToSave.on_sale,
                    recorded_at: new Date().toISOString()
                  })
                
                if (historyError) {
                  console.error('Error adding price history:', historyError)
                } else {
                  priceHistoryAdded++
                }
              }
              
            } else {
              // Product doesn't exist, insert it
              const { data: newProduct, error: insertError } = await supabase
                .from('supermarket_products')
                .insert(productToSave)
                .select('id')
                .single()
              
              if (insertError) {
                console.error('Error inserting product:', insertError)
                errors++
                continue
              }
              
              inserted++
              
              // Add initial price history
              if (productToSave.price !== null && newProduct) {
                const { error: historyError } = await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: newProduct.id,
                    price: productToSave.price,
                    original_price: productToSave.original_price,
                    on_sale: productToSave.on_sale,
                    recorded_at: new Date().toISOString()
                  })
                
                if (historyError) {
                  console.error('Error adding initial price history:', historyError)
                } else {
                  priceHistoryAdded++
                }
              }
            }
          } else {
            // Replace all mode - just insert everything
            const { data: newProduct, error: insertError } = await supabase
              .from('supermarket_products')
              .insert(productToSave)
              .select('id')
              .single()
            
            if (insertError) {
              console.error('Error inserting product:', insertError)
              errors++
              continue
            }
            
            inserted++
            
            // Add initial price history
            if (productToSave.price !== null && newProduct) {
              const { error: historyError } = await supabase
                .from('supermarket_price_history')
                .insert({
                  product_id: newProduct.id,
                  price: productToSave.price,
                  original_price: productToSave.original_price,
                  on_sale: productToSave.on_sale,
                  recorded_at: new Date().toISOString()
                })
              
              if (historyError) {
                console.error('Error adding initial price history:', historyError)
              } else {
                priceHistoryAdded++
              }
            }
          }
          
        } catch (error: any) {
          console.error('Error processing product:', error)
          errors++
        }
      }
      
      // Small delay between batches
      if (i + BATCH_SIZE < products.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const timeElapsed = Date.now() - startTime
    
    console.log(`✅ Upload completed in ${timeElapsed}ms`)
    console.log(`📊 Results: ${inserted} inserted, ${updated} updated, ${errors} errors, ${priceHistoryAdded} price history entries`)
    
    return NextResponse.json({
      success: true,
      message: 'Products uploaded successfully',
      results: {
        inserted,
        updated,
        errors,
        priceHistoryAdded,
        totalProcessed: inserted + updated + errors,
        timeElapsed
      }
    })
    
  } catch (error: any) {
    console.error('❌ Upload failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Upload failed',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}
