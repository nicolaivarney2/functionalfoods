import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('🧹 Starting duplicate cleanup...')
    
    const supabase = createSupabaseServiceClient()
    
    // Get all REMA products (fetch in batches to avoid limits)
    let allProducts: any[] = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: batch, error: fetchError } = await supabase
        .from('supermarket_products')
        .select('*')
        .eq('source', 'rema1000')
        .order('name, category, created_at')
        .range(offset, offset + batchSize - 1)

      if (fetchError) {
        throw new Error(`Failed to fetch products: ${fetchError.message}`)
      }

      if (batch && batch.length > 0) {
        allProducts = allProducts.concat(batch)
        offset += batchSize
        hasMore = batch.length === batchSize
        console.log(`📦 Fetched batch: ${batch.length} products (total: ${allProducts.length})`)
      } else {
        hasMore = false
      }
    }
    
    console.log(`🔍 Found ${allProducts?.length || 0} total REMA products`)
    
    // Group by name and category to find duplicates
    const productGroups = new Map<string, any[]>()
    
    if (allProducts) {
      for (const product of allProducts) {
        const key = `${product.name}|${product.category}`
        if (!productGroups.has(key)) {
          productGroups.set(key, [])
        }
        productGroups.get(key)!.push(product)
      }
    }
    
    // Find groups with duplicates
    const duplicateGroups = Array.from(productGroups.values()).filter(group => group.length > 1)
    
    console.log(`🔍 Found ${duplicateGroups.length} duplicate groups`)
    
    let totalDeleted = 0
    
    for (const group of duplicateGroups) {
      // Sort by created_at to keep the oldest
      group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      // Keep the first (oldest) product, delete the rest
      const toDelete = group.slice(1)
      
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
    
    console.log(`✅ Cleanup completed! Deleted ${totalDeleted} duplicates`)
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      duplicatesFound: duplicateGroups.length,
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
