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

    return {
      external_id: `python-${externalId}`, // Use same format as existing products
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
  const maxTimeMs = 9500 // 9.5 seconds for Vercel timeout (safe margin)
  
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
    
    // Get all products from all departments
    console.log('🔍 Fetching all products from all departments...')
    const discoveredProducts = []
    
    // Get all departments first
    console.log('🔍 Fetching departments...')
    const departmentsResponse = await fetch('https://api.digital.rema1000.dk/api/v3/departments')
    console.log('📡 Departments response status:', departmentsResponse.status)
    const departmentsData = await departmentsResponse.json()
    console.log('📊 Departments data:', JSON.stringify(departmentsData).substring(0, 500) + '...')
    const departments = departmentsData.data || []
    console.log(`📂 Found ${departments.length} departments`)
    
    // Limit to first 3 departments for quick scrape (to avoid timeout)
    const limitedDepartments = departments.slice(0, 3)
    console.log(`🔍 Limiting to first ${limitedDepartments.length} departments to avoid timeout`)
    
    for (const department of limitedDepartments) {
      // Check timeout before starting each department
      if (Date.now() - startTime > maxTimeMs) {
        console.log(`⏰ Timeout reached, stopping at department ${department.name}`)
        break
      }
      
      console.log(`🔍 Fetching products from ${department.name} (ID: ${department.id})...`)
      let page = 1
      let hasMorePages = true
      
      while (hasMorePages && Date.now() - startTime < maxTimeMs) {
        try {
          const url = `https://api.digital.rema1000.dk/api/v3/departments/${department.id}/products?page=${page}&limit=50`
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
              }
            }
            console.log(`📦 Page ${page}: Found ${data.data.length} products (Total: ${discoveredProducts.length})`)
            
            const pagination = data.meta?.pagination
            hasMorePages = pagination && page < pagination.last_page
            page++
          } else {
            hasMorePages = false
          }
        } catch (error) {
          console.log(`❌ Error fetching page ${page} from ${department.name}:`, error)
          hasMorePages = false
        }
      }
      console.log(`✅ Completed ${department.name}: ${discoveredProducts.length} total products`)
    }
    
    console.log(`📦 Discovered ${discoveredProducts.length} products`)
    
    // Check if we're already close to timeout
    if (Date.now() - startTime > maxTimeMs - 2000) {
      console.log(`⏰ Already close to timeout, skipping database processing`)
      return NextResponse.json({
        success: true,
        message: 'Scrape completed but skipped database processing due to timeout',
        productsFound: discoveredProducts.length,
        productsAdded: 0,
        productsUpdated: 0,
        executionTime: Date.now() - startTime
      })
    }
    
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
    const batchSize = 20 // Smaller batches for faster processing
    let productsAdded = 0
    let productsUpdated = 0
    let processedCount = 0
    
    for (let i = 0; i < discoveredProducts.length; i += batchSize) {
      const batch = discoveredProducts.slice(i, i + batchSize)
      const batchStartTime = Date.now()
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(discoveredProducts.length / batchSize)} (${batch.length} products)`)
      
      for (const product of batch) {
        // Check timeout BEFORE processing each product
        if (Date.now() - startTime > maxTimeMs) {
          console.log(`⏰ Timeout reached after ${processedCount} products`)
          break
        }
        
        try {
          // Check if product already exists BEFORE upsert
          const { data: existingProduct } = await supabase
            .from('supermarket_products')
            .select('id, price')
            .eq('external_id', product.external_id)
            .single()
          
          // Use upsert to insert or update product
          const { data: upsertedProduct, error: upsertError } = await supabase
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
              // Product existed before - this was an update
              productsUpdated++
              console.log(`🔄 Updated product: ${product.name}`)
            } else {
              // Product didn't exist before - this was an insert
              productsAdded++
              console.log(`➕ Added product: ${product.name}`)
            }
            
            // Add price history
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_id: upsertedProduct.id,
                price: product.price,
                original_price: product.original_price,
                is_on_sale: product.is_on_sale,
                recorded_at: new Date().toISOString()
              })
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