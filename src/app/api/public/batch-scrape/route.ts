import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function transformProduct(productData: any, departmentId: number): any {
  try {
    // REMA API returns products directly in the data array
    const product = productData
    
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

    // Map department to correct category using the departmentId from the API call
    let category = 'Ukategoriseret'
    console.log(`🏷️ Product: ${product.name}, Department ID from API call: ${departmentId}`)
    
    // Use the departmentId from the API call since REMA doesn't include it in product data
    if (departmentId === 10) category = "Brød og kager"
    else if (departmentId === 20) category = "Frugt og grønt"
    else if (departmentId === 30) category = "Kød og fisk"
    else if (departmentId === 40) category = "Kød og fisk"
    else if (departmentId === 50) category = "Ukategoriseret"
    else if (departmentId === 60) category = "Mejeri og køl"
    else if (departmentId === 70) category = "Mejeri og køl"
    else if (departmentId === 80) category = "Kolonial"
    else if (departmentId === 90) category = "Drikkevarer"
    else if (departmentId === 100) category = "Husholdning"
    else if (departmentId === 110) category = "Baby og familie"
    else if (departmentId === 120) category = "Personlig pleje"
    else if (departmentId === 130) category = "Slik og snacks"
    else if (departmentId === 140) category = "Kiosk"
    else if (departmentId === 160) category = "Ukategoriseret"
    
    console.log(`🏷️ Mapped department ${departmentId} to category: ${category}`)

    const transformedProduct = {
      external_id: `python-${externalId}`, // Use same format as existing products
      name: product.name || 'Unknown Product',
      description: product.declaration || product.description || null,
      category: category,
      price: currentPrice || null,
      original_price: originalPrice || null,
      is_on_sale: onSale,
      image_url: product.images?.[0]?.large || product.images?.[0]?.medium || null,
      available: product.is_available_in_all_stores || true,
      last_updated: new Date().toISOString(),
      source: 'rema1000',
      store: 'REMA 1000'
    }
    
    console.log(`✅ Transformed product:`, JSON.stringify(transformedProduct, null, 2))
    return transformedProduct
  } catch (error) {
    console.error('Error transforming product:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 8000 // 8 seconds per batch
  
  try {
    // Get page from query params, other params from body
    const requestUrl = new URL(req.url)
    const page = parseInt(requestUrl.searchParams.get('page') || '1')
    const { departmentId, limit = 100 } = await req.json()
    
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
    
    // Check if response is actually JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text()
      console.error('❌ Response is not JSON:', textResponse.substring(0, 500))
      throw new Error(`API returned non-JSON response: ${contentType}`)
    }
    
    let data
    try {
      const responseText = await response.text()
      console.log(`📡 Response length: ${responseText.length} characters`)
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      const responseText = await response.text()
      console.error('❌ Response text (first 1000 chars):', responseText.substring(0, 1000))
      throw new Error(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
    }
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
      const transformedProduct = transformProduct(productData, departmentId)
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
        console.log(`🔍 Checking if product exists: ${product.external_id}`)
        const { data: existingProduct } = await supabase
          .from('supermarket_products')
          .select('id, price, original_price, is_on_sale, category')
          .eq('external_id', product.external_id)
          .single()
        
        console.log(`🔍 Existing product for ${product.external_id}:`, existingProduct ? 'EXISTS' : 'NOT FOUND')
        
        // Use upsert to insert or update product
        const { error: upsertError } = await supabase
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
            // Product existed before - check if prices or category changed
            const priceChanged = existingProduct.price !== product.price || 
                               existingProduct.original_price !== product.original_price ||
                               existingProduct.is_on_sale !== product.is_on_sale
            
            const categoryChanged = existingProduct.category !== product.category

            if (priceChanged || categoryChanged) {
              if (categoryChanged) {
                console.log(`🏷️ Category changed for ${product.name}: ${existingProduct.category} → ${product.category}`)
              }
              // Add price history entry for the OLD price before updating
              await supabase
                .from('supermarket_price_history')
                .insert({
                  product_external_id: product.external_id,
                  price: existingProduct.price,
                  original_price: existingProduct.original_price,
                  is_on_sale: existingProduct.is_on_sale,
                  timestamp: new Date().toISOString()
                })
              
              productsUpdated++
              console.log(`🔄 Updated product: ${product.name} (${existingProduct.price} → ${product.price})`)
            } else {
              console.log(`✅ No changes for: ${product.name}`)
            }
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
    
    // After successful batch scrape, run maintenance tasks
    let maintenanceResults = null
    if (discoveredProducts.length > 0) {
      try {
        console.log('🧹 Running maintenance tasks after batch scrape...')
        
        // Resolve absolute base URL from request or env
        const requestOrigin = (() => {
          try { return new URL(req.url).origin } catch { return undefined }
        })()
        const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_VERCEL_URL
        const normalizedEnvUrl = envUrl ? (/^https?:\/\//i.test(envUrl) ? envUrl : `https://${envUrl}`) : undefined
        const baseUrl = requestOrigin || normalizedEnvUrl || 'http://localhost:3000'

        // 1. Handle discontinued products
        const discontinuedResponse = await fetch(`${baseUrl}/api/admin/dagligvarer/handle-discontinued`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        let discontinuedData = null
        if (discontinuedResponse.ok) {
          discontinuedData = await discontinuedResponse.json()
          console.log('✅ Discontinued products handled:', discontinuedData)
        }
        
        // 2. Fix missing original prices (only run occasionally to avoid API overload)
        const shouldFixPrices = Math.random() < 0.1 // 10% chance to run
        if (shouldFixPrices) {
          console.log('🔧 Running price fix (10% chance)...')
          const priceFixResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/admin/dagligvarer/fix-missing-original-prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          
          if (priceFixResponse.ok) {
            const priceFixData = await priceFixResponse.json()
            console.log('✅ Price fixes applied:', priceFixData)
            maintenanceResults = {
              discontinued: discontinuedData,
              priceFix: priceFixData
            }
          }
        } else {
          maintenanceResults = {
            discontinued: discontinuedData,
            priceFix: { message: 'Skipped (10% chance)' }
          }
        }
        
      } catch (error) {
        console.warn('⚠️ Maintenance tasks failed:', error)
        maintenanceResults = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Batch scrape completed successfully',
      productsFound: discoveredProducts.length,
      productsAdded,
      productsUpdated,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      executionTime,
      maintenance: maintenanceResults
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
