import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 25000 // 25 seconds for Vercel timeout
  
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
    const departmentsResponse = await fetch('https://api.digital.rema1000.dk/api/v3/departments')
    const departmentsData = await departmentsResponse.json()
    const departments = departmentsData.data || []
    
    console.log(`📂 Found ${departments.length} departments`)
    
    for (const department of departments) {
      console.log(`🔍 Fetching products from ${department.name} (ID: ${department.id})...`)
      
      let page = 1
      let hasMorePages = true
      
      while (hasMorePages && Date.now() - startTime < maxTimeMs) {
        try {
          const url = `https://api.digital.rema1000.dk/api/v3/departments/${department.id}/products?page=${page}&limit=50`
          const response = await fetch(url)
          const data = await response.json()
          
          if (data.data && data.data.length > 0) {
            // Transform products to our format
            for (const productData of data.data) {
              const transformedProduct = transformProduct(productData)
              if (transformedProduct) {
                discoveredProducts.push(transformedProduct)
              }
            }
            
            console.log(`📦 Page ${page}: Found ${data.data.length} products (Total: ${discoveredProducts.length})`)
            
            // Check if there are more pages
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
    
    console.log(`📦 Total products found: ${discoveredProducts.length}`)
    
    console.log(`📦 Discovered ${discoveredProducts.length} products`)
    
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
    const batchSize = 50
    let productsAdded = 0
    let productsUpdated = 0
    let processedCount = 0
    
    for (let i = 0; i < discoveredProducts.length; i += batchSize) {
      const batch = discoveredProducts.slice(i, i + batchSize)
      const batchStartTime = Date.now()
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(discoveredProducts.length / batchSize)} (${batch.length} products)`)
      
      for (const product of batch) {
        try {
          // Check if product already exists
          const { data: existingProduct } = await supabase
            .from('supermarket_products')
            .select('id, price, original_price')
            .eq('external_id', product.external_id)
            .single()
          
          if (existingProduct) {
            // Update existing product
            const { error: updateError } = await supabase
              .from('supermarket_products')
              .update({
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                original_price: product.original_price,
                is_on_sale: product.isOnSale,
                imageUrl: product.imageUrl,
                available: product.available,
                lastUpdated: product.lastUpdated
              })
              .eq('external_id', product.external_id)
            
            if (updateError) {
              console.error(`❌ Failed to update product ${product.external_id}:`, updateError)
            } else {
              productsUpdated++
              
              // Add price history if price changed
              if (existingProduct.price !== product.price) {
                await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: existingProduct.id,
                    price: product.price,
                    original_price: product.original_price,
                    is_on_sale: product.isOnSale,
                    recorded_at: new Date().toISOString()
                  })
              }
            }
          } else {
            // Insert new product
            const { data: newProduct, error: insertError } = await supabase
              .from('supermarket_products')
              .insert({
                external_id: product.external_id,
                name: product.name,
                description: product.description,
                category: product.category,
                price: product.price,
                original_price: product.original_price,
                is_on_sale: product.isOnSale,
                imageUrl: product.imageUrl,
                available: product.available,
                lastUpdated: product.lastUpdated,
                source: product.source
              })
              .select('id')
              .single()
            
            if (insertError) {
              console.error(`❌ Failed to insert product ${product.external_id}:`, insertError)
            } else {
              productsAdded++
              
              // Add initial price history
              await supabase
                .from('supermarket_price_history')
                .insert({
                  product_id: newProduct.id,
                  price: product.price,
                  original_price: product.original_price,
                  is_on_sale: product.isOnSale,
                  recorded_at: new Date().toISOString()
                })
            }
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