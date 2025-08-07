import { Recipe } from '@/types/recipe'
import { IngredientTag, NutritionalInfo } from '@/lib/ingredient-system/types'
import { ingredientService } from '@/lib/ingredient-system'

export interface CalculatedNutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  vitamins: any[]
  minerals: any[]
}

export class RecipeCalculator {
  /**
   * Calculate nutritional values for a recipe based on its ingredients
   */
  calculateRecipeNutrition(recipe: Recipe): CalculatedNutrition {
    const totalNutrition: CalculatedNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: [],
      minerals: []
    }

    recipe.ingredients.forEach(ingredient => {
      const ingredientTag = this.findIngredientTag(ingredient.name)
      if (ingredientTag?.nutritionalInfo) {
        const ingredientNutrition = this.calculateIngredientNutrition(
          ingredientTag.nutritionalInfo,
          ingredient.amount,
          ingredient.unit
        )
        
        // Add to totals
        totalNutrition.calories += ingredientNutrition.calories
        totalNutrition.protein += ingredientNutrition.protein
        totalNutrition.carbs += ingredientNutrition.carbs
        totalNutrition.fat += ingredientNutrition.fat
        totalNutrition.fiber += ingredientNutrition.fiber
        totalNutrition.sugar += ingredientNutrition.sugar
        totalNutrition.sodium += ingredientNutrition.sodium
        
        // Add vitamins and minerals (weighted by amount)
        this.addWeightedVitamins(totalNutrition.vitamins, ingredientTag.nutritionalInfo.vitamins || [], ingredient.amount)
        this.addWeightedMinerals(totalNutrition.minerals, ingredientTag.nutritionalInfo.minerals || [], ingredient.amount)
      }
    })

    // Convert to per-serving values
    const servings = recipe.servings || 1
    return this.convertToPerServing(totalNutrition, servings)
  }

  /**
   * Find ingredient tag by name
   */
  private findIngredientTag(ingredientName: string): IngredientTag | undefined {
    return ingredientService.getIngredientByName(ingredientName)
  }

  /**
   * Calculate nutritional values for a single ingredient based on amount and unit
   */
  private calculateIngredientNutrition(
    nutritionalInfo: NutritionalInfo,
    amount: number,
    unit: string
  ): CalculatedNutrition {
    // Convert amount to grams
    const grams = this.convertToGrams(amount, unit)
    const multiplier = grams / 100 // Nutritional info is per 100g

    return {
      calories: (nutritionalInfo.caloriesPer100g || 0) * multiplier,
      protein: (nutritionalInfo.proteinPer100g || 0) * multiplier,
      carbs: (nutritionalInfo.carbsPer100g || 0) * multiplier,
      fat: (nutritionalInfo.fatPer100g || 0) * multiplier,
      fiber: (nutritionalInfo.fiberPer100g || 0) * multiplier,
      sugar: (nutritionalInfo.sugarPer100g || 0) * multiplier,
      sodium: (nutritionalInfo.sodiumPer100g || 0) * multiplier,
      vitamins: [],
      minerals: []
    }
  }

  /**
   * Convert various units to grams
   */
  private convertToGrams(amount: number, unit: string): number {
    const unitMap: { [key: string]: number } = {
      'g': 1,
      'gram': 1,
      'kg': 1000,
      'kilo': 1000,
      'ml': 1, // Approximate for liquids
      'l': 1000,
      'liter': 1000,
      'stk': 100, // Average piece weight
      'stykke': 100,
      'spsk': 15, // Tablespoon
      'teskefuld': 5, // Teaspoon
      'knsp': 1, // Pinch
      'bunke': 50, // Bunch
      'fed': 5, // Clove (garlic)
      'håndfuld': 30, // Handful
    }

    return amount * (unitMap[unit.toLowerCase()] || 100) // Default to 100g if unknown unit
  }

  /**
   * Add weighted vitamins to total
   */
  private addWeightedVitamins(totalVitamins: any[], ingredientVitamins: any[], amount: number) {
    ingredientVitamins.forEach(vitamin => {
      const existingVitamin = totalVitamins.find(v => v.vitamin === vitamin.vitamin)
      const weightedAmount = vitamin.amountPer100g * (amount / 100)
      
      if (existingVitamin) {
        existingVitamin.amountPer100g += weightedAmount
      } else {
        totalVitamins.push({
          vitamin: vitamin.vitamin,
          amountPer100g: weightedAmount,
          unit: vitamin.unit
        })
      }
    })
  }

  /**
   * Add weighted minerals to total
   */
  private addWeightedMinerals(totalMinerals: any[], ingredientMinerals: any[], amount: number) {
    ingredientMinerals.forEach(mineral => {
      const existingMineral = totalMinerals.find(m => m.mineral === mineral.mineral)
      const weightedAmount = mineral.amountPer100g * (amount / 100)
      
      if (existingMineral) {
        existingMineral.amountPer100g += weightedAmount
      } else {
        totalMinerals.push({
          mineral: mineral.mineral,
          amountPer100g: weightedAmount,
          unit: mineral.unit
        })
      }
    })
  }

  /**
   * Convert total nutrition to per-serving values
   */
  private convertToPerServing(nutrition: CalculatedNutrition, servings: number): CalculatedNutrition {
    return {
      calories: Math.round(nutrition.calories / servings),
      protein: Math.round(nutrition.protein / servings * 10) / 10,
      carbs: Math.round(nutrition.carbs / servings * 10) / 10,
      fat: Math.round(nutrition.fat / servings * 10) / 10,
      fiber: Math.round(nutrition.fiber / servings * 10) / 10,
      sugar: Math.round(nutrition.sugar / servings * 10) / 10,
      sodium: Math.round(nutrition.sodium / servings * 10) / 10,
      vitamins: nutrition.vitamins.map(v => ({
        ...v,
        amountPer100g: Math.round(v.amountPer100g / servings * 10) / 10
      })),
      minerals: nutrition.minerals.map(m => ({
        ...m,
        amountPer100g: Math.round(m.amountPer100g / servings * 10) / 10
      }))
    }
  }

  /**
   * Update recipe with calculated nutritional values
   */
  updateRecipeWithCalculatedNutrition(recipe: Recipe): Recipe {
    const calculatedNutrition = this.calculateRecipeNutrition(recipe)
    
    return {
      ...recipe,
      calories: calculatedNutrition.calories,
      protein: calculatedNutrition.protein,
      carbs: calculatedNutrition.carbs,
      fat: calculatedNutrition.fat,
      fiber: calculatedNutrition.fiber
    }
  }

  /**
   * Process all imported recipes and update their nutritional values
   */
  processImportedRecipes(recipes: Recipe[]): Recipe[] {
    console.log(`Processing nutritional values for ${recipes.length} recipes...`)
    
    return recipes.map(recipe => {
      try {
        return this.updateRecipeWithCalculatedNutrition(recipe)
      } catch (error) {
        console.error(`Error processing recipe ${recipe.title}:`, error)
        return recipe // Return original if calculation fails
      }
    })
  }
} 