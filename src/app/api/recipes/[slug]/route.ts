import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) {
          return undefined
        },
        set(name: string, value: string, options: any) {
          // Service role doesn't need cookies
        },
        remove(name: string, options: any) {
          // Service role doesn't need cookies
        },
      },
    })
    
    // Check if slug is a UUID (ID) or regular slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)
    
    let query = supabase.from('recipes').select('*')
    
    if (isUUID) {
      // Search by ID
      query = query.eq('id', slug)
    } else {
      // Search by slug
      query = query.eq('slug', slug)
    }
    
    const { data, error } = await query.single()
    
    if (error) {
      console.error('Error fetching recipe:', error)
      console.error('Searching for:', isUUID ? `ID: ${slug}` : `Slug: ${slug}`)
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Error in GET /api/recipes/[slug]:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) {
          return undefined
        },
        set(name: string, value: string, options: any) {
          // Service role doesn't need cookies
        },
        remove(name: string, options: any) {
          // Service role doesn't need cookies
        },
      },
    })
    
    // Update recipe with provided fields
    const { data, error } = await supabase
      .from('recipes')
      .update(body)
      .eq('slug', slug)
      .select()
    
    if (error) {
      console.error('Error updating recipe:', error)
      return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      recipe: data[0],
      message: 'Recipe updated successfully'
    })
    
  } catch (error) {
    console.error('Error in PUT /api/recipes/[slug]:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
} 