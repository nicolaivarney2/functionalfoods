import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('🏷️ Starting store branding fix...')
    
    const supabase = createSupabaseServiceClient()
    
    // Find all products with 'rema1000' store name
    const { data: productsToFix, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('external_id, name, store')
      .eq('store', 'rema1000')

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`)
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

    // Update each product
    for (const product of productsToFix) {
      try {
        const { error: updateError } = await supabase
          .from('supermarket_products')
          .update({
            store: 'REMA 1000',
            last_updated: new Date().toISOString()
          })
          .eq('external_id', product.external_id)

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
