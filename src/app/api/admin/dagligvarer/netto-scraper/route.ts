import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 8000 // 8 seconds per batch
  
  try {
    const { category, page = 1, limit = 100 } = await req.json()
    
    console.log(`🚀 Starting Netto scraper for category: ${category}, page: ${page}`)
    
    // Scrape Netto's website to find EAN numbers
    const eanNumbers = await scrapeNettoEANs(category, page, limit)
    
    if (eanNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No EAN numbers found',
        eanNumbers: [],
        hasMore: false,
        executionTime: Date.now() - startTime
      })
    }
    
    console.log(`📦 Found ${eanNumbers.length} EAN numbers`)
    
    // Now lookup each EAN in Salling Group API
    const supabase = createSupabaseServiceClient()
    let productsAdded = 0
    let productsUpdated = 0
    
    for (const ean of eanNumbers) {
      // Check timeout
      if (Date.now() - startTime > maxTimeMs) {
        console.log(`⏰ Timeout reached, stopping processing`)
        break
      }
      
      try {
        // Lookup product in Salling Group API
        const productData = await lookupProductByEAN(ean)
        
        if (productData) {
          // Transform and save to database
          const transformedProduct = transformNettoProduct(productData, ean)
          
          if (transformedProduct) {
            // Check if product already exists
            const { data: existingProduct } = await supabase
              .from('supermarket_products')
              .select('id, price, original_price, is_on_sale')
              .eq('external_id', transformedProduct.external_id)
              .single()
            
            // Upsert product
            const { error: upsertError } = await supabase
              .from('supermarket_products')
              .upsert({
                external_id: transformedProduct.external_id,
                name: transformedProduct.name,
                description: transformedProduct.description,
                category: transformedProduct.category,
                price: transformedProduct.price,
                original_price: transformedProduct.original_price,
                is_on_sale: transformedProduct.is_on_sale,
                image_url: transformedProduct.image_url,
                available: transformedProduct.available,
                last_updated: transformedProduct.last_updated,
                source: transformedProduct.source,
                store: transformedProduct.store
              }, {
                onConflict: 'external_id'
              })
            
            if (upsertError) {
              console.error(`❌ Failed to upsert product ${ean}:`, upsertError)
            } else {
              if (existingProduct) {
                productsUpdated++
                console.log(`🔄 Updated product: ${transformedProduct.name}`)
              } else {
                productsAdded++
                console.log(`➕ Added product: ${transformedProduct.name}`)
              }
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing EAN ${ean}:`, error)
      }
    }
    
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'Netto scraper completed',
      eanNumbers: eanNumbers,
      productsAdded,
      productsUpdated,
      executionTime
    })
    
  } catch (error) {
    console.error('❌ Netto scraper error:', error)
    return NextResponse.json({
      success: false,
      message: `Scraper failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}

async function scrapeNettoEANs(category: string, page: number, limit: number): Promise<string[]> {
  try {
    // This is a placeholder - we need to implement actual scraping
    // For now, return some example EANs
    const exampleEANs = [
      '6935364070199', // From Salling Group documentation
      '5701234567890', // Example EAN
      '5701234567891', // Example EAN
      '5701234567892', // Example EAN
      '5701234567893', // Example EAN
    ]
    
    console.log(`📡 Scraping Netto website for category: ${category}, page: ${page}`)
    
    // TODO: Implement actual scraping of Netto's website
    // This would involve:
    // 1. Making a request to Netto's website
    // 2. Parsing the HTML to find product links
    // 3. Extracting EAN numbers from product pages
    // 4. Returning the list of EANs
    
    return exampleEANs.slice(0, limit)
  } catch (error) {
    console.error('Error scraping Netto EANs:', error)
    return []
  }
}

async function lookupProductByEAN(ean: string): Promise<any> {
  try {
    // Use the first available store ID for now
    const storeId = '12345' // This should be dynamically selected
    
    const response = await fetch(`https://api.sallinggroup.com/v2/products/${ean}?storeId=${storeId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error(`Failed to lookup EAN ${ean}: ${response.status}`)
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Error looking up EAN ${ean}:`, error)
    return null
  }
}

function transformNettoProduct(data: any, ean: string) {
  try {
    const product = data.instore
    
    if (!product) {
      return null
    }

    // Calculate pricing
    let currentPrice = product.price || 0
    let originalPrice = product.price || 0
    let onSale = false
    
    if (product.campaign) {
      // Product is on campaign
      currentPrice = product.campaign.unitPrice || product.price || 0
      originalPrice = product.price || 0
      onSale = true
    }

    return {
      external_id: `netto-${ean}`,
      name: product.name || 'Unknown Product',
      description: product.description || null,
      category: 'Ukategoriseret', // Salling Group doesn't provide category
      price: currentPrice,
      original_price: originalPrice,
      is_on_sale: onSale,
      image_url: null, // Salling Group doesn't provide images
      available: true,
      last_updated: new Date().toISOString(),
      source: 'netto',
      store: 'Netto',
      ean: ean,
      unit: product.unit || null,
      unit_price: product.unitPrice || currentPrice,
      campaign: product.campaign ? {
        display_text: product.campaign.displayText,
        from_date: product.campaign.fromDate,
        to_date: product.campaign.toDate,
        quantity: product.campaign.quantity,
        price: product.campaign.price
      } : null,
      deposit: product.deposit ? {
        price: product.deposit.price,
        text: product.deposit.text
      } : null
    }
  } catch (error) {
    console.error('Error transforming Netto product:', error)
    return null
  }
}