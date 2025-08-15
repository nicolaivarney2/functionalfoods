import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
