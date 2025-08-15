import { supabase } from '@/lib/supabase'

// Types for Frida DTU data
interface FridaFood {
  food_id: number
  food_name_da: string
  food_name_en: string
}

interface FridaNutritionValue {
  food_id: number
  parameter_id: number
  parameter_name_da: string
  parameter_name_en: string
  value: number
  sort_key: number
}

interface NutritionalInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  vitamins: Record<string, number>
  minerals: Record<string, number>
}

export class FridaDTUMatcher {
  private ingredientCache: Map<string, NutritionalInfo> = new Map()
  
  constructor() {
    // Supabase connection is ready to use
  }

  /**
   * Get manually confirmed match from ingredient_matches table
   */
  private async getManualMatch(ingredientName: string): Promise<{ fridaId: string, fridaName: string } | null> {
    try {
      // Support both legacy name-based IDs and new slug-based IDs
      const toSlug = (input: string) => input
        .toLowerCase()
        .replace(/[æøå]/g, (m) => ({ 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }[m] as string))
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      const slugId = toSlug(ingredientName)

      // Look for saved matches by either slug id or exact name
      const orFilter = [
        `recipe_ingredient_id.eq.${slugId}`,
        `recipe_ingredient_id.eq.${ingredientName}`,
        `recipe_ingredient_id.like.${slugId}-%`
      ].join(',')

      const { data: matches, error } = await supabase
        .from('ingredient_matches')
        .select('frida_ingredient_id')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error || !matches || matches.length === 0) {
        return null
      }
      
      const fridaId = matches[0].frida_ingredient_id
      
      // Get the Frida ingredient details
      const { data: fridaIngredient, error: fridaError } = await supabase
        .from('frida_ingredients')
        .select('name')
        .eq('id', fridaId)
        .limit(1)
      
      if (fridaError || !fridaIngredient || fridaIngredient.length === 0) {
        return null
      }
      
      return {
        fridaId,
        fridaName: fridaIngredient[0].name
      }
    } catch (error) {
      console.log(`⚠️ Error checking manual matches: ${error}`)
      return null
    }
  }

  /**
   * Get nutrition data from frida_ingredients table
   */
  private async getFridaIngredientNutrition(fridaId: string): Promise<NutritionalInfo | null> {
    try {
      const { data: ingredient, error } = await supabase
        .from('frida_ingredients')
        .select('calories, protein, carbs, fat, fiber, vitamins, minerals')
        .eq('id', fridaId)
        .limit(1)
      
      if (error || !ingredient || ingredient.length === 0) {
        console.log(`❌ Failed to get nutrition for Frida ID: ${fridaId}`)
        return null
      }
      
      const ing = ingredient[0]
      return {
        calories: ing.calories || 0,
        protein: ing.protein || 0,
        carbs: ing.carbs || 0,
        fat: ing.fat || 0,
        fiber: ing.fiber || 0,
        vitamins: ing.vitamins || {},
        minerals: ing.minerals || {}
      }
    } catch (error) {
      console.log(`❌ Error getting Frida nutrition: ${error}`)
      return null
    }
  }

  /**
   * Search for foods in Supabase database
   */
  private async searchFoods(searchTerm: string): Promise<FridaFood[]> {
    try {
      const normalizedTerm = this.normalizeIngredientName(searchTerm)
      
      // Use full-text search for better Danish language support
      const { data, error } = await supabase
        .from('frida_foods')
        .select('food_id, food_name_da, food_name_en')
        .or(`food_name_da.ilike.%${normalizedTerm}%,food_name_en.ilike.%${normalizedTerm}%`)
        .limit(10)
      
      if (error) {
        console.error('❌ Error searching foods:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('❌ Failed to search foods:', error)
      return []
    }
  }

  /**
   * Normalize ingredient name for better matching
   */
  private normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[æøå]/g, (match) => {
        const replacements: Record<string, string> = { 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }
        return replacements[match] || match
      })
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Calculate similarity score between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const normalized1 = this.normalizeIngredientName(str1)
    const normalized2 = this.normalizeIngredientName(str2)
    
    // Exact match
    if (normalized1 === normalized2) return 1.0
    
    // Contains match
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return 0.8
    
    // Word overlap
    const words1 = normalized1.split(' ')
    const words2 = normalized2.split(' ')
    const commonWords = words1.filter(word => words2.includes(word))
    if (commonWords.length > 0) {
      return commonWords.length / Math.max(words1.length, words2.length)
    }
    
    return 0
  }

  /**
   * Find best match for ingredient in Frida database
   */
  private async findBestMatch(ingredientName: string): Promise<{ foodId: number, name: string, score: number } | null> {
    const foods = await this.searchFoods(ingredientName)
    let bestMatch = null
    let bestScore = 0

    for (const food of foods) {
      const scoreDa = this.calculateSimilarity(ingredientName, food.food_name_da)
      const scoreEn = this.calculateSimilarity(ingredientName, food.food_name_en || '')
      const score = Math.max(scoreDa, scoreEn)
      
      if (score > bestScore && score > 0.3) { // Minimum threshold
        bestScore = score
        bestMatch = { 
          foodId: food.food_id, 
          name: food.food_name_da, 
          score 
        }
      }
    }

    return bestMatch
  }

  /**
   * Get nutritional values for a specific food ID from Supabase
   */
  private async getNutritionalValues(foodId: number): Promise<FridaNutritionValue[]> {
    try {
      const { data, error } = await supabase
        .from('frida_nutrition_values')
        .select('food_id, parameter_id, parameter_name_da, parameter_name_en, value, sort_key')
        .eq('food_id', foodId)
        .order('sort_key')
      
      if (error) {
        console.error('❌ Error getting nutrition values:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('❌ Failed to get nutrition values:', error)
      return []
    }
  }

  /**
   * Get nutritional info for a specific food ID from Supabase
   */
  private async getNutritionalInfo(foodId: number): Promise<NutritionalInfo | null> {
    const nutritionValues = await this.getNutritionalValues(foodId)
    
    if (nutritionValues.length === 0) return null

    const nutrition: NutritionalInfo = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      vitamins: {},
      minerals: {}
    }

    for (const entry of nutritionValues) {
      const value = entry.value
      
      // Use Danish parameter names since that's what we have in our data
      switch (entry.parameter_name_da) {
        case 'Energi (kcal)':
          nutrition.calories = value
          break
        case 'Protein':
          nutrition.protein = value
          break
        case 'Kulhydrat difference':
          nutrition.carbs = value
          break
        case 'Fedt':
          nutrition.fat = value
          break
        case 'Kostfibre':
          nutrition.fiber = value
          break
        default:
          // Handle vitamins and minerals
          if (entry.parameter_name_da.includes('vitamin') || entry.parameter_name_da.includes('Vitamin')) {
            nutrition.vitamins[entry.parameter_name_da] = value
          } else if (entry.parameter_name_da.includes('jern') || entry.parameter_name_da.includes('calcium') || 
                     entry.parameter_name_da.includes('magnesium') || entry.parameter_name_da.includes('zink') ||
                     entry.parameter_name_da.includes('selen') || entry.parameter_name_da.includes('kalium')) {
            nutrition.minerals[entry.parameter_name_da] = value
          }
          break
      }
    }

    return nutrition
  }

  /**
   * Match ingredient and get nutritional info
   */
  public async matchIngredient(ingredientName: string): Promise<{ nutrition: NutritionalInfo | null, match: string | null, score: number }> {
    // Check cache first
    if (this.ingredientCache.has(ingredientName)) {
      return {
        nutrition: this.ingredientCache.get(ingredientName)!,
        match: ingredientName,
        score: 1.0
      }
    }

    // First, check if this ingredient has a manually confirmed match in the database
    const manualMatch = await this.getManualMatch(ingredientName)
    if (manualMatch) {
      console.log(`🎯 Using manual match for "${ingredientName}" → "${manualMatch.fridaName}"`)
      const nutrition = await this.getFridaIngredientNutrition(manualMatch.fridaId)
      if (nutrition) {
        this.ingredientCache.set(ingredientName, nutrition)
        return {
          nutrition,
          match: manualMatch.fridaName,
          score: 1.0 // Manual matches get perfect score
        }
      }
    }

    // If no manual match, fall back to automatic matching
    const bestMatch = await this.findBestMatch(ingredientName)
    
    if (!bestMatch) {
      console.log(`❌ No match found for: ${ingredientName}`)
      return { nutrition: null, match: null, score: 0 }
    }

    const nutrition = await this.getNutritionalInfo(bestMatch.foodId)
    
    if (nutrition) {
      this.ingredientCache.set(ingredientName, nutrition)
      console.log(`✅ Matched "${ingredientName}" to "${bestMatch.name}" (score: ${bestMatch.score.toFixed(2)})`)
    }

    return {
      nutrition,
      match: bestMatch.name,
      score: bestMatch.score
    }
  }

  /**
   * Process all ingredients in a recipe and calculate total nutrition
   */
  public async calculateRecipeNutrition(ingredients: Array<{ name: string, amount: number, unit: string }>): Promise<NutritionalInfo> {
    const totalNutrition: NutritionalInfo = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      vitamins: {},
      minerals: {}
    }

    for (const ingredient of ingredients) {
      const result = await this.matchIngredient(ingredient.name)
      
      if (result.nutrition) {
        // Convert to per 100g basis and scale by amount
        const scaleFactor = this.getScaleFactor(ingredient.unit, ingredient.amount)
        
        totalNutrition.calories += result.nutrition.calories * scaleFactor
        totalNutrition.protein += result.nutrition.protein * scaleFactor
        totalNutrition.carbs += result.nutrition.carbs * scaleFactor
        totalNutrition.fat += result.nutrition.fat * scaleFactor
        totalNutrition.fiber += result.nutrition.fiber * scaleFactor
        
        // Add vitamins and minerals
        for (const [vitamin, value] of Object.entries(result.nutrition.vitamins)) {
          totalNutrition.vitamins[vitamin] = (totalNutrition.vitamins[vitamin] || 0) + value * scaleFactor
        }
        
        for (const [mineral, value] of Object.entries(result.nutrition.minerals)) {
          totalNutrition.minerals[mineral] = (totalNutrition.minerals[mineral] || 0) + value * scaleFactor
        }
      }
    }

    return totalNutrition
  }

  /**
   * Convert ingredient amount to 100g basis
   */
  private getScaleFactor(unit: string, amount: number): number {
    const unitLower = unit.toLowerCase()
    
    // Common conversions to grams
    const conversions: Record<string, number> = {
      'g': 1,
      'gram': 1,
      'kg': 1000,
      'kilo': 1000,
      // Piece-based defaults (conservative)
      'stk': 80,
      'st': 80, // alias often seen in imported data
      'stykke': 80,
      'spsk': 15, // Tablespoon
      'tesk': 5,  // Teaspoon (common misspelling)
      'tsk': 5,   // Teaspoon
      'dl': 100,  // Deciliter
      'l': 1000,  // Liter
      'ml': 1     // Milliliter
    }
    
    const gramsPerUnit = conversions[unitLower] || 80 // Default to 80g per piece/unknown to avoid overcounting
    const totalGrams = amount * gramsPerUnit
    
    return totalGrams / 100 // Convert to per 100g basis
  }
} 