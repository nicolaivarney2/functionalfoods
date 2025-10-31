import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const { ingredient_id, product_external_id, confidence, match_type } = await request.json()

    if (!ingredient_id || !product_external_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields: ingredient_id and product_external_id' 
      }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // Insert the match
    const { data, error } = await supabase
      .from('product_ingredient_matches')
      .insert({
        ingredient_id,
        product_external_id,
        confidence: confidence || 100,
        match_type: match_type || 'manual',
        is_manual: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding product match:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to add product match' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Product match added successfully',
      data 
    })

  } catch (error) {
    console.error('Error in add-product-match:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
