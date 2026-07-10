import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import {
  SubscriptionLimitError,
  assertMealPlanGenerationAllowed,
  assertPriceAlertCreationAllowed,
  logMealPlanGeneration,
} from '@/lib/subscription-entitlements'
import { displayStoreName } from '@/lib/price-alerts/store-ids'
import { isPriceAlertTriggered, offerIsOnSale } from '@/lib/price-alerts/trigger'

export const dynamic = 'force-dynamic'

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
          isOnSale = offerIsOnSale(offer as Record<string, unknown>)
          discountPct = offer.discount_percentage ?? null
          triggered = isPriceAlertTriggered(alert, offer as Record<string, unknown>)
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

async function enrichGroups(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  groups: Record<string, unknown>[],
  alertCounts: Map<string, number>,
) {
  if (groups.length === 0) return []

  const groupIds = groups.map((g) => String(g.id))
  const { data: groupAlerts } = await supabase
    .from('user_price_alerts')
    .select('group_id, product_id, store_id, threshold_type, min_discount_pct')
    .in('group_id', groupIds)

  const alertsByGroup = new Map<string, Record<string, unknown>[]>()
  const productIds = new Set<string>()
  for (const row of groupAlerts ?? []) {
    if (!row.group_id) continue
    const list = alertsByGroup.get(row.group_id) ?? []
    list.push(row as Record<string, unknown>)
    alertsByGroup.set(row.group_id, list)
    if (row.product_id) productIds.add(String(row.product_id))
  }

  const offersByKey = new Map<string, Record<string, unknown>>()
  if (productIds.size > 0) {
    const { data: offers } = await supabase
      .from('product_offers')
      .select(
        'product_id, store_id, current_price, normal_price, is_on_sale, discount_percentage, is_offer_active',
      )
      .in('product_id', Array.from(productIds))

    for (const o of offers ?? []) {
      offersByKey.set(`${o.product_id}:${o.store_id}`, o as Record<string, unknown>)
    }
  }

  return groups.map((g) => {
    const id = String(g.id)
    const members = alertsByGroup.get(id) ?? []
    let triggeredCount = 0
    for (const alert of members) {
      const offer = offersByKey.get(`${alert.product_id}:${alert.store_id}`)
      if (isPriceAlertTriggered(alert, offer)) triggeredCount++
    }
    return {
      ...g,
      alertCount: alertCounts.get(id) ?? members.length,
      triggeredCount,
      triggered: triggeredCount > 0,
    }
  })
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
    const enrichedGroups = await enrichGroups(
      supabase,
      (groups ?? []) as Record<string, unknown>[],
      alertCounts,
    )

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

    try {
      await assertPriceAlertCreationAllowed(supabase, user.id, 1)
    } catch (err) {
      if (err instanceof SubscriptionLimitError) {
        return NextResponse.json(
          { error: err.message, code: err.code, tier: err.tier, status: err.status },
          { status: 402 },
        )
      }
      throw err
    }

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
