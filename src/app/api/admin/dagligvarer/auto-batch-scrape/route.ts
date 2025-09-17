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
    let batchCount = 0
    
    // Define all REMA departments to scrape
    const departments = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 160]
    
    for (const departmentId of departments) {
      console.log(`🏪 Processing department ${departmentId}...`)
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        batchCount++
        console.log(`🔄 Processing department ${departmentId}, batch ${batchCount} (page ${page})...`)
        
        try {
          const response = await fetch(`${baseUrl}/api/dagligvarer/batch-scrape-admin?page=${page}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ departmentId, limit: 100 })
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
          
          console.log(`✅ Department ${departmentId}, batch ${batchCount} completed: ${data.productsFound} found, ${data.productsAdded} added, ${data.productsUpdated} updated`)
          
          // Small delay between batches to avoid overwhelming the system
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
        } catch (error) {
          console.error(`❌ Department ${departmentId}, batch ${batchCount} failed:`, error)
          // Continue with next department instead of failing completely
          hasMore = false
        }
      }
      
      // Delay between departments
      if (departmentId !== departments[departments.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000))
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
      departmentsProcessed: departments.length
    })
    
  } catch (error) {
    console.error('❌ Error in automatic batch scrape:', error)
    return NextResponse.json({
      success: false,
      message: `Automatic batch scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
