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

// Map product categories based on name and department
const mapCategory = (productName: string, department: any) => {
  const name = productName.toLowerCase()
  
  // 🥬 Frugt & grønt - Udvidet liste
  if (name.includes('banan') || name.includes('æble') || name.includes('tomat') || 
      name.includes('agurk') || name.includes('salat') || name.includes('løg') ||
      name.includes('kartoffel') || name.includes('gulerod') || name.includes('broccoli') ||
      name.includes('tranebær') || name.includes('jordbær') || name.includes('blåbær') ||
      name.includes('hindbær') || name.includes('solbær') || name.includes('stikkelsbær') ||
      name.includes('citron') || name.includes('lime') ||
      name.includes('appelsin') || name.includes('mandarin') || name.includes('grapefrugt') ||
      name.includes('ananas') || name.includes('mango') || name.includes('kiwi') ||
      name.includes('druer') || name.includes('vandmelon') || name.includes('melon') ||
      name.includes('pære') || name.includes('fersken') || name.includes('nektarin') ||
      name.includes('plomme') || name.includes('kirsebær') || name.includes('morel') ||
      name.includes('porre') || name.includes('selleri') || name.includes('spinat') ||
      name.includes('kål') || name.includes('blomkål') || name.includes('rosenkål') ||
      name.includes('rødbede') || name.includes('peberfrugt') || name.includes('aubergine') ||
      name.includes('squash') || name.includes('ingefær') || name.includes('hvidløg')) {
    return 'Frugt & grønt'
  }
  
  // 🥩 Kød, fisk & fjerkræ - Udvidet liste
  if (name.includes('kød') || name.includes('hakket') || name.includes('steak') ||
      name.includes('pølse') || name.includes('skinke') || name.includes('bacon') ||
      name.includes('kylling') || name.includes('fisk') || name.includes('laks') ||
      name.includes('torsk') || name.includes('reje') || name.includes('laks') ||
      name.includes('ørred') || name.includes('sej') || name.includes('kuller') ||
      name.includes('makrel') || name.includes('sild') || name.includes('ansjos') ||
      name.includes('kalmar') || name.includes('musling') || name.includes('østers') ||
      name.includes('okse') || name.includes('kalv') || name.includes('lam') ||
      name.includes('gris') || name.includes('and') || name.includes('gås') ||
      name.includes('kalkun') || name.includes('hønse') || name.includes('æg')) {
    return 'Kød, fisk & fjerkræ'
  }
  
  // 🥛 Mejeri - Udvidet liste
  if (name.includes('mælk') || name.includes('ost') || name.includes('yoghurt') ||
      name.includes('fløde') || name.includes('smør') || name.includes('kærnemælk') ||
      name.includes('kefir') || name.includes('skyr') || name.includes('quark') ||
      name.includes('creme fraiche') || name.includes('rømme') || name.includes('tykmælk') ||
      name.includes('koldskål') || name.includes('piskefløde') || name.includes('kødmælk')) {
    return 'Mejeri'
  }
  
  // 🥖 Brød & kager - Udvidet liste
  if (name.includes('brød') || name.includes('kage') || name.includes('boller') ||
      name.includes('rundstykker') || name.includes('croissant') || name.includes('wienerbrød') ||
      name.includes('kringle') || name.includes('franskbrød') || name.includes('rugbrød') ||
      name.includes('hvidbrød') || name.includes('fuldkornsbrød') || name.includes('surdejsbrød') ||
      name.includes('konditorværk') || name.includes('muffin') || name.includes('cupcake')) {
    return 'Brød & kager'
  }
  
  // 🍚 Kolonial - Udvidet liste (inklusive kikærter!)
  if (name.includes('ris') || name.includes('pasta') || name.includes('kartoffel') ||
      name.includes('bønner') || name.includes('linser') || name.includes('quinoa') ||
      name.includes('kikærter') || name.includes('ærter') || name.includes('majs') ||
      name.includes('bulgur') || name.includes('couscous') || name.includes('buckwheat') ||
      name.includes('marmelade') || name.includes('honning') || name.includes('sirup') ||
      name.includes('oliven') || name.includes('pesto') || name.includes('bouillon') ||
      name.includes('ketchup') || name.includes('sennep') || name.includes('mayonnaise') ||
      name.includes('soya') || name.includes('olie') || name.includes('eddike') ||
      name.includes('salt') || name.includes('peber') || name.includes('krydderier') ||
      name.includes('tørrede tomater') || name.includes('tørrede svampe') || name.includes('nødder') ||
      name.includes('frø') || name.includes('tørrede frugter') || name.includes('konserves') ||
      name.includes('rosiner') || name.includes('dadler') || name.includes('aprikoser') ||
      name.includes('pruner') || name.includes('figen') || name.includes('kranbær')) {
    return 'Kolonial'
  }
  
  // 🥤 Drikkevarer - Kun rigtige drikkevarer
  if (name.includes('øl') || name.includes('vin') || name.includes('sodavand') ||
      name.includes('juice') || name.includes('vand') || name.includes('kaffe') ||
      name.includes('te') || name.includes('cocacola') || name.includes('pepsi') ||
      name.includes('fanta') || name.includes('sprite') || name.includes('red bull') ||
      name.includes('monster') || name.includes('energidrik') || name.includes('smoothie') ||
      name.includes('shake') || name.includes('milkshake') || name.includes('kakao')) {
    return 'Drikkevarer'
  }
  
  // 🍫 Snacks & slik - Udvidet liste
  if (name.includes('chips') || name.includes('nødder') || name.includes('chokolade') ||
      name.includes('slik') || name.includes('kiks') || name.includes('kiks') ||
      name.includes('popcorn') || name.includes('pretzels') || name.includes('crackers') ||
      name.includes('kartoffelchips') || name.includes('tortillachips') || name.includes('nøddechips') ||
      name.includes('lakrids') || name.includes('karamel') || name.includes('toffee') ||
      name.includes('gummi') || name.includes('pastiller') || name.includes('tyggegummi')) {
    return 'Snacks & slik'
  }
  
  // 🧴 Husholdning & rengøring
  if (name.includes('vaskemiddel') || name.includes('ble') || name.includes('toiletpapir') ||
      name.includes('håndsæbe') || name.includes('shampoo') || name.includes('tandpasta') ||
      name.includes('deodorant') || name.includes('parfume') || name.includes('creme') ||
      name.includes('sæbe') || name.includes('opvaskemiddel') || name.includes('rengøringsmiddel') ||
      name.includes('køkkenrulle') || name.includes('alufolie') || name.includes('fryseposer')) {
    return 'Husholdning & rengøring'
  }
  
  // 🧸 Baby & børn
  if (name.includes('babymad') || name.includes('ble') || name.includes('baby') ||
      name.includes('børne') || name.includes('legetøj') || name.includes('børnetøj')) {
    return 'Baby & børn'
  }
  
  // 🐕 Kæledyr
  if (name.includes('hundemad') || name.includes('katte') || name.includes('dyremad') ||
      name.includes('kæledyr') || name.includes('hund') || name.includes('kat')) {
    return 'Kæledyr'
  }
  
  // Try to use department info if available and it makes sense
  if (department?.name && !department.name.includes('Ukendt')) {
    return department.name
  }
  
  return 'Ukategoriseret'
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting REMA products import from Python scraper...')
    
    const body = await request.json()
    const { products } = body
    
    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'No products provided or invalid format' },
        { status: 400 }
      )
    }
    
    console.log(`📦 Importing ${products.length} products from Python scraper...`)
    
    // Initialize Supabase client with correct service role key
    const supabase = createClient(
      (process.env as any).NEXT_PUBLIC_SUPABASE_URL!,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamF4eWNmamd1bHR3ZHdmZmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyNzYwNywiZXhwIjoyMDY5OTAzNjA3fQ.4ZEeQ-CS5OSOIOsoMNGzRdNOpbSvD5OII7wl8LRr7JQ'
    )
    let newProducts = 0
    let updatedProducts = 0
    const errors: string[] = []
    
    for (const product of products) {
      try {
        const underlineInfo = parseUnderline(product.underline)
        
        // Transform REMA product to our schema
        const productData = {
          external_id: `python-${product.id}`, // Clear unique prefix
          name: product.name,
          description: product.description || product.underline || null,
          category: mapCategory(product.name, product.department || null),
          subcategory: product.department?.parent?.name || 'Ukategoriseret',
          price: product.prices?.[0]?.price || 0,
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
