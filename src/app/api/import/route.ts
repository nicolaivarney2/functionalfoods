import { NextRequest, NextResponse } from 'next/server'
import { importRecipes, RawRecipeData } from '@/lib/recipe-import'
import { convertKetolivRecipes } from '@/lib/ketoliv-converter'
import { downloadBulkImages } from '@/lib/image-downloader'
import { databaseService } from '@/lib/database-service'
import { FridaDTUMatcher } from '@/lib/frida-dtu-matcher'
import { ingredientMatcher } from '@/lib/ingredient-matcher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipes, isKetolivFormat } = body
    
    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({
        success: false,
        message: 'No recipes provided or invalid format'
      }, { status: 400 })
    }

    let processedRecipes: RawRecipeData[]

    if (isKetolivFormat) {
      // Convert ketoliv format to our format
      processedRecipes = convertKetolivRecipes(recipes)
    } else {
      // Recipes are already in our format
      processedRecipes = recipes
    }

    // Convert and import recipes
    const importedRecipes = importRecipes(processedRecipes)
    
    // Calculate nutrition using Frida DTU
    console.log('🧮 Calculating nutrition with Frida DTU...')
    const fridaMatcher = new FridaDTUMatcher()
    const recipesWithNutrition = importedRecipes.map(recipe => {
      const fridaNutrition = fridaMatcher.calculateRecipeNutrition(recipe.ingredients || [])
      
      return {
        ...recipe,
        calories: Math.round(fridaNutrition.calories),
        protein: Math.round(fridaNutrition.protein * 10) / 10,
        carbs: Math.round(fridaNutrition.carbs * 10) / 10,
        fat: Math.round(fridaNutrition.fat * 10) / 10,
        fiber: Math.round(fridaNutrition.fiber * 10) / 10,
        nutritionalInfo: fridaNutrition
      }
    })
    
    // Download and store images locally
    console.log('Downloading images for imported recipes...')
    const recipesWithLocalImages = await downloadBulkImages(recipesWithNutrition)
    
    // Extract and process ingredients with deduplication
    console.log('🧩 Extracting and deduplicating ingredients...')
    await ingredientMatcher.initialize()
    
    const uniqueIngredients = new Set<string>()
    recipesWithLocalImages.forEach(recipe => {
      recipe.ingredients?.forEach((ingredient: any) => {
        uniqueIngredients.add(ingredient.name.toLowerCase())
      })
    })
    
    const ingredientObjects = Array.from(uniqueIngredients).map(name => ({
      id: `${name}-${Date.now()}`,
      name: name,
      category: 'general',
      description: `${name} - imported from recipes`
    }))
    
    const { newIngredients, skippedCount } = await ingredientMatcher.processIngredients(ingredientObjects)
    console.log(`🧩 Ingredient processing: ${newIngredients.length} new, ${skippedCount} duplicates skipped`)
    
    // Save recipes and new ingredients to database
    const saved = await databaseService.saveRecipes(recipesWithLocalImages)
    const ingredientsSaved = newIngredients.length > 0 ? await databaseService.saveIngredients(newIngredients) : true
    
    if (!saved || !ingredientsSaved) {
      return NextResponse.json({
        success: false,
        message: 'Failed to save recipes or ingredients to database'
      }, { status: 500 })
    }

    // Get total recipes from database
    const allRecipes = await databaseService.getRecipes()

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${recipesWithLocalImages.length} recipes with ${newIngredients.length} new ingredients (${skippedCount} duplicates skipped)`,
      recipeCount: recipesWithLocalImages.length,
      ingredientCount: newIngredients.length,
      duplicatesSkipped: skippedCount,
      totalRecipes: allRecipes.length
    })

  } catch (error) {
    console.error('Error importing recipes:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to import recipes',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 