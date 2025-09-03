import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Zyte API configuration
const ZYTE_API_KEY = process.env.ZYTE_API_KEY
const ZYTE_API_URL = 'https://api.zyte.com/v1/extract'

// Zyte API helper functions
async function zyteRequest(payload: any): Promise<any> {
  if (!ZYTE_API_KEY) {
    throw new Error('Zyte API key not configured')
  }

  const response = await fetch(ZYTE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${ZYTE_API_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Zyte API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function decodeBase64Response(body: string): any {
  try {
    const decoded = Buffer.from(body, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch (error) {
    console.error('Failed to decode Zyte response:', error)
    return null
  }
}

async function fetchJSONViaZyte(url: string): Promise<any> {
  const payload = {
    url,
    httpResponseBody: true,
    geolocation: 'DK'
  }

  try {
    const result = await zyteRequest(payload)
    if (result.httpResponseBody) {
      return decodeBase64Response(result.httpResponseBody)
    }
  } catch (error) {
    console.error(`Failed to fetch ${url} via Zyte:`, error)
  }
  
  return null
}

async function fetchProductPricesViaZyte(productIds: string[]): Promise<any[]> {
  console.log(`💰 Fetching prices for ${productIds.length} products via Zyte...`)
  
  const priceData: any[] = []
  const BATCH_SIZE = 10 // Process in smaller batches for price updates
  
  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE)
    console.log(`📦 Processing price batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products`)
    
    for (const productId of batch) {
      try {
        // Try different price endpoints
        const endpoints = [
          `https://shop.rema1000.dk/api/products/${productId}`,
          `https://shop.rema1000.dk/api/v1/products/${productId}`,
          `https://shop.rema1000.dk/webapi/products/${productId}`
        ]
        
        for (const endpoint of endpoints) {
          const data = await fetchJSONViaZyte(endpoint)
          
          if (data && (data.product || data.id || data.price)) {
            const product = data.product || data
            
            if (product.price !== undefined || product.currentPrice !== undefined) {
              priceData.push({
                external_id: `rema-${productId}`,
                price: parseFloat(product.price?.value || product.price || product.currentPrice || 0),
                original_price: parseFloat(product.originalPrice?.value || product.originalPrice || product.listPrice || 0),
                on_sale: product.onSale || (product.price < product.originalPrice),
                available: product.available !== false
              })
              break // Found price data, move to next product
            }
          }
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`Error fetching price for product ${productId}:`, error)
      }
    }
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return priceData
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 25000 // 25 seconds for Zyte requests
  
  try {
    const body = await req.json()
    const shop = body.shop || 'rema1000'
    
    if (shop !== 'rema1000') {
      return NextResponse.json({
        success: false,
        message: `Shop ${shop} not implemented yet`
      }, { status: 400 })
    }

    if (!ZYTE_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'Zyte API key not configured. Please add ZYTE_API_KEY to environment variables.'
      }, { status: 500 })
    }
    
    console.log('💰 Starting Zyte-powered price scrape for', shop)
    
    const supabase = createSupabaseServiceClient()
    
    // Get existing REMA products from database
    console.log('📊 Fetching existing products from database...')
    const { data: existingProducts, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('id, external_id, price, original_price, on_sale')
      .eq('source', 'rema1000')
      .order('last_updated', { ascending: false })
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing products: ${fetchError.message}`)
    }
    
    if (!existingProducts || existingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No existing REMA products found. Run a full scrape first.'
      }, { status: 400 })
    }
    
    console.log(`📦 Found ${existingProducts.length} existing products`)
    
    // Extract product IDs from external_id (remove 'rema-' prefix)
    const productIds = existingProducts
      .map(p => p.external_id.replace('rema-', ''))
      .filter(id => id && id !== 'undefined')
      .slice(0, 200) // Limit to 200 products for price scrape to stay within time limit
    
    console.log(`🎯 Will check prices for ${productIds.length} products`)
    
    // Fetch current prices via Zyte
    const priceData = await fetchProductPricesViaZyte(productIds)
    console.log(`💰 Retrieved price data for ${priceData.length} products`)
    
    // Update products and track changes
    let processed = 0
    let updated = 0
    let priceChanges = 0
    let errors = 0
    
    for (const priceInfo of priceData) {
      if (Date.now() - startTime > maxTimeMs * 0.9) {
        console.log(`⏰ Time limit reached. Processed ${processed} of ${priceData.length} products`)
        break
      }
      
      try {
        // Find the existing product
        const existingProduct = existingProducts.find(p => p.external_id === priceInfo.external_id)
        
        if (!existingProduct) {
          console.warn(`Product not found in database: ${priceInfo.external_id}`)
          errors++
          continue
        }
        
        // Check if price changed
        const priceChanged = existingProduct.price !== priceInfo.price || 
                           existingProduct.on_sale !== priceInfo.on_sale
        
        // Update product
        const { error: updateError } = await supabase
          .from('supermarket_products')
          .update({
            price: priceInfo.price,
            original_price: priceInfo.original_price || priceInfo.price,
            on_sale: priceInfo.on_sale,
            available: priceInfo.available,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingProduct.id)
        
        if (updateError) {
          console.error(`Error updating product ${existingProduct.id}:`, updateError)
          errors++
          continue
        }
        
        updated++
        
        // Add price history if price changed
        if (priceChanged) {
          const { error: historyError } = await supabase
            .from('supermarket_price_history')
            .insert({
              product_id: existingProduct.id,
              price: priceInfo.price,
              original_price: priceInfo.original_price || priceInfo.price,
              on_sale: priceInfo.on_sale,
              recorded_at: new Date().toISOString()
            })
          
          if (historyError) {
            console.error(`Error adding price history for product ${existingProduct.id}:`, historyError)
          } else {
            priceChanges++
          }
        }
        
        processed++
        
      } catch (error) {
        console.error('Error processing price update:', error)
        errors++
      }
    }
    
    const timeElapsed = Date.now() - startTime
    
    console.log(`✅ Zyte price scrape completed: ${processed} processed, ${updated} updated, ${priceChanges} price changes, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Zyte-powered price scrape completed',
      shop,
      timeElapsed,
      stats: {
        processed,
        total: priceData.length,
        updated,
        priceChanges,
        errors,
        existingProducts: existingProducts.length
      }
    })
    
  } catch (error: any) {
    console.error('❌ Zyte price scrape failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Zyte price scrape failed',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}