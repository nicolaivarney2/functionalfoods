import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { displayStoreName } from '@/lib/price-alerts/store-ids'

export const dynamic = 'force-dynamic'

function isTriggered(alert: Record<string, unknown>, offer: Record<string, unknown> | undefined): boolean {
  if (!offer || !offer.is_on_sale) return false
  if (alert.threshold_type === 'any_sale') return true
  const discount =
    offer.discount_percentage != null
      ? Number(offer.discount_percentage)
      : offer.normal_price && offer.current_price
        ? Math.round(
            ((Number(offer.normal_price) - Number(offer.current_price)) / Number(offer.normal_price)) * 100,
          )
        : 0
  return discount >= Number(alert.min_discount_pct ?? 0)
}

async function enrichAlerts(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  alerts: Record<string, unknown>[],
) {
  return Promise.all(
    alerts.map(async (alert) => {
      let currentPrice: number | null = null
      let normalPrice: number | null = null
      let isOnSale = false
      let discountPct: number | null = null
      let triggered = false

      if (alert.product_offer_id) {
        const { data: offer } = await supabase
          .from('product_offers')
          .select('current_price, normal_price, is_on_sale, discount_percentage, is_offer_active')
          .eq('id', Number(alert.product_offer_id))
          .maybeSingle()

        if (offer) {
          currentPrice = offer.current_price ?? null
          normalPrice = offer.normal_price ?? null
          isOnSale = Boolean(offer.is_offer_active ?? offer.is_on_sale)
          discountPct = offer.discount_percentage ?? null
          triggered = isTriggered(alert, offer as Record<string, unknown>)
        }
      }

      return {
        ...alert,
        store: displayStoreName(String(alert.store_id || '')),
        currentPrice,
        normalPrice,
        isOnSale,
        discountPct,
        triggered,
      }
    }),
  )
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()

    const [{ data: alerts, error }, { data: groups, error: groupsError }, { data: meta }] =
      await Promise.all([
        supabase
          .from('user_price_alerts')
          .select('*')
          .eq('user_id', user.id)
          .is('group_id', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_price_alert_groups')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('user_price_alert_meta').select('last_seen_at').eq('user_id', user.id).maybeSingle(),
      ])

    if (error || groupsError) {
      console.error('price-alerts GET:', error || groupsError)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    const groupIds = (groups ?? []).map((g) => g.id)
    let alertCounts = new Map<string, number>()
    if (groupIds.length > 0) {
      const { data: groupAlerts } = await supabase
        .from('user_price_alerts')
        .select('group_id')
        .in('group_id', groupIds)
      for (const row of groupAlerts ?? []) {
        if (!row.group_id) continue
        alertCounts.set(row.group_id, (alertCounts.get(row.group_id) ?? 0) + 1)
      }
    }

    const enrichedAlerts = await enrichAlerts(supabase, (alerts ?? []) as Record<string, unknown>[])
    const enrichedGroups = (groups ?? []).map((g) => ({
      ...g,
      alertCount: alertCounts.get(g.id) ?? 0,
    }))

    const lastSeenAt = meta?.last_seen_at ? new Date(meta.last_seen_at).getTime() : 0
    const unseenCount = enrichedAlerts.filter((a) => {
      const triggeredAt = (a as { last_triggered_at?: string | null }).last_triggered_at
      return a.triggered && triggeredAt && new Date(triggeredAt).getTime() > lastSeenAt
    }).length

    return NextResponse.json({ alerts: enrichedAlerts, groups: enrichedGroups, unseenCount })
  } catch (err) {
    console.error('GET /api/price-alerts:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const productOfferId = body.productOfferId as string | number | undefined
    const thresholdType = body.thresholdType as 'any_sale' | 'min_discount' | undefined
    const minDiscountPct = body.minDiscountPct as number | undefined

    if (!productOfferId || !thresholdType) {
      return NextResponse.json(
        { error: 'productOfferId and thresholdType are required' },
        { status: 400 },
      )
    }
    if (!['any_sale', 'min_discount'].includes(thresholdType)) {
      return NextResponse.json({ error: 'Invalid thresholdType' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const offerId = Number(productOfferId)

    const { data: offer, error: offerError } = await supabase
      .from('product_offers')
      .select('id, product_id, store_id, name_store, current_price, products:product_id(image_url)')
      .eq('id', offerId)
      .maybeSingle()

    if (offerError || !offer) {
      return NextResponse.json({ error: 'Product offer not found' }, { status: 404 })
    }

    const productsArr = Array.isArray(offer.products) ? offer.products : offer.products ? [offer.products] : []
    const imageUrl = productsArr[0]?.image_url ?? null

    const { data, error } = await supabase
      .from('user_price_alerts')
      .upsert(
        {
          user_id: user.id,
          product_id: String(offer.product_id),
          store_id: String(offer.store_id),
          product_offer_id: String(offer.id),
          product_name: offer.name_store ?? 'Produkt',
          image_url: imageUrl,
          threshold_type: thresholdType,
          min_discount_pct: thresholdType === 'min_discount' ? (minDiscountPct ?? 20) : null,
          is_active: true,
          group_id: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id,store_id' },
      )
      .select('*')
      .single()

    if (error) {
      console.error('price-alerts POST:', error)
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      alert: { ...data, store: displayStoreName(String(offer.store_id)) },
    })
  } catch (err) {
    console.error('POST /api/price-alerts:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    const { data: existing } = await supabase
      .from('user_price_alerts')
      .select('id, group_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }
    if (existing.group_id) {
      return NextResponse.json(
        { error: 'Kan ikke slette enkelt alarm i gruppe — slet hele gruppen i stedet' },
        { status: 400 },
      )
    }

    const { error } = await supabase.from('user_price_alerts').delete().eq('id', id).eq('user_id', user.id)

    if (error) {
      console.error('price-alerts DELETE:', error)
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/price-alerts:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
