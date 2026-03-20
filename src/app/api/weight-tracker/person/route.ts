import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'

export const dynamic = 'force-dynamic'

/** Opdater eller opret voksenprofil fra vægt-tracker (inkl. kaldenavn og mål). */
export async function PATCH(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const adultIndex = parseInt(String(body.adultIndex ?? '0'), 10)
    if (Number.isNaN(adultIndex) || adultIndex < 0) {
      return NextResponse.json({ error: 'Ugyldig person' }, { status: 400 })
    }

    const row: Record<string, unknown> = {
      user_id: user.id,
      adult_index: adultIndex,
      updated_at: new Date().toISOString(),
    }

    if (typeof body.displayName === 'string') row.display_name = body.displayName.trim().slice(0, 80) || null
    if (body.targetWeightKg != null && body.targetWeightKg !== '') {
      const t = parseFloat(String(body.targetWeightKg))
      if (!Number.isNaN(t)) row.target_weight_kg = t
    }
    if (body.weightGoalTargetDate === null || body.weightGoalTargetDate === '') {
      row.weight_goal_target_date = null
    } else if (typeof body.weightGoalTargetDate === 'string') {
      row.weight_goal_target_date = body.weightGoalTargetDate.slice(0, 10)
    }

    const mapOpt = (key: string, snake: string) => {
      if (body[key] !== undefined && body[key] !== null && body[key] !== '') row[snake] = body[key]
    }
    mapOpt('gender', 'gender')
    if (body.age != null) row.age = parseInt(String(body.age), 10)
    if (body.height != null) row.height = parseInt(String(body.height), 10)
    if (body.weight != null) row.weight = parseFloat(String(body.weight))
    if (body.activityLevel != null) row.activity_level = parseFloat(String(body.activityLevel))
    if (typeof body.dietaryApproach === 'string') row.dietary_approach = body.dietaryApproach
    if (Array.isArray(body.mealsPerDay)) row.meals_per_day = body.mealsPerDay
    if (typeof body.weightGoal === 'string') row.weight_goal = body.weightGoal
    if (typeof body.isComplete === 'boolean') row.is_complete = body.isComplete

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: existing } = await supabase
      .from('adult_weight_loss_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('adult_index', adultIndex)
      .maybeSingle()

    if (existing) {
      const { user_id: _u, adult_index: _a, ...updates } = row as Record<string, unknown>
      const { error } = await supabase.from('adult_weight_loss_profiles').update(updates).eq('id', existing.id)
      if (error) {
        console.error('adult_weight_loss_profiles update', error)
        return NextResponse.json({ error: 'Kunne ikke gemme profil' }, { status: 500 })
      }
    } else {
      const insertRow = {
        ...row,
        excluded_foods: [] as string[],
        meals_per_day: (row.meals_per_day as string[]) || ['dinner'],
        is_complete: (row.is_complete as boolean) ?? false,
      }
      const { error } = await supabase.from('adult_weight_loss_profiles').insert(insertRow)
      if (error) {
        console.error('adult_weight_loss_profiles insert', error)
        return NextResponse.json({ error: 'Kunne ikke oprette profil' }, { status: 500 })
      }
    }

    const { data: profile } = await supabase
      .from('adult_weight_loss_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('adult_index', adultIndex)
      .single()

    return NextResponse.json({ success: true, data: profile })
  } catch (e) {
    console.error('weight-tracker/person PATCH', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
