import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

/** POST: Opret delbar link til madplan (kræver login) */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    let user: any = null
    if (authHeader?.startsWith('Bearer ')) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceKey)
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: u }, error } = await supabase.auth.getUser(token)
      if (!error && u) user = u
    }
    if (!user) {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (n: string) => cookieStore.get(n)?.value,
            set: () => {},
            remove: () => {}
          }
        }
      )
      const { data: { user: u }, error } = await supabase.auth.getUser()
      if (!error && u) user = u
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const mealPlanId = body.mealPlanId
    if (!mealPlanId) {
      return NextResponse.json({ error: 'mealPlanId required' }, { status: 400 })
    }

    const supabase = (await import('@supabase/supabase-js')).createClient(supabaseUrl, serviceKey)
    const { data: plan, error: fetchError } = await supabase
      .from('user_meal_plans')
      .select('id, user_id, share_token, shopping_list, family_profile_snapshot')
      .eq('id', mealPlanId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const token = plan.share_token || randomBytes(12).toString('base64url')
    const sharedByName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || null

    // Opdater plan FØRST – så linket virker med det samme (uafhængigt af pris-hentning)
    const { error: updateError } = await supabase
      .from('user_meal_plans')
      .update({
        is_shared: true,
        share_token: token,
        shared_by_name: sharedByName,
        updated_at: new Date().toISOString()
      })
      .eq('id', mealPlanId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error sharing plan:', updateError)
      return NextResponse.json({ error: 'Failed to share' }, { status: 500 })
    }

    // Hent priser (vent op til 8 sek) – baggrunden når ikke at gemme før serveren lukker
    let shoppingListPrices: Record<string, Record<string, any>> | null = null
    const storeIds = (plan.family_profile_snapshot as any)?.selectedStores
    const shoppingList = plan.shopping_list as any
    if (storeIds?.length > 0 && shoppingList?.categories?.length > 0) {
      const items: any[] = []
      shoppingList.categories.forEach((cat: any) => {
        cat.items?.forEach((item: any) => {
          items.push({
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            ingredientId: item.ingredientId,
            isBasis: item.isBasis || false
          })
        })
      })
      if (items.length > 0) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
          const controller = new AbortController()
          const timeout = setTimeout(() => controller.abort(), 8000)
          const res = await fetch(`${baseUrl}/api/madbudget/shopping-list-prices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shoppingListItems: items, selectedStoreIds: storeIds }),
            signal: controller.signal
          })
          clearTimeout(timeout)
          const data = await res.json()
          if (data.success && data.data && Object.keys(data.data).length > 0) {
            shoppingListPrices = { ...data.data, _fetchedAt: new Date().toISOString() }
            await supabase
              .from('user_meal_plans')
              .update({ shopping_list_prices: shoppingListPrices, updated_at: new Date().toISOString() })
              .eq('id', mealPlanId)
              .eq('user_id', user.id)
          }
        } catch (e) {
          // Timeout eller fejl – linket virker stadig, bare uden priser
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const shareUrl = `${baseUrl}/madplan/${token}`
    return NextResponse.json({ success: true, shareUrl, token })
  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
