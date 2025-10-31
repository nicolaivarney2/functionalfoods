import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 8000 // 8 seconds per batch
  
  try {
    const { query, storeId, limit = 100, method = 'relevant' } = await req.json()
    
    if (!query || !storeId) {
      return NextResponse.json({
        success: false,
        message: 'Both query and storeId are required'
      }, { status: 400 })
    }
    
    console.log(`🔍 Searching Netto products using ${method} for: "${query}" in store ${storeId}`)
    
    // Use Salling Group's Product Suggestions API
    const products = await searchNettoProducts(query, storeId, limit, method)
    
    if (products.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products found',
        products: [],
        hasMore: false,
        executionTime: Date.now() - startTime
      })
    }
    
    console.log(`📦 Found ${products.length} products`)
    
    // Save products to database
    const supabase = createSupabaseServiceClient()
    let productsAdded = 0
    let productsUpdated = 0
    
    for (const product of products) {
      // Check timeout
      if (Date.now() - startTime > maxTimeMs) {
        console.log(`⏰ Timeout reached, stopping processing`)
        break
      }
      
      try {
        // Check if product already exists
        const { data: existingProduct } = await supabase
          .from('supermarket_products')
          .select('id, price, original_price, is_on_sale')
          .eq('external_id', product.external_id)
          .single()
        
        // Upsert product
        const { error: upsertError } = await supabase
          .from('supermarket_products')
          .upsert({
            external_id: product.external_id,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            original_price: product.original_price,
            is_on_sale: product.is_on_sale,
            image_url: product.image_url,
            available: product.available,
            last_updated: product.last_updated,
            source: product.source,
            store: product.store
          }, {
            onConflict: 'external_id'
          })
        
        if (upsertError) {
          console.error(`❌ Failed to upsert product ${product.external_id}:`, upsertError)
        } else {
          if (existingProduct) {
            productsUpdated++
            console.log(`🔄 Updated product: ${product.name}`)
          } else {
            productsAdded++
            console.log(`➕ Added product: ${product.name}`)
          }
        }
      } catch (error) {
        console.error(`❌ Error processing product ${product.external_id}:`, error)
      }
    }
    
    const executionTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      message: 'Netto products found and saved',
      products: products,
      productsAdded,
      productsUpdated,
      executionTime
    })
    
  } catch (error) {
    console.error('❌ Netto suggestions error:', error)
    return NextResponse.json({
      success: false,
      message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime: Date.now() - startTime
    }, { status: 500 })
  }
}

async function searchNettoProducts(query: string, storeId: string, limit: number, method: string): Promise<any[]> {
  try {
    // Get API token from environment variables
    const apiToken = process.env.SALLING_GROUP_API_TOKEN
    if (!apiToken) {
      console.error('Salling Group API token not configured')
      return []
    }

    let url: string
    
    // Choose the right endpoint based on method
    switch (method) {
      case 'relevant':
        url = `https://api.sallinggroup.com/v1/product-suggestions/relevant-products?q=${encodeURIComponent(query)}&storeId=${storeId}&limit=${limit}`
        break
      case 'similar':
        // For similar products, we need a product ID/EAN
        url = `https://api.sallinggroup.com/v1/product-suggestions/similar-products?productId=${encodeURIComponent(query)}&storeId=${storeId}&limit=${limit}`
        break
      case 'frequently-bought':
        // For frequently bought together, we need a product ID/EAN
        url = `https://api.sallinggroup.com/v1/product-suggestions/frequently-bought-together?productId=${encodeURIComponent(query)}&storeId=${storeId}&limit=${limit}`
        break
      default:
        url = `https://api.sallinggroup.com/v1/product-suggestions/relevant-products?q=${encodeURIComponent(query)}&storeId=${storeId}&limit=${limit}`
    }
    
    console.log(`📡 Fetching: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      }
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    if (!response.ok) {
      console.error(`Failed to search products: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    console.log(`📦 Response data:`, JSON.stringify(data, null, 2))
    
    // Transform the response to our format
    const products = data.map((item: any) => transformSuggestionProduct(item))
    
    return products.filter(Boolean) // Remove null/undefined items
  } catch (error) {
    console.error('Error searching Netto products:', error)
    return []
  }
}

function transformSuggestionProduct(item: any) {
  try {
    // This is a placeholder - we need to see the actual response structure
    // from the Product Suggestions API to implement this correctly
    
    return {
      external_id: `netto-suggestion-${item.id || item.ean || Math.random()}`,
      name: item.name || item.title || 'Unknown Product',
      description: item.description || null,
      category: 'Ukategoriseret',
      price: item.price || 0,
      original_price: item.originalPrice || item.price || 0,
      is_on_sale: item.isOnSale || false,
      image_url: item.imageUrl || null,
      available: true,
      last_updated: new Date().toISOString(),
      source: 'netto',
      store: 'Netto',
      ean: item.ean || null,
      unit: item.unit || null,
      unit_price: item.unitPrice || item.price || 0
    }
  } catch (error) {
    console.error('Error transforming suggestion product:', error)
    return null
  }
}
