import { NextRequest, NextResponse } from 'next/server'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'
import { databaseService } from '@/lib/database-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting delta update process...')
    
    // Get existing products from database
    const existingProducts = await databaseService.getSupermarketProducts()
    console.log(`📊 Found ${existingProducts.length} existing products in database`)
    
    if (existingProducts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No existing products found. Run full scrape first.',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    // Initialize scraper
    const scraper = new Rema1000Scraper()
    
    // Perform smart delta update
    const deltaResult = await scraper.smartDeltaUpdate(existingProducts)
    
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
        totalProducts: existingProducts.length + deltaResult.new.length
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
    
    const existingProducts = await databaseService.getSupermarketProducts()
    
    // Get last update info (you might want to store this in a separate table)
    const lastUpdate = new Date().toISOString()
    
    const status = {
      success: true,
      message: 'Delta update status',
      timestamp: new Date().toISOString(),
      status: {
        totalProducts: existingProducts.length,
        lastUpdate: lastUpdate,
        readyForDelta: existingProducts.length > 0
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
