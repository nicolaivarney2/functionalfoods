import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin recipes route: Starting...')
    
    // Create Supabase client with service role key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      serviceRoleKeyLength: serviceRoleKey?.length || 0
    })
    
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
    
    console.log('🔍 Service role client created successfully')
    
    // For now, skip complex authentication and just fetch recipes
    // TODO: Implement proper admin authentication later
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

export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 Admin recipes PUT route: Starting...')
    
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
    
    // Parse request body
    const body = await request.json()
    const { recipeId, description, dietaryCategories } = body
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
    }
    
    console.log('🔍 Updating recipe:', { recipeId, description, dietaryCategories })
    
    // Prepare update data
    const updateData: any = {}
    if (description !== undefined) {
      updateData.description = description
    }
    if (dietaryCategories !== undefined) {
      updateData.dietaryCategories = dietaryCategories
    }
    
    // Add updated timestamp
    updateData.updatedAt = new Date().toISOString()
    
    // Update recipe in database
    const { data, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', recipeId)
      .select()
    
    if (error) {
      console.error('❌ Error updating recipe:', error)
      return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 })
    }
    
    console.log('✅ Recipe updated successfully:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('❌ Error in /api/admin/recipes PUT:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}
