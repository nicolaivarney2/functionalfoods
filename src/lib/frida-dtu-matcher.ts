import fridaData from '../../frida-nutritional-data.json'

// Types for Frida DTU data
interface FridaDataEntry {
  FoodID: number
  FødevareNavn: string
  FoodName: string
  ParameterID: number
  ParameterNavn: string
  ParameterName: string
  ResVal: number
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
  private fridaData: FridaDataEntry[]
  private ingredientCache: Map<string, NutritionalInfo> = new Map()
  
  constructor() {
    this.fridaData = fridaData as FridaDataEntry[]
    console.log('✅ FridaDTUMatcher initialized with', this.fridaData.length, 'entries')
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
   * Find best match for ingredient in Frida data
   */
  private findBestMatch(ingredientName: string): { foodId: number, name: string, score: number } | null {
    const uniqueFoods = this.getUniqueFoods()
    let bestMatch = null
    let bestScore = 0

    for (const food of uniqueFoods) {
      const score = this.calculateSimilarity(ingredientName, food.name)
      if (score > bestScore && score > 0.3) { // Minimum threshold
        bestScore = score
        bestMatch = { foodId: food.foodId, name: food.name, score }
      }
    }

    return bestMatch
  }

  /**
   * Get unique foods from Frida data
   */
  private getUniqueFoods(): Array<{ foodId: number, name: string }> {
    const uniqueFoods = new Map<number, string>()
    
    for (const entry of this.fridaData) {
      if (!uniqueFoods.has(entry.FoodID)) {
        uniqueFoods.set(entry.FoodID, entry.FødevareNavn)
      }
    }
    
    return Array.from(uniqueFoods.entries()).map(([foodId, name]) => ({
      foodId,
      name
    }))
  }

  /**
   * Get nutritional info for a specific food ID
   */
  private getNutritionalInfo(foodId: number): NutritionalInfo | null {
    const foodEntries = this.fridaData.filter(entry => entry.FoodID === foodId)
    
    if (foodEntries.length === 0) return null

    const nutrition: NutritionalInfo = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      vitamins: {},
      minerals: {}
    }

    for (const entry of foodEntries) {
      const value = entry.ResVal
      
      switch (entry.ParameterNavn) {
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
          if (entry.ParameterNavn.includes('vitamin') || entry.ParameterNavn.includes('Vitamin')) {
            nutrition.vitamins[entry.ParameterNavn] = value
          } else if (entry.ParameterNavn.includes('jern') || entry.ParameterNavn.includes('calcium') || 
                     entry.ParameterNavn.includes('magnesium') || entry.ParameterNavn.includes('zink') ||
                     entry.ParameterNavn.includes('selen') || entry.ParameterNavn.includes('kalium')) {
            nutrition.minerals[entry.ParameterNavn] = value
          }
          break
      }
    }

    return nutrition
  }

  /**
   * Match ingredient and get nutritional info
   */
  public matchIngredient(ingredientName: string): { nutrition: NutritionalInfo | null, match: string | null, score: number } {
    // Check cache first
    if (this.ingredientCache.has(ingredientName)) {
      return {
        nutrition: this.ingredientCache.get(ingredientName)!,
        match: ingredientName,
        score: 1.0
      }
    }

    const bestMatch = this.findBestMatch(ingredientName)
    
    if (!bestMatch) {
      console.log(`❌ No match found for: ${ingredientName}`)
      return { nutrition: null, match: null, score: 0 }
    }

    const nutrition = this.getNutritionalInfo(bestMatch.foodId)
    
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
  public calculateRecipeNutrition(ingredients: Array<{ name: string, amount: number, unit: string }>): NutritionalInfo {
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
      const result = this.matchIngredient(ingredient.name)
      
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
      'stk': 100, // Assume 100g per piece
      'stykke': 100,
      'spsk': 15, // Tablespoon
      'tesk': 5,  // Teaspoon
      'dl': 100,  // Deciliter
      'l': 1000,  // Liter
      'ml': 1     // Milliliter
    }
    
    const gramsPerUnit = conversions[unitLower] || 100 // Default to 100g
    const totalGrams = amount * gramsPerUnit
    
    return totalGrams / 100 // Convert to per 100g basis
  }
} 