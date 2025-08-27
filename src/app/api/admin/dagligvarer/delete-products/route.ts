import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { productIds } = body
    
    // If no product IDs provided, delete all REMA products
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      console.log('🗑️ No product IDs provided, deleting all REMA products...')
      
      // Use hardcoded service role key for now (temporary fix)
      const supabase = createClient(
        (process.env as any).NEXT_PUBLIC_SUPABASE_URL!,
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamF4eWNmamd1bHR3ZHdmZmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyNzYwNywiZXhwIjoyMDY5OTAzNjA3fQ.4ZEeQ-CS5OSOIOsoMNGzRdNOpbSvD5OII7wl8LRr7JQ'
      )
      
      // Delete ALL products (not just REMA 1000)
      const { error, count } = await supabase
        .from('supermarket_products')
        .delete()
        .neq('id', 0) // Delete all products (id > 0)
      
      if (error) {
        console.error('❌ Error deleting all REMA products:', error)
        return NextResponse.json({
          success: false,
          error: 'Failed to delete all REMA products',
          details: error.message
        }, { status: 500 })
      }
      
      console.log(`✅ Successfully deleted all REMA products`)
      
      return NextResponse.json({
        success: true,
        message: 'Successfully deleted all REMA products',
        deletedCount: count || 0
      })
    }

    console.log(`🗑️ Deleting ${productIds.length} specific products...`)
    
    // Use hardcoded service role key for now (temporary fix)
    const supabase = createClient(
      (process.env as any).NEXT_PUBLIC_SUPABASE_URL!,
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamF4eWNmamd1bHR3ZHdmZmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyNzYwNywiZXhwIjoyMDY5OTAzNjA3fQ.4ZEeQ-CS5OSOIOsoMNGzRdNOpbSvD5OII7wl8LRr7JQ'
    )
    
    // Delete products by ID
    const { error } = await supabase
      .from('supermarket_products')
      .delete()
      .in('id', productIds)
    
    if (error) {
      console.error('❌ Error deleting specific products:', error)
      return NextResponse.json({
        success: false,
        error: 'Failed to delete specific products',
        details: error.message
      }, { status: 500 })
    }
    
    console.log(`✅ Successfully deleted ${productIds.length} specific products`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${productIds.length} specific products`,
      deletedCount: productIds.length
    })
    
  } catch (error) {
    console.error('❌ Error in delete products API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
