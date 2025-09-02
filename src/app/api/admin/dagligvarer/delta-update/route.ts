import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { POST as SyncFromScraper } from '../sync-from-scraper/route'

export const dynamic = 'force-dynamic'

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
    
    // NEW: Use DB-diff sync (latest scraped JSON) for reliable updates within serverless limits
    console.log('🔄 Starting delta update via DB-diff sync-from-scraper...')
    const publicBase = (process.env as any).NEXT_PUBLIC_SUPABASE_URL as string | undefined
    const storageUrl = publicBase ? `${publicBase}/storage/v1/object/public/scraper-data/rema/latest.json` : undefined
    // Try latest.json first; if it fails, fall back to default metadata-based sync
    let syncJson: any = null
    try {
      const internalReq = new Request('http://internal/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(storageUrl ? { url: storageUrl } : {}) }) as any
      const syncRes = await SyncFromScraper(internalReq)
      syncJson = await syncRes.json().catch(() => null)
      if (!syncJson?.success) throw new Error(syncJson?.error || 'latest.json failed')
    } catch (e) {
      const fallbackReq = new Request('http://internal/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }) as any
      const fbRes = await SyncFromScraper(fallbackReq)
      syncJson = await fbRes.json().catch(() => null)
      if (!syncJson?.success) {
        return NextResponse.json({ success: false, message: 'Delta via DB-diff sync failed', error: syncJson?.error || 'unknown' }, { status: 500 })
      }
    }

    const updated = syncJson?.changes?.updated ?? 0
    const inserted = syncJson?.changes?.inserted ?? 0
    const result = {
      success: true,
      message: 'Delta update (DB-diff) completed successfully',
      timestamp: new Date().toISOString(),
      delta: {
        updated,
        new: inserted,
        unchanged: Math.max(existingProducts.products.length - updated, 0),
        totalChanges: updated + inserted
      },
      database: {
        updates: updated + inserted,
        totalProducts: existingProducts.products.length,
        deltaStatus: 'completed',
        readyForDelta: existingProducts.products.length > 0
      },
      debug: {
        methodUsed: 'sync-from-scraper',
        totals: syncJson?.totals,
        source: syncJson?.source,
        samples: syncJson?.changes?.samples || []
      }
    }

    console.log('🎉 Delta (DB-diff) process completed:', result)
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
