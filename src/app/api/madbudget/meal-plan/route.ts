import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    // Try Authorization header first (like family-profile route)
    const authHeader = request.headers.get('authorization')
    let user: any = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceKey)
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      if (!tokenError && tokenUser) {
        user = tokenUser
      }
    }
    
    // Fallback to cookies if no Authorization header or token user
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
            set(name: string, value: string, options: any) {
              try {
                cookieStore.set({ name, value, ...options })
              } catch (error) {
                // Ignore errors in read-only contexts
              }
            },
            remove(name: string, options: any) {
              try {
                cookieStore.set({ name, value: '', ...options })
              } catch (error) {
                // Ignore errors in read-only contexts
              }
            },
          },
        }
      )
      
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
      if (!cookieError && cookieUser) {
        user = cookieUser
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client for DB operations
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { searchParams } = new URL(request.url)
    const mealPlanId = searchParams.get('id')
    const active = searchParams.get('active') === 'true'

    let data: any = null
    let error: any = null

    if (mealPlanId) {
      ({ data, error } = await supabase
        .from('user_meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', mealPlanId)
        .single())
    } else if (active) {
      ({ data, error } = await supabase
        .from('user_meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('week_start_date', { ascending: false })
        .limit(1))
    } else {
      ({ data, error } = await supabase
        .from('user_meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start_date', { ascending: false })
        .limit(10))
    }

    if (error) {
      console.error('Error fetching meal plans:', error)
      return NextResponse.json({ error: 'Failed to fetch meal plans' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in GET /api/madbudget/meal-plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    // Auth like family-profile: header first, then cookies
    const authHeader = request.headers.get('authorization')
    let user: any = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceKey)
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      if (!tokenError && tokenUser) {
        user = tokenUser
      }
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
            set(name: string, value: string, options: any) {
              try {
                cookieStore.set({ name, value, ...options })
              } catch (error) {
                // Ignore errors in read-only contexts
              }
            },
            remove(name: string, options: any) {
              try {
                cookieStore.set({ name, value: '', ...options })
              } catch (error) {
                // Ignore errors in read-only contexts
              }
            },
          },
        }
      )
      
      const { data: { user: cookieUser }, error: cookieError } = await supabase.auth.getUser()
      if (!cookieError && cookieUser) {
        user = cookieUser
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client for DB writes
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await request.json()
    const {
      name,
      weekStartDate,
      weekEndDate,
      weekNumber,
      variationLevel,
      familyProfileSnapshot,
      mealPlanData,
      shoppingList,
      totalCost,
      totalSavings,
      estimatedCaloriesPerDay
    } = body

    // Deactivate previous active plans
    await supabase
      .from('user_meal_plans')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Check if meal plan for this week already exists
    const { data: existingPlan } = await supabase
      .from('user_meal_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStartDate)
      .single()
    
    let data, error
    if (existingPlan) {
      // Update existing plan
      const { data: updated, error: updateError } = await supabase
        .from('user_meal_plans')
        .update({
          name: name || `Madplan ${weekStartDate}`,
          week_end_date: weekEndDate,
          week_number: weekNumber || null,
          variation_level: variationLevel || 2,
          family_profile_snapshot: familyProfileSnapshot,
          meal_plan_data: mealPlanData,
          shopping_list: shoppingList,
          total_cost: totalCost,
          total_savings: totalSavings,
          estimated_calories_per_day: estimatedCaloriesPerDay,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPlan.id)
        .select()
        .single()
      data = updated
      error = updateError
    } else {
      // Insert new meal plan
      const { data: inserted, error: insertError } = await supabase
        .from('user_meal_plans')
        .insert({
          user_id: user.id,
          name: name || `Madplan ${weekStartDate}`,
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          week_number: weekNumber || null,
          variation_level: variationLevel || 2,
          family_profile_snapshot: familyProfileSnapshot,
          meal_plan_data: mealPlanData,
          shopping_list: shoppingList,
          total_cost: totalCost,
          total_savings: totalSavings,
          estimated_calories_per_day: estimatedCaloriesPerDay,
          is_active: true
        })
        .select()
        .single()
      data = inserted
      error = insertError
    }

    if (error) {
      console.error('Error saving meal plan:', error)
      return NextResponse.json({ error: 'Failed to save meal plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in POST /api/madbudget/meal-plan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

