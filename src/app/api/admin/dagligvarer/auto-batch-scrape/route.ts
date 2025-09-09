import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting automatic batch scrape for all REMA products...')
    
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
    let totalProducts = 0
    let totalAdded = 0
    let totalUpdated = 0
    let page = 1
    let hasMore = true
    let batchCount = 0
    
    while (hasMore) {
      batchCount++
      console.log(`🔄 Processing batch ${batchCount} (page ${page})...`)
      
      try {
        const response = await fetch(`${baseUrl}/api/dagligvarer/batch-scrape?page=${page}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) {
          throw new Error(`Batch scrape failed with status ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(`Batch scrape failed: ${data.message}`)
        }
        
        totalProducts += data.productsFound || 0
        totalAdded += data.productsAdded || 0
        totalUpdated += data.productsUpdated || 0
        hasMore = data.hasMore || false
        page = data.nextPage || page + 1
        
        console.log(`✅ Batch ${batchCount} completed: ${data.productsFound} found, ${data.productsAdded} added, ${data.productsUpdated} updated`)
        
        // Small delay between batches to avoid overwhelming the system
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (error) {
        console.error(`❌ Batch ${batchCount} failed:`, error)
        // Continue with next batch instead of failing completely
        hasMore = false
      }
    }
    
    console.log(`🎉 Automatic batch scrape completed!`)
    console.log(`📊 Total: ${totalProducts} products found, ${totalAdded} added, ${totalUpdated} updated across ${batchCount} batches`)
    
    return NextResponse.json({
      success: true,
      message: 'Automatic batch scrape completed successfully',
      totalProducts,
      totalAdded,
      totalUpdated,
      batchesProcessed: batchCount,
      finalPage: page
    })
    
  } catch (error) {
    console.error('❌ Error in automatic batch scrape:', error)
    return NextResponse.json({
      success: false,
      message: `Automatic batch scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
