import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { FridaDTUMatcher } from '@/lib/frida-dtu-matcher'
import { RecipeCalculator } from '@/lib/recipe-calculator'

export async function POST(request: NextRequest) {
  try {
    const { recipeId } = await request.json()
    
    if (!recipeId) {
      return NextResponse.json(
        { error: 'Recipe ID is required' },
        { status: 400 }
      )
    }
    
    console.log(`🔄 Recalculating nutrition for recipe ID: ${recipeId}`)
    
    // Get recipe first
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .single()
    
    if (recipeError || !recipe) {
      return NextResponse.json(
        { error: 'Recipe not found', details: recipeError?.message },
        { status: 404 }
      )
    }
    
    // Ingredients are stored in the recipe object itself, not in a separate table
    const ingredients = recipe.ingredients || []
    
    console.log(`📝 Found recipe: "${recipe.title}" with ${ingredients.length} ingredients`)
    
    // Calculate nutrition using FridaDTUMatcher (with manual matches support)
    const fridaMatcher = new FridaDTUMatcher()
    const recipeCalculator = new RecipeCalculator()
    
    const ingredientsList = ingredients
    const nutritionResults = await Promise.all(
      ingredientsList.map(async (ing: any) => {
        const result = await fridaMatcher.matchIngredient(ing.name)
        console.log(`${result.nutrition ? '✅' : '❌'} ${ing.name} → ${result.match || 'No match'} (${(result.score * 100).toFixed(0)}%)`)
        
        if (result.nutrition) {
          // Calculate per serving based on ingredient amount with proper unit conversion
          const amountInGrams = recipeCalculator.convertAmountToGrams(ing.amount, ing.unit, ing.name)
          const servingMultiplier = amountInGrams / 100 // Frida nutrition is per 100g
          return {
            ingredient: ing.name,
            match: result.match,
            calories: result.nutrition.calories * servingMultiplier,
            protein: result.nutrition.protein * servingMultiplier,
            carbs: result.nutrition.carbs * servingMultiplier,
            fat: result.nutrition.fat * servingMultiplier,
            fiber: result.nutrition.fiber * servingMultiplier,
            vitamins: Object.fromEntries(
              Object.entries(result.nutrition.vitamins || {}).map(([k, v]) => [k, v * servingMultiplier])
            ),
            minerals: Object.fromEntries(
              Object.entries(result.nutrition.minerals || {}).map(([k, v]) => [k, v * servingMultiplier])
            )
          }
        }
        return null
      })
    )
    
    // Sum up total nutrition (filter out null results)
    const validResults = nutritionResults.filter(r => r !== null)
    const totalNutrition = validResults.reduce(
      (total, nutrition) => ({
        calories: total.calories + nutrition!.calories,
        protein: total.protein + nutrition!.protein,
        carbs: total.carbs + nutrition!.carbs,
        fat: total.fat + nutrition!.fat,
        fiber: total.fiber + nutrition!.fiber,
        vitamins: {
          ...total.vitamins,
          ...Object.fromEntries(
            Object.entries(nutrition!.vitamins || {}).map(([k, v]) => [
              k, (total.vitamins[k] || 0) + v
            ])
          )
        },
        minerals: {
          ...total.minerals,
          ...Object.fromEntries(
            Object.entries(nutrition!.minerals || {}).map(([k, v]) => [
              k, (total.minerals[k] || 0) + v
            ])
          )
        }
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        vitamins: {} as Record<string, number>,
        minerals: {} as Record<string, number>
      }
    )
    
    // Convert to per-portion nutrition
    const servings = recipe.servings || 2
    const perPortionNutrition = {
      calories: totalNutrition.calories / servings,
      protein: totalNutrition.protein / servings,
      carbs: totalNutrition.carbs / servings,
      fat: totalNutrition.fat / servings,
      fiber: totalNutrition.fiber / servings,
      vitamins: Object.fromEntries(
        Object.entries(totalNutrition.vitamins).map(([k, v]) => [k, v / servings])
      ),
      minerals: Object.fromEntries(
        Object.entries(totalNutrition.minerals).map(([k, v]) => [k, v / servings])
      )
    }
    
    console.log(`🧮 Calculated nutrition (per portion, ${servings} servings):`, {
      calories: Math.round(perPortionNutrition.calories),
      protein: Math.round(perPortionNutrition.protein * 10) / 10,
      carbs: Math.round(perPortionNutrition.carbs * 10) / 10,
      fat: Math.round(perPortionNutrition.fat * 10) / 10,
      matchedIngredients: validResults.length,
      totalIngredients: ingredientsList.length
    })
    
    // Update recipe with new nutritional info (per portion)
    const { data: updatedRecipe, error: updateError } = await supabase
      .from('recipes')
      .update({
        nutritionalinfo: perPortionNutrition,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Error updating recipe nutrition:', updateError)
      return NextResponse.json(
        { error: 'Failed to update nutrition', details: updateError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully recalculated nutrition for "${recipe.title}"`,
      nutrition: perPortionNutrition,
      matchedIngredients: validResults.length,
      totalIngredients: ingredientsList.length,
      ingredientMatches: validResults.map(r => ({
        ingredient: r!.ingredient,
        match: r!.match
      }))
    })
    
  } catch (error) {
    console.error('❌ Error recalculating nutrition:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate nutrition', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}