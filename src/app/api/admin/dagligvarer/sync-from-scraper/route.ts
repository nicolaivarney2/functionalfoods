import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { databaseService } from '@/lib/database-service'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { SupermarketProduct } from '@/lib/supermarket-scraper/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function toExternalId(item: any): string | null {
  const candidates: Array<string | number | undefined | null> = [
    item?.external_id,
    item?.store_url,
    item?.image_url,
    item?.id
  ]
  for (const c of candidates) {
    if (typeof c === 'string') {
      const hyphen = c.lastIndexOf('-')
      const tail = hyphen >= 0 ? c.slice(hyphen + 1) : c
      let m: RegExpMatchArray | null = tail.match(/\d{3,}/)
      if (!m) m = c.match(/\/produkt\/(\d{3,})/)
      if (!m) m = c.match(/\/(\d{3,})\//)
      const numStr = m?.[1] || m?.[0]
      if (numStr) return `python-${numStr}`
    } else if (typeof c === 'number' && Number.isFinite(c)) {
      return `python-${c}`
    }
  }
  return null
}

function extractNumericId(candidate: any): string | null {
  if (candidate == null) return null
  const s = String(candidate)
  const m = s.match(/(\d{3,})/)
  return m?.[1] || null
}

export async function POST(req: NextRequest) {
  try {
    // Allow dynamic sources: explicit URL, metadataId, latest metadata, or local file fallback
    const body = await req.json().catch(() => ({} as any))
    const inputUrl: string | undefined = body?.url
    const metadataId: string | number | undefined = body?.metadataId
    const store: string = body?.store || 'REMA 1000'

    const loadFromUrl = async (url: string): Promise<any[]> => {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to fetch URL ${url}: ${res.status}`)
      const json = await res.json()
      return Array.isArray(json) ? json : (json?.products ?? [])
    }

    const loadFromMetadata = async (): Promise<{ list: any[]; source: any }> => {
      const supabase = createSupabaseServiceClient()
      if (metadataId) {
        const { data, error } = await supabase
          .from('scraping_metadata')
          .select('id, timestamp, metadata, products_count')
          .eq('id', metadataId)
          .single()
        if (error) throw error
        const meta = data?.metadata as any
        if (meta?.jsonUrl) {
          const list = await loadFromUrl(meta.jsonUrl)
          return { list, source: { type: 'metadataUrl', id: data.id, timestamp: data.timestamp } }
        }
        if (meta?.jsonData) {
          const json = typeof meta.jsonData === 'string' ? JSON.parse(meta.jsonData) : meta.jsonData
          const list = Array.isArray(json) ? json : (json?.products ?? [])
          return { list, source: { type: 'metadataJson', id: data.id, timestamp: data.timestamp } }
        }
        throw new Error('Metadata record has no jsonUrl or jsonData')
      } else {
        const { data, error } = await supabase
          .from('scraping_metadata')
          .select('id, timestamp, metadata, products_count')
          .eq('store', store)
          .eq('data_type', 'full_import')
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (error) throw error
        if (!data) throw new Error('No scraping metadata found')
        const meta = data.metadata as any
        if (meta?.jsonUrl) {
          const list = await loadFromUrl(meta.jsonUrl)
          return { list, source: { type: 'latestMetadataUrl', id: data.id, timestamp: data.timestamp } }
        }
        if (meta?.jsonData) {
          const json = typeof meta.jsonData === 'string' ? JSON.parse(meta.jsonData) : meta.jsonData
          const list = Array.isArray(json) ? json : (json?.products ?? [])
          return { list, source: { type: 'latestMetadataJson', id: data.id, timestamp: data.timestamp } }
        }
        throw new Error('Latest metadata has no jsonUrl or jsonData')
      }
    }

    let scrapedList: any[] = []
    let sourceInfo: any = null
    if (inputUrl) {
      scrapedList = await loadFromUrl(inputUrl)
      sourceInfo = { type: 'url', url: inputUrl }
    } else {
      try {
        const loaded = await loadFromMetadata()
        scrapedList = loaded.list
        sourceInfo = loaded.source
      } catch (e) {
        // Fallback to local file if metadata missing
        const jsonPath = path.join(process.cwd(), 'scripts', 'data', 'rema_products_full.json')
        const raw = await fs.readFile(jsonPath, 'utf8')
        const scraped = JSON.parse(raw)
        scrapedList = Array.isArray(scraped) ? scraped : (scraped?.products ?? [])
        sourceInfo = { type: 'localFile', path: jsonPath }
      }
    }

    if (!Array.isArray(scrapedList) || scrapedList.length === 0) {
      return NextResponse.json({ success: false, message: 'No scraped data found in JSON' }, { status: 400 })
    }

    // Load all existing products once (bypasses 1000 row cap via pagination)
    const { products: existing, total } = await databaseService.getAllSupermarketProductsForDelta()

    const byExternalId = new Map<string, any>()
    const byNumericId = new Map<string, any>()
    for (const p of existing) {
      const ext = p.external_id || null
      if (ext) byExternalId.set(String(ext), p)
      const num = extractNumericId(p.external_id) || extractNumericId(p.store_url) || extractNumericId(p.image_url) || extractNumericId(p.id)
      if (num) byNumericId.set(num, p)
    }

    let updated = 0
    let inserted = 0
    const changedSamples: Array<{ id: string; name: string; from: any; to: any }> = []

    // Helper to extract price info from Python scraper structure
    const extractPricing = (it: any): { price: number; original_price: number; is_on_sale: boolean; sale_end_date: string | null } => {
      let price = Number(it.price ?? it.current_price ?? it.unit_price ?? 0)
      let original_price = Number(it.original_price ?? it.regular_price ?? price)
      let is_on_sale = Boolean(it.is_on_sale ?? (original_price > price))
      let sale_end_date: string | null = it.sale_end_date ?? it.ending_at ?? null

      // Python scraper format: prices[0]=campaign, prices[1]=regular when on sale
      if (Array.isArray(it.prices) && it.prices.length >= 1) {
        const p0 = it.prices[0]
        const p1 = it.prices.length > 1 ? it.prices[1] : undefined
        const isCampaign = p0?.is_campaign === true || p0?.is_campaign === 'true' || p0?.is_campaign === 1
        if (isCampaign && p1) {
          price = Number(p0.price) || 0
          original_price = Number(p1.price) || price
          is_on_sale = true
          sale_end_date = p0.ending_at || sale_end_date
        } else if (p0 && !isCampaign) {
          price = Number(p0.price) || 0
          original_price = Number(p0.price) || price
          is_on_sale = false
        }
      }

      return { price, original_price, is_on_sale, sale_end_date }
    }

    for (const item of scrapedList) {
      const externalId = item.external_id ?? toExternalId(item)
      if (!externalId) continue

      let db = byExternalId.get(externalId)
      const { price, original_price, is_on_sale, sale_end_date } = extractPricing(item)
      if (!db) {
        const numScraped = extractNumericId(item.external_id) || extractNumericId(item.store_url) || extractNumericId(item.image_url) || extractNumericId(item.id)
        if (numScraped) {
          db = byNumericId.get(numScraped)
        }
      }

      if (!db) {
        // Optional: create minimal new product (skip for now to avoid schema mismatches)
        continue
      }

      const diffPrice = db.price !== price
      const diffOffer = db.is_on_sale !== is_on_sale
      const diffOriginal = Number(db.original_price || 0) !== original_price
      const diffSaleEnd = (db.sale_end_date || null) !== (sale_end_date || null)

      if (diffPrice || diffOffer || diffOriginal || diffSaleEnd) {
        const toUpdate: Partial<SupermarketProduct> = {
          id: db.id,
          name: db.name,
          description: db.description,
          category: db.category,
          subcategory: db.subcategory,
          price,
          originalPrice: original_price,
          unit: db.unit,
          unitPrice: db.unit_price,
          isOnSale: is_on_sale,
          saleEndDate: sale_end_date,
          imageUrl: db.image_url,
          store: db.store,
          available: db.available,
          temperatureZone: db.temperature_zone,
          nutritionInfo: db.nutrition_info || {},
          labels: Array.isArray(db.labels) ? db.labels : [],
          lastUpdated: new Date().toISOString(),
          source: db.source
        }
        await databaseService.updateSupermarketProduct(toUpdate as SupermarketProduct)
        updated++
        if (changedSamples.length < 5) changedSamples.push({ id: externalId, name: db.name, from: { price: db.price, original_price: db.original_price, is_on_sale: db.is_on_sale, sale_end_date: db.sale_end_date }, to: { price, original_price, is_on_sale, sale_end_date } })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sync from scraper (DB diff) completed',
      totals: { existing: total, scraped: scrapedList.length },
      changes: { updated, inserted, samples: changedSamples },
      source: sourceInfo
    })
  } catch (error) {
    console.error('sync-from-scraper error:', error)
    return NextResponse.json({ success: false, message: 'Sync failed', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}


