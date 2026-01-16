import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  const startTime = Date.now()
  const maxExecutionTime = 8000 // 8 seconds max to avoid Vercel timeout
  
  try {
    console.log('🔄 Starting discontinued products handler...')
    
    const supabase = createSupabaseServiceClient()
    
    // Get all current REMA products from our database
    const { data: allRemaProducts, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('external_id, name, store, source')
      .eq('source', 'rema1000')
      .eq('store', 'REMA 1000')

    if (fetchError) {
      throw new Error(`Failed to fetch REMA products: ${fetchError.message}`)
    }

    console.log(`📦 Found ${allRemaProducts?.length || 0} REMA products in database`)

    if (!allRemaProducts || allRemaProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No REMA products found in database',
        discontinued: 0,
        hidden: 0,
        priceRemoved: 0
      })
    }

    // Get current REMA products from API (all departments)
    const departmentsResponse = await fetch('https://api.digital.rema1000.dk/api/v3/departments')
    if (!departmentsResponse.ok) {
      throw new Error(`Failed to fetch departments: ${departmentsResponse.statusText}`)
    }
    const departmentsData = await departmentsResponse.json()
    const departments = departmentsData.data || []

    console.log(`🏪 Found ${departments.length} departments from REMA API`)

    // Collect all current product IDs from REMA API
    const currentRemaProductIds = new Set<string>()
    let departmentsProcessed = 0
    let totalPagesProcessed = 0
    
    for (const department of departments) {
      // Check if we're running out of time
      if (Date.now() - startTime > maxExecutionTime) {
        console.warn(`⏰ Timeout approaching, stopping after ${departmentsProcessed} departments, ${totalPagesProcessed} pages`)
        break
      }
      
      try {
        let page = 1
        let hasMore = true
        
        while (hasMore) {
          // Check timeout before each API call
          if (Date.now() - startTime > maxExecutionTime) {
            console.warn(`⏰ Timeout approaching, stopping department ${department.name} at page ${page}`)
            break
          }
          
          // Fetch products for this department (all pages to catch discontinued products)
          const productsResponse = await fetch(
            `https://api.digital.rema1000.dk/api/v3/departments/${department.id}/products?page=${page}&limit=1000`
          )
          
          if (productsResponse.ok) {
            const productsData = await productsResponse.json()
            const products = productsData.data || []
            
            for (const product of products) {
              currentRemaProductIds.add(`python-${product.id}`)
            }
            
            console.log(`📦 Department ${department.name}, page ${page}: ${products.length} products`)
            totalPagesProcessed++
            
            // Check if there are more pages
            hasMore = products.length === 1000 // If we got exactly 1000, there might be more
            page++
            
            // Safety limit to prevent infinite loops
            if (page > 50) {
              console.warn(`⚠️ Reached page limit for department ${department.name}`)
              hasMore = false
            }
          } else {
            console.warn(`⚠️ Failed to fetch page ${page} for department ${department.name}: ${productsResponse.statusText}`)
            hasMore = false
          }
        }
        
        departmentsProcessed++
      } catch (error) {
        console.warn(`⚠️ Failed to fetch products for department ${department.name}:`, error)
        departmentsProcessed++
      }
    }

    console.log(`🔍 Total current REMA products from API: ${currentRemaProductIds.size}`)

    // Find discontinued products (in our DB but not in current API)
    const discontinuedProducts = allRemaProducts.filter(product => 
      !currentRemaProductIds.has(product.external_id)
    )

    console.log(`❌ Found ${discontinuedProducts.length} discontinued products`)

    let hiddenCount = 0
    let priceRemovedCount = 0

    // Process each discontinued product
    for (const product of discontinuedProducts) {
      try {
        // Check if other stores have this product
        const { data: otherStoreProducts, error: otherStoresError } = await supabase
          .from('supermarket_products')
          .select('id, store, source')
          .eq('name', product.name)
          .neq('external_id', product.external_id)

        if (otherStoresError) {
          console.error(`❌ Error checking other stores for ${product.name}:`, otherStoresError)
          continue
        }

        const hasOtherStores = otherStoreProducts && otherStoreProducts.length > 0

        if (hasOtherStores) {
          // Product exists in other stores - just remove REMA price and mark as unavailable
          const { error: updateError } = await supabase
            .from('supermarket_products')
            .update({
              available: false,
              last_updated: new Date().toISOString(),
              // Keep the product but mark as discontinued from REMA
              metadata: {
                discontinued_from_rema: true,
                discontinued_date: new Date().toISOString()
              }
            })
            .eq('external_id', product.external_id)

          if (updateError) {
            console.error(`❌ Failed to update discontinued product ${product.name}:`, updateError)
          } else {
            priceRemovedCount++
            console.log(`🏷️ Removed REMA price for: ${product.name} (available in other stores)`)
          }
        } else {
          // Product doesn't exist in other stores - hide it but keep for history
          const { error: updateError } = await supabase
            .from('supermarket_products')
            .update({
              available: false,
              last_updated: new Date().toISOString(),
              // Keep the product but mark as discontinued and hidden
              metadata: {
                discontinued_from_rema: true,
                discontinued_date: new Date().toISOString(),
                hidden: true,
                reason: 'discontinued_from_all_stores'
              }
            })
            .eq('external_id', product.external_id)

          if (updateError) {
            console.error(`❌ Failed to hide discontinued product ${product.name}:`, updateError)
          } else {
            hiddenCount++
            console.log(`👁️ Hidden discontinued product: ${product.name} (kept for history)`)
          }
        }
      } catch (error) {
        console.error(`❌ Error processing discontinued product ${product.name}:`, error)
      }
    }

    const executionTime = Date.now() - startTime
    const wasTimeout = executionTime > maxExecutionTime * 0.8 // 80% of max time
    
    return NextResponse.json({
      success: true,
      message: wasTimeout 
        ? `Discontinued products handled (partial scan due to timeout)`
        : 'Discontinued products handled successfully',
      discontinued: discontinuedProducts.length,
      hidden: hiddenCount,
      priceRemoved: priceRemovedCount,
      currentRemaProducts: currentRemaProductIds.size,
      totalInDatabase: allRemaProducts.length,
      executionTime: executionTime,
      departmentsProcessed: departmentsProcessed,
      totalPagesProcessed: totalPagesProcessed,
      wasTimeout: wasTimeout
    })

  } catch (error) {
    console.error('❌ Error handling discontinued products:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to handle discontinued products: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
