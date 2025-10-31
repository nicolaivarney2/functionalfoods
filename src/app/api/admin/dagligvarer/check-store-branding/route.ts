import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking store branding status...')
    
    const supabase = createSupabaseServiceClient()
    
    // Count products with different store names
    const { count: rema1000Count, error: rema1000Error } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .eq('store', 'rema1000')

    const { count: rema1000ProperCount, error: rema1000ProperError } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .eq('store', 'REMA 1000')

    const { count: totalRemaCount, error: totalRemaError } = await supabase
      .from('supermarket_products')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'rema1000')

    if (rema1000Error || rema1000ProperError || totalRemaError) {
      throw new Error(`Failed to count products: ${rema1000Error?.message || rema1000ProperError?.message || totalRemaError?.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Store branding status checked',
      counts: {
        oldBranding: rema1000Count || 0,
        newBranding: rema1000ProperCount || 0,
        totalRemaProducts: totalRemaCount || 0
      },
      status: (rema1000Count || 0) === 0 ? 'complete' : 'needs_fix'
    })

  } catch (error) {
    console.error('❌ Error checking store branding:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to check store branding: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
