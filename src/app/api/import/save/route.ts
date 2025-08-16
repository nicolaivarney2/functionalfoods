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
        message: 'No recipes provided or invalid format',
        debug: { recipes, ingredients }
      }, { status: 400 })
    }

    if (!ingredients || !Array.isArray(ingredients)) {
      console.error('❌ Invalid ingredients data:', ingredients)
      return NextResponse.json({
        success: false,
        message: 'No ingredients provided or invalid format',
        debug: { recipes, ingredients }
      }, { status: 400 })
    }

    console.log(`💾 Saving ${recipes.length} recipes and ${ingredients.length} ingredients...`)

    // Check environment variables
    console.log('🔍 Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    })

    // Initialize ingredient matcher
    console.log('🔧 Initializing ingredient matcher...')
    try {
      await ingredientMatcher.initialize()
      console.log('✅ Ingredient matcher initialized')
    } catch (initError) {
      console.error('💥 Error initializing ingredient matcher:', initError)
      return NextResponse.json({
        success: false,
        message: 'Failed to initialize ingredient matcher',
        error: initError instanceof Error ? initError.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // Process ingredients to remove duplicates
    console.log('🔍 Processing ingredients...')
    let newIngredients: any[] = []
    let matchedIngredients: any[] = []
    let skippedCount = 0
    
    try {
      const result = await ingredientMatcher.processIngredients(ingredients)
      newIngredients = result.newIngredients
      matchedIngredients = result.matchedIngredients
      skippedCount = result.skippedCount
      
      console.log('🔍 Ingredient matching results:')
      console.log(`  - Total ingredients: ${ingredients.length}`)
      console.log(`  - New ingredients: ${newIngredients.length}`)
      console.log(`  - Skipped duplicates: ${skippedCount}`)
    } catch (processError) {
      console.error('💥 Error processing ingredients:', processError)
      return NextResponse.json({
        success: false,
        message: 'Failed to process ingredients',
        error: processError instanceof Error ? processError.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // Save recipes to database
    console.log('💾 Saving recipes to database...')
    console.log('📋 First recipe structure:', JSON.stringify(recipes[0], null, 2))
    
    try {
      const recipesSaved = await databaseService.saveRecipes(recipes)
      console.log('🔍 saveRecipes result:', recipesSaved)
      
      if (!recipesSaved) {
        console.error('❌ Failed to save recipes')
        return NextResponse.json({
          success: false,
          message: 'Failed to save recipes to database',
          debug: { recipesCount: recipes.length, firstRecipe: recipes[0] }
        }, { status: 500 })
      }
      console.log('✅ Recipes saved successfully')
    } catch (saveError) {
      console.error('💥 Exception during recipe save:', saveError)
      console.error('Save error stack:', saveError instanceof Error ? saveError.stack : 'No stack trace')
      return NextResponse.json({
        success: false,
        message: 'Exception during recipe save',
        error: saveError instanceof Error ? saveError.message : 'Unknown error',
        stack: saveError instanceof Error ? saveError.stack : undefined,
        debug: { recipesCount: recipes.length, firstRecipe: recipes[0] }
      }, { status: 500 })
    }

    // Save new ingredients to database
    let ingredientsSaved = true
    if (newIngredients.length > 0) {
      console.log('💾 Saving new ingredients to database...')
      console.log('📋 First ingredient structure:', JSON.stringify(newIngredients[0], null, 2))
      
      try {
        ingredientsSaved = await databaseService.saveIngredients(newIngredients)
        console.log('🔍 saveIngredients result:', ingredientsSaved)
        
        if (!ingredientsSaved) {
          console.error('❌ Failed to save ingredients')
          return NextResponse.json({
            success: false,
            message: 'Failed to save ingredients to database',
            debug: { newIngredientsCount: newIngredients.length, firstIngredient: newIngredients[0] }
          }, { status: 500 })
        }
        console.log('✅ Ingredients saved successfully')
      } catch (saveError) {
        console.error('💥 Exception during ingredient save:', saveError)
        console.error('Save error stack:', saveError instanceof Error ? saveError.stack : 'No stack trace')
        return NextResponse.json({
          success: false,
          message: 'Exception during ingredient save',
          error: saveError instanceof Error ? saveError.message : 'Unknown error',
          stack: saveError instanceof Error ? saveError.stack : undefined,
          debug: { newIngredientsCount: newIngredients.length, firstIngredient: newIngredients[0] }
        }, { status: 500 })
      }
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
      stack: error instanceof Error ? error.stack : undefined,
      debug: { 
        errorType: error?.constructor?.name, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error' 
      }
    }, { status: 500 })
  }
}
