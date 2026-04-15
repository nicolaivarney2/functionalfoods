import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { databaseService } from '@/lib/database-service'
import { revalidateRecipeCollectionPaths } from '@/lib/cache-revalidation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_ADMIN_PAGE_SIZE = 1000

function parseBoundedInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export async function GET(request: NextRequest) {
  try {
    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const page = parseBoundedInt(searchParams.get('page'), 0, 0, 100_000)
    const limit = parseBoundedInt(searchParams.get('limit'), MAX_ADMIN_PAGE_SIZE, 1, MAX_ADMIN_PAGE_SIZE)
    const offset = page * limit
    
    // Create Supabase client with service role key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() {
          return undefined // Service role doesn't need cookies
        },
        set() {
          // Service role doesn't need cookies
        },
        remove() {
          // Service role doesn't need cookies
        },
      },
    })
    
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
    // Create Supabase client with service role key for admin access
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() {
          return undefined // Service role doesn't need cookies
        },
        set() {
          // Service role doesn't need cookies
        },
        remove() {
          // Service role doesn't need cookies
        },
      },
    })
    
    // Parse request body
    const body = await request.json()
    const {
      recipeId,
      description,
      dietaryCategories,
      mainCategory,
      subCategories,
      ingredients,
      ingredientGroups,
      instructions,
      servings,
    } = body
    
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
    if (ingredientGroups !== undefined) {
      updateData.ingredientGroups = Array.isArray(ingredientGroups) ? ingredientGroups : []
    }
    if (instructions !== undefined) {
      updateData.instructions = Array.isArray(instructions) ? instructions : []
    }
    if (servings !== undefined) {
      const parsedServings = Number(servings)
      if (Number.isFinite(parsedServings) && parsedServings > 0) {
        updateData.servings = Math.max(1, Math.round(parsedServings))
      }
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
      
      const currentDietary = currentRecipe && typeof currentRecipe === 'object'
        ? (currentRecipe as { dietaryCategories?: unknown }).dietaryCategories
        : undefined
      const currentArray = Array.isArray(currentDietary) ? currentDietary : []
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
      .select('id, slug, title, dietaryCategories, mainCategory, subCategories')
      .eq('id', recipeId)
      .single()

    // Invalidate public cache for this recipe and listing pages
    databaseService.clearRecipeCaches()
    if (verifyData?.slug) {
      revalidatePath(`/opskrift/${verifyData.slug}`)
    }
    revalidateRecipeCollectionPaths(verifyData || {})
    
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
