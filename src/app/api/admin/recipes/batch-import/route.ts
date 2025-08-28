import { NextRequest, NextResponse } from 'next/server'
import { ImportProcessor } from '@/lib/import-processor'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { recipes, batchSize = 5, delayBetweenBatches = 1000 } = await request.json()
    
    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid recipes data'
      }, { status: 400 })
    }

    console.log(`🚀 Starting batch import: ${recipes.length} recipes`)
    console.log(`📦 Batch size: ${batchSize}, Delay: ${delayBetweenBatches}ms`)

    // Create import processor
    const processor = new ImportProcessor()
    
    // Process import with batch options
    const result = await processor.processImport(recipes, {
      batchSize,
      delayBetweenBatches
    })

    console.log(`✅ Batch import complete!`)
    console.log(`📊 Stats:`, result.stats)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.recipes.length} recipes`,
      stats: result.stats,
      recipes: result.recipes,
      ingredients: result.ingredients
    })

  } catch (error) {
    console.error('❌ Batch import failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
