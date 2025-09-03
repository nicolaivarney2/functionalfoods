import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// REMA 1000 GraphQL/API helpers - updated based on their actual structure
async function fetchRemaCategories(): Promise<string[]> {
  try {
    // Try to get categories from their main API
    const response = await fetch('https://shop.rema1000.dk/api/categories', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shop.rema1000.dk/'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.categories?.map((cat: any) => cat.slug || cat.id) || []
    }
    
    // Fallback to known categories
    return [
      'frugt-groent',
      'koed-fisk-fjerkrae', 
      'mejeri-aegger',
      'broed-kager',
      'kolonial',
      'drikkevarer',
      'snacks-slik',
      'husholdning-rengoring',
      'personlig-pleje',
      'fryse-koel'
    ]
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return [
      'frugt-groent',
      'koed-fisk-fjerkrae', 
      'mejeri-aegger',
      'broed-kager',
      'kolonial',
      'drikkevarer'
    ]
  }
}

async function fetchRemaProductsByCategory(category: string, page: number = 1): Promise<any[]> {
  try {
    // Try their GraphQL endpoint first
    const graphqlResponse = await fetch('https://shop.rema1000.dk/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shop.rema1000.dk/'
      },
      body: JSON.stringify({
        query: `
          query GetProducts($category: String!, $page: Int!, $limit: Int!) {
            products(category: $category, page: $page, limit: $limit) {
              items {
                id
                name
                description
                price {
                  value
                  currency
                }
                originalPrice {
                  value
                  currency
                }
                category {
                  name
                  slug
                }
                subcategory {
                  name
                  slug
                }
                unit
                amount
                quantity
                unitPrice
                imageUrl
                available
                labels
              }
              total
              hasMore
            }
          }
        `,
        variables: {
          category,
          page,
          limit: 100
        }
      })
    })

    if (graphqlResponse.ok) {
      const graphqlData = await graphqlResponse.json()
      return graphqlData.data?.products?.items || []
    }

    // Fallback to REST API
    const restResponse = await fetch(`https://shop.rema1000.dk/api/products?category=${category}&page=${page}&limit=100`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shop.rema1000.dk/'
      }
    })

    if (restResponse.ok) {
      const restData = await restResponse.json()
      return restData.products || restData.items || []
    }

    return []
  } catch (error) {
    console.error(`Error fetching products for category ${category}:`, error)
    return []
  }
}

async function fetchRemaProduct(productId: number): Promise<any> {
  try {
    const response = await fetch(`https://shop.rema1000.dk/api/products/${productId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://shop.rema1000.dk/'
      }
    })
    
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    return null
  }
}

function transformRemaProduct(apiData: any): any {
  if (!apiData?.product) return null
  
  const product = apiData.product
  const price = product.price?.value || 0
  const originalPrice = product.originalPrice?.value || price
  const isOnSale = product.price?.value < product.originalPrice?.value
  
  return {
    external_id: `python-${product.id}`,
    name: product.name || '',
    description: product.description || null,
    category: product.category?.name || null,
    subcategory: product.subcategory?.name || null,
    price: price,
    original_price: originalPrice,
    is_on_sale: isOnSale,
    unit: product.unit || null,
    amount: product.amount || null,
    quantity: product.quantity || null,
    unit_price: product.unitPrice || null,
    currency: 'DKK',
    store: 'REMA 1000',
    store_url: `https://shop.rema1000.dk/produkt/${product.id}`,
    image_url: product.imageUrl || null,
    available: product.available !== false,
    last_updated: new Date().toISOString(),
    source: 'rema1000'
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const maxTimeMs = 9000 // 9 seconds to stay under Vercel's 10s limit
  
  try {
    const body = await req.json()
    const shop = body.shop || 'rema1000'
    
    if (shop !== 'rema1000') {
      return NextResponse.json({
        success: false,
        message: `Shop ${shop} not implemented yet`
      }, { status: 400 })
    }
    
    console.log('🚀 Starting full scrape for', shop)
    
    const supabase = createSupabaseServiceClient()
    
    // Get categories from REMA
    console.log('🔍 Fetching categories...')
    const categories = await fetchRemaCategories()
    console.log(`📂 Found ${categories.length} categories:`, categories)
    
    let processed = 0
    let updated = 0
    let inserted = 0
    let errors = 0
    const allProducts: any[] = []
    
    // Scrape products by category
    for (const category of categories) {
      // Check time limit
      if (Date.now() - startTime > maxTimeMs * 0.8) {
        console.log(`⏰ Time limit reached after ${processed} products. Stopping to avoid timeout.`)
        break
      }
      
      console.log(`🛒 Scraping category: ${category}`)
      
      try {
        let page = 1
        let hasMore = true
        
        while (hasMore && Date.now() - startTime < maxTimeMs * 0.8) {
          const categoryProducts = await fetchRemaProductsByCategory(category, page)
          
          if (categoryProducts.length === 0) {
            hasMore = false
            break
          }
          
          console.log(`📦 Found ${categoryProducts.length} products in ${category} (page ${page})`)
          allProducts.push(...categoryProducts)
          
          // Process this batch of products
          for (const productData of categoryProducts) {
            if (Date.now() - startTime > maxTimeMs * 0.8) break
            
            try {
              const transformedProduct = transformRemaProduct({ product: productData })
              if (!transformedProduct) {
                errors++
                continue
              }
              
              // Check if product exists
              const { data: existingProduct } = await supabase
                .from('supermarket_products')
                .select('id, price, original_price, is_on_sale')
                .eq('external_id', transformedProduct.external_id)
                .single()
              
              if (existingProduct) {
                // Update existing product
                const { error: updateError } = await supabase
                  .from('supermarket_products')
                  .update(transformedProduct)
                  .eq('id', existingProduct.id)
                
                if (updateError) throw updateError
                
                // Add price history if price changed
                if (existingProduct.price !== transformedProduct.price || 
                    existingProduct.is_on_sale !== transformedProduct.is_on_sale) {
                  await supabase
                    .from('supermarket_price_history')
                    .insert({
                      product_id: existingProduct.id,
                      price: transformedProduct.price,
                      original_price: transformedProduct.original_price,
                      is_on_sale: transformedProduct.is_on_sale,
                      timestamp: transformedProduct.last_updated
                    })
                }
                
                updated++
              } else {
                // Insert new product
                const { data: newProduct, error: insertError } = await supabase
                  .from('supermarket_products')
                  .insert(transformedProduct)
                  .select('id')
                  .single()
                
                if (insertError) throw insertError
                
                // Add initial price history
                await supabase
                  .from('supermarket_price_history')
                  .insert({
                    product_id: newProduct.id,
                    price: transformedProduct.price,
                    original_price: transformedProduct.original_price,
                    is_on_sale: transformedProduct.is_on_sale,
                    timestamp: transformedProduct.last_updated
                  })
                
                inserted++
              }
              
              processed++
              
            } catch (error) {
              console.error(`Error processing product:`, error)
              errors++
            }
          }
          
          page++
          
          // Small delay between pages
          await new Promise(resolve => setTimeout(resolve, 50))
        }
        
      } catch (error) {
        console.error(`Error scraping category ${category}:`, error)
        errors++
      }
    }
    
    const timeElapsed = Date.now() - startTime
    
    console.log(`✅ Full scrape completed: ${processed} processed, ${updated} updated, ${inserted} new, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: 'Full scrape completed',
      shop,
      timeElapsed,
      stats: {
        processed,
        total: allProducts.length,
        updated,
        inserted,
        errors
      },
      categories: {
        scanned: categories.length,
        completed: categories.length
      }
    })
    
  } catch (error) {
    console.error('❌ Full scrape failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Full scrape failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}