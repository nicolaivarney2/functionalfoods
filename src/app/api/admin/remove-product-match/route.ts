import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { deleteMatchInFooddata, runFooddataPublish } from '@/lib/fooddata-publish'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(request: NextRequest) {
  try {
    const { match_id } = await request.json()

    if (!match_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required field: match_id' 
      }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: existing, error: fetchError } = await supabase
      .from('product_ingredient_matches')
      .select('ingredient_id, product_external_id')
      .eq('id', match_id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({
        success: false,
        message: 'Match not found',
      }, { status: 404 })
    }

    const { error } = await supabase
      .from('product_ingredient_matches')
      .delete()
      .eq('id', match_id)

    if (error) {
      console.error('Error removing product match:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to remove product match' 
      }, { status: 500 })
    }

    const publishResult = await runFooddataPublish('remove-product-match', async (client) => {
      await deleteMatchInFooddata(
        client,
        existing.ingredient_id,
        existing.product_external_id
      )
    })
    if (!publishResult.ok && !publishResult.skipped) {
      console.warn('⚠️ fooddata delete failed (local match removed):', publishResult.error)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Product match removed successfully'
    })

  } catch (error) {
    console.error('Error in remove-product-match:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
