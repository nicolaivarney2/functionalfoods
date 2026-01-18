import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Force dynamic rendering to prevent build-time execution
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Create Supabase client with proper cookies context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables')
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
        imageUrl,
        createdAt,
        updatedAt
      `)
      .order('createdAt', { ascending: false })

    if (error) {
      console.error('Error fetching recipes:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recipes' },
        { status: 500 }
      )
    }

    return NextResponse.json(recipes || [])
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
