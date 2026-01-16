import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { ingredient_id, product_external_id, confidence, match_type } = await request.json()

    console.log(`🔄 Adding product match: ingredient_id=${ingredient_id}, product_external_id=${product_external_id}`)

    if (!ingredient_id || !product_external_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: ingredient_id and product_external_id' 
      }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Check if match already exists
    const { data: existingMatch, error: checkError } = await supabase
      .from('product_ingredient_matches')
      .select('id')
      .eq('ingredient_id', ingredient_id)
      .eq('product_external_id', product_external_id)
      .single()

    if (existingMatch) {
      console.log('⚠️ Match already exists')
      return NextResponse.json({ 
        success: false, 
        message: 'This product is already matched to this ingredient',
        data: existingMatch
      }, { status: 409 })
    }

    // Check if ingredient exists
    const { data: ingredient, error: ingredientError } = await supabase
      .from('ingredients')
      .select('id, name')
      .eq('id', ingredient_id)
      .single()

    if (ingredientError || !ingredient) {
      console.error('❌ Ingredient not found:', ingredientError)
      return NextResponse.json({ 
        success: false, 
        message: 'Ingredient not found',
        details: ingredientError?.message
      }, { status: 404 })
    }

    console.log(`✅ Found ingredient: ${ingredient.name}`)

    // Validate product exists.
    // We support TWO sources:
    // - Old: supermarket_products.external_id (e.g. "python-123", "rema-123", etc.)
    // - New (Goma): product_offers.store_product_id (e.g. "meny-57012...", "kvickly-...", etc.)
    let foundProduct = false

    // Old structure
    try {
      const { data: products, error: productError } = await supabase
        .from('supermarket_products')
        .select('external_id, name')
        .eq('external_id', product_external_id)
        .limit(1)

      if (!productError && products && products.length > 0) {
        foundProduct = true
        console.log(`✅ Found product in supermarket_products: ${products[0].name}`)
      }
    } catch (err) {
      console.warn('⚠️ Exception checking supermarket_products:', err)
    }

    // New structure (Goma)
    if (!foundProduct) {
      try {
        const { data: offers, error: offerError } = await supabase
          .from('product_offers')
          .select('id, store_product_id, name_store')
          .eq('store_product_id', product_external_id)
          .limit(1)

        if (!offerError && offers && offers.length > 0) {
          foundProduct = true
          console.log(`✅ Found product in product_offers: ${offers[0].name_store} (${offers[0].store_product_id})`)
        }
      } catch (err) {
        console.warn('⚠️ Exception checking product_offers:', err)
      }
    }

    if (!foundProduct) {
      console.warn(`⚠️ Product not found in either source for product_external_id="${product_external_id}". Allowing match anyway.`)
    }

    // Insert the match
    const insertData = {
      ingredient_id,
      product_external_id,
      confidence: confidence || 100,
      match_type: match_type || 'manual',
      is_manual: true
    }
    
    console.log(`📝 Inserting match with data:`, JSON.stringify(insertData, null, 2))
    
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Error adding product match:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      console.error('❌ Error code:', error.code)
      console.error('❌ Error hint:', error.hint)
      
      // Check if it's a foreign key constraint error
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        return NextResponse.json({ 
          success: false, 
          message: 'Product not found in database. The product might be from a new structure that is not yet supported.',
          details: error.message,
          hint: 'Try matching a product from REMA 1000 (old structure) first, or update the foreign key constraint in the database.'
        }, { status: 400 })
      }
      
      // Check if it's a unique constraint error (duplicate)
      if (error.code === '23505' || error.message?.includes('unique')) {
        return NextResponse.json({ 
          success: false, 
          message: 'This product is already matched to this ingredient'
        }, { status: 409 })
      }
      
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to add product match',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }

    console.log(`✅ Successfully added product match: ${data?.id}`)
    return NextResponse.json({ 
      success: true, 
      message: 'Product match added successfully',
      data 
    })

  } catch (error) {
    console.error('❌ Error in add-product-match:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
