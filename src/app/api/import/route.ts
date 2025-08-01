import { NextRequest, NextResponse } from 'next/server'
import { addImportedRecipesServer, getImportedRecipesCountServer } from '@/lib/recipe-storage-server'
import { importRecipes, RawRecipeData } from '@/lib/recipe-import'
import { convertKetolivRecipes } from '@/lib/ketoliv-converter'
import { downloadBulkImages } from '@/lib/image-downloader'

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
    
    // Download and store images locally
    console.log('Downloading images for imported recipes...')
    const recipesWithLocalImages = await downloadBulkImages(importedRecipes)
    
    // Save to storage
    addImportedRecipesServer(recipesWithLocalImages)

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${recipesWithLocalImages.length} recipes with images`,
      recipeCount: recipesWithLocalImages.length,
      totalRecipes: getImportedRecipesCountServer() + 3
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