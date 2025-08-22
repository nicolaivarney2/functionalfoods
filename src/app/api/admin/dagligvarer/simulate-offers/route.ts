import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    console.log('🥩 Starting meat offers simulation...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials'
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Find meat products and simulate offers
    const { data: meatProducts, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('id, name, price, category')
      .eq('store', 'REMA 1000')
      .eq('category', 'Kød, fisk & fjerkræ')
      .limit(10) // Simulate offers on 10 meat products
    
    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch meat products: ${fetchError.message}`
      }, { status: 500 })
    }
    
    if (!meatProducts || meatProducts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No meat products found'
      }, { status: 404 })
    }
    
    console.log(`🎯 Found ${meatProducts.length} meat products to simulate offers on`)
    
    let updatedCount = 0
    const errors: string[] = []
    
    for (const product of meatProducts) {
      try {
        // Simulate a 20% discount with better precision handling
        const originalPrice = parseFloat(product.price)
        const discountMultiplier = 0.8 // 20% off
        const discountedPrice = Math.round(originalPrice * discountMultiplier * 100) / 100 // Round to 2 decimals
        
        // Ensure the discounted price is actually lower
        if (discountedPrice >= originalPrice) {
          console.log(`⚠️ Skipping ${product.name}: calculated price ${discountedPrice} >= original ${originalPrice}`)
          continue
        }
        
        const { error: updateError } = await supabase
          .from('supermarket_products')
          .update({
            price: discountedPrice,
            original_price: originalPrice,
            is_on_sale: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id)
        
        if (updateError) {
          errors.push(`Failed to update ${product.name}: ${updateError.message}`)
        } else {
          updatedCount++
          console.log(`✅ ${product.name}: ${originalPrice} kr → ${discountedPrice} kr (20% off, diff: ${(originalPrice - discountedPrice).toFixed(2)} kr)`)
        }
      } catch (error) {
        errors.push(`Error processing ${product.name}: ${error}`)
      }
    }
    
    const result = {
      success: true,
      message: `Simulated offers on ${updatedCount} meat products`,
      timestamp: new Date().toISOString(),
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined
    }
    
    console.log(`🎉 Meat offers simulation completed: ${updatedCount} products updated`)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error in meat offers simulation:', error)
    return NextResponse.json({
      success: false,
      message: 'Meat offers simulation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
