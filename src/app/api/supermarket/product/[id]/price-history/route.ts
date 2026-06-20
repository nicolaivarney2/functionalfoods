import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    const offerId = Number(id)
    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json({ error: 'Invalid product id' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: offer, error: offerError } = await supabase
      .from('product_offers')
      .select('product_id, store_id, current_price, normal_price, is_on_sale, is_offer_active')
      .eq('id', offerId)
      .maybeSingle()

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const productId = String(offer.product_id)
    const storeId = String(offer.store_id)

    const { data: historyRows, error: historyError } = await supabase
      .from('price_history')
      .select('price, normal_price, is_on_sale, snapshot_date')
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .order('snapshot_date', { ascending: true })
      .limit(90)

    if (historyError) {
      console.error('price-history query:', historyError)
      return NextResponse.json({ history: [] })
    }

    const history = (historyRows ?? []).map((row) => ({
      price: Number(row.price),
      normalPrice: row.normal_price != null ? Number(row.normal_price) : null,
      isOnSale: Boolean(row.is_on_sale),
      timestamp: `${row.snapshot_date}T12:00:00.000Z`,
    }))

    return NextResponse.json({
      history,
      current: {
        price: offer.current_price ?? 0,
        normalPrice: offer.normal_price ?? offer.current_price ?? 0,
        isOnSale: Boolean(offer.is_offer_active ?? offer.is_on_sale),
      },
    })
  } catch (err) {
    console.error('GET /api/supermarket/product/[id]/price-history:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
