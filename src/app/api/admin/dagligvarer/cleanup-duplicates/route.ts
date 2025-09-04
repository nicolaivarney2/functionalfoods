import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Starting duplicate cleanup...')
    
    const supabase = createSupabaseServiceClient()
    
    // Find duplicates by name and category
    const { data: duplicates, error: findError } = await supabase
      .from('supermarket_products')
      .select('name, category, count(*)')
      .eq('source', 'rema1000')
      .group('name, category')
      .having('count(*) > 1')
    
    if (findError) {
      throw new Error(`Failed to find duplicates: ${findError.message}`)
    }
    
    console.log(`🔍 Found ${duplicates?.length || 0} duplicate groups`)
    
    let totalDeleted = 0
    
    if (duplicates && duplicates.length > 0) {
      for (const duplicate of duplicates) {
        // Get all products with this name and category
        const { data: products, error: fetchError } = await supabase
          .from('supermarket_products')
          .select('*')
          .eq('name', duplicate.name)
          .eq('category', duplicate.category)
          .eq('source', 'rema1000')
          .order('created_at', { ascending: true }) // Keep oldest
        
        if (fetchError) {
          console.error(`❌ Error fetching products for ${duplicate.name}:`, fetchError)
          continue
        }
        
        if (products && products.length > 1) {
          // Keep the first (oldest) product, delete the rest
          const toDelete = products.slice(1)
          
          for (const product of toDelete) {
            const { error: deleteError } = await supabase
              .from('supermarket_products')
              .delete()
              .eq('id', product.id)
            
            if (deleteError) {
              console.error(`❌ Error deleting product ${product.id}:`, deleteError)
            } else {
              totalDeleted++
              console.log(`🗑️ Deleted duplicate: ${product.name} (${product.external_id})`)
            }
          }
        }
      }
    }
    
    console.log(`✅ Cleanup completed! Deleted ${totalDeleted} duplicates`)
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      duplicatesFound: duplicates?.length || 0,
      duplicatesDeleted: totalDeleted
    })
    
  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({
      success: false,
      message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
