import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'
import {
  SubscriptionLimitError,
  assertPriceAlertCreationAllowed,
} from '@/lib/subscription-entitlements'
import { MAX_GROUP_ALERTS, MIN_GROUP_MATCHES, PREVIEW_CACHE_TTL_MS } from '@/lib/price-alerts/constants'
import {
  matchOffersForPriceAlertQuery,
  summarizeMatches,
} from '@/lib/price-alerts/match-offers-for-query'
import { displayStoreName, normalizeDagligvarerStoreIds } from '@/lib/price-alerts/store-ids'

export const dynamic = 'force-dynamic'

type CacheEntry = { at: number; payload: unknown }
const previewCache = new Map<string, CacheEntry>()

function cacheKey(search: string, stores: string[]): string {
  return `${search.toLowerCase()}::${stores.sort().join(',')}`
}

async function createSingleAlert(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
  match: Awaited<ReturnType<typeof matchOffersForPriceAlertQuery>>[number],
  thresholdType: 'any_sale' | 'min_discount',
  minDiscountPct: number | null,
) {
  const { data, error } = await supabase
    .from('user_price_alerts')
    .upsert(
      {
        user_id: userId,
        product_id: match.productId,
        store_id: match.storeId,
        product_offer_id: String(match.productOfferId),
        product_name: match.name,
        image_url: match.imageUrl,
        threshold_type: thresholdType,
        min_discount_pct: thresholdType === 'min_discount' ? minDiscountPct : null,
        is_active: true,
        group_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,product_id,store_id' },
    )
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const storesParam = searchParams.get('stores')
    const storeIds = storesParam ? storesParam.split(',').map((s) => s.trim()).filter(Boolean) : []

    if (search.length < 2) {
      return NextResponse.json({
        searchQuery: search,
        matchCount: 0,
        storeCount: 0,
        canCreateGroup: false,
        capped: false,
      })
    }

    const key = cacheKey(search, storeIds)
    const cached = previewCache.get(key)
    if (cached && Date.now() - cached.at < PREVIEW_CACHE_TTL_MS) {
      return NextResponse.json(cached.payload)
    }

    const matches = await matchOffersForPriceAlertQuery(search, storeIds)
    const summary = summarizeMatches(matches)
    const payload = {
      searchQuery: search,
      stores: normalizeDagligvarerStoreIds(storeIds),
      ...summary,
      preview: matches.slice(0, 5).map((m) => ({
        name: m.name,
        store: displayStoreName(m.storeId),
      })),
    }
    previewCache.set(key, { at: Date.now(), payload })
    return NextResponse.json(payload)
  } catch (err) {
    console.error('GET /api/price-alerts/groups:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const searchQuery = String(body.searchQuery || body.label || '').trim()
    const label = String(body.label || searchQuery).trim()
    const thresholdType = body.thresholdType as 'any_sale' | 'min_discount'
    const minDiscountPct =
      thresholdType === 'min_discount' ? Number(body.minDiscountPct ?? 20) : null
    const storeIds = Array.isArray(body.storeIds) ? (body.storeIds as string[]) : []

    if (!searchQuery || searchQuery.length < 2) {
      return NextResponse.json({ error: 'searchQuery is required (min 2 chars)' }, { status: 400 })
    }
    if (!['any_sale', 'min_discount'].includes(thresholdType)) {
      return NextResponse.json({ error: 'Invalid thresholdType' }, { status: 400 })
    }

    const matches = await matchOffersForPriceAlertQuery(searchQuery, storeIds)
    if (matches.length === 0) {
      return NextResponse.json({ error: 'Ingen matchende varer fundet' }, { status: 404 })
    }

    const supabase = createSupabaseServiceClient()

    try {
      await assertPriceAlertCreationAllowed(supabase, user.id, matches.length)
    } catch (err) {
      if (err instanceof SubscriptionLimitError) {
        return NextResponse.json(
          { error: err.message, code: err.code, tier: err.tier, status: err.status },
          { status: 402 },
        )
      }
      throw err
    }

    if (matches.length < MIN_GROUP_MATCHES) {
      const alert = await createSingleAlert(
        supabase,
        user.id,
        matches[0],
        thresholdType,
        minDiscountPct,
      )
      return NextResponse.json({
        success: true,
        type: 'single',
        alert: { ...alert, store: displayStoreName(alert.store_id) },
      })
    }

    const { data: group, error: groupError } = await supabase
      .from('user_price_alert_groups')
      .insert({
        user_id: user.id,
        label,
        search_query: searchQuery,
        threshold_type: thresholdType,
        min_discount_pct: minDiscountPct,
        is_active: true,
      })
      .select('*')
      .single()

    if (groupError || !group) {
      console.error('price-alerts groups POST group:', groupError)
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    const alertRows = matches.map((m) => ({
      user_id: user.id,
      group_id: group.id,
      product_id: m.productId,
      store_id: m.storeId,
      product_offer_id: String(m.productOfferId),
      product_name: m.name,
      image_url: m.imageUrl,
      threshold_type: thresholdType,
      min_discount_pct: minDiscountPct,
      is_active: true,
    }))

    const { error: alertsError } = await supabase.from('user_price_alerts').upsert(alertRows, {
      onConflict: 'user_id,product_id,store_id',
    })

    if (alertsError) {
      await supabase.from('user_price_alert_groups').delete().eq('id', group.id)
      console.error('price-alerts groups POST alerts:', alertsError)
      return NextResponse.json({ error: 'Failed to create alerts' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      type: 'group',
      group: {
        ...group,
        alertCount: alertRows.length,
        capped: alertRows.length >= MAX_GROUP_ALERTS,
      },
    })
  } catch (err) {
    console.error('POST /api/price-alerts/groups:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
