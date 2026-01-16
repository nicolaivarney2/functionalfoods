import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    console.log('🏷️ Starting store branding fix...')
    
    const supabase = createSupabaseServiceClient()
    
    // Find all products with 'rema1000' store name (fetch in batches to avoid limits)
    let productsToFix: any[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: batch, error: fetchError } = await supabase
        .from('supermarket_products')
        .select('external_id, name, store')
        .eq('store', 'rema1000')
        .range(offset, offset + batchSize - 1)

      if (fetchError) {
        throw new Error(`Failed to fetch products: ${fetchError.message}`)
      }

      if (batch && batch.length > 0) {
        productsToFix = productsToFix.concat(batch)
        offset += batchSize
        hasMore = batch.length === batchSize
        console.log(`📦 Fetched batch: ${batch.length} products (total: ${productsToFix.length})`)
      } else {
        hasMore = false
      }
    }

    console.log(`🎯 Found ${productsToFix?.length || 0} products with 'rema1000' store name`)

    if (!productsToFix || productsToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products found that need store branding fix',
        fixed: 0,
        total: 0
      })
    }

    let fixedCount = 0
    const fixedProducts = []
    const updateBatchSize = 50 // Update 50 products at a time to avoid timeout

    // Update products in batches
    for (let i = 0; i < productsToFix.length; i += updateBatchSize) {
      const batch = productsToFix.slice(i, i + updateBatchSize)
      const batchNumber = Math.floor(i / updateBatchSize) + 1
      const totalBatches = Math.ceil(productsToFix.length / updateBatchSize)
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)`)
      
      try {
        // Use bulk update for this batch
        const { error: batchUpdateError } = await supabase
          .from('supermarket_products')
          .update({
            store: 'REMA 1000',
            last_updated: new Date().toISOString()
          })
          .in('external_id', batch.map(p => p.external_id))
          .eq('store', 'rema1000')

        if (batchUpdateError) {
          console.error(`❌ Failed to update batch ${batchNumber}:`, batchUpdateError)
          // Fallback to individual updates for this batch
          for (const product of batch) {
            try {
              const { error: updateError } = await supabase
                .from('supermarket_products')
                .update({
                  store: 'REMA 1000',
                  last_updated: new Date().toISOString()
                })
                .eq('external_id', product.external_id)
                .eq('store', 'rema1000')

              if (updateError) {
                console.error(`❌ Failed to update ${product.name}:`, updateError)
              } else {
                fixedCount++
                fixedProducts.push({
                  name: product.name,
                  oldStore: product.store,
                  newStore: 'REMA 1000'
                })
                console.log(`✅ Fixed store branding: ${product.name}`)
              }
            } catch (error) {
              console.error(`❌ Error processing ${product.name}:`, error)
            }
          }
        } else {
          fixedCount += batch.length
          console.log(`✅ Fixed batch ${batchNumber}: ${batch.length} products`)
          
          // Add batch products to fixedProducts for reference
          batch.forEach(product => {
            fixedProducts.push({
              name: product.name,
              oldStore: product.store,
              newStore: 'REMA 1000'
            })
          })
        }
      } catch (error) {
        console.error(`❌ Error processing batch ${batchNumber}:`, error)
      }
      
      // Small delay to avoid overwhelming the database
      if (i + updateBatchSize < productsToFix.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Store branding fixed successfully',
      fixed: fixedCount,
      total: productsToFix.length,
      fixedProducts: fixedProducts.slice(0, 10) // Show first 10 for reference
    })

  } catch (error) {
    console.error('❌ Error fixing store branding:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to fix store branding: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
