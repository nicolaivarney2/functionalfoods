export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { ingredientMatcher } from '@/lib/ingredient-matcher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipes, ingredients } = body
    
    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({
        success: false,
        message: 'No recipes provided or invalid format'
      }, { status: 400 })
    }

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({
        success: false,
        message: 'No ingredients provided or invalid format'
      }, { status: 400 })
    }

    console.log(`💾 Saving ${recipes.length} recipes and ${ingredients.length} ingredients...`)

    // Initialize ingredient matcher
    await ingredientMatcher.initialize()
    
    // Process ingredients to remove duplicates
    const { newIngredients, matchedIngredients, skippedCount } = await ingredientMatcher.processIngredients(ingredients)
    
    console.log('🔍 Ingredient matching results:')
    console.log(`  - Total ingredients: ${ingredients.length}`)
    console.log(`  - New ingredients: ${newIngredients.length}`)
    console.log(`  - Skipped duplicates: ${skippedCount}`)
    
    // Save recipes to database
    const recipesSaved = await databaseService.saveRecipes(recipes)
    if (!recipesSaved) {
      return NextResponse.json({
        success: false,
        message: 'Failed to save recipes to database'
      }, { status: 500 })
    }

    // Save new ingredients to database
    let ingredientsSaved = true
    if (newIngredients.length > 0) {
      ingredientsSaved = await databaseService.saveIngredients(newIngredients)
      if (!ingredientsSaved) {
        return NextResponse.json({
          success: false,
          message: 'Failed to save ingredients to database'
        }, { status: 500 })
      }
    }

    // Get updated database stats
    const dbStats = await databaseService.getDatabaseStats()

    return NextResponse.json({
      success: true,
      message: `Successfully saved ${recipes.length} recipes and ${newIngredients.length} new ingredients (${skippedCount} duplicates skipped)`,
      recipeCount: recipes.length,
      ingredientCount: newIngredients.length,
      duplicatesSkipped: skippedCount,
      dbStats
    })

  } catch (error) {
    console.error('Error saving imported data:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to save imported data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
