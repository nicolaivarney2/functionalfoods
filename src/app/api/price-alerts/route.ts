import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const { data: alerts, error } = await supabase
      .from('user_price_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('price-alerts GET:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    const enriched = await Promise.all(
      (alerts ?? []).map(async (alert) => {
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

            if (alert.threshold_type === 'any_sale') {
              triggered = isOnSale
            } else if (alert.threshold_type === 'min_discount' && discountPct != null) {
              triggered = discountPct >= (alert.min_discount_pct ?? 0)
            }
          }
        }

        return {
          ...alert,
          currentPrice,
          normalPrice,
          isOnSale,
          discountPct,
          triggered,
        }
      }),
    )

    return NextResponse.json({ alerts: enriched })
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
    const storeName = String(offer.store_id)

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
      alert: { ...data, store: storeName },
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
    const { error } = await supabase
      .from('user_price_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

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
