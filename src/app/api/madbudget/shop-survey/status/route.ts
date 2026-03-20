import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSurveyWeekContext } from '@/lib/madbudget-week-dates'
import { storesForSurvey } from '@/lib/madbudget-stores'

export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const force =
      searchParams.get('force') === '1' ||
      searchParams.get('shopSurvey') === '1'

    const { thisMondayStr, prevMondayStr } = getSurveyWeekContext()

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const [{ data: plans }, { data: existing }, { data: family }] = await Promise.all([
      supabase
        .from('user_meal_plans')
        .select('id, week_start_date')
        .eq('user_id', user.id)
        .eq('week_start_date', prevMondayStr),
      supabase
        .from('madbudget_shop_survey_responses')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_week_start', thisMondayStr)
        .maybeSingle(),
      supabase.from('family_profiles').select('selected_stores').eq('user_id', user.id).maybeSingle(),
    ])

    const hadPlanLastWeek = Array.isArray(plans) && plans.length > 0
    const alreadyAnswered = !!existing?.id
    const storeOptions = storesForSurvey(family?.selected_stores as number[] | undefined)

    const showSurvey = force || (hadPlanLastWeek && !alreadyAnswered)

    return NextResponse.json({
      success: true,
      showSurvey,
      thisWeekMonday: thisMondayStr,
      referencedWeekMonday: prevMondayStr,
      hadPlanLastWeek,
      alreadyAnswered,
      storeOptions,
    })
  } catch (e) {
    console.error('shop-survey/status', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
