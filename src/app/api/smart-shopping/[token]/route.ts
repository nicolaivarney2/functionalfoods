import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    if (!token || token.length < 8) {
      return NextResponse.json({ error: 'Ugyldigt link' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: row, error } = await supabase
      .from('smart_shopping_links')
      .select(
        'id, token, store_id, store_name, store_key, payload, shopping_list_prices, meal_summary, created_at, open_count, first_opened_at'
      )
      .eq('token', token)
      .single()

    if (error || !row) {
      return NextResponse.json({ error: 'Link ikke fundet eller udløbet' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const r = row as {
      open_count?: number
      first_opened_at?: string | null
    }
    const prev = r.open_count ?? 0
    await supabase
      .from('smart_shopping_links')
      .update({
        open_count: prev + 1,
        first_opened_at: r.first_opened_at || now,
        last_opened_at: now,
      })
      .eq('token', token)

    return NextResponse.json({
      success: true,
      data: {
        storeId: row.store_id,
        storeName: row.store_name,
        storeKey: row.store_key,
        shoppingList: row.payload,
        shoppingListPrices: row.shopping_list_prices,
        mealSummary: row.meal_summary,
        createdAt: row.created_at,
      },
    })
  } catch (e) {
    console.error('smart-shopping GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
