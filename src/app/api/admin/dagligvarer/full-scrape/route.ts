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

function transformRemaProduct(apiData: any): any {
  if (!apiData?.product) return null
  
  const product = apiData.product
  const price = product.price?.value || 0
  const originalPrice = product.originalPrice?.value || price
  const isOnSale = product.price?.value < product.originalPrice?.value
  
  return {
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
    
    console.log('🚀 Starting full scrape for', shop)
    
    const supabase = createSupabaseServiceClient()
    
    // Discover products by scanning REMA's product IDs
    const productIds: number[] = []
    const scanRanges = [
      { start: 1, end: 1000 },
      { start: 10000, end: 15000 },
      { start: 50000, end: 70000 },
      { start: 100000, end: 120000 }
    ]
    
    // Quick discovery scan (sample product IDs to find valid ones)
    console.log('🔍 Discovering valid product IDs...')
    for (const range of scanRanges) {
      if (Date.now() - startTime > maxTimeMs * 0.3) break // Use max 30% of time for discovery
      
      const sampleSize = 20
      const step = Math.floor((range.end - range.start) / sampleSize)
      
      for (let i = 0; i < sampleSize; i++) {
        const testId = range.start + (i * step)
        const product = await fetchRemaProduct(testId)
        if (product?.product) {
          productIds.push(testId)
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }
    
    console.log(`📊 Found ${productIds.length} valid product IDs`)
    
    // Process products in batches
    let processed = 0
    let updated = 0
    let inserted = 0
    let errors = 0
    const batchSize = 10
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      // Check time limit
      if (Date.now() - startTime > maxTimeMs) {
        console.log(`⏰ Time limit reached. Processed ${processed}/${productIds.length} products`)
        break
      }
      
      const batch = productIds.slice(i, i + batchSize)
      console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productIds.length/batchSize)}`)
      
      // Process batch in parallel
      const batchPromises = batch.map(async (productId) => {
        try {
          const apiData = await fetchRemaProduct(productId)
          if (!apiData?.product) return { status: 'error' }
          
          const transformedProduct = transformRemaProduct(apiData)
          if (!transformedProduct) return { status: 'error' }
          
          // Check if product exists
          const { data: existingProduct } = await supabase
            .from('supermarket_products')
            .select('id, price, original_price, is_on_sale')
            .eq('external_id', transformedProduct.external_id)
            .single()
          
          if (existingProduct) {
            // Update existing product
            const { error: updateError } = await supabase
              .from('supermarket_products')
              .update(transformedProduct)
              .eq('id', existingProduct.id)
            
            if (updateError) throw updateError
            
            // Add price history if price changed
            if (existingProduct.price !== transformedProduct.price || 
                existingProduct.is_on_sale !== transformedProduct.is_on_sale) {
              await supabase
                .from('supermarket_price_history')
                .insert({
                  product_id: existingProduct.id,
                  price: transformedProduct.price,
                  original_price: transformedProduct.original_price,
                  is_on_sale: transformedProduct.is_on_sale,
                  timestamp: transformedProduct.last_updated
                })
            }
            
            return { status: 'updated' }
          } else {
            // Insert new product
            const { data: newProduct, error: insertError } = await supabase
              .from('supermarket_products')
              .insert(transformedProduct)
              .select('id')
              .single()
            
            if (insertError) throw insertError
            
            // Add initial price history
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_id: newProduct.id,
                price: transformedProduct.price,
                original_price: transformedProduct.original_price,
                is_on_sale: transformedProduct.is_on_sale,
                timestamp: transformedProduct.last_updated
              })
            
            return { status: 'inserted' }
          }
        } catch (error) {
          console.error(`Error processing product ${productId}:`, error)
          return { status: 'error' }
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // Count results
      batchResults.forEach(result => {
        processed++
        if (result.status === 'updated') updated++
        else if (result.status === 'inserted') inserted++
        else if (result.status === 'error') errors++
      })
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    const timeElapsed = Date.now() - startTime
    
    console.log(`✅ Full scrape completed: ${processed} processed, ${updated} updated, ${inserted} new, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Full scrape completed',
      shop,
      timeElapsed,
      stats: {
        processed,
        total: productIds.length,
        updated,
        inserted,
        errors
      },
      batches: {
        completed: Math.ceil(processed / batchSize),
        total: Math.ceil(productIds.length / batchSize)
      }
    })
    
  } catch (error) {
    console.error('❌ Full scrape failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Full scrape failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}