import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { FridaDTUMatcher } from '@/lib/frida-dtu-matcher'
import { createSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting BULK nutrition recalculation for ALL recipes...')

    // Initialize services
    const matcher = new FridaDTUMatcher()
    const supabase = createSupabaseClient()
    
    // Get all recipes
    const allRecipes = await databaseService.getRecipes()
    console.log(`📊 Found ${allRecipes.length} recipes to process`)
    
    const results = {
      totalRecipes: allRecipes.length,
      processed: 0,
      success: 0,
      errors: 0,
      details: [] as Array<{
        recipeId: string
        title: string
        status: 'success' | 'error'
        message: string
        matchedIngredients?: number
        totalIngredients?: number
      }>
    }

    // Process each recipe
    for (const recipe of allRecipes) {
      try {
        console.log(`🔄 Processing recipe ${results.processed + 1}/${results.totalRecipes}: ${recipe.title}`)
        
        if (!recipe.ingredients || recipe.ingredients.length === 0) {
          results.details.push({
            recipeId: recipe.id,
            title: recipe.title,
            status: 'error',
            message: 'No ingredients found'
          })
          results.errors++
          results.processed++
          continue
        }

        let totalCalories = 0
        let totalProtein = 0
        let totalCarbs = 0
        let totalFat = 0
        let totalFiber = 0
        let totalVitamins: Record<string, number> = {}
        let totalMinerals: Record<string, number> = {}
        let matchedIngredients = 0
        let totalIngredients = recipe.ingredients.length

        // Calculate nutrition for each ingredient
        for (const ingredient of recipe.ingredients) {
          try {
            const result = await matcher.matchIngredient(ingredient.name)
            
            if (result.nutrition) {
              const grams = convertToGrams(ingredient.amount || 0, ingredient.unit || '')
              const scaleFactor = grams / 100
              
              // Macro nutrients
              totalCalories += result.nutrition.calories * scaleFactor
              totalProtein += result.nutrition.protein * scaleFactor
              totalCarbs += result.nutrition.carbs * scaleFactor
              totalFat += result.nutrition.fat * scaleFactor
              totalFiber += result.nutrition.fiber * scaleFactor
              
              // Micro nutrients
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
            }
          } catch (error) {
            console.error(`Error processing ingredient ${ingredient.name} in ${recipe.title}:`, error)
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

        // Update recipe in database
        const { error: updateError } = await supabase
          .from('recipes')
          .update({
            calories: perPortionNutrition.calories,
            protein: perPortionNutrition.protein,
            carbs: perPortionNutrition.carbs,
            fat: perPortionNutrition.fat,
            fiber: perPortionNutrition.fiber,
            vitamins: perPortionVitamins,
            minerals: perPortionMinerals,
            total_calories: Math.round(totalCalories),
            total_protein: Math.round(totalProtein * 10) / 10,
            total_carbs: Math.round(totalCarbs * 10) / 10,
            total_fat: Math.round(totalFat * 10) / 10,
            total_fiber: Math.round(totalFiber * 10) / 10,
            updatedAt: new Date().toISOString()
          })
          .eq('id', recipe.id)

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        results.success++
        results.details.push({
          recipeId: recipe.id,
          title: recipe.title,
          status: 'success',
          message: `Updated nutrition: ${matchedIngredients}/${totalIngredients} ingredients matched`,
          matchedIngredients,
          totalIngredients
        })

        console.log(`✅ Successfully updated ${recipe.title}: ${matchedIngredients}/${totalIngredients} ingredients matched`)

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`❌ Failed to process ${recipe.title}:`, errorMsg)
        
        results.errors++
        results.details.push({
          recipeId: recipe.id,
          title: recipe.title,
          status: 'error',
          message: errorMsg
        })
      }
      
      results.processed++
    }

    console.log(`🎉 BULK nutrition recalculation completed!`)
    console.log(`📊 Results: ${results.success} success, ${results.errors} errors, ${results.processed} processed`)

    return NextResponse.json({
      success: true,
      message: `Bulk nutrition recalculation completed for ${results.totalRecipes} recipes`,
      results
    })

  } catch (error) {
    console.error('Error in bulk nutrition recalculation API:', error)
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
