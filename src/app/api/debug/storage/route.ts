import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseClient()
    
    // List all files in the recipe-images bucket
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('recipe-images')
      .list('', {
        limit: 100,
        offset: 0
      })
    
    if (storageError) {
      console.error('Storage error:', storageError)
      return NextResponse.json({
        error: 'Failed to list storage files',
        details: storageError.message
      }, { status: 500 })
    }
    
    // Get recipes from database
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, title, slug, imageUrl, image_url')
      .order('createdAt', { ascending: false })
    
    if (recipesError) {
      console.error('Recipes error:', recipesError)
      return NextResponse.json({
        error: 'Failed to fetch recipes',
        details: recipesError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      storage: {
        bucket: 'recipe-images',
        files: storageFiles || [],
        count: storageFiles?.length || 0
      },
      recipes: {
        count: recipes?.length || 0,
        sample: recipes?.slice(0, 3) || []
      },
      debug: {
        hasStorageFiles: !!(storageFiles && storageFiles.length > 0),
        hasRecipes: !!(recipes && recipes.length > 0),
        storageError: storageError ? (storageError as any).message || null : null,
        recipesError: recipesError ? (recipesError as any).message || null : null
      }
    })
    
  } catch (error) {
    console.error('Debug route error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
