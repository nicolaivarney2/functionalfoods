import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

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

    // Delete the match
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
