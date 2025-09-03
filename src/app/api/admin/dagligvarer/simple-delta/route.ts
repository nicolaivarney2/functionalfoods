import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Simple REMA API call to get fresh product data
async function fetchRemaProduct(productId: number): Promise<any> {
  try {
    const response = await fetch(`https://shop.rema1000.dk/api/products/${productId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shop.rema1000.dk/'
      }
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error)
    return null
  }
}

// Transform REMA API data to our format
function transformRemaProduct(apiData: any): any {
  if (!apiData || !apiData.product) return null
  
  const product = apiData.product
  const price = product.price?.value || 0
  const originalPrice = product.originalPrice?.value || price
  const isOnSale = product.price?.value < product.originalPrice?.value
  
  return {
    id: `rema-${product.id}`,
    external_id: `python-${product.id}`,
    name: product.name || '',
    description: product.description || null,
    category: product.category?.name || null,
    subcategory: product.subcategory?.name || null,
    price: price,
    original_price: originalPrice,
    is_on_sale: isOnSale,
    unit: product.unit || null,
    amount: product.amount || null,
    quantity: product.quantity || null,
    unit_price: product.unitPrice || null,
    currency: 'DKK',
    store: 'REMA 1000',
    store_url: `https://shop.rema1000.dk/produkt/${product.id}`,
    image_url: product.imageUrl || null,
    available: product.available !== false,
    last_updated: new Date().toISOString(),
    source: 'rema1000'
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting simple delta update...')
    
    const supabase = createSupabaseServiceClient()
    
    // Get all REMA products from database
    const { data: existingProducts, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('*')
      .eq('source', 'rema1000')
      .order('last_updated', { ascending: true })
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing products: ${fetchError.message}`)
    }
    
    console.log(`📊 Found ${existingProducts?.length || 0} existing products`)
    
    let updated = 0
    let unchanged = 0
    let errors = 0
    const batchSize = 20 // Process 20 products per batch
    const maxTimeMs = 9000 // Stop after 9 seconds to avoid Vercel timeout
    
    const productsToCheck = existingProducts || []
    const startTime = Date.now()
    
    for (let i = 0; i < productsToCheck.length; i += batchSize) {
      const batch = productsToCheck.slice(i, i + batchSize)
      
      // Check if we're running out of time, but be smart about it
      const timeElapsed = Date.now() - startTime
      const remainingProducts = productsToCheck.length - i
      
      // If we have less than 2 batches left, process them regardless of time
      // This prevents stopping with just a few products remaining
      if (timeElapsed > maxTimeMs && remainingProducts > batchSize * 2) {
        console.log(`⏰ Time limit reached after ${i} products. Stopping to avoid timeout.`)
        break
      }
      
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productsToCheck.length/batchSize)} (products ${i + 1}-${Math.min(i + batchSize, productsToCheck.length)})`)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (existingProduct) => {
        try {
          // Extract numeric ID from external_id
          const externalId = existingProduct.external_id || existingProduct.id
          const numericIdMatch = externalId.match(/(\d+)/)
          if (!numericIdMatch) {
            console.log(`⚠️ No numeric ID found for ${existingProduct.name}`)
            return { status: 'unchanged', product: existingProduct }
          }
          
          const numericId = parseInt(numericIdMatch[1])
          
          // Fetch fresh data from REMA API
          const freshApiData = await fetchRemaProduct(numericId)
          if (!freshApiData) {
            return { status: 'unchanged', product: existingProduct }
          }
          
          const freshProduct = transformRemaProduct(freshApiData)
          if (!freshProduct) {
            return { status: 'unchanged', product: existingProduct }
          }
          
          // Check for changes
          const hasPriceChange = freshProduct.price !== existingProduct.price
          const hasOfferChange = freshProduct.is_on_sale !== existingProduct.is_on_sale
          const hasOriginalPriceChange = freshProduct.original_price !== existingProduct.original_price
          
          if (hasPriceChange || hasOfferChange || hasOriginalPriceChange) {
            // Update product in database
            const { error: updateError } = await supabase
              .from('supermarket_products')
              .update({
                price: freshProduct.price,
                original_price: freshProduct.original_price,
                is_on_sale: freshProduct.is_on_sale,
                last_updated: new Date().toISOString()
              })
              .eq('id', existingProduct.id)
            
            if (updateError) {
              console.error(`❌ Failed to update ${existingProduct.name}:`, updateError)
              return { status: 'error', product: existingProduct }
            }
            
            // Add price history
            await databaseService.addPriceHistory({
              id: existingProduct.id,
              price: freshProduct.price,
              originalPrice: freshProduct.original_price,
              isOnSale: freshProduct.is_on_sale,
              timestamp: new Date().toISOString()
            })
            
            console.log(`✅ Updated ${existingProduct.name}: ${existingProduct.price} → ${freshProduct.price} (sale: ${existingProduct.is_on_sale} → ${freshProduct.is_on_sale})`)
            return { status: 'updated', product: existingProduct, freshProduct }
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
        if (result.status === 'updated') updated++
        else if (result.status === 'unchanged') unchanged++
        else if (result.status === 'error') errors++
      })
      
      // Small delay between batches
      if (i + batchSize < productsToCheck.length) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    const totalProcessed = updated + unchanged + errors
    const remaining = productsToCheck.length - totalProcessed
    
    console.log(`✅ Simple delta update completed: ${updated} updated, ${unchanged} unchanged, ${errors} errors`)
    if (remaining > 0) {
      console.log(`📝 Note: ${remaining} products remaining (stopped due to time limit)`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Simple delta update completed',
      timestamp: new Date().toISOString(),
      results: {
        updated,
        unchanged,
        errors,
        totalProcessed: updated + unchanged + errors,
        totalProducts: productsToCheck.length,
        remaining: productsToCheck.length - (updated + unchanged + errors)
      }
    })
    
  } catch (error) {
    console.error('❌ Simple delta update failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Simple delta update failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
