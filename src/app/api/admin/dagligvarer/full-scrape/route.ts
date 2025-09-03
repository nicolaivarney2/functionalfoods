import { NextRequest, NextResponse } from 'next/server'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'
import { databaseService } from '@/lib/database-service'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting full REMA 1000 scrape...')
    
    const rema1000Scraper = new Rema1000Scraper()
    
    // Perform full scrape
    const scrapeResult = await rema1000Scraper.scrapeAllProducts()
    
    if (!scrapeResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Full scrape failed',
        error: scrapeResult.error
      }, { status: 500 })
    }

    console.log(`📊 Scraped ${scrapeResult.products?.length || 0} products`)

    // Clear existing REMA products from database
    console.log('🗑️ Clearing existing REMA products...')
    const supabase = createSupabaseServiceClient()
    const { error: deleteError } = await supabase
      .from('supermarket_products')
      .delete()
      .eq('source', 'rema1000')
    
    if (deleteError) {
      console.error('❌ Error clearing existing products:', deleteError)
      return NextResponse.json({
        success: false,
        message: 'Failed to clear existing products',
        error: deleteError.message
      }, { status: 500 })
    }

    // Store all new products
    console.log('💾 Storing new products...')
    const storeResult = await rema1000Scraper.storeProducts(scrapeResult.products || [])
    
    if (!storeResult.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to store products',
        error: storeResult.error
      }, { status: 500 })
    }

    // Upload to Supabase Storage for future DB-diff syncs
    console.log('☁️ Uploading to Supabase Storage...')
    const storageResult = await rema1000Scraper.uploadToStorage(scrapeResult.products || [])
    
    // Create metadata record
    const metadata = {
      timestamp: new Date().toISOString(),
      productsCount: scrapeResult.products?.length || 0,
      status: 'completed',
      method: 'full-scrape',
      storeResult: {
        newProducts: storeResult.newProducts || 0,
        updatedProducts: storeResult.updatedProducts || 0,
        errors: storeResult.errors || []
      },
      storageResult: storageResult.success ? {
        jsonUrl: storageResult.jsonUrl,
        storagePath: storageResult.storagePath
      } : null
    }

    const { error: metadataError } = await supabase
      .from('scraping_metadata')
      .insert({
        store: 'REMA 1000',
        source: 'rema1000',
        status: 'completed',
        metadata: metadata
      })

    if (metadataError) {
      console.error('⚠️ Failed to save metadata:', metadataError)
    }

    console.log('✅ Full scrape completed successfully')

    return NextResponse.json({
      success: true,
      message: 'Full scrape completed successfully',
      timestamp: new Date().toISOString(),
      scrape: {
        totalScraped: scrapeResult.products?.length || 0,
        newProducts: storeResult.newProducts || 0,
        updatedProducts: storeResult.updatedProducts || 0,
        errors: storeResult.errors || []
      },
      storage: storageResult.success ? {
        jsonUrl: storageResult.jsonUrl,
        storagePath: storageResult.storagePath
      } : null,
      metadata: metadata
    })

  } catch (error) {
    console.error('❌ Full scrape error:', error)
    return NextResponse.json({
      success: false,
      message: 'Full scrape failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
