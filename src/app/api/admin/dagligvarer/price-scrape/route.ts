import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// REMA 1000 API helpers
async function fetchRemaProduct(productId: number): Promise<any> {
  try {
    const response = await fetch(`https://shop.rema1000.dk/api/products/${productId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shop.rema1000.dk/'
      }
    })
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    return null
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 9000 // 9 seconds to stay under Vercel's 10s limit
  
  try {
    const body = await req.json()
    const shop = body.shop || 'rema1000'
    
    if (shop !== 'rema1000') {
      return NextResponse.json({
        success: false,
        message: `Shop ${shop} not implemented yet`
      }, { status: 400 })
    }
    
    console.log('🚀 Starting price scrape for', shop)
    
    const supabase = createSupabaseServiceClient()
    
    // Get existing products to check prices
    const { data: existingProducts, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('id, external_id, name, price, original_price, is_on_sale')
      .eq('source', shop)
      .order('last_updated', { ascending: true }) // Start with oldest products
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing products: ${fetchError.message}`)
    }
    
    console.log(`📊 Found ${existingProducts?.length || 0} existing products`)
    
    let processed = 0
    let updated = 0
    let errors = 0
    const batchSize = 15 // Slightly larger batches since we're only checking prices
    
    const productsToCheck = existingProducts || []
    
    for (let i = 0; i < productsToCheck.length; i += batchSize) {
      // Check time limit, but allow finishing last few batches
      const timeElapsed = Date.now() - startTime
      const remainingProducts = productsToCheck.length - i
      
      if (timeElapsed > maxTimeMs && remainingProducts > batchSize * 2) {
        console.log(`⏰ Time limit reached after ${processed} products. Stopping to avoid timeout.`)
        break
      }
      
      const batch = productsToCheck.slice(i, i + batchSize)
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productsToCheck.length/batchSize)} (products ${i + 1}-${Math.min(i + batchSize, productsToCheck.length)})`)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (existingProduct) => {
        try {
          // Extract numeric ID from external_id
          const externalId = existingProduct.external_id || existingProduct.id
          const numericIdMatch = externalId.match(/(\d+)/)
          if (!numericIdMatch) {
            return { status: 'error', product: existingProduct }
          }
          
          const numericId = parseInt(numericIdMatch[1])
          
          // Fetch fresh data from REMA API
          const freshApiData = await fetchRemaProduct(numericId)
          if (!freshApiData?.product) {
            return { status: 'unchanged', product: existingProduct }
          }
          
          const freshProduct = freshApiData.product
          const newPrice = freshProduct.price?.value || 0
          const newOriginalPrice = freshProduct.originalPrice?.value || newPrice
          const newIsOnSale = freshProduct.price?.value < freshProduct.originalPrice?.value
          
          // Check for changes (only price-related fields)
          const hasPriceChange = newPrice !== existingProduct.price
          const hasOfferChange = newIsOnSale !== existingProduct.is_on_sale
          const hasOriginalPriceChange = newOriginalPrice !== existingProduct.original_price
          
          if (hasPriceChange || hasOfferChange || hasOriginalPriceChange) {
            // Update only price-related fields in database
            const { error: updateError } = await supabase
              .from('supermarket_products')
              .update({
                price: newPrice,
                original_price: newOriginalPrice,
                is_on_sale: newIsOnSale,
                last_updated: new Date().toISOString()
              })
              .eq('id', existingProduct.id)
            
            if (updateError) {
              console.error(`❌ Failed to update ${existingProduct.name}:`, updateError)
              return { status: 'error', product: existingProduct }
            }
            
            // Add price history
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_id: existingProduct.id,
                price: newPrice,
                original_price: newOriginalPrice,
                is_on_sale: newIsOnSale,
                timestamp: new Date().toISOString()
              })
            
            console.log(`✅ Updated ${existingProduct.name}: ${existingProduct.price} → ${newPrice} (sale: ${existingProduct.is_on_sale} → ${newIsOnSale})`)
            return { status: 'updated', product: existingProduct }
          } else {
            return { status: 'unchanged', product: existingProduct }
          }
        } catch (error) {
          console.error(`❌ Error processing ${existingProduct.name}:`, error)
          return { status: 'error', product: existingProduct }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // Count results
      batchResults.forEach(result => {
        processed++
        if (result.status === 'updated') updated++
        else if (result.status === 'error') errors++
      })
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 30))
    }
    
    const timeElapsed = Date.now() - startTime
    const unchanged = processed - updated - errors
    
    console.log(`✅ Price scrape completed: ${processed} processed, ${updated} updated, ${unchanged} unchanged, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Price scrape completed',
      shop,
      timeElapsed,
      stats: {
        processed,
        total: productsToCheck.length,
        updated,
        inserted: 0, // Price scrape doesn't insert new products
        errors
      },
      batches: {
        completed: Math.ceil(processed / batchSize),
        total: Math.ceil(productsToCheck.length / batchSize)
      }
    })
    
  } catch (error) {
    console.error('❌ Price scrape failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Price scrape failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}