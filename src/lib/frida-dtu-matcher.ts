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
  private async getManualMatch(ingredientName: string): Promise<{ name: string, category: string, nutritionalInfo: NutritionalInfo | null } | null> {
    try {
      console.log(`🔍 Looking for manual match for: ${ingredientName}`)
      
      // Use singleton Supabase client
      const { data, error } = await supabase
        .from('frida_ingredients')
        .select('*')
        .ilike('name', `%${ingredientName}%`)
        .limit(1)
        .single()
      
      if (error) {
        console.log(`❌ No manual match found for: ${ingredientName}`)
        return null
      }
      
      console.log(`✅ Manual match found: ${data.name}`)
      
      // Create proper NutritionalInfo object from direct fields
      const nutritionalInfo: NutritionalInfo = {
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        fiber: data.fiber || 0,
        vitamins: data.vitamins || {},
        minerals: data.minerals || {}
      }
      
      return {
        name: data.name,
        category: data.category,
        nutritionalInfo
      }
    } catch (error) {
      console.error(`❌ Error getting manual match for ${ingredientName}:`, error)
      return null
    }
  }

  /**
   * Search for foods in Supabase database
   *
   * VIGTIGT: Brug IKKE normalizeIngredientName() til SQL — den omskriver æøå til ae/oe/aa,
   * så ilike('%roedloeg%') ikke matcher kolonnen "Rødløg" i frida_ingredients.
   */
  private async searchFoods(searchTerm: string): Promise<FridaFood[]> {
    try {
      const term = searchTerm.trim()
      console.log(`🔍 Searching for: "${term}" in frida_ingredients`)

      const fetchByPattern = async (pattern: string) => {
        const { data, error } = await supabase
          .from('frida_ingredients')
          .select('id, name, category')
          .ilike('name', `%${pattern}%`)
          .limit(20)

        if (error) {
          console.error('❌ Error searching foods:', error)
          return [] as { id: string; name: string; category: string }[]
        }
        return data || []
      }

      let data = await fetchByPattern(term)

      // Flere ord / komma: prøv enkeltord — længste ord først (fx "hakkede tomater" → "tomater" før "hakkede")
      if (!data.length) {
        const words = term
          .split(/[\s,]+/)
          .filter((w) => w.length >= 3)
          .sort((a, b) => b.length - a.length)
        for (const w of words) {
          if (w === term) continue
          data = await fetchByPattern(w)
          if (data.length) break
        }
      }

      // Sammensatte danske ord uden mellemrum — Frida har ofte "Kylling, bryst …"
      if (!data.length && !term.includes(' ') && term.length >= 8) {
        const meat = term.match(/^(kylling|svin|okse|laks|torsk|kalv|lam)(e|)/i)
        if (meat) {
          data = await fetchByPattern(meat[0])
        }
        if (!data.length) {
          const blom = term.match(/^(blomkål|blomkal)/i)
          if (blom) {
            data = await fetchByPattern(blom[0])
          }
        }
      }

      console.log(`🔍 Found ${data?.length || 0} matches for "${searchTerm}"`)
      
      // Transform data to match FridaFood interface
      const results = (data || []).map(item => ({
        food_id: parseInt(item.id.replace('frida-', '')),
        food_name_da: item.name,
        food_name_en: item.name // Use Danish name for both since we only have Danish
      }))
      
      console.log(`🔍 Transformed results:`, results.slice(0, 3)) // Log first 3 for debugging
      
      return results
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
    console.log(`🎯 Finding best match for: "${ingredientName}"`)
    
    const foods = await this.searchFoods(ingredientName)
    console.log(`🎯 searchFoods returned ${foods.length} foods`)
    
    let bestMatch = null
    let bestScore = 0

    for (const food of foods) {
      const scoreDa = this.calculateSimilarity(ingredientName, food.food_name_da)
      const scoreEn = this.calculateSimilarity(ingredientName, food.food_name_en || '')
      const score = Math.max(scoreDa, scoreEn)
      
      console.log(`🎯 "${food.food_name_da}" - score: ${score.toFixed(3)}`)
      
      if (score > bestScore && score > 0.3) { // Minimum threshold
        bestScore = score
        bestMatch = { 
          foodId: food.food_id, 
          name: food.food_name_da, 
          score 
        }
        console.log(`🎯 New best match: "${food.food_name_da}" (score: ${score.toFixed(3)})`)
      }
    }

    if (bestMatch) {
      console.log(`🎯 Final best match: "${bestMatch.name}" (score: ${bestMatch.score.toFixed(3)})`)
    } else {
      console.log(`🎯 No match found for "${ingredientName}" (best score was ${bestScore.toFixed(3)})`)
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
      console.log(`🎯 Using manual match for "${ingredientName}" → "${manualMatch.name}"`)
      // Use the nutritionalInfo directly from manual match
      if (manualMatch.nutritionalInfo) {
        this.ingredientCache.set(ingredientName, manualMatch.nutritionalInfo)
        return {
          nutrition: manualMatch.nutritionalInfo,
          match: manualMatch.name,
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
   * Match direkte via gemt Frida-id (fx "frida-1234" eller "1234")
   */
  public async matchByFridaIngredientId(
    fridaIngredientId: string | number
  ): Promise<{ nutrition: NutritionalInfo | null; match: string | null; score: number }> {
    const raw = String(fridaIngredientId || '').trim()
    const foodId = parseInt(raw.replace(/^frida-/i, ''), 10)
    if (!Number.isFinite(foodId)) {
      return { nutrition: null, match: null, score: 0 }
    }

    const cacheKey = `frida-id:${foodId}`
    if (this.ingredientCache.has(cacheKey)) {
      return {
        nutrition: this.ingredientCache.get(cacheKey)!,
        match: raw,
        score: 1.0,
      }
    }

    const nutrition = await this.getNutritionalInfo(foodId)
    if (!nutrition) {
      return { nutrition: null, match: null, score: 0 }
    }

    this.ingredientCache.set(cacheKey, nutrition)
    return {
      nutrition,
      match: raw,
      score: 1.0,
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
        const scaleFactor = await this.getScaleFactor(ingredient.name, ingredient.amount, ingredient.unit)
        
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
  private async getScaleFactor(ingredientName: string, targetAmount: number, targetUnit: string): Promise<number> {
    try {
      console.log(`⚖️ Getting scale factor for: ${ingredientName} (${targetAmount} ${targetUnit})`)
      
      // Use singleton Supabase client
      const { data, error } = await supabase
        .from('frida_ingredients')
        .select('*')
        .ilike('name', `%${ingredientName}%`)
        .limit(1)
        .single()
      
      if (error || !data) {
        console.log(`❌ No scale factor found for: ${ingredientName}`)
        return 1.0
      }
      
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
        'spsk': 13, // Tablespoon (mere præcis dansk mål)
        'tesk': 4,  // Teaspoon (mere præcis dansk mål)
        'tsk': 4,   // Teaspoon (mere præcis dansk mål)
        'dl': 100,  // Deciliter
        'l': 1000,  // Liter
        'ml': 1     // Milliliter
      }
      
      const gramsPerUnit = conversions[targetUnit.toLowerCase()] || 80 // Default to 80g per piece/unknown to avoid overcounting
      const totalGrams = targetAmount * gramsPerUnit
      
      return totalGrams / 100 // Convert to per 100g basis
    } catch (error) {
      console.error(`❌ Error getting scale factor for ${ingredientName}:`, error)
      return 1.0
    }
  }
}