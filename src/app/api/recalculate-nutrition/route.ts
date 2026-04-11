import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { recalculateRecipeNutritionFromFrida } from '@/lib/recipe-frida-nutrition-recalc'

export async function POST(request: NextRequest) {
  try {
    const { recipeId } = await request.json()

    if (!recipeId) {
      return NextResponse.json({ success: false, error: 'Recipe ID is required' }, { status: 400 })
    }

    console.log(`🔄 Starting nutrition recalculation for recipe ID: ${recipeId}`)

    const result = await recalculateRecipeNutritionFromFrida(recipeId)

    if (!result.success) {
      const status = result.error === 'Recipe not found' ? 404 : 500
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.error,
        },
        { status }
      )
    }

    const supabase = createSupabaseServiceClient()
    const { data: recipe } = await supabase.from('recipes').select('title').eq('id', recipeId).maybeSingle()

    return NextResponse.json({
      success: true,
      message: `Nutrition recalculated successfully for "${recipe?.title || recipeId}"`,
      matchedIngredients: result.matchedIngredients,
      totalIngredients: result.totalIngredients,
      unmatchedIngredients: result.unmatchedIngredients,
      servings: result.servings,
      nutrition: result.nutrition,
      vitamins: result.vitamins,
      minerals: result.minerals,
    })
  } catch (error) {
    console.error('Error in recalculate-nutrition API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
