import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin recipes route: Starting...')
    
    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '0')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const offset = page * limit
    
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
    
    // Use service role client to fetch recipes with pagination
    const { data: recipes, error } = await supabase
      .from('recipes')
      .select('*')
      .order('updatedAt', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('❌ Error fetching recipes:', error)
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }
    
    console.log(`✅ Returning ${recipes?.length || 0} recipes (page ${page}, limit ${limit})`)
    return NextResponse.json({
      recipes: recipes || [],
      page,
      limit,
      hasMore: recipes?.length === limit
    })
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
    const { recipeId, description, dietaryCategories, mainCategory, subCategories, ingredients, instructions } = body
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
    }
    
    // Prepare update data
    const updateData: any = {}
    if (description !== undefined) {
      updateData.description = description
    }
    if (dietaryCategories !== undefined) {
      const dietaryArray = Array.isArray(dietaryCategories) ? dietaryCategories : []
      updateData.dietaryCategories = dietaryArray
    }
    if (mainCategory !== undefined) {
      updateData.mainCategory = mainCategory
    }
    if (subCategories !== undefined) {
      const subCategoriesArray = Array.isArray(subCategories) ? subCategories : []
      updateData.subCategories = subCategoriesArray
    }
    if (ingredients !== undefined) {
      updateData.ingredients = Array.isArray(ingredients) ? ingredients : []
    }
    if (instructions !== undefined) {
      updateData.instructions = Array.isArray(instructions) ? instructions : []
    }
    
    updateData.updatedAt = new Date().toISOString()
    
    // Workaround: Hvis dietaryCategories arrayet bliver kortere, sæt det til null først
    // Dette tvinger Supabase til at opdatere JSONB kolonnen korrekt
    if (dietaryCategories !== undefined) {
      const dietaryArray = Array.isArray(dietaryCategories) ? dietaryCategories : []
      const { data: currentRecipe } = await supabase
        .from('recipes')
        .select('dietaryCategories')
        .eq('id', recipeId)
        .single()
      
      const currentArray = Array.isArray(currentRecipe?.dietaryCategories) ? currentRecipe.dietaryCategories : []
      if (dietaryArray.length < currentArray.length) {
        // Array er kortere - sæt til null først for at tvinge opdatering
        await supabase
          .from('recipes')
          .update({ dietaryCategories: null })
          .eq('id', recipeId)
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    // Update recipe in database
    const { data, error } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', recipeId)
      .select()
    
    if (error) {
      console.error('❌ Error updating recipe:', error)
      return NextResponse.json({ 
        error: 'Failed to update recipe', 
        details: error.message 
      }, { status: 500 })
    }
    
    // Verify the update
    const { data: verifyData } = await supabase
      .from('recipes')
      .select('id, title, dietaryCategories, mainCategory, subCategories')
      .eq('id', recipeId)
      .single()
    
    return NextResponse.json({ 
      success: true, 
      data: verifyData || data 
    })
  } catch (error) {
    console.error('❌ Error in /api/admin/recipes PUT:', error)
    return NextResponse.json(
      { error: 'Failed to update recipe' },
      { status: 500 }
    )
  }
}
