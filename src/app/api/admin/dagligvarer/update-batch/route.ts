import { NextRequest, NextResponse } from 'next/server'
import { Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'
import { createSupabaseClient } from '@/lib/supabase'
import { databaseService } from '@/lib/database-service'

export const dynamic = 'force-dynamic'

async function updateOneByExternalId(externalId: string, scraper: Rema1000Scraper, supabase: ReturnType<typeof createSupabaseClient>) {
  const numMatch = externalId.match(/(\d{3,})$/)
  const remaId = numMatch ? parseInt(numMatch[1], 10) : NaN
  if (Number.isNaN(remaId)) {
    return { externalId, ok: false, error: 'invalid_external_id' }
  }
  const { data: rows } = await supabase
    .from('supermarket_products')
    .select('*')
    .eq('external_id', externalId)
    .limit(1)
  const existing = rows?.[0]
  const fresh = await scraper.fetchProduct(remaId)
  if (!existing || !fresh) return { externalId, ok: false, error: existing ? 'not_found_rema' : 'not_found_db' }
  ;(fresh as any).external_id = existing.external_id
  const ok = await databaseService.updateSupermarketProduct(fresh as any)
  if (ok) {
    try {
      await supabase
        .from('supermarket_price_history')
        .insert({
          product_external_id: existing.external_id,
          price: fresh.price,
          original_price: fresh.originalPrice,
          is_on_sale: fresh.isOnSale,
          sale_end_date: fresh.saleEndDate,
          timestamp: new Date().toISOString()
        })
    } catch {}
  }
  return { externalId, ok, before: { price: existing.price, original_price: existing.original_price, is_on_sale: existing.is_on_sale }, after: { price: fresh.price, original_price: fresh.originalPrice, is_on_sale: fresh.isOnSale } }
}

export async function POST(request: NextRequest) {
  try {
    const { externalIds = [], productIds = [] } = await request.json()
    const scraper = new Rema1000Scraper()
    const supabase = createSupabaseClient()
    const resolvedExternalIds: string[] = []

    // Map numeric IDs to known external_id patterns to locate DB rows
    for (const id of productIds) {
      const n = parseInt(String(id), 10)
      if (!Number.isNaN(n)) {
        resolvedExternalIds.push(`python-${n}`)
        resolvedExternalIds.push(`rema-${n}`)
      }
    }

    const ids = Array.from(new Set([...(externalIds as string[]), ...resolvedExternalIds]))
    const results: any[] = []

    for (const ext of ids) {
      const res = await updateOneByExternalId(ext, scraper, supabase)
      results.push(res)
    }

    const updated = results.filter(r => r.ok).length
    return NextResponse.json({ success: true, updated, total: ids.length, results })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const idsParam = url.searchParams.get('ids') // comma-separated numeric ids
  const extsParam = url.searchParams.get('exts') // comma-separated external_ids
  const productIds = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : []
  const externalIds = extsParam ? extsParam.split(',').map(s => s.trim()).filter(Boolean) : []
  const scraper = new Rema1000Scraper()
  const supabase = createSupabaseClient()
  const resolvedExternalIds: string[] = []
  for (const id of productIds) {
    const n = parseInt(String(id), 10)
    if (!Number.isNaN(n)) {
      resolvedExternalIds.push(`python-${n}`)
      resolvedExternalIds.push(`rema-${n}`)
    }
  }
  const ids = Array.from(new Set([...(externalIds as string[]), ...resolvedExternalIds]))
  const results: any[] = []
  for (const ext of ids) {
    const res = await updateOneByExternalId(ext, scraper, supabase)
    results.push(res)
  }
  const updated = results.filter(r => r.ok).length
  return NextResponse.json({ success: true, updated, total: ids.length, results })
}


