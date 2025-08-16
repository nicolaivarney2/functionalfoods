export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { ingredientMatcher } from '@/lib/ingredient-matcher'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 /api/import/save: Starting request...')
    
    const body = await request.json()
    const { recipes, ingredients } = body
    
    console.log('📋 Request body:', { 
      recipesCount: recipes?.length || 0, 
      ingredientsCount: ingredients?.length || 0 
    })
    
    if (!recipes || !Array.isArray(recipes)) {
      console.error('❌ Invalid recipes data:', recipes)
      return NextResponse.json({
        success: false,
        message: 'No recipes provided or invalid format'
      }, { status: 400 })
    }

    if (!ingredients || !Array.isArray(ingredients)) {
      console.error('❌ Invalid ingredients data:', ingredients)
      return NextResponse.json({
        success: false,
        message: 'No ingredients provided or invalid format'
      }, { status: 400 })
    }

    console.log(`💾 Saving ${recipes.length} recipes and ${ingredients.length} ingredients...`)

    // Check environment variables
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    })

    // Initialize ingredient matcher
    console.log('🔧 Initializing ingredient matcher...')
    await ingredientMatcher.initialize()
    console.log('✅ Ingredient matcher initialized')
    
    // Process ingredients to remove duplicates
    console.log('🔍 Processing ingredients...')
    const { newIngredients, matchedIngredients, skippedCount } = await ingredientMatcher.processIngredients(ingredients)
    
    console.log('🔍 Ingredient matching results:')
    console.log(`  - Total ingredients: ${ingredients.length}`)
    console.log(`  - New ingredients: ${newIngredients.length}`)
    console.log(`  - Skipped duplicates: ${skippedCount}`)
    
    // Save recipes to database
    console.log('💾 Saving recipes to database...')
    const recipesSaved = await databaseService.saveRecipes(recipes)
    if (!recipesSaved) {
      console.error('❌ Failed to save recipes')
      return NextResponse.json({
        success: false,
        message: 'Failed to save recipes to database'
      }, { status: 500 })
    }
    console.log('✅ Recipes saved successfully')

    // Save new ingredients to database
    let ingredientsSaved = true
    if (newIngredients.length > 0) {
      console.log('💾 Saving new ingredients to database...')
      ingredientsSaved = await databaseService.saveIngredients(newIngredients)
      if (!ingredientsSaved) {
        console.error('❌ Failed to save ingredients')
        return NextResponse.json({
          success: false,
          message: 'Failed to save ingredients to database'
        }, { status: 500 })
      }
      console.log('✅ Ingredients saved successfully')
    }

    // Get updated database stats
    console.log('📊 Getting database stats...')
    const dbStats = await databaseService.getDatabaseStats()
    console.log('✅ Database stats retrieved:', dbStats)

    const response = {
      success: true,
      message: `Successfully saved ${recipes.length} recipes and ${newIngredients.length} new ingredients (${skippedCount} duplicates skipped)`,
      recipeCount: recipes.length,
      ingredientCount: newIngredients.length,
      duplicatesSkipped: skippedCount,
      dbStats
    }

    console.log('🎉 Success response:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('💥 Error in /api/import/save:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({
      success: false,
      message: 'Failed to save imported data',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
