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
    
    // Try to get token from Authorization header first (more reliable than cookies)
    const authHeader = request.headers.get('authorization')
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use service role client with explicit token
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceKey)
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      if (!tokenError && tokenUser) {
        user = tokenUser
      }
    }
    
    // Fallback to cookies if no Authorization header
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
    
    // Use service role client for database operations
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get family profile
    const { data: familyProfile, error } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching family profile:', error)
      return NextResponse.json({ error: 'Failed to fetch family profile' }, { status: 500 })
    }

    // Get adult profiles
    const { data: adultProfiles, error: adultError } = await supabase
      .from('adult_weight_loss_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('adult_index')

    if (adultError) {
      console.error('Error fetching adult profiles:', adultError)
      return NextResponse.json({ error: 'Failed to fetch adult profiles' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        familyProfile: familyProfile || null,
        adultProfiles: adultProfiles || []
      }
    })
  } catch (error) {
    console.error('Error in GET /api/madbudget/family-profile:', error)
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
    
    // Try to get token from Authorization header first (more reliable than cookies)
    const authHeader = request.headers.get('authorization')
    let user = null
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Use service role client with explicit token
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(supabaseUrl, serviceKey)
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
      if (!tokenError && tokenUser) {
        user = tokenUser
      }
    }
    
    // Fallback to cookies if no Authorization header
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
    
    // Use service role client for database operations
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const body = await request.json()
    const { familyProfile, adultProfiles } = body

    // Upsert family profile
    const { error: familyError } = await supabase
      .from('family_profiles')
      .upsert({
        user_id: user.id,
        adults: familyProfile.adults,
        children: familyProfile.children,
        children_ages: familyProfile.childrenAges || [],
        prioritize_organic: familyProfile.prioritizeOrganic,
        prioritize_animal_organic: familyProfile.prioritizeAnimalOrganic,
        excluded_ingredients: familyProfile.excludedIngredients || [],
        selected_stores: familyProfile.selectedStores || [],
        variation_level: familyProfile.variationLevel || 2,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (familyError) {
      console.error('Error saving family profile:', familyError)
      return NextResponse.json({ error: 'Failed to save family profile' }, { status: 500 })
    }

    // Upsert adult profiles
    if (adultProfiles && Array.isArray(adultProfiles)) {
      for (const [index, profile] of adultProfiles.entries()) {
        if (profile.isComplete) {
          const { error: adultError } = await supabase
            .from('adult_weight_loss_profiles')
            .upsert({
              user_id: user.id,
              adult_index: index,
              gender: profile.gender,
              age: profile.age,
              height: profile.height,
              weight: profile.weight,
              activity_level: profile.activityLevel,
              dietary_approach: profile.dietaryApproach,
              excluded_foods: [], // Not used per adult - only in family settings
              meals_per_day: profile.mealsPerDay || ['dinner'],
              weight_goal: profile.weightGoal,
              is_complete: profile.isComplete,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,adult_index'
            })

          if (adultError) {
            console.error(`Error saving adult profile ${index}:`, adultError)
            // Continue with other profiles even if one fails
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/madbudget/family-profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

