import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSurveyWeekContext } from '@/lib/madbudget-week-dates'

export const dynamic = 'force-dynamic'

type ShopReason = 'cheapest' | 'closest' | 'prefer_anyway' | 'other'

async function getAuthenticatedUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return null

  const authHeader = request.headers.get('authorization')
  let user: { id: string } | null = null

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
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )
    const { data: { user: u }, error } = await supabase.auth.getUser()
    if (!error && u) user = u
  }

  return user
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const storeId = typeof body.storeId === 'number' ? body.storeId : parseInt(String(body.storeId), 10)
    const storeName = typeof body.storeName === 'string' ? body.storeName.trim() : ''
    const shopReason = body.shopReason as ShopReason
    const otherReason =
      typeof body.otherReason === 'string' ? body.otherReason.trim().slice(0, 500) : null

    if (!storeName || Number.isNaN(storeId)) {
      return NextResponse.json({ error: 'Butik er påkrævet' }, { status: 400 })
    }

    const validReasons: ShopReason[] = ['cheapest', 'closest', 'prefer_anyway', 'other']
    if (!validReasons.includes(shopReason)) {
      return NextResponse.json({ error: 'Ugyldig begrundelse' }, { status: 400 })
    }

    if (shopReason === 'other' && !otherReason) {
      return NextResponse.json({ error: 'Skriv venligst en kort begrundelse' }, { status: 400 })
    }

    const { thisMondayStr, prevMondayStr } = getSurveyWeekContext()

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { error } = await supabase.from('madbudget_shop_survey_responses').insert({
      user_id: user.id,
      prompt_week_start: thisMondayStr,
      referenced_week_start: prevMondayStr,
      store_id: storeId,
      store_name: storeName,
      shop_reason: shopReason,
      other_reason: shopReason === 'other' ? otherReason : null,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Du har allerede besvaret for denne uge' }, { status: 409 })
      }
      console.error('madbudget_shop_survey insert', error)
      return NextResponse.json(
        {
          error: 'Kunne ikke gemme svar',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('shop-survey POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
