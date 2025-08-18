import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { description, dietaryCategories } = body
    const recipeId = params.id
    
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
    console.error('❌ Error in /api/admin/recipes/[id] PUT:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}
