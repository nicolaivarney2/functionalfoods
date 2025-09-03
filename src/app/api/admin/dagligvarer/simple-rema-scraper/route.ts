import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Simple approach - try to find REMA's actual working endpoints
async function tryRemaEndpoint(url: string, options: any = {}): Promise<any> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://shop.rema1000.dk/',
    'Origin': 'https://shop.rema1000.dk',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...options.headers
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      ...options
    })

    if (!response.ok) {
      console.log(`❌ ${url} failed: ${response.status} ${response.statusText}`)
      return null
    }

    const text = await response.text()
    console.log(`✅ ${url} success: ${text.length} chars`)
    
    try {
      return JSON.parse(text)
    } catch {
      return { raw: text, length: text.length }
    }
  } catch (error: any) {
    console.log(`❌ ${url} error:`, error?.message || 'Unknown error')
    return null
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting simple REMA scraper...')
    
    const supabase = createSupabaseServiceClient()
    
    // Try different approaches to get REMA data
    const approaches = [
      // Approach 1: Try their search API (most likely to work)
      async () => {
        console.log('🔍 Trying search approach...')
        const searchTerms = ['mælk', 'brød', 'smør', 'kød', 'øl', 'kaffe', 'sukker', 'ris', 'pasta', 'juice']
        const products = []
        
        for (const term of searchTerms.slice(0, 3)) { // Only test first 3 to save time
          const searchUrl = `https://shop.rema1000.dk/api/search?q=${encodeURIComponent(term)}&limit=20`
          const result = await tryRemaEndpoint(searchUrl)
          
          if (result && result.products) {
            products.push(...result.products)
          } else if (result && Array.isArray(result)) {
            products.push(...result)
          }
          
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        return products
      },
      
      // Approach 2: Try their category pages
      async () => {
        console.log('🛒 Trying category approach...')
        const categories = ['frugt-groent', 'mejeri', 'broed', 'kolonial']
        const products = []
        
        for (const cat of categories) {
          const categoryUrl = `https://shop.rema1000.dk/api/categories/${cat}/products?limit=10`
          const result = await tryRemaEndpoint(categoryUrl)
          
          if (result && result.products) {
            products.push(...result.products)
          } else if (result && Array.isArray(result)) {
            products.push(...result)
          }
          
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        return products
      },
      
      // Approach 3: Try their product listing
      async () => {
        console.log('📦 Trying product listing approach...')
        const listingUrls = [
          'https://shop.rema1000.dk/api/products?page=1&limit=50',
          'https://shop.rema1000.dk/webapi/products?page=1&limit=50',
          'https://shop.rema1000.dk/api/v1/products?page=1&limit=50'
        ]
        
        for (const url of listingUrls) {
          const result = await tryRemaEndpoint(url)
          if (result && (result.products || Array.isArray(result))) {
            return result.products || result
          }
        }
        
        return []
      },
      
      // Approach 4: Try known product IDs (from your existing data)
      async () => {
        console.log('🔢 Trying direct product IDs...')
        const { data: existingProducts } = await supabase
          .from('supermarket_products')
          .select('external_id')
          .eq('source', 'rema1000')
          .limit(10)
        
        const products = []
        
        if (existingProducts) {
          for (const existing of existingProducts.slice(0, 5)) {
            const id = existing.external_id?.match(/\d+/)?.[0]
            if (id) {
              const productUrl = `https://shop.rema1000.dk/api/products/${id}`
              const result = await tryRemaEndpoint(productUrl)
              if (result && result.product) {
                products.push(result.product)
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        return products
      }
    ]
    
    let allProducts = []
    let successfulApproach = null
    
    // Try each approach until one works
    for (let i = 0; i < approaches.length; i++) {
      if (Date.now() - startTime > 8000) break // Stop before timeout
      
      try {
        const products = await approaches[i]()
        if (products && products.length > 0) {
          allProducts = products
          successfulApproach = i + 1
          console.log(`✅ Approach ${i + 1} worked! Found ${products.length} products`)
          break
        }
      } catch (error: any) {
        console.log(`❌ Approach ${i + 1} failed:`, error?.message || 'Unknown error')
      }
    }
    
    if (allProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No products found with any approach',
        debug: 'All scraping approaches failed to retrieve data'
      })
    }
    
    // Transform and save the products we found
    let updated = 0
    let inserted = 0
    let errors = 0
    
    for (const productData of allProducts.slice(0, 20)) { // Limit to 20 to avoid timeout
      try {
        const transformedProduct = transformRemaProduct(productData)
        if (!transformedProduct) continue
        
        // Check if exists
        const { data: existing } = await supabase
          .from('supermarket_products')
          .select('id, price, is_on_sale')
          .eq('external_id', transformedProduct.external_id)
          .single()
        
        if (existing) {
          // Update
          await supabase
            .from('supermarket_products')
            .update(transformedProduct)
            .eq('id', existing.id)
          
          // Add price history if changed
          if (existing.price !== transformedProduct.price || existing.is_on_sale !== transformedProduct.is_on_sale) {
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_id: existing.id,
                price: transformedProduct.price,
                original_price: transformedProduct.original_price,
                is_on_sale: transformedProduct.is_on_sale,
                timestamp: transformedProduct.last_updated
              })
          }
          
          updated++
        } else {
          // Insert new
          const { data: newProduct } = await supabase
            .from('supermarket_products')
            .insert(transformedProduct)
            .select('id')
            .single()
          
          if (newProduct) {
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_id: newProduct.id,
                price: transformedProduct.price,
                original_price: transformedProduct.original_price,
                is_on_sale: transformedProduct.is_on_sale,
                timestamp: transformedProduct.last_updated
              })
          }
          
          inserted++
        }
        
      } catch (error: any) {
        console.error('Error processing product:', error)
        errors++
      }
    }
    
    const timeElapsed = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'Simple REMA scraper completed',
      timeElapsed,
      approach: successfulApproach,
      stats: {
        found: allProducts.length,
        processed: updated + inserted,
        updated,
        inserted,
        errors
      }
    })
    
  } catch (error: any) {
    console.error('❌ Simple scraper failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Simple scraper failed',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

function transformRemaProduct(productData: any): any {
  try {
    // Handle different possible data structures
    const product = productData.product || productData
    
    if (!product || !product.id) return null
    
    const price = product.price?.value || product.price || 0
    const originalPrice = product.originalPrice?.value || product.originalPrice || price
    const isOnSale = product.isOnSale || (originalPrice > price) || product.labels?.includes('Tilbud')
    
    return {
      external_id: `python-${product.id}`,
      name: product.name || product.title || '',
      description: product.description || null,
      category: product.category?.name || product.categoryName || 'Ukategoriseret',
      subcategory: product.subcategory?.name || product.subcategoryName || null,
      price: price,
      original_price: originalPrice,
      is_on_sale: isOnSale,
      unit: product.unit || null,
      amount: product.amount || null,
      quantity: product.quantity || null,
      unit_price: product.unitPrice || product.unit_price || null,
      currency: 'DKK',
      store: 'REMA 1000',
      store_url: `https://shop.rema1000.dk/produkt/${product.id}`,
      image_url: product.imageUrl || product.image || null,
      available: product.available !== false,
      last_updated: new Date().toISOString(),
      source: 'rema1000'
    }
  } catch (error: any) {
    console.error('Transform error:', error)
    return null
  }
}
