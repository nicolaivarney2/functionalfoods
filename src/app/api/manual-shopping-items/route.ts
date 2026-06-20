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
    const { data, error } = await supabase
      .from('user_manual_shopping_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('manual-shopping-items GET:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET /api/manual-shopping-items:', err)
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
    const supabase = createSupabaseServiceClient()

    if (body.productOfferId) {
      const offerId = Number(body.productOfferId)
      const { data: offer, error: offerError } = await supabase
        .from('product_offers')
        .select(`
          id,
          product_id,
          store_id,
          name_store,
          products:product_id (unit, amount, image_url)
        `)
        .eq('id', offerId)
        .maybeSingle()

      if (offerError || !offer) {
        return NextResponse.json({ error: 'Product offer not found' }, { status: 404 })
      }

      const productsArr = Array.isArray(offer.products) ? offer.products : offer.products ? [offer.products] : []
      const p = productsArr[0] ?? {}

      const { data, error } = await supabase
        .from('user_manual_shopping_items')
        .insert({
          user_id: user.id,
          name: offer.name_store ?? 'Produkt',
          quantity: body.quantity ?? 1,
          unit: p.unit ?? 'stk',
          product_offer_id: String(offer.id),
          product_id: String(offer.product_id),
          store_id: String(offer.store_id),
          image_url: p.image_url ?? null,
        })
        .select('*')
        .single()

      if (error) {
        console.error('manual-shopping-items POST (offer):', error)
        return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
      }

      return NextResponse.json({ item: data })
    }

    const name = (body.name as string | undefined)?.trim()
    if (!name) {
      return NextResponse.json({ error: 'name or productOfferId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_manual_shopping_items')
      .insert({
        user_id: user.id,
        name,
        quantity: body.quantity ?? 1,
        unit: body.unit ?? 'stk',
      })
      .select('*')
      .single()

    if (error) {
      console.error('manual-shopping-items POST (text):', error)
      return NextResponse.json({ error: 'Failed to add item' }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('POST /api/manual-shopping-items:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, isChecked } = await request.json()
    if (!id || typeof isChecked !== 'boolean') {
      return NextResponse.json({ error: 'id and isChecked are required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('user_manual_shopping_items')
      .update({ is_checked: isChecked, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      console.error('manual-shopping-items PATCH:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH /api/manual-shopping-items:', err)
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
      .from('user_manual_shopping_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('manual-shopping-items DELETE:', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/manual-shopping-items:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
