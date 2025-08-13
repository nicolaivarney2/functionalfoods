import { NextRequest, NextResponse } from 'next/server'
import { importRecipes, RawRecipeData } from '@/lib/recipe-import'
import { convertKetolivRecipes } from '@/lib/ketoliv-converter'
import { downloadBulkImages } from '@/lib/image-downloader'
import { databaseService } from '@/lib/database-service'
import { supabaseServer } from '@/lib/supabaseServer'
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
    const recipesWithNutrition = await Promise.all(importedRecipes.map(async recipe => {
      const fridaNutrition = await fridaMatcher.calculateRecipeNutrition(recipe.ingredients || [])
      
      // Normalize ingredient amounts like "0,5" → 0.5
      const normalizedIngredients = (recipe.ingredients || []).map((i: any) => {
        const toNum = (v: any) => {
          if (typeof v === 'number') return v
          if (typeof v !== 'string') return 0
          const mapFractions: Record<string, string> = { '½': '0.5', '¼': '0.25', '¾': '0.75' }
          let s = v.trim().replace(/[½¼¾]/g, (m) => mapFractions[m] || m).replace(',', '.')
          if (/^\s*\d+\s*\/\s*\d+\s*$/.test(s)) { const [n,d]=s.split('/').map(Number); return d? n/d:0 }
          const num = parseFloat(s)
          return isFinite(num) ? num : 0
        }
        return { ...i, amount: toNum(i.amount) }
      })

      return {
        ...recipe,
        ingredients: normalizedIngredients,
        calories: Math.round(fridaNutrition.calories),
        protein: Math.round(fridaNutrition.protein * 10) / 10,
        carbs: Math.round(fridaNutrition.carbs * 10) / 10,
        fat: Math.round(fridaNutrition.fat * 10) / 10,
        fiber: Math.round(fridaNutrition.fiber * 10) / 10,
        nutritionalInfo: fridaNutrition
      }
    }))
    
    // Download and store images locally
    console.log('🖼️ Downloading images for imported recipes...')
    console.log(`   Recipes to process: ${recipesWithNutrition.length}`)
    
    let recipesWithLocalImages: any[]
    
    try {
      recipesWithLocalImages = await downloadBulkImages(recipesWithNutrition)
      console.log(`   ✅ Image download completed. Processed ${recipesWithLocalImages.length} recipes`)
      
      // Log which recipes had their images updated
      recipesWithLocalImages.forEach((recipe, index) => {
        const original = recipesWithNutrition[index]
        if (recipe.imageUrl !== original.imageUrl) {
          console.log(`   📸 Image updated for ${recipe.title}: ${original.imageUrl} -> ${recipe.imageUrl}`)
        } else {
          console.log(`   ⚠️  Image unchanged for ${recipe.title}: ${recipe.imageUrl}`)
        }
      })
    } catch (error) {
      console.error('❌ Error during image download:', error)
      // Continue with original recipes if image download fails
      recipesWithLocalImages = recipesWithNutrition
      console.log('   ⚠️  Continuing with original recipes due to image download failure')
    }
    
    // Extract and process ingredients with deduplication
    console.log('🧩 Extracting and deduplicating ingredients...')
    await ingredientMatcher.initialize()
    
    const uniqueIngredients = new Set<string>()
    recipesWithLocalImages.forEach(recipe => {
      recipe.ingredients?.forEach((ingredient: any) => {
        uniqueIngredients.add(ingredient.name.toLowerCase())
      })
    })
    
    const toSlug = (input: string) => input
      .toLowerCase()
      .replace(/[æøå]/g, (m) => ({ 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }[m] as string))
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
    const ingredientObjects = Array.from(uniqueIngredients).map(name => {
      const slug = toSlug(name)
      return {
        id: slug,
        name: name,
        category: 'general',
        description: `${name} - imported from recipes`
      }
    })
    
    const { newIngredients, skippedCount } = await ingredientMatcher.processIngredients(ingredientObjects)
    console.log(`🧩 Ingredient processing: ${newIngredients.length} new, ${skippedCount} duplicates skipped`)
    
    // Save recipes and new ingredients to database using service role (bypass RLS)
    // Map recipes to DB columns (mirror of database-service filtering)
    const filteredRecipes = recipesWithLocalImages.map((recipe: any) => {
      const row: any = {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        calories: recipe.calories || 0,
        protein: recipe.protein || 0,
        carbs: recipe.carbs || 0,
        fat: recipe.fat || 0,
        fiber: recipe.fiber || 0,
        keywords: recipe.keywords,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        servings: recipe.servings || 2,
        difficulty: recipe.difficulty || 'Nem',
        author: recipe.author || 'Functional Foods',
      }
      if (recipe.slug) row.slug = recipe.slug
      row.shortdescription = recipe.shortDescription || null
      row.preparationtime = recipe.preparationTime || 0
      row.cookingtime = recipe.cookingTime || 0
      row.totaltime = recipe.totalTime || ((recipe.preparationTime || 0) + (recipe.cookingTime || 0))
      row.metatitle = recipe.metaTitle || null
      row.metadescription = recipe.metaDescription || null
      row.maincategory = recipe.mainCategory || null
      row.subcategories = recipe.subCategories || null
      row.dietarycategories = recipe.dietaryCategories && recipe.dietaryCategories.length > 0 ? recipe.dietaryCategories : null
      row.imageurl = recipe.imageUrl || '/images/recipe-placeholder.jpg'
      row.imagealt = recipe.imageAlt || null
      row.publishedat = recipe.publishedAt ? (typeof recipe.publishedAt === 'string' ? recipe.publishedAt : recipe.publishedAt.toISOString()) : new Date().toISOString()
      row.updatedat = recipe.updatedAt ? (typeof recipe.updatedAt === 'string' ? recipe.updatedAt : recipe.updatedAt.toISOString()) : new Date().toISOString()
      row.rating = recipe.rating || null
      row.reviewcount = recipe.reviewCount || null
      row.preptimeiso = recipe.prepTimeISO || null
      row.cooktimeiso = recipe.cookTimeISO || null
      row.totaltimeiso = recipe.totalTimeISO || null
      if (recipe.nutritionalInfo) row.nutritionalinfo = recipe.nutritionalInfo
      return row
    })
    
    const { error: saveRecipesError } = await supabaseServer
      .from('recipes')
      .insert(filteredRecipes)
    const { error: saveIngredientsError } = newIngredients.length > 0
      ? await supabaseServer.from('ingredients').upsert(newIngredients, { onConflict: 'id' })
      : { error: null as any }
    
    const saved = !saveRecipesError
    const ingredientsSaved = !saveIngredientsError
    
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