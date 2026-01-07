import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with cookies for user session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
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
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mealPlanId = searchParams.get('id')
    const active = searchParams.get('active') === 'true'

    let query = supabase
      .from('user_meal_plans')
      .select('*')
      .eq('user_id', user.id)

    if (mealPlanId) {
      query = query.eq('id', mealPlanId).single()
    } else if (active) {
      query = query.eq('is_active', true).order('week_start_date', { ascending: false }).limit(1)
    } else {
      query = query.order('week_start_date', { ascending: false }).limit(10)
    }

    const { data, error } = await query

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
    // Create Supabase client with cookies for user session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
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
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

