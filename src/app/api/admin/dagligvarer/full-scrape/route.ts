import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Zyte API configuration
const ZYTE_API_KEY = process.env.ZYTE_API_KEY
const ZYTE_API_URL = 'https://api.zyte.com/v1/extract'

if (!ZYTE_API_KEY) {
  console.error('❌ ZYTE_API_KEY environment variable is required')
}

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

async function discoverREMAEndpoints(): Promise<string[]> {
  console.log('🔍 Discovering REMA API endpoints via Zyte...')
  
  const payload = {
    url: 'https://shop.rema1000.dk/',
    geolocation: 'DK',
    networkCapture: [
      {
        filterType: 'url',
        matchType: 'contains', 
        value: 'api',
        httpResponseBody: true
      }
    ],
    actions: [
      { action: 'waitForResponse', url: { matchType: 'contains', value: 'api' } },
      { action: 'scrollBottom' },
      { action: 'wait', seconds: 2 }
    ]
  }

  try {
    const result = await zyteRequest(payload)
    const endpoints: string[] = []
    
    for (const capture of result.networkCapture || []) {
      const url = capture.url
      if (url && url.includes('api')) {
        endpoints.push(url)
        console.log(`✅ Found API endpoint: ${url}`)
      }
    }
    
    return Array.from(new Set(endpoints)) // Remove duplicates
  } catch (error) {
    console.error('Failed to discover endpoints:', error)
    return []
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

async function findWorkingProductsEndpoint(): Promise<string | null> {
  console.log('🎯 Testing product endpoints via Zyte...')
  
  const testPatterns = [
    'https://shop.rema1000.dk/api/products',
    'https://shop.rema1000.dk/api/v1/products', 
    'https://shop.rema1000.dk/api/v2/products',
    'https://shop.rema1000.dk/webapi/products',
    'https://shop.rema1000.dk/api/products?page=1&limit=50'
  ]

  for (const url of testPatterns) {
    console.log(`🔍 Testing: ${url}`)
    const data = await fetchJSONViaZyte(url)
    
    if (data) {
      console.log(`📊 Response from ${url}:`, {
        isArray: Array.isArray(data),
        keys: typeof data === 'object' ? Object.keys(data) : 'not object',
        length: Array.isArray(data) ? data.length : 'not array',
        preview: JSON.stringify(data).substring(0, 200) + '...'
      })
      
      // Check if this looks like product data
      let products = []
      if (Array.isArray(data)) {
        products = data
      } else if (data.products) {
        products = data.products
      } else if (data.items) {
        products = data.items
      } else if (data.data) {
        products = data.data
      }

      console.log(`📦 Extracted ${products.length} products from ${url}`)

      if (products.length > 0) {
        const firstItem = products[0]
        console.log(`🔍 First item from ${url}:`, {
          hasId: !!firstItem.id,
          hasName: !!firstItem.name,
          hasPrice: !!firstItem.price,
          keys: Object.keys(firstItem)
        })
        
        if (firstItem.id || firstItem.name || firstItem.price) {
          console.log(`✅ Found working products endpoint: ${url}`)
          return url
        }
      } else {
        console.log(`⚠️ No products found in response from ${url}`)
      }
    } else {
      console.log(`❌ No data returned from ${url}`)
    }
  }

  console.log('❌ No working products endpoint found')
  return null
}

async function scrapeProductsPaginated(baseUrl: string, maxProducts: number = 1000): Promise<any[]> {
  console.log(`🛒 Scraping products from: ${baseUrl}`)
  
  const allProducts: any[] = []
  let page = 1
  const maxPages = Math.ceil(maxProducts / 50)

  while (page <= maxPages && allProducts.length < maxProducts) {
    const url = baseUrl.includes('?') 
      ? `${baseUrl}&page=${page}&limit=50`
      : `${baseUrl}?page=${page}&limit=50`
    
    console.log(`📄 Fetching page ${page}...`)
    const data = await fetchJSONViaZyte(url)
    
    if (!data) {
      console.log(`❌ No data for page ${page}, stopping`)
      break
    }

    // Extract products from response
    let products = []
    if (Array.isArray(data)) {
      products = data
    } else if (data.products) {
      products = data.products
    } else if (data.items) {
      products = data.items
    } else if (data.data) {
      products = data.data
    }

    if (products.length === 0) {
      console.log(`📄 No products on page ${page}, stopping`)
      break
    }

    allProducts.push(...products)
    console.log(`📄 Page ${page}: ${products.length} products (Total: ${allProducts.length})`)

    // Stop if we got fewer products than expected (end of data)
    if (products.length < 50) {
      console.log(`📄 Got ${products.length} products (< 50), assuming end of data`)
      break
    }

    page++
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return allProducts
}

function transformProduct(productData: any): any {
  try {
    const product = productData.product || productData
    
    if (!product.id && !product.productId && !product.name) {
      return null
    }

    const externalId = String(product.id || product.productId || Math.random())
    const currentPrice = parseFloat(product.price?.value || product.price || product.currentPrice || 0)
    const originalPrice = parseFloat(product.originalPrice?.value || product.originalPrice || product.listPrice || currentPrice)
    const onSale = currentPrice < originalPrice

    return {
      external_id: `rema-${externalId}`,
      name: product.name || product.title || 'Unknown Product',
      description: product.description || null,
      category: product.category?.name || product.category || 'Uncategorized',
      price: currentPrice || null,
      original_price: originalPrice || null,
      on_sale: onSale,
      brand: product.brand || product.manufacturer || null,
      image_url: product.imageUrl || product.image || null,
      available: product.available !== false,
      last_updated: new Date().toISOString(),
      source: 'rema1000'
    }
  } catch (error) {
    console.error('Transform error:', error)
    return null
  }
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
    
    console.log('🚀 Starting Zyte-powered full scrape for', shop)
    
    const supabase = createSupabaseServiceClient()
    
    // Step 1: Discover API endpoints
    const discoveredEndpoints = await discoverREMAEndpoints()
    console.log(`📡 Discovered ${discoveredEndpoints.length} endpoints`)

    // Step 2: Find working products endpoint
    const productsEndpoint = await findWorkingProductsEndpoint()
    
    if (!productsEndpoint) {
      console.log('🔄 No API endpoints found, trying main page scraping...')
      
      // Fallback: Try to scrape from main page
      const mainPageData = await fetchJSONViaZyte('https://shop.rema1000.dk/')
      
      if (mainPageData && mainPageData.products) {
        console.log('✅ Found products on main page, using fallback strategy')
        // Use main page as endpoint
        const allProducts = mainPageData.products || []
        
        // Process and save products
        let processed = 0
        let updated = 0
        let inserted = 0
        let errors = 0

        for (const productData of allProducts) {
          if (Date.now() - startTime > maxTimeMs * 0.9) {
            console.log(`⏰ Time limit reached. Processed ${processed} of ${allProducts.length} products`)
            break
          }

          try {
            const transformedProduct = transformProduct(productData)
            if (!transformedProduct) {
              errors++
              continue
            }

            // Check if product exists
            const { data: existingProduct } = await supabase
              .from('supermarket_products')
              .select('id, price, on_sale')
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
                  existingProduct.on_sale !== transformedProduct.on_sale) {
                await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: existingProduct.id,
                    price: transformedProduct.price,
                    original_price: transformedProduct.original_price,
                    on_sale: transformedProduct.on_sale,
                    recorded_at: new Date().toISOString()
                  })
              }

              updated++
            } else {
              // Insert new product
              const { data: newProduct, error: insertError } = await supabase
                .from('supermarket_products')
                .insert(transformedProduct)
                .select('id')
                .single()

              if (insertError) throw insertError

              // Add initial price history
              if (transformedProduct.price !== null) {
                await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: newProduct.id,
                    price: transformedProduct.price,
                    original_price: transformedProduct.original_price,
                    on_sale: transformedProduct.on_sale,
                    recorded_at: new Date().toISOString()
                  })
              }

              inserted++
            }

            processed++

          } catch (error) {
            console.error('Error processing product:', error)
            errors++
          }
        }
        
        const timeElapsed = Date.now() - startTime
        
        console.log(`✅ Main page scrape completed: ${processed} processed, ${updated} updated, ${inserted} new, ${errors} errors`)
        
        return NextResponse.json({
          success: true,
          message: 'Main page scrape completed (fallback)',
          shop,
          timeElapsed,
          stats: {
            processed,
            total: allProducts.length,
            updated,
            inserted,
            errors
          },
          zyte: {
            discoveredEndpoints: discoveredEndpoints.length,
            usedFallback: true
          }
        })
      }
      
      return NextResponse.json({
        success: false,
        message: 'No working products endpoint found via Zyte API and main page fallback failed',
        discoveredEndpoints
      }, { status: 500 })
    }

    // Step 3: Scrape products
    const maxProducts = Math.floor((maxTimeMs - (Date.now() - startTime)) / 1000) * 10 // Estimate based on remaining time
    const allProducts = await scrapeProductsPaginated(productsEndpoint, maxProducts)
    
    console.log(`📦 Scraped ${allProducts.length} total products`)

    // Step 4: Process and save products
    let processed = 0
    let updated = 0
    let inserted = 0
    let errors = 0

    for (const productData of allProducts) {
      if (Date.now() - startTime > maxTimeMs * 0.9) {
        console.log(`⏰ Time limit reached. Processed ${processed} of ${allProducts.length} products`)
        break
      }

      try {
        const transformedProduct = transformProduct(productData)
        if (!transformedProduct) {
          errors++
          continue
        }

        // Check if product exists
        const { data: existingProduct } = await supabase
          .from('supermarket_products')
          .select('id, price, on_sale')
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
              existingProduct.on_sale !== transformedProduct.on_sale) {
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_id: existingProduct.id,
                price: transformedProduct.price,
                original_price: transformedProduct.original_price,
                on_sale: transformedProduct.on_sale,
                recorded_at: new Date().toISOString()
              })
          }

          updated++
        } else {
          // Insert new product
          const { data: newProduct, error: insertError } = await supabase
            .from('supermarket_products')
            .insert(transformedProduct)
            .select('id')
            .single()

          if (insertError) throw insertError

          // Add initial price history
          if (transformedProduct.price !== null) {
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_id: newProduct.id,
                price: transformedProduct.price,
                original_price: transformedProduct.original_price,
                on_sale: transformedProduct.on_sale,
                recorded_at: new Date().toISOString()
              })
          }

          inserted++
        }

        processed++

      } catch (error) {
        console.error('Error processing product:', error)
        errors++
      }
    }
    
    const timeElapsed = Date.now() - startTime
    
    console.log(`✅ Zyte scrape completed: ${processed} processed, ${updated} updated, ${inserted} new, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Zyte-powered full scrape completed',
      shop,
      timeElapsed,
      stats: {
        processed,
        total: allProducts.length,
        updated,
        inserted,
        errors
      },
      zyte: {
        discoveredEndpoints: discoveredEndpoints.length,
        productsEndpoint
      }
    })
    
  } catch (error: any) {
    console.error('❌ Zyte scrape failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Zyte scrape failed',
      error: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}