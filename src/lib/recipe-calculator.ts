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
    const grams = this.convertAmountToGrams(amount, unit, 'unknown')
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
  public convertAmountToGrams(amount: number, unit: string, ingredientName?: string): number {
    const unitLower = unit.toLowerCase()
    
    // Basic unit conversions
    const basicUnits: { [key: string]: number } = {
      'g': 1,
      'gram': 1,
      'kg': 1000,
      'kilo': 1000,
      
      // Liquid measurements (approx. 1ml = 1g for water-based liquids)
      'ml': 1,
      'l': 1000,
      'liter': 1000,
      'dl': 100,
      
      // Standard tablespoon/teaspoon (varies by ingredient type)
      'spsk': this.getTablespoonWeight(ingredientName),
      'spiseskefuld': this.getTablespoonWeight(ingredientName),
      'tsk': this.getTeaspoonWeight(ingredientName),
      'teskefuld': this.getTeaspoonWeight(ingredientName),
      'teske': this.getTeaspoonWeight(ingredientName),
      
      // Piece-based measurements
      'stk': this.getPieceWeight(ingredientName),
      'stykke': this.getPieceWeight(ingredientName),
      'fed': this.getCloveWeight(ingredientName),
      
      // Volume/handful measurements
      'bundt': this.getBunchWeight(ingredientName),
      'bunke': this.getBunchWeight(ingredientName),
      'håndfuld': 30,
      'knsp': 1, // Pinch
      'knivspids': 1,
      
      // Danish cooking units
      'kop': 240, // Cup
      'glas': 200, // Glass
    }

    return amount * (basicUnits[unitLower] || 100) // Default to 100g if unknown unit
  }

  /**
   * Get tablespoon weight based on ingredient type (15ml volume but different weights)
   */
  private getTablespoonWeight(ingredientName?: string): number {
    if (!ingredientName) return 15
    
    const ingredient = ingredientName.toLowerCase()
    
    // Oils and liquids
    if (ingredient.includes('olie') || ingredient.includes('oil')) return 14
    if (ingredient.includes('eddike') || ingredient.includes('vinegar')) return 15
    if (ingredient.includes('saft') || ingredient.includes('juice')) return 15
    if (ingredient.includes('fløde') || ingredient.includes('cream')) return 15
    if (ingredient.includes('mælk') || ingredient.includes('milk')) return 15
    
    // Powders and spices
    if (ingredient.includes('mel') || ingredient.includes('flour')) return 8
    if (ingredient.includes('sukker') || ingredient.includes('sugar')) return 12
    if (ingredient.includes('salt')) return 18
    if (ingredient.includes('paprika') || ingredient.includes('krydderi')) return 7
    if (ingredient.includes('oregano') || ingredient.includes('basilikum')) return 3
    
    // Thick pastes
    if (ingredient.includes('butter') || ingredient.includes('smør')) return 14
    if (ingredient.includes('peanut') || ingredient.includes('nød')) return 16
    
    return 15 // Default tablespoon weight
  }

  /**
   * Get teaspoon weight based on ingredient type (5ml volume but different weights)
   */
  private getTeaspoonWeight(ingredientName?: string): number {
    if (!ingredientName) return 5
    
    const ingredient = ingredientName.toLowerCase()
    
    // Oils and liquids
    if (ingredient.includes('olie') || ingredient.includes('oil')) return 4.5
    if (ingredient.includes('eddike') || ingredient.includes('vinegar')) return 5
    
    // Powders and spices
    if (ingredient.includes('salt')) return 6
    if (ingredient.includes('sukker') || ingredient.includes('sugar')) return 4
    if (ingredient.includes('paprika') || ingredient.includes('krydderi')) return 2
    if (ingredient.includes('oregano') || ingredient.includes('basilikum')) return 1
    if (ingredient.includes('spidskommen') || ingredient.includes('cumin')) return 2
    if (ingredient.includes('kardemomme') || ingredient.includes('cardamom')) return 2
    if (ingredient.includes('gurkemeje') || ingredient.includes('turmeric')) return 3
    
    return 5 // Default teaspoon weight
  }

  /**
   * Get piece weight based on ingredient type
   */
  private getPieceWeight(ingredientName?: string): number {
    if (!ingredientName) return 100
    
    const ingredient = ingredientName.toLowerCase()
    
    // Eggs
    if (ingredient.includes('æg') || ingredient.includes('egg')) return 60
    
    // Vegetables
    if (ingredient.includes('løg') || ingredient.includes('onion')) return 150
    if (ingredient.includes('tomat') || ingredient.includes('tomato')) return 100
    if (ingredient.includes('agurk') || ingredient.includes('cucumber')) return 300
    if (ingredient.includes('citron') || ingredient.includes('lemon')) return 60
    if (ingredient.includes('lime')) return 30
    if (ingredient.includes('peberfrugt') || ingredient.includes('pepper')) return 150
    
    // Meat pieces
    if (ingredient.includes('kylling') || ingredient.includes('chicken')) return 150
    if (ingredient.includes('bøf') || ingredient.includes('steak')) return 200
    
    return 100 // Default piece weight
  }

  /**
   * Get clove weight (garlic, etc.)
   */
  private getCloveWeight(ingredientName?: string): number {
    if (!ingredientName) return 5
    
    const ingredient = ingredientName.toLowerCase()
    
    if (ingredient.includes('hvidløg') || ingredient.includes('garlic')) return 3
    
    return 5 // Default clove weight
  }

  /**
   * Get bunch weight 
   */
  private getBunchWeight(ingredientName?: string): number {
    if (!ingredientName) return 50
    
    const ingredient = ingredientName.toLowerCase()
    
    if (ingredient.includes('persille') || ingredient.includes('parsley')) return 30
    if (ingredient.includes('mynte') || ingredient.includes('mint')) return 20
    if (ingredient.includes('forårsløg') || ingredient.includes('spring onion')) return 40
    if (ingredient.includes('basilikum') || ingredient.includes('basil')) return 25
    
    return 50 // Default bunch weight
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