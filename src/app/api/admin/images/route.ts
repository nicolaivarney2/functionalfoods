import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Create Supabase client dynamically to avoid build-time issues
function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://najaxycfjgultwdwffhv.supabase.co'
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
  
  // Only throw error if we're actually trying to use the client (not during build)
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required Supabase environment variables')
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

    // Get all recipes with image information
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('id, title, imageurl, created_at, updated_at')
      .not('imageurl', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching recipes with images:', error)
      return NextResponse.json(
        { error: 'Failed to fetch images' },
        { status: 500 }
      )
    }

    // Transform data to match the interface expected by the frontend
    const images = (recipes || []).map(recipe => ({
      id: recipe.id,
      recipe_id: recipe.id,
      recipe_title: recipe.title,
      image_url: recipe.imageurl,
      local_path: recipe.imageurl?.startsWith('/') ? recipe.imageurl : undefined,
      file_size: 0, // We don't store file size currently
      created_at: recipe.created_at,
      updated_at: recipe.updated_at
    }))

    return NextResponse.json({ images })
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
