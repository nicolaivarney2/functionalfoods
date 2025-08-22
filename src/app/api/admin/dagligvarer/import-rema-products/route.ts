import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Helper function to parse underline field
function parseUnderline(underline: string | null): { unit: string | null, amount: number | null, brand: string | null, quantity: string | null } {
  if (!underline) {
    return { unit: null, amount: null, brand: null, quantity: null };
  }

  // Parse patterns like "285 GR. / EASIS" or "1 L. / COCA COLA"
  const match = underline.match(/^(\d+(?:[.,]\d+)?)\s*([A-Z]+)\.?\s*(?:\/\s*(.+))?$/i);
  
  if (match) {
    const [, amountStr, unit, brand] = match;
    const amount = parseFloat(amountStr.replace(',', '.'));
    
    return {
      unit: standardizeUnit(unit),
      amount: amount,
      brand: brand || null,
      quantity: `${amountStr} ${unit}`
    };
  }

  // Fallback: try to extract just amount and unit
  const fallbackMatch = underline.match(/^(\d+(?:[.,]\d+)?)\s*([A-Z]+)/i);
  if (fallbackMatch) {
    const [, amountStr, unit] = fallbackMatch;
    const amount = parseFloat(amountStr.replace(',', '.'));
    
    return {
      unit: standardizeUnit(unit),
      amount: amount,
      brand: null,
      quantity: `${amountStr} ${unit}`
    };
  }

  return { unit: null, amount: null, brand: null, quantity: underline };
}

// Standardize units to consistent format
const standardizeUnit = (unit: string) => {
  const unitMap: { [key: string]: string } = {
    'gr': 'g',
    'g': 'g',
    'kg': 'kg',
    'ml': 'ml',
    'l': 'l',
    'cl': 'cl',
    'dl': 'dl',
    'stk': 'stk',
    'bdt': 'stk', // REMA uses 'bdt' for 'stk'
    'pak': 'stk',
    'pkt': 'stk'
  }
  return unitMap[unit.toLowerCase()] || 'stk'
}

// AI-baseret produkt kategorisering
const categorizeProductWithAI = async (productData: any) => {
  try {
    // Byg kontekst for AI
    const context = `
Produkt: ${productData.name}
Beskrivelse: ${productData.description || 'Ingen beskrivelse'}
Labels: ${productData.labels?.map((l: any) => l.name).join(', ') || 'Ingen labels'}
Mængde: ${productData.underline || 'Ukendt mængde'}

Kategoriser dette produkt i en af følgende kategorier:
- Frugt & grønt (friske frugter, grøntsager, frisk kød/fisk)
- Kolonial (tørrede varer, konserves, basis madvarer)
- Kød, fisk & fjerkræ (frisk kød, fisk, fjerkræ)
- Mejeri (mælk, ost, yoghurt, fløde)
- Brød & kager (brød, kager, boller)
- Drikkevarer (drikke, juice, vand, kaffe)
- Snacks & slik (chips, slik, nødder)
- Husholdning & rengøring (rengøring, papir, personlig pleje)
- Baby & børn (babymad, ble, legetøj)
- Kæledyr (hundemad, kattemad)

Returner kun kategorinavnet, intet andet.
`

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI API key not found, using fallback categorization')
      return fallbackCategoryMapping(productData.name)
    }

    // Kald AI for kategorisering
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du er en ekspert i dansk supermarked kategorisering. Kategoriser produkter præcist og logisk.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`⚠️ AI API error ${response.status}: ${errorText}`)
      return fallbackCategoryMapping(productData.name)
    }

    try {
      const result = await response.json()
      const category = result.choices[0]?.message?.content?.trim()
      
      if (category && category !== 'Ukategoriseret') {
        return category
      }
    } catch (parseError) {
      console.log('⚠️ Failed to parse AI response:', parseError)
    }
    
    // Fallback til manuel kategorisering hvis AI fejler
    return fallbackCategoryMapping(productData.name)
    
  } catch (error) {
    console.log('⚠️ AI kategorisering fejlede, bruger fallback:', error)
    return fallbackCategoryMapping(productData.name)
  }
}

// Fallback kategorisering hvis AI fejler
const fallbackCategoryMapping = (productName: string) => {
  const name = productName.toLowerCase()
  
  // Basis kategorisering for kritiske produkter
  if (name.includes('kikærter') || name.includes('bønner') || name.includes('ris') || name.includes('pasta')) {
    return 'Kolonial'
  }
  if (name.includes('æble') || name.includes('tomat') || name.includes('agurk')) {
    return 'Frugt & grønt'
  }
  if (name.includes('mælk') || name.includes('ost') || name.includes('yoghurt')) {
    return 'Mejeri'
  }
  
  return 'Ukategoriseret'
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting REMA products import from Python scraper...')
    
    const body = await request.json()
    const { action, products } = body
    
    // Initialize Supabase client with correct service role key
    const supabase = createClient(
      (process.env as any).NEXT_PUBLIC_SUPABASE_URL!,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamF4eWNmamd1bHR3ZHdmZmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyNzYwNywiZXhwIjoyMDY5OTAzNjA3fQ.4ZEeQ-CS5OSOIOsoMNGzRdNOpbSvD5OII7wl8LRr7JQ'
    )
    
    // Handle different actions
    if (action === 'fixExistingProducts') {
      console.log('🔧 Starting fix of existing products...')
      
      // Get all existing products from database using pagination
      let existingProducts: any[] = []
      let offset = 0
      const limit = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data: batch, error: fetchError } = await supabase
          .from('supermarket_products')
          .select('*')
          .eq('store', 'REMA 1000')
          .range(offset, offset + limit - 1)
        
        if (fetchError) {
          return NextResponse.json({ 
            success: false, 
            error: `Failed to fetch existing products: ${fetchError.message}` 
          })
        }
        
        if (batch && batch.length > 0) {
          existingProducts = [...existingProducts, ...batch]
          offset += limit
          hasMore = batch.length === limit
        } else {
          hasMore = false
        }
      }
      
      console.log(`🔍 Found ${existingProducts.length} existing products to fix`)
      
      let fixedProducts = 0
      const errors: string[] = []
      
      // Process products in batches to avoid Vercel timeout
      const batchSize = 100
      const totalProducts = existingProducts?.length || 0
      
      for (let i = 0; i < totalProducts; i += batchSize) {
        const batch = existingProducts?.slice(i, i + batchSize) || []
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(totalProducts/batchSize)} (${batch.length} products)`)
        
        // Process batch in parallel for speed
        const batchPromises = batch.map(async (product) => {
          try {
            // Simple logic: if price < original_price, it's on sale
            let isOnSale = false
            let originalPrice = product.original_price
            
            // Check if current price is lower than original price
            if (product.price < product.original_price) {
              isOnSale = true
              console.log(`🎯 Product ${product.name}: ON SALE! Price: ${product.price}, Original: ${product.original_price}`)
            } else {
              // If not on sale, set original_price to current price
              originalPrice = product.price
              isOnSale = false
              console.log(`📦 Product ${product.name}: Not on sale. Price: ${product.price}`)
            }
            
            // Update the product with corrected sale information
            const { error: updateError } = await supabase
              .from('supermarket_products')
              .update({
                is_on_sale: isOnSale,
                original_price: originalPrice,
                updated_at: new Date().toISOString()
              })
              .eq('id', product.id)
            
            if (updateError) {
              return { success: false, error: `Failed to fix ${product.name}: ${updateError.message}` }
            } else {
              return { success: true, product: product.name }
            }
            
          } catch (error) {
            return { success: false, error: `Error processing ${product.name}: ${error}` }
          }
        })
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises)
        
        // Count successes and errors
        batchResults.forEach(result => {
          if (result.success) {
            fixedProducts++
          } else if (result.error) {
            errors.push(result.error)
          }
        })
        
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} completed: ${batchResults.filter(r => r.success).length} fixed, ${batchResults.filter(r => !r.success).length} errors`)
      }
      
      return NextResponse.json({
        success: true,
        message: `Fixed ${fixedProducts} products in ${Math.ceil(totalProducts/batchSize)} batches`,
        fixedProducts,
        totalProducts,
        batches: Math.ceil(totalProducts/batchSize),
        errors: errors.length > 0 ? errors : undefined
      })
    }
    
    // Default action: import products
    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'No products provided or invalid format' },
        { status: 400 }
      )
    }
    
    console.log(`📦 Importing ${products.length} products from Python scraper...`)
    let newProducts = 0
    let updatedProducts = 0
    const errors: string[] = []
    
    for (const product of products) {
      try {
        console.log(`🔍 Processing product: ${product.name} (ID: ${product.id})`)
        
        const underlineInfo = parseUnderline(product.underline)
        
        // Get category with better error handling
        let category
        try {
          category = await categorizeProductWithAI(product)
          console.log(`✅ AI categorized "${product.name}" as: ${category}`)
        } catch (aiError) {
          console.log(`⚠️ AI categorization failed for "${product.name}", using fallback:`, aiError)
          category = fallbackCategoryMapping(product.name)
        }
        
        // Transform REMA product to our schema
        const productData = {
          external_id: `python-${product.id}`, // Clear unique prefix
          name: product.name,
          description: product.description || product.underline || null,
          category: category,
          subcategory: product.department?.parent?.name || 'Ukategoriseret',
          // For REMA: price is always the current price (campaign or regular)
          price: product.prices?.[0]?.price || 0,
          // For REMA: we need to store the "regular" price somewhere
          // Since REMA doesn't provide original_price, we'll use current price as baseline
          // and mark is_on_sale based on campaign flag
          original_price: product.prices?.[0]?.price || 0,
          unit: underlineInfo.unit,
          amount: underlineInfo.amount,
          quantity: underlineInfo.quantity,
          unit_price: product.prices?.[0]?.compare_unit_price || 0,
          is_on_sale: product.prices?.[0]?.is_campaign || false,
          sale_end_date: product.prices?.[0]?.ending_at || null,
          currency: 'DKK',
          store: 'REMA 1000',
          store_url: `https://shop.rema1000.dk/produkt/${product.id}`,
          image_url: product.images?.[0]?.medium || product.images?.[0]?.small || null,
          available: product.is_available_in_all_stores !== false,
          temperature_zone: product.temperature_zone,
          nutrition_info: product.detail?.nutrition_info || null,
          labels: product.labels?.map((l: any) => l.name) || [],
          source: 'rema1000-python-scraper',
          last_updated: new Date().toISOString(),
          metadata: {
            rema_id: product.id,
            department: product.department?.name || 'Ukendt',
            brand: underlineInfo.brand,
            original_underline: product.underline
          }
        };
        
        console.log(`🔍 Processing product: ${productData.name} (${productData.external_id})`)
        
        // Validate required fields
        if (!productData.external_id || !productData.name) {
          errors.push(`Product missing required fields: ${JSON.stringify(productData)}`)
          continue
        }
        
        // Check if product already exists
        const { data: existingProduct } = await supabase
          .from('supermarket_products')
          .select('id, price, original_price, is_on_sale, sale_end_date')
          .eq('external_id', productData.external_id)
          .single()
        
        if (existingProduct) {
          console.log(`🔄 Updating existing product: ${productData.external_id}`)
          // Update existing product
          const { error: updateError } = await supabase
            .from('supermarket_products')
            .update({
              name: productData.name,
              description: productData.description,
              category: productData.category,
              subcategory: productData.subcategory,
              price: productData.price,
              original_price: productData.original_price,
              unit: productData.unit,
              amount: productData.amount,
              quantity: productData.quantity,
              unit_price: productData.unit_price,
              is_on_sale: productData.is_on_sale,
              sale_end_date: productData.sale_end_date,
              image_url: productData.image_url,
              available: productData.available,
              temperature_zone: productData.temperature_zone,
              nutrition_info: productData.nutrition_info,
              labels: productData.labels,
              last_updated: productData.last_updated,
              updated_at: new Date().toISOString()
            })
            .eq('external_id', productData.external_id)
          
          if (updateError) {
            errors.push(`Failed to update ${productData.name}: ${updateError.message}`)
          } else {
            updatedProducts++
            
            // Add to price history
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_external_id: productData.external_id,
                price: productData.price,
                original_price: productData.original_price,
                is_on_sale: productData.is_on_sale,
                sale_end_date: productData.sale_end_date
              })
          }
        } else {
          console.log(`✨ Inserting new product: ${productData.external_id}`)
          console.log(`📋 Product data:`, JSON.stringify(productData, null, 2))
          // Insert new product
          const { error: insertError } = await supabase
            .from('supermarket_products')
            .insert(productData)
          
          if (insertError) {
            console.error(`❌ Insert error for ${productData.name}:`, insertError)
            errors.push(`Failed to insert ${productData.name}: ${insertError.message}`)
          } else {
            console.log(`✅ Successfully inserted ${productData.name}`)
            newProducts++
            
            // Add to price history
            await supabase
              .from('supermarket_price_history')
              .insert({
                product_external_id: productData.external_id,
                price: productData.price,
                original_price: productData.original_price,
                is_on_sale: productData.is_on_sale,
                sale_end_date: productData.sale_end_date
              })
          }
        }
        
        // Add small delay to be respectful to database
        await new Promise(resolve => setTimeout(resolve, 50))
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Error processing product: ${errorMessage}`)
      }
    }
    
    console.log(`✅ Import completed: ${newProducts} new, ${updatedProducts} updated`)
    
    return NextResponse.json({
      success: true,
      message: 'REMA products successfully imported from Python scraper',
      import: {
        totalImported: products.length,
        newProducts,
        updatedProducts,
        errors
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error in REMA products import:', error)
    
    return NextResponse.json(
      { 
        error: 'REMA products import failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      (process.env as any).NEXT_PUBLIC_SUPABASE_URL!,
      (process.env as any).NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    // Get statistics from database
    const { data: products, error: productsError } = await supabase
      .from('supermarket_products')
      .select('*')
      .eq('store', 'REMA 1000')
    
    if (productsError) {
      throw productsError
    }
    
    // Calculate statistics
    const totalProducts = products?.length || 0
    const productsOnSale = products?.filter((p: any) => p.is_on_sale).length || 0
    const categories = products?.reduce((acc: string[], p: any) => {
      if (p.category && !acc.includes(p.category)) {
        acc.push(p.category)
      }
      return acc
    }, []) || []
    const lastUpdate = products?.length > 0 ? Math.max(...products.map((p: any) => new Date(p.last_updated).getTime())) : null
    const averagePrice = products?.length > 0 
      ? products.reduce((sum: number, p: any) => sum + parseFloat(p.price.toString()), 0) / products.length 
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
    console.error('❌ Error fetching REMA statistics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch REMA statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
