import { NextRequest, NextResponse } from 'next/server'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'

export async function GET(request: NextRequest) {
  try {
    console.log('🧠 Testing REMA 1000 delta update capabilities...')
    
    const scraper = new Rema1000Scraper()
    
    // Test basic product fetching first
    console.log('🔍 Testing basic product fetching...')
    const testProduct = await scraper.fetchProduct(304020) // Use known working product ID: ØKO. BANANER FAIRTRADE
    
    if (!testProduct) {
      return NextResponse.json({
        success: false,
        message: 'Could not fetch basic product - REMA API may be down',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    console.log('✅ Basic product fetch successful, investigating delta capabilities...')
    
    // Investigate delta update capabilities
    const deltaCapabilities = await scraper.investigateDeltaEndpoints()
    
    // Test conditional request with last-modified if supported
    let conditionalRequestTest = null
    if (deltaCapabilities.lastModifiedSupport) {
      console.log('📅 Testing conditional request with last-modified...')
      try {
        const testUrl = `${scraper.baseUrl}/products/304020` // Use known working product ID
        const response = await fetch(testUrl, {
          headers: {
            'If-Modified-Since': new Date(Date.now() - 24 * 60 * 60 * 1000).toUTCString(), // 24 hours ago
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        })
        
        conditionalRequestTest = {
          status: response.status,
          supports304: response.status === 304,
          hasLastModified: !!response.headers.get('last-modified')
        }
      } catch (error) {
        console.log('⚠️ Conditional request test failed:', error)
      }
    }
    
    const result = {
      success: true,
      message: 'REMA API delta capabilities investigation complete',
      timestamp: new Date().toISOString(),
      basicApi: {
        working: true,
        testProduct: testProduct.name
      },
      deltaCapabilities,
      conditionalRequestTest,
      recommendations: generateRecommendations(deltaCapabilities)
    }
    
    console.log('🎯 REMA delta investigation complete:', result)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error testing REMA delta capabilities:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to test REMA delta capabilities',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function generateRecommendations(capabilities: any) {
  const recommendations = []
  
  if (capabilities.hasDeltaUpdates) {
    recommendations.push('🎉 Use REMA\'s native delta endpoints for efficient updates')
  }
  
  if (capabilities.lastModifiedSupport) {
    recommendations.push('📅 Use conditional requests with If-Modified-Since headers')
  }
  
  if (!capabilities.hasDeltaUpdates && !capabilities.lastModifiedSupport) {
    recommendations.push('🔄 Implement intelligent batch updates by product category priority')
    recommendations.push('⏰ Update high-priority categories (frugt, kød) more frequently')
    recommendations.push('💡 Consider implementing change detection based on price history')
  }
  
  return recommendations
}

export async function POST(request: NextRequest) {
  try {
    const { action, productId } = await request.json()
    const scraper = new Rema1000Scraper()
    
    switch (action) {
      case 'fetchProduct':
        if (!productId) {
          return NextResponse.json(
            { error: 'Product ID is required' },
            { status: 400 }
          )
        }
        
        console.log(`🔍 Fetching product ${productId} from database...`)
        
        try {
          const response = await fetch(`${(process.env as any).NEXT_PUBLIC_SUPABASE_URL}/rest/v1/supermarket_products?id=eq.${productId}&select=*`, {
            headers: {
              'apikey': (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${(process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          })
          
          if (!response.ok) {
            throw new Error(`Database query failed: ${response.status}`)
          }
          
          const products = await response.json()
          const product = products[0] // Get first (and only) product
          
          if (!product) {
            console.log(`❌ Product ${productId} not found in database`)
            return NextResponse.json({ success: true, product: null })
          }
          
          console.log(`✅ Found product: ${product.name}`)
          return NextResponse.json({ success: true, product })
          
        } catch (dbError) {
          console.error('❌ Database query failed:', dbError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to fetch product from database',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }, { status: 500 })
        }
        
      case 'fetchPriceHistory':
        if (!productId) {
          return NextResponse.json(
            { error: 'Product ID is required for price history' },
            { status: 400 }
          )
        }
        
        console.log(`📈 Fetching price history for product ${productId}...`)
        
        try {
          // First get the product's external_id
          const productResponse = await fetch(`${(process.env as any).NEXT_PUBLIC_SUPABASE_URL}/rest/v1/supermarket_products?id=eq.${productId}&select=external_id`, {
            headers: {
              'apikey': (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${(process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          })
          
          if (!productResponse.ok) {
            throw new Error(`Product query failed: ${productResponse.status}`)
          }
          
          const products = await productResponse.json()
          if (!products[0]) {
            return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
          }
          
          const externalId = products[0].external_id
          
          // Now get price history for this external_id
          const historyResponse = await fetch(`${(process.env as any).NEXT_PUBLIC_SUPABASE_URL}/rest/v1/supermarket_price_history?product_external_id=eq.${externalId}&order=timestamp.asc`, {
            headers: {
              'apikey': (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${(process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          })
          
          if (!historyResponse.ok) {
            throw new Error(`Price history query failed: ${historyResponse.status}`)
          }
          
          const priceHistory = await historyResponse.json()
          console.log(`✅ Found ${priceHistory.length} price history entries`)
          
          return NextResponse.json({ 
            success: true, 
            priceHistory,
            externalId
          })
          
        } catch (dbError) {
          console.error('❌ Price history query failed:', dbError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to fetch price history from database',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }, { status: 500 })
        }

      case 'fetchCategoryCounts':
        console.log('🔄 Fetching category counts from database...')
        
        try {
          const response = await fetch(`${(process.env as any).NEXT_PUBLIC_SUPABASE_URL}/rest/v1/supermarket_products?select=category&store=eq.REMA 1000`, {
            headers: {
              'apikey': (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${(process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
          })
          
          if (!response.ok) {
            throw new Error(`Database query failed: ${response.status}`)
          }
          
          const allProducts = await response.json()
          
          // Count products by category
          const categoryCounts = allProducts.reduce((acc: { [key: string]: number }, product: any) => {
            const category = product.category || 'Ukategoriseret'
            acc[category] = (acc[category] || 0) + 1
            return acc
          }, {})
          
          // Add total count
          categoryCounts['Alle kategorier'] = allProducts.length
          
          console.log(`✅ Calculated category counts for ${allProducts.length} total products`)
          
          return NextResponse.json({ 
            success: true, 
            categoryCounts
          })
          
        } catch (dbError) {
          console.error('❌ Category counts query failed:', dbError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to fetch category counts from database',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }, { status: 500 })
        }

      case 'fetchAllProducts':
        console.log('🔄 Fetching products from database...')
        
        // Extract pagination parameters from request
        const url = new URL(request.url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '10000') // Much higher default limit
        const category = url.searchParams.get('category')
        const search = url.searchParams.get('search')
        
        // Calculate offset for pagination
        const offset = (page - 1) * limit
        
        // Build query with filters
        let query = `select=*&store=eq.REMA 1000&limit=${limit}&offset=${offset}`
        
        if (category && category !== 'all') {
          query += `&category=eq.${category}`
        }
        
        if (search) {
          query += `&name=ilike.*${search}*`
        }
        
        // Check if we need to filter by offers only
        const showOffers = url.searchParams.get('offers') === 'true'
        if (showOffers) {
          query += `&is_on_sale=eq.true`
        }
        
        // Use service role key to get all products without limits
        try {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          
          if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Missing Supabase service role key')
          }
          
          // Create service role client
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(supabaseUrl, serviceRoleKey)
          
          // Build query with service role client
          let supabaseQuery = supabase
            .from('supermarket_products')
            .select('*')
            .eq('store', 'REMA 1000')
          
          if (category && category !== 'all') {
            supabaseQuery = supabaseQuery.eq('category', category)
          }
          
          if (search) {
            supabaseQuery = supabaseQuery.ilike('name', `%${search}%`)
          }
          
          if (showOffers) {
            supabaseQuery = supabaseQuery.eq('is_on_sale', true)
          }
          
          // Apply pagination
          supabaseQuery = supabaseQuery
            .range(offset, offset + limit - 1)
            .order('name', { ascending: true })
          
          const { data: products, error, count } = await supabaseQuery
          
          if (error) {
            throw new Error(`Database query failed: ${error.message}`)
          }
          
          console.log(`✅ Fetched ${products?.length || 0} products (page ${page}, total: ${count || 0})`)
          
          return NextResponse.json({ 
            success: true, 
            products: products || [],
            pagination: {
              page,
              limit,
              total: count || 0,
              hasMore: (products?.length || 0) === limit
            }
          })
          
        } catch (dbError) {
          console.error('❌ Database query failed:', dbError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to fetch products from database',
            details: dbError instanceof Error ? dbError.message : 'Unknown error'
          }, { status: 500 })
        }
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: fetchProduct, fetchAllProducts, fetchPriceHistory' },
          { status: 400 }
        )
    }
    
  } catch (error) {
    console.error('❌ Error in REMA scraper POST:', error)
    
    return NextResponse.json(
      { 
        error: 'Request failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
