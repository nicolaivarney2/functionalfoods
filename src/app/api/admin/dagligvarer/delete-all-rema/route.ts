import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    console.log('🗑️ Starting deletion of all REMA products...')
    
    const supabase = createSupabaseServiceClient()
    
    // First, count how many REMA products we have
    const { count: totalCount, error: countError } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'rema1000')

    if (countError) {
      throw new Error(`Failed to count REMA products: ${countError.message}`)
    }

    console.log(`🔍 Found ${totalCount || 0} REMA products to delete`)

    if (!totalCount || totalCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No REMA products found to delete',
        deleted: 0
      })
    }

    // Delete all REMA products
    const { error: deleteError } = await supabase
      .from('supermarket_products')
      .delete()
      .eq('source', 'rema1000')

    if (deleteError) {
      throw new Error(`Failed to delete REMA products: ${deleteError.message}`)
    }

    console.log(`✅ Successfully deleted ${totalCount} REMA products`)

    return NextResponse.json({
      success: true,
      message: 'All REMA products deleted successfully',
      deleted: totalCount
    })

  } catch (error) {
    console.error('❌ Error deleting REMA products:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to delete REMA products: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
