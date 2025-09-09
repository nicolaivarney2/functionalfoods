import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 Starting Netto scraper...')

    const supabase = createSupabaseServiceClient()

    // Get Salling Group API key from environment
    const sallingApiKey = process.env.SALLING_GROUP_API_KEY
    if (!sallingApiKey) {
      throw new Error('SALLING_GROUP_API_KEY not found in environment variables')
    }

    // First, get all Netto stores in Denmark
    console.log('📍 Fetching Netto stores...')
    const storesResponse = await fetch('https://api.sallinggroup.com/v2/stores', {
      headers: {
        'Authorization': `Bearer ${sallingApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!storesResponse.ok) {
      throw new Error(`Failed to fetch stores: ${storesResponse.status}`)
    }

    const storesData = await storesResponse.json()
    const nettoStores = storesData.filter((store: any) => store.brand === 'netto')
    
    console.log(`🏪 Found ${nettoStores.length} Netto stores`)

    // Get food waste (tilbuds) data for all stores
    let totalProducts = 0
    let totalAdded = 0
    let totalUpdated = 0
    let totalErrors = 0

    for (const store of nettoStores.slice(0, 10)) { // Limit to first 10 stores for testing
      try {
        console.log(`🛒 Processing store: ${store.name} (${store.id})`)
        
        const foodWasteResponse = await fetch(`https://api.sallinggroup.com/v1/food-waste/${store.id}`, {
          headers: {
            'Authorization': `Bearer ${sallingApiKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (!foodWasteResponse.ok) {
          console.warn(`⚠️ Failed to fetch food waste for store ${store.name}: ${foodWasteResponse.status}`)
          continue
        }

        const foodWasteData = await foodWasteResponse.json()
        const clearances = foodWasteData.clearances || []

        console.log(`📦 Found ${clearances.length} clearance products in ${store.name}`)

        for (const clearance of clearances) {
          try {
            const offer = clearance.offer
            const product = clearance.product

            if (!offer || !product) continue

            // Transform Netto product data to our format
            const productData = {
              external_id: `netto-${product.ean}`,
              name: product.description,
              description: null,
              category: 'Tilbud', // All food waste products are on sale
              subcategory: 'Kort udløb',
              price: offer.newPrice,
              original_price: offer.originalPrice,
              unit: offer.stockUnit || 'stk',
              amount: offer.stock || 1,
              quantity: `${offer.stock} ${offer.stockUnit || 'stk'}`,
              unit_price: 0,
              is_on_sale: true,
              sale_end_date: offer.endTime,
              currency: offer.currency || 'DKK',
              store: 'Netto',
              store_url: `https://www.netto.dk/butikker/${store.id}`,
              image_url: product.image || null,
              available: offer.stock > 0,
              temperature_zone: null,
              nutrition_info: null,
              labels: ['Tilbud', 'Kort udløb'],
              source: 'netto-food-waste-api',
              last_updated: new Date().toISOString(),
              metadata: {
                netto_store_id: store.id,
                netto_store_name: store.name,
                netto_store_address: store.address,
                ean: product.ean,
                discount_percent: offer.percentDiscount,
                stock: offer.stock,
                stock_unit: offer.stockUnit,
                start_time: offer.startTime,
                end_time: offer.endTime
              }
            }

            // Check if product already exists
            const { data: existingProduct } = await supabase
              .from('supermarket_products')
              .select('id, price, original_price, is_on_sale')
              .eq('external_id', productData.external_id)
              .single()

            if (existingProduct) {
              // Update existing product
              const { error: updateError } = await supabase
                .from('supermarket_products')
                .update({
                  price: productData.price,
                  original_price: productData.original_price,
                  is_on_sale: productData.is_on_sale,
                  sale_end_date: productData.sale_end_date,
                  available: productData.available,
                  last_updated: productData.last_updated,
                  metadata: productData.metadata
                })
                .eq('external_id', productData.external_id)

              if (updateError) {
                console.error('❌ Update error:', updateError)
                totalErrors++
              } else {
                totalUpdated++
                console.log(`🔄 Updated: ${productData.name}`)
              }
            } else {
              // Insert new product
              const { error: insertError } = await supabase
                .from('supermarket_products')
                .insert(productData)

              if (insertError) {
                console.error('❌ Insert error:', insertError)
                totalErrors++
              } else {
                totalAdded++
                console.log(`➕ Added: ${productData.name}`)
              }
            }

            totalProducts++

          } catch (productError) {
            console.error('❌ Product processing error:', productError)
            totalErrors++
          }
        }

        // Small delay between stores
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (storeError) {
        console.error(`❌ Store processing error for ${store.name}:`, storeError)
        totalErrors++
      }
    }

    console.log(`✅ Netto scraper completed!`)
    console.log(`📊 Total products: ${totalProducts}`)
    console.log(`➕ Added: ${totalAdded}`)
    console.log(`🔄 Updated: ${totalUpdated}`)
    console.log(`❌ Errors: ${totalErrors}`)

    return NextResponse.json({
      success: true,
      message: 'Netto scraper completed successfully',
      data: {
        totalProducts,
        productsAdded: totalAdded,
        productsUpdated: totalUpdated,
        errors: totalErrors,
        storesProcessed: nettoStores.slice(0, 10).length,
        totalStores: nettoStores.length
      }
    })

  } catch (error) {
    console.error('❌ Netto scraper error:', error)
    return NextResponse.json({
      success: false,
      message: `Netto scraper failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
