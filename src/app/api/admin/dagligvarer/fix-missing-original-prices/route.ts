import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Starting missing original price fixer...')
    
    const supabase = createSupabaseServiceClient()
    
    // Find products that are marked as on sale but have original_price = price (missing original price)
    const { data: productsNeedingFix, error: fetchError } = await supabase
      .from('supermarket_products')
      .select('*')
      .eq('source', 'rema1000')
      .eq('is_on_sale', true)
      .eq('original_price', supabase.rpc('price')) // original_price = price

    if (fetchError) {
      throw new Error(`Failed to fetch products needing fix: ${fetchError.message}`)
    }

    console.log(`🎯 Found ${productsNeedingFix?.length || 0} products with missing original prices`)

    if (!productsNeedingFix || productsNeedingFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products found that need original price fixing',
        fixed: 0,
        total: 0
      })
    }

    let fixedCount = 0
    const fixedProducts = []

    // Process each product that needs fixing
    for (const product of productsNeedingFix) {
      try {
        // Extract REMA ID from external_id (python-12345 -> 12345)
        const remaId = product.external_id.replace('python-', '')
        
        // Fetch fresh data from REMA API
        const productResponse = await fetch(
          `https://api.digital.rema1000.dk/api/v3/products/${remaId}`
        )

        if (!productResponse.ok) {
          console.warn(`⚠️ Failed to fetch fresh data for ${product.name} (ID: ${remaId})`)
          continue
        }

        const productData = await productResponse.json()
        const freshProduct = productData.data

        if (!freshProduct || !freshProduct.prices || freshProduct.prices.length < 2) {
          console.warn(`⚠️ No valid price data for ${product.name}`)
          continue
        }

        // REMA API structure: prices[0] = campaign, prices[1] = regular
        const campaignPrice = freshProduct.prices[0]
        const regularPrice = freshProduct.prices[1]

        let newPrice = product.price
        let newOriginalPrice = product.original_price
        let newIsOnSale = product.is_on_sale

        if (campaignPrice.is_campaign && regularPrice) {
          // Product is on sale - use campaign price and regular price
          newPrice = campaignPrice.price
          newOriginalPrice = regularPrice.price
          newIsOnSale = true
        } else {
          // Product is not on sale - use regular price for both
          newPrice = regularPrice.price
          newOriginalPrice = regularPrice.price
          newIsOnSale = false
        }

        // Only update if we found a valid original price
        if (newOriginalPrice > newPrice) {
          // Add price history entry for the old price
          await supabase
            .from('supermarket_price_history')
            .insert({
              product_external_id: product.external_id,
              price: product.price,
              original_price: product.original_price,
              is_on_sale: product.is_on_sale,
              timestamp: new Date().toISOString()
            })

          // Update the product with correct prices
          const { error: updateError } = await supabase
            .from('supermarket_products')
            .update({
              price: newPrice,
              original_price: newOriginalPrice,
              is_on_sale: newIsOnSale,
              last_updated: new Date().toISOString()
            })
            .eq('external_id', product.external_id)

          if (updateError) {
            console.error(`❌ Failed to update ${product.name}:`, updateError)
          } else {
            fixedCount++
            const discount = Math.round((newOriginalPrice - newPrice) / newOriginalPrice * 100)
            
            fixedProducts.push({
              name: product.name,
              oldPrice: product.price,
              oldOriginal: product.original_price,
              newPrice: newPrice,
              newOriginal: newOriginalPrice,
              discount: discount
            })
            
            console.log(`✅ Fixed ${product.name}: ${product.price} → ${newPrice} (original: ${newOriginalPrice}, ${discount}% off)`)
          }
        } else {
          console.log(`ℹ️ ${product.name}: No valid original price found in fresh data`)
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error processing ${product.name}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Missing original prices fixed successfully',
      fixed: fixedCount,
      total: productsNeedingFix.length,
      fixedProducts: fixedProducts.slice(0, 10) // Show first 10 for reference
    })

  } catch (error) {
    console.error('❌ Error fixing missing original prices:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to fix missing original prices: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}