import { NextRequest, NextResponse } from 'next/server'
import { rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'
import { createSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting product scraping process...')
    
    // Step 1: Scrape products from REMA 1000
    const products = await rema1000Scraper.fetchAllProducts()
    
    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found during scraping' },
        { status: 400 }
      )
    }
    
    console.log(`📦 Scraped ${products.length} products from REMA 1000`)
    
    // Step 2: Store products in database
    const supabase = createSupabaseClient()
    let newProducts = 0
    let updatedProducts = 0
    const errors: string[] = []
    
    for (const product of products) {
      try {
        // Check if product already exists
        const { data: existingProduct } = await supabase
          .from('supermarket_products')
          .select('id, price, original_price, is_on_sale, sale_end_date')
          .eq('external_id', product.id)
          .single()
        
        if (existingProduct) {
          // Update existing product
          const { error: updateError } = await supabase
            .from('supermarket_products')
            .update({
              price: product.price,
              original_price: product.originalPrice,
              unit: product.unit,
              unit_price: product.unitPrice,
              is_on_sale: product.isOnSale,
              sale_end_date: product.saleEndDate,
              image_url: product.imageUrl,
              available: product.available,
              temperature_zone: product.temperatureZone,
              nutrition_info: product.nutritionInfo,
              labels: product.labels,
              last_updated: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('external_id', product.id)
          
          if (updateError) {
            errors.push(`Failed to update ${product.name}: ${updateError.message}`)
          } else {
            updatedProducts++
            
            // Add to price history
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_external_id: product.id,
                price: product.price,
                original_price: product.originalPrice,
                is_on_sale: product.isOnSale,
                sale_end_date: product.saleEndDate
              })
          }
        } else {
          // Insert new product
          const { error: insertError } = await supabase
            .from('supermarket_products')
            .insert({
              external_id: product.id,
              name: product.name,
              description: product.description,
              category: product.category,
              subcategory: product.subcategory,
              price: product.price,
              original_price: product.originalPrice,
              unit: product.unit,
              unit_price: product.unitPrice,
              is_on_sale: product.isOnSale,
              sale_end_date: product.saleEndDate,
              image_url: product.imageUrl,
              store: product.store,
              available: product.available,
              temperature_zone: product.temperatureZone,
              nutrition_info: product.nutritionInfo,
              labels: product.labels,
              source: product.source,
              last_updated: new Date().toISOString()
            })
          
          if (insertError) {
            errors.push(`Failed to insert ${product.name}: ${insertError.message}`)
          } else {
            newProducts++
            
            // Add to price history
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_external_id: product.id,
                price: product.price,
                original_price: product.originalPrice,
                is_on_sale: product.isOnSale,
                sale_end_date: product.saleEndDate
              })
          }
        }
        
        // Add small delay to be respectful to database
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error processing ${product.name}: ${errorMessage}`)
      }
    }
    
    console.log(`✅ Database storage completed: ${newProducts} new, ${updatedProducts} updated`)
    
    return NextResponse.json({
      success: true,
      message: 'Products successfully scraped and stored',
      scraping: {
        totalScraped: products.length,
        newProducts,
        updatedProducts,
        errors
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in product scraping process:', error)
    
    return NextResponse.json(
      { 
        error: 'Product scraping failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Get statistics from database
    const { data: products, error: productsError } = await supabase
      .from('supermarket_products')
      .select('*')
    
    if (productsError) {
      throw productsError
    }
    
    // Calculate statistics
    const totalProducts = products?.length || 0
    const productsOnSale = products?.filter(p => p.is_on_sale).length || 0
    const categories = products?.reduce((acc: string[], p) => {
      if (p.category && !acc.includes(p.category)) {
        acc.push(p.category)
      }
      return acc
    }, []) || []
    const lastUpdate = products?.length > 0 ? Math.max(...products.map(p => new Date(p.last_updated).getTime())) : null
    const averagePrice = products?.length > 0 
      ? products.reduce((sum, p) => sum + parseFloat(p.price), 0) / products.length 
      : 0
    
    return NextResponse.json({
      success: true,
      statistics: {
        totalProducts,
        productsOnSale,
        categories,
        lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
        averagePrice: Math.round(averagePrice * 100) / 100
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error fetching statistics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
