import { NextRequest, NextResponse } from 'next/server'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'
import { databaseService } from '@/lib/database-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting delta update process...')
    
    // Get ALL existing products from database for delta update
    const existingProducts = await databaseService.getAllSupermarketProductsForDelta()
    
    console.log(`📊 Found ${existingProducts.products.length} existing products in database`)
    
    if (existingProducts.products.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No existing products found. Run full scrape first.',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    // Initialize scraper
    const scraper = new Rema1000Scraper()
    
    // Perform intelligent batch update directly (skip smart delta investigation)
    console.log('🔄 Starting delta update with intelligentBatchUpdate...')
    const deltaResult = await scraper.intelligentBatchUpdate(existingProducts.products)
    console.log('✅ intelligentBatchUpdate completed:', deltaResult)
    
    console.log(`✅ Delta update completed:`)
    console.log(`   - Updated: ${deltaResult.updated.length}`)
    console.log(`   - New: ${deltaResult.new.length}`)
    console.log(`   - Unchanged: ${deltaResult.unchanged.length}`)
    console.log(`   - Total changes: ${deltaResult.totalChanges}`)
    
    // Update database with changes
    let databaseUpdates = 0
    
    if (deltaResult.updated.length > 0) {
      // Update existing products
      for (const product of deltaResult.updated) {
        try {
          await databaseService.updateSupermarketProduct(product)
          databaseUpdates++
        } catch (error) {
          console.log(`⚠️ Failed to update product ${product.id}:`, error)
        }
      }
    }
    
    if (deltaResult.new.length > 0) {
      // Add new products
      for (const product of deltaResult.new) {
        try {
          await databaseService.addSupermarketProduct(product)
          databaseUpdates++
        } catch (error) {
          console.log(`⚠️ Failed to add product ${product.id}:`, error)
        }
      }
    }
    
    const result = {
      success: true,
      message: 'Delta update completed successfully',
      timestamp: new Date().toISOString(),
      delta: {
        updated: deltaResult.updated.length,
        new: deltaResult.new.length,
        unchanged: deltaResult.unchanged.length,
        totalChanges: deltaResult.totalChanges
      },
      database: {
        updates: databaseUpdates,
        totalProducts: existingProducts.products.length,
        deltaStatus: 'completed',
        readyForDelta: existingProducts.products.length > 0
      },
      debug: {
        methodUsed: 'intelligentBatchUpdate',
        totalProductsFound: existingProducts.products.length,
        remaProductsFound: existingProducts.products.filter(p => 
          p.source === 'rema1000' || 
          p.source === 'rema1000-python-scraper' ||
          p.source?.includes('rema')
        ).length,
        sourcesFound: Array.from(new Set(existingProducts.products.map(p => p.source))),
        sampleProducts: existingProducts.products.slice(0, 3).map(p => ({ id: p.id, name: p.name, source: p.source }))
      }
    }
    
    console.log('🎉 Delta update process completed:', result)
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error in delta update:', error)
    return NextResponse.json({
      success: false,
      message: 'Delta update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting delta update status...')
    
    const existingProducts = await databaseService.getAllSupermarketProductsForDelta()
    
    // Get last update info (you might want to store this in a separate table)
    const lastUpdate = new Date().toISOString()
    
    const status = {
      success: true,
      message: 'Delta update status',
      timestamp: new Date().toISOString(),
      status: {
        totalProducts: existingProducts.products.length,
        lastUpdate: lastUpdate,
        readyForDelta: existingProducts.products.length > 0
      }
    }
    
    return NextResponse.json(status)
    
  } catch (error) {
    console.error('❌ Error getting delta update status:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get delta update status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
