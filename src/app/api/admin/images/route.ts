import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic'

// Create Supabase client dynamically to avoid build-time issues
function createSupabaseServerClient() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://najaxycfjgultwdwffhv.supabase.co'
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
    
    // Don't call cookies() here - it causes build issues
    // We'll call it inside the actual function when needed
    
    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            // This will be called at runtime, not build time
            return undefined // Placeholder during build
          },
          set(name: string, value: string, options: any) {
            // This will be called at runtime, not build time
          },
          remove(name: string, options: any) {
            // This will be called at runtime, not build time
          },
        },
      }
    )
  } catch (error) {
    // During build, return a dummy client. During runtime, this will fail gracefully.
    console.warn('Supabase client creation failed:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client with proper cookies context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://najaxycfjgultwdwffhv.supabase.co'
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
    
    const cookieStore = cookies()
    
    const supabase = createServerClient(
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

    // Get all recipes with image information
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select(`
        id,
        title,
        slug,
        image_url,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recipes:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recipes' },
        { status: 500 }
      )
    }

    return NextResponse.json({ recipes: recipes || [] })
  } catch (error) {
    console.error('Error in images API:', error)
    
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
