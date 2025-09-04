import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
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
    
    for (const department of departments) {
      try {
        // Fetch products for this department (first page only for efficiency)
        const productsResponse = await fetch(
          `https://api.digital.rema1000.dk/api/v3/departments/${department.id}/products?page=1&limit=1000`
        )
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json()
          const products = productsData.data || []
          
          for (const product of products) {
            currentRemaProductIds.add(`python-${product.id}`)
          }
          
          console.log(`📦 Department ${department.name}: ${products.length} products`)
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch products for department ${department.name}:`, error)
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
          // Product doesn't exist in other stores - hide it completely
          const { error: deleteError } = await supabase
            .from('supermarket_products')
            .delete()
            .eq('external_id', product.external_id)

          if (deleteError) {
            console.error(`❌ Failed to delete discontinued product ${product.name}:`, deleteError)
          } else {
            hiddenCount++
            console.log(`🗑️ Hidden discontinued product: ${product.name}`)
          }
        }
      } catch (error) {
        console.error(`❌ Error processing discontinued product ${product.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Discontinued products handled successfully',
      discontinued: discontinuedProducts.length,
      hidden: hiddenCount,
      priceRemoved: priceRemovedCount,
      currentRemaProducts: currentRemaProductIds.size,
      totalInDatabase: allRemaProducts.length
    })

  } catch (error) {
    console.error('❌ Error handling discontinued products:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to handle discontinued products: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
