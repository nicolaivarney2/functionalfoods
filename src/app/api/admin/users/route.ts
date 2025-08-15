import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create Supabase client dynamically to avoid build-time issues
function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://najaxycfjgultwdwffhv.supabase.co'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
  
  // Only throw error if we're actually trying to use the client (not during build)
  // During build, we'll use fallback values. During runtime, we'll check if real values exist.
  if (typeof window === 'undefined') {
    // We're on the server side
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // Only throw if we're actually in a request context, not during build
      if (process.env.VERCEL_ENV || process.env.NODE_ENV === 'production') {
        throw new Error('Missing required Supabase environment variables')
      }
    }
  }
  
  const cookieStore = cookies()
  
  return createServerClient(
    supabaseUrl,
    supabaseKey,
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
}

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = createSupabaseServerClient()

    // Get all users with their profiles
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Error in users API:', error)
    
    // Handle specific environment variable errors
    if (error instanceof Error && error.message.includes('Missing required Supabase environment variables')) {
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
