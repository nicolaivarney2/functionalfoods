import { NextRequest, NextResponse } from 'next/server'
import { rema1000Scraper, Rema1000Scraper } from '@/lib/supermarket-scraper/rema1000-scraper'
import { databaseService } from '@/lib/database-service'
import { createSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function handleUpdate(productId?: string | number, externalId?: string) {
  try {

    // Accept either a numeric REMA ID or a full external_id
    let numericId: number | null = null
    let extId: string | null = null

    if (typeof productId === 'string' || typeof productId === 'number') {
      const n = parseInt(String(productId), 10)
      if (!Number.isNaN(n)) numericId = n
    }

    if (typeof externalId === 'string' && externalId.trim()) {
      extId = externalId.trim()
      const match = extId.match(/(\d{3,})$/)
      if (!numericId && match) numericId = parseInt(match[1], 10)
    }

    if (!numericId && !extId) {
      return NextResponse.json({ success: false, error: 'Provide productId (numeric REMA id) or externalId' }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // Find existing DB row by external_id
    const extCandidates = extId
      ? [extId]
      : [`python-${numericId}`, `rema-${numericId}`]

    const { data: rows, error: findErr } = await supabase
      .from('supermarket_products')
      .select('*')
      .in('external_id', extCandidates)
      .limit(1)

    if (findErr) {
      return NextResponse.json({ success: false, error: findErr.message }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Product not found in DB for provided id', candidates: extCandidates }, { status: 404 })
    }

    const existing = rows[0]

    // Fetch fresh product from REMA
    const scraper = new Rema1000Scraper()
    const remaId = numericId || parseInt(String(existing.external_id).replace(/^[^0-9]*/, ''), 10)
    const fresh = await scraper.fetchProduct(remaId)

    if (!fresh) {
      return NextResponse.json({ success: false, error: 'REMA API returned no product for id', remaId }, { status: 404 })
    }

    // Preserve external_id for DB matching
    ;(fresh as any).external_id = existing.external_id

    // Write update
    const ok = await databaseService.updateSupermarketProduct(fresh as any)

    // Add price history (best-effort)
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

    return NextResponse.json({
      success: ok,
      message: ok ? 'Single product updated' : 'Update failed',
      remaId,
      external_id: existing.external_id,
      before: {
        price: existing.price,
        original_price: existing.original_price,
        is_on_sale: existing.is_on_sale
      },
      after: {
        price: fresh.price,
        original_price: fresh.originalPrice,
        is_on_sale: fresh.isOnSale
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { productId, externalId } = await request.json()
    return await handleUpdate(productId, externalId)
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const productId = url.searchParams.get('productId') || undefined
  const externalId = url.searchParams.get('externalId') || undefined
  return await handleUpdate(productId, externalId)
}


