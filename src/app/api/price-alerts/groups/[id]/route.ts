import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { displayStoreName } from '@/lib/price-alerts/store-ids'
import { isPriceAlertTriggered, offerIsOnSale } from '@/lib/price-alerts/trigger'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const supabase = createSupabaseServiceClient()

    const { data: group, error: groupError } = await supabase
      .from('user_price_alert_groups')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const { data: alerts, error: alertsError } = await supabase
      .from('user_price_alerts')
      .select('*')
      .eq('group_id', id)
      .eq('user_id', user.id)
      .order('product_name')

    if (alertsError) {
      return NextResponse.json({ error: 'Failed to load alerts' }, { status: 500 })
    }

    const productIds = Array.from(new Set((alerts ?? []).map((a) => a.product_id)))
    const { data: offers } = await supabase
      .from('product_offers')
      .select(
        'product_id, store_id, current_price, normal_price, is_on_sale, discount_percentage, is_offer_active, id',
      )
      .in('product_id', productIds)

    const offersByKey = new Map<string, Record<string, unknown>>()
    for (const o of offers || []) {
      offersByKey.set(`${o.product_id}:${o.store_id}`, o as Record<string, unknown>)
    }

    const enriched = (alerts ?? []).map((alert) => {
      const offer = offersByKey.get(`${alert.product_id}:${alert.store_id}`)
      const currentPrice = offer?.current_price != null ? Number(offer.current_price) : null
      const normalPrice = offer?.normal_price != null ? Number(offer.normal_price) : null
      const isOnSale = offerIsOnSale(offer)
      const discountPct = offer?.discount_percentage != null ? Number(offer.discount_percentage) : null
      return {
        ...alert,
        storeName: displayStoreName(alert.store_id),
        currentPrice,
        normalPrice,
        isOnSale,
        discountPct,
        triggered: isPriceAlertTriggered(alert as Record<string, unknown>, offer),
        productOfferId: offer?.id ?? alert.product_offer_id,
      }
    })

    return NextResponse.json({
      group: {
        ...group,
        alertCount: enriched.length,
        triggeredCount: enriched.filter((a) => a.triggered).length,
      },
      alerts: enriched,
    })
  } catch (err) {
    console.error('GET /api/price-alerts/groups/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await context.params
    const supabase = createSupabaseServiceClient()

    const { error } = await supabase
      .from('user_price_alert_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('DELETE /api/price-alerts/groups/[id]:', error)
      return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/price-alerts/groups/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
