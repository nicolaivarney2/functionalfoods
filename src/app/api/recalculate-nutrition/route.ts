import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { FridaDTUMatcher } from '@/lib/frida-dtu-matcher'

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

    // Get the recipe
    const allRecipes = await databaseService.getRecipes()
    const recipe = allRecipes.find(r => r.id === recipeId)
    
    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Get ingredient matches for this recipe
    const supabase = createSupabaseClient()
    const { data: ingredientMatches, error: matchesError } = await supabase
      .from('ingredient_matches')
      .select('*')
      .eq('recipe_id', recipeId)

    if (matchesError) {
      console.error('Error fetching ingredient matches:', matchesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ingredient matches', details: matchesError.message },
        { status: 500 }
      )
    }

    // Initialize nutrition calculator
    const matcher = new FridaDTUMatcher()
    
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let totalFiber = 0
    let matchedIngredients = 0
    let totalIngredients = recipe.ingredients?.length || 0

    console.log(`📊 Processing ${totalIngredients} ingredients for recipe: ${recipe.title}`)

    // Calculate nutrition for each ingredient
    for (const ingredient of recipe.ingredients || []) {
      try {
        // Try to find a match in ingredient_matches first
        const match = ingredientMatches?.find(m => 
          m.ingredient_name?.toLowerCase() === ingredient.name?.toLowerCase()
        )

        if (match && match.frida_ingredient_id) {
          // Use the matched Frida ingredient
          const fridaNutrition = await matcher.getFridaIngredientNutrition(match.frida_ingredient_id)
          
          if (fridaNutrition) {
            // Convert ingredient amount to grams and calculate nutrition
            const grams = convertToGrams(ingredient.amount || 0, ingredient.unit || '')
            const scaleFactor = grams / 100
            
            totalCalories += fridaNutrition.calories * scaleFactor
            totalProtein += fridaNutrition.protein * scaleFactor
            totalCarbs += fridaNutrition.carbs * scaleFactor
            totalFat += fridaNutrition.fat * scaleFactor
            totalFiber += fridaNutrition.fiber * scaleFactor
            
            matchedIngredients++
            console.log(`✅ Matched: ${ingredient.name} -> ${fridaNutrition.name} (${grams}g)`)
          } else {
            console.log(`⚠️ No nutrition data for matched ingredient: ${ingredient.name}`)
          }
        } else {
          // Try to find a match using the matcher
          const result = await matcher.matchIngredient(ingredient.name)
          
          if (result.nutrition) {
            const grams = convertToGrams(ingredient.amount || 0, ingredient.unit || '')
            const scaleFactor = grams / 100
            
            totalCalories += result.nutrition.calories * scaleFactor
            totalProtein += result.nutrition.protein * scaleFactor
            totalCarbs += result.nutrition.carbs * scaleFactor
            totalFat += result.nutrition.fat * scaleFactor
            totalFiber += result.nutrition.fiber * scaleFactor
            
            matchedIngredients++
            console.log(`✅ Auto-matched: ${ingredient.name} -> ${result.match} (${grams}g)`)
          } else {
            console.log(`❌ No match found for: ${ingredient.name}`)
          }
        }
      } catch (error) {
        console.error(`Error processing ingredient ${ingredient.name}:`, error)
      }
    }

    // Round nutrition values
    const nutrition = {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10
    }

    console.log(`📊 Final nutrition totals:`, nutrition)
    console.log(`✅ Matched ${matchedIngredients}/${totalIngredients} ingredients`)

    // Update the recipe in the database
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId)

    if (updateError) {
      console.error('Error updating recipe nutrition:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update recipe nutrition', 
          details: updateError.message 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Nutrition recalculated successfully for "${recipe.title}"`,
      matchedIngredients,
      totalIngredients,
      nutrition
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
    spsk: 15,
    tesk: 5,
    tsk: 5,
    dl: 100,
    l: 1000,
    ml: 1,
  }
  const gramsPerUnit = conversions[u] ?? 100
  return amount * gramsPerUnit
}
