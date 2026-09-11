import {
  calculateNutritionFromIngredientLines,
  type IngredientLineInput,
} from '@/lib/recipe-frida-nutrition-recalc'

export type ProvisionalNutritionJson = {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

/** Frida-baseret ernæring pr. portion; falder tilbage til AI-estimat hvis intet matcher. */
export async function nutritionForProvisionalMeal(
  ingredients: IngredientLineInput[],
  servings: number,
  aiFallback?: ProvisionalNutritionJson | null
): Promise<{
  nutrition: ProvisionalNutritionJson
  matchedIngredients: number
  totalIngredients: number
  source: 'frida' | 'ai-fallback' | 'empty'
}> {
  const lines = ingredients.filter((i) => String(i.name || '').trim())
  if (!lines.length) {
    return {
      nutrition: aiFallback ?? {},
      matchedIngredients: 0,
      totalIngredients: 0,
      source: aiFallback ? 'ai-fallback' : 'empty',
    }
  }

  const calc = await calculateNutritionFromIngredientLines(lines, servings)
  const aiCal = aiFallback?.calories != null ? Number(aiFallback.calories) : null
  const fridaCal = Number(calc.perPortion.calories) || 0
  const fridaLooksWrong =
    calc.matchedIngredients > 0 &&
    aiCal != null &&
    Number.isFinite(aiCal) &&
    aiCal >= 80 &&
    (fridaCal < 80 && aiCal >= 200 ||
      fridaCal < aiCal * 0.35 ||
      (calc.totalIngredients >= 3 && calc.matchedIngredients <= 1 && fridaCal < aiCal * 0.6))

  if (calc.matchedIngredients > 0 && !fridaLooksWrong) {
    return {
      nutrition: {
        ...calc.perPortion,
        vitamins: calc.vitamins,
        minerals: calc.minerals,
      },
      matchedIngredients: calc.matchedIngredients,
      totalIngredients: calc.totalIngredients,
      source: 'frida',
    }
  }

  return {
    nutrition: aiFallback ?? {},
    matchedIngredients: 0,
    totalIngredients: calc.totalIngredients,
    source: aiFallback ? 'ai-fallback' : 'empty',
  }
}
