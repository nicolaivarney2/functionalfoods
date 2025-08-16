import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) {
          return undefined // Service role doesn't need cookies
        },
        set(name: string, value: string, options: any) {
          // Service role doesn't need cookies
        },
        remove(name: string, options: any) {
          // Service role doesn't need cookies
        },
      },
    })
    
    // Check authentication (still required for admin access)
    const cookieStore = await cookies()
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { data: { session }, error: authError } = await authSupabase.auth.getSession()
    
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await authSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    
    if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🍽️ GET /api/admin/recipes called (all recipes including drafts)')
    
    // Use service role client to fetch all recipes
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .order('updatedAt', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching recipes:', error)
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }
    
    console.log(`✅ Returning ${recipes?.length || 0} recipes (all statuses)`)
    return NextResponse.json(recipes || [])
  } catch (error) {
    console.error('❌ Error in /api/admin/recipes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    )
  }
}
