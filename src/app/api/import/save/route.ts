export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { ingredientMatcher } from '@/lib/ingredient-matcher'
import { createSupabaseClient } from '@/lib/supabase'

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
    let skippedCount = 0
    
    try {
      const result = await ingredientMatcher.processIngredients(ingredients)
      newIngredients = result.newIngredients
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

    // Download and store images for all recipes
    console.log('🖼️ Starting automatic image download for all recipes...')
    let imagesDownloaded = 0
    let imagesFailed = 0
    
    try {
      const supabase = createSupabaseClient()
      
      for (const recipe of recipes) {
        if (recipe.imageUrl && recipe.imageUrl.includes('ketoliv.dk')) {
          console.log(`📥 Downloading image for: ${recipe.title}`)
          
          try {
            // Call the image processing API
            const imageResponse = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/images/process`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageUrl: recipe.imageUrl,
                recipeSlug: recipe.slug
              })
            })
            
            if (imageResponse.ok) {
              const imageResult = await imageResponse.json()
              if (imageResult.success && imageResult.storageUrl) {
                // Update recipe in database with new image URL
                const { error: updateError } = await supabase
                  .from('recipes')
                  .update({ imageUrl: imageResult.storageUrl })
                  .eq('slug', recipe.slug)
                
                if (updateError) {
                  console.error(`❌ Failed to update recipe image URL for ${recipe.title}:`, updateError)
                  imagesFailed++
                } else {
                  console.log(`✅ Image downloaded and recipe updated: ${recipe.title}`)
                  imagesDownloaded++
                }
              } else {
                console.error(`❌ Image processing failed for ${recipe.title}:`, imageResult.error)
                imagesFailed++
              }
            } else {
              console.error(`❌ Image API call failed for ${recipe.title}:`, imageResponse.status)
              imagesFailed++
            }
            
            // Add small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500))
            
          } catch (imageError) {
            console.error(`❌ Error downloading image for ${recipe.title}:`, imageError)
            imagesFailed++
          }
        } else {
          console.log(`⏭️ Skipping image download for ${recipe.title} (no Ketoliv URL)`)
        }
      }
      
      console.log(`🖼️ Image download completed: ${imagesDownloaded} successful, ${imagesFailed} failed`)
      
    } catch (imageError) {
      console.error('💥 Error during image download process:', imageError)
      // Don't fail the entire import if image download fails
    }

    // Get updated database stats
    console.log('📊 Getting database stats...')
    const dbStats = await databaseService.getDatabaseStats()
    console.log('✅ Database stats retrieved:', dbStats)

    const response = {
      success: true,
      message: `Successfully saved ${recipes.length} recipes and ${newIngredients.length} new ingredients (${skippedCount} duplicates skipped). Images: ${imagesDownloaded} downloaded, ${imagesFailed} failed.`,
      recipeCount: recipes.length,
      ingredientCount: newIngredients.length,
      duplicatesSkipped: skippedCount,
      imagesDownloaded,
      imagesFailed,
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
