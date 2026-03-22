import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

async function getUser(supabaseUrl: string, serviceKey: string, request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) return user
  }
  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (n: string) => cookieStore.get(n)?.value,
      set: () => {},
      remove: () => {},
    },
  })
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!error && user) return user
  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getUser(supabaseUrl, serviceKey, request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      mealPlanId,
      storeId,
      storeKey,
      storeName,
      shoppingList,
      shoppingListPrices,
      mealSummary,
    } = body as {
      mealPlanId?: string | null
      storeId: number
      storeKey: string
      storeName: string
      shoppingList: unknown
      shoppingListPrices?: unknown
      mealSummary?: unknown
    }

    if (!shoppingList || typeof storeId !== 'number' || !storeKey || !storeName) {
      return NextResponse.json({ error: 'Manglende data (butik, liste)' }, { status: 400 })
    }

    if (mealPlanId) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceKey)
      const { data: plan } = await supabase
        .from('user_meal_plans')
        .select('id')
        .eq('id', mealPlanId)
        .eq('user_id', user.id)
        .single()
      if (!plan) {
        return NextResponse.json({ error: 'Madplan ikke fundet' }, { status: 404 })
      }
    }

    const token = randomBytes(18).toString('base64url')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data, error } = await supabase
      .from('smart_shopping_links')
      .insert({
        token,
        user_id: user.id,
        meal_plan_id: mealPlanId || null,
        store_id: storeId,
        store_name: storeName,
        store_key: storeKey,
        payload: shoppingList,
        shopping_list_prices: shoppingListPrices ?? null,
        meal_summary: mealSummary ?? null,
      })
      .select('id, token')
      .single()

    if (error) {
      console.error('smart_shopping_links insert', error)
      return NextResponse.json(
        { error: 'Kunne ikke oprette link. Har du kørt add-smart-shopping-links.sql i Supabase?' },
        { status: 500 }
      )
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const url = `${origin.replace(/\/$/, '')}/indkob/${data.token}`

    return NextResponse.json({ success: true, token: data.token, url })
  } catch (e) {
    console.error('smart-shopping create', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
