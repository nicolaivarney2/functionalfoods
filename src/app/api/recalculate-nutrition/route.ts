import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { FridaDTUMatcher } from '@/lib/frida-dtu-matcher'
import { createSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { recipeId } = await request.json()
    
    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Starting nutrition recalculation for recipe ID: ${recipeId}`)

    // Get the recipe (including drafts)
    const allRecipes = await databaseService.getAllRecipes()
    const recipe = allRecipes.find(r => r.id === recipeId)
    
    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Note: ingredient_matches table doesn't have recipe_id, so we'll use direct matching
    // Initialize nutrition calculator and Supabase client
    const matcher = new FridaDTUMatcher()
    const supabase = createSupabaseClient()
    
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let totalFiber = 0
    const totalVitamins: Record<string, number> = {}
    const totalMinerals: Record<string, number> = {}
    let matchedIngredients = 0
    const totalIngredients = recipe.ingredients?.length || 0

    console.log(`📊 Processing ${totalIngredients} ingredients for recipe: ${recipe.title}`)
    console.log(`🍽️ Recipe serves: ${recipe.servings || 'unknown'} portions`)

    // Calculate nutrition for each ingredient using direct matching
    for (const ingredient of recipe.ingredients || []) {
      try {
        console.log(`🔍 Processing ingredient: ${ingredient.name} (${ingredient.amount} ${ingredient.unit})`)
        
        // Use the matcher to find nutrition data for each ingredient
        const result = await matcher.matchIngredient(ingredient.name)
        
        console.log(`🔍 Match result for ${ingredient.name}:`, {
          hasNutrition: !!result.nutrition,
          match: result.match,
          score: result.score,
          nutrition: result.nutrition
        })
        
        if (result.nutrition) {
          const grams = convertToGrams(ingredient.amount || 0, ingredient.unit || '')
          const scaleFactor = grams / 100
          
          console.log(`⚖️ Conversion: ${ingredient.amount} ${ingredient.unit} = ${grams}g (scale factor: ${scaleFactor})`)
          
          // Macro nutrients (per 100g basis, scaled by actual amount)
          totalCalories += result.nutrition.calories * scaleFactor
          totalProtein += result.nutrition.protein * scaleFactor
          totalCarbs += result.nutrition.carbs * scaleFactor
          totalFat += result.nutrition.fat * scaleFactor
          totalFiber += result.nutrition.fiber * scaleFactor
          
          // Micro nutrients (vitamins and minerals)
          if (result.nutrition.vitamins) {
            for (const [vitamin, value] of Object.entries(result.nutrition.vitamins)) {
              totalVitamins[vitamin] = (totalVitamins[vitamin] || 0) + value * scaleFactor
            }
          }
          
          if (result.nutrition.minerals) {
            for (const [mineral, value] of Object.entries(result.nutrition.minerals)) {
              totalMinerals[mineral] = (totalMinerals[mineral] || 0) + value * scaleFactor
            }
          }
          
          matchedIngredients++
          console.log(`✅ Matched: ${ingredient.name} -> ${result.match} (${grams}g)`)
          console.log(`📊 Running totals: ${Math.round(totalCalories)} kcal, ${Math.round(totalProtein * 10) / 10}g protein`)
        } else {
          console.log(`❌ No match found for: ${ingredient.name}`)
        }
      } catch (error) {
        console.error(`Error processing ingredient ${ingredient.name}:`, error)
      }
    }

    // Calculate per portion nutrition
    const servings = recipe.servings || 1
    const perPortionNutrition = {
      calories: Math.round(totalCalories / servings),
      protein: Math.round((totalProtein / servings) * 10) / 10,
      carbs: Math.round((totalCarbs / servings) * 10) / 10,
      fat: Math.round((totalFat / servings) * 10) / 10,
      fiber: Math.round((totalFiber / servings) * 10) / 10
    }

    // Calculate per portion micro nutrients
    const perPortionVitamins: Record<string, number> = {}
    const perPortionMinerals: Record<string, number> = {}
    
    for (const [vitamin, value] of Object.entries(totalVitamins)) {
      perPortionVitamins[vitamin] = Math.round((value / servings) * 100) / 100
    }
    
    for (const [mineral, value] of Object.entries(totalMinerals)) {
      perPortionMinerals[mineral] = Math.round((value / servings) * 100) / 100
    }

    console.log(`📊 Final nutrition totals (per portion):`, perPortionNutrition)
    console.log(`🧪 Vitamins (per portion):`, perPortionVitamins)
    console.log(`⚡ Minerals (per portion):`, perPortionMinerals)
    console.log(`✅ Matched ${matchedIngredients}/${totalIngredients} ingredients`)

    // Update the recipe in the database with both total and per-portion nutrition
    const updateData = {
      calories: perPortionNutrition.calories,
      protein: perPortionNutrition.protein,
      carbs: perPortionNutrition.carbs,
      fat: perPortionNutrition.fat,
      fiber: perPortionNutrition.fiber,
      // Store micro nutrients as JSONB
      vitamins: perPortionVitamins,
      minerals: perPortionMinerals,
      // Store total nutrition (for reference) - use snake_case
      total_calories: Math.round(totalCalories),
      total_protein: Math.round(totalProtein * 10) / 10,
      total_carbs: Math.round(totalCarbs * 10) / 10,
      total_fat: Math.round(totalFat * 10) / 10,
      total_fiber: Math.round(totalFiber * 10) / 10,
      updatedAt: new Date().toISOString()
    }
    
    console.log(`💾 Updating database with:`, updateData)
    
    const { error: updateError } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', recipeId)

    if (updateError) {
      console.error('❌ Error updating recipe nutrition:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update recipe nutrition', 
          details: updateError.message 
        },
        { status: 500 }
      )
    }

    console.log(`✅ Database update successful for recipe: ${recipe.title}`)
    
    // Verify the update by fetching the recipe again
    const { data: updatedRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select('calories, protein, carbs, fat, fiber, vitamins, minerals')
      .eq('id', recipeId)
      .single()
    
    if (fetchError) {
      console.error('❌ Error fetching updated recipe:', fetchError)
    } else {
      console.log(`🔍 Verification - Updated recipe data:`, updatedRecipe)
    }

    return NextResponse.json({
      success: true,
      message: `Nutrition recalculated successfully for "${recipe.title}"`,
      matchedIngredients,
      totalIngredients,
      servings,
      nutrition: perPortionNutrition,
      vitamins: perPortionVitamins,
      minerals: perPortionMinerals
    })

  } catch (error) {
    console.error('Error in recalculate-nutrition API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function convertToGrams(amount: number, unit: string): number {
  const u = (unit || '').toLowerCase()
  const conversions: Record<string, number> = {
    g: 1,
    gram: 1,
    kg: 1000,
    kilo: 1000,
    stk: 80,
    st: 80,
    stykke: 80,
    spsk: 13,  // 1 spsk = 13g (mere præcis dansk mål)
    tesk: 4,   // 1 tsk = 4g (mere præcis dansk mål)
    tsk: 4,    // 1 tsk = 4g (mere præcis dansk mål)
    dl: 100,
    l: 1000,
    ml: 1,
  }
  const gramsPerUnit = conversions[u] ?? 100
  return amount * gramsPerUnit
}
