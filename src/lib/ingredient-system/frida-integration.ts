import { IngredientTag, IngredientCategory, NutritionalInfo } from './types'

// Frida API integration for Danish nutritional data
export class FridaIntegration {
  private baseUrl = 'https://frida.fooddata.dk/api/v1'
  private cache = new Map<string, any>()

  /**
   * Extract all unique ingredients from imported recipes
   */
  extractUniqueIngredients(recipes: any[]): string[] {
    const uniqueIngredients = new Set<string>()
    
    recipes.forEach(recipe => {
      recipe.ingredients?.forEach((ingredient: any) => {
        // Clean ingredient name
        const cleanName = this.cleanIngredientName(ingredient.name)
        if (cleanName) {
          uniqueIngredients.add(cleanName)
        }
      })
    })
    
    return Array.from(uniqueIngredients).sort()
  }

  /**
   * Clean ingredient name for better matching
   */
  private cleanIngredientName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\sæøå]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
  }

  /**
   * Search for ingredient in Frida database
   */
  async searchFridaIngredient(ingredientName: string): Promise<any | null> {
    try {
      // Check cache first
      if (this.cache.has(ingredientName)) {
        return this.cache.get(ingredientName)
      }

      // Search Frida API
      const response = await fetch(`${this.baseUrl}/foods/search?q=${encodeURIComponent(ingredientName)}&lang=da`)
      
      if (!response.ok) {
        console.warn(`Failed to fetch data for ${ingredientName}`)
        return null
      }

      const data = await response.json()
      
      if (data.foods && data.foods.length > 0) {
        // Get the best match
        const bestMatch = data.foods[0]
        this.cache.set(ingredientName, bestMatch)
        return bestMatch
      }

      return null
    } catch (error) {
      console.error(`Error searching Frida for ${ingredientName}:`, error)
      return null
    }
  }

  /**
   * Convert Frida data to our NutritionalInfo format
   */
  convertFridaToNutritionalInfo(fridaData: any): NutritionalInfo {
    const nutrients = fridaData.nutrients || {}
    
    return {
      caloriesPer100g: nutrients.energy_kcal || 0,
      proteinPer100g: nutrients.protein || 0,
      carbsPer100g: nutrients.carbohydrates || 0,
      fatPer100g: nutrients.fat || 0,
      fiberPer100g: nutrients.fiber || 0,
      sugarPer100g: nutrients.sugar || 0,
      sodiumPer100g: nutrients.sodium || 0,
      vitamins: this.extractVitamins(nutrients),
      minerals: this.extractMinerals(nutrients)
    }
  }

  /**
   * Extract vitamin information from Frida data
   */
  private extractVitamins(nutrients: any): any[] {
    const vitamins = []
    const vitaminMap: { [key: string]: string } = {
      'vitamin_a': 'Vitamin A',
      'vitamin_d': 'Vitamin D',
      'vitamin_e': 'Vitamin E',
      'vitamin_k': 'Vitamin K',
      'vitamin_c': 'Vitamin C',
      'vitamin_b1': 'Vitamin B1',
      'vitamin_b2': 'Vitamin B2',
      'vitamin_b3': 'Vitamin B3',
      'vitamin_b6': 'Vitamin B6',
      'vitamin_b12': 'Vitamin B12',
      'folate': 'Folate'
    }

    Object.entries(nutrients).forEach(([key, value]) => {
      if (vitaminMap[key] && value) {
        vitamins.push({
          vitamin: vitaminMap[key],
          amountPer100g: Number(value),
          unit: 'mg'
        })
      }
    })

    return vitamins
  }

  /**
   * Extract mineral information from Frida data
   */
  private extractMinerals(nutrients: any): any[] {
    const minerals = []
    const mineralMap: { [key: string]: string } = {
      'calcium': 'Calcium',
      'iron': 'Iron',
      'magnesium': 'Magnesium',
      'phosphorus': 'Phosphorus',
      'potassium': 'Potassium',
      'zinc': 'Zinc',
      'selenium': 'Selenium'
    }

    Object.entries(nutrients).forEach(([key, value]) => {
      if (mineralMap[key] && value) {
        minerals.push({
          mineral: mineralMap[key],
          amountPer100g: Number(value),
          unit: 'mg'
        })
      }
    })

    return minerals
  }

  /**
   * Determine ingredient category based on name and Frida data
   */
  determineIngredientCategory(ingredientName: string, fridaData?: any): IngredientCategory {
    const name = ingredientName.toLowerCase()
    
    // Protein sources
    if (name.includes('kylling') || name.includes('høne') || name.includes('kalkun') ||
        name.includes('laks') || name.includes('torsk') || name.includes('ørred') ||
        name.includes('æg') || name.includes('bønne') || name.includes('linser') ||
        name.includes('kød') || name.includes('hakket')) {
      return IngredientCategory.Protein
    }
    
    // Vegetables
    if (name.includes('broccoli') || name.includes('spinat') || name.includes('salat') ||
        name.includes('tomat') || name.includes('agurk') || name.includes('løg') ||
        name.includes('hvidløg') || name.includes('gulerod') || name.includes('kartoffel')) {
      return IngredientCategory.Vegetable
    }
    
    // Fruits
    if (name.includes('æble') || name.includes('banan') || name.includes('bær') ||
        name.includes('citron') || name.includes('lime') || name.includes('appelsin')) {
      return IngredientCategory.Fruit
    }
    
    // Dairy
    if (name.includes('mælk') || name.includes('ost') || name.includes('fløde') ||
        name.includes('yoghurt') || name.includes('smør')) {
      return IngredientCategory.Dairy
    }
    
    // Grains
    if (name.includes('havregryn') || name.includes('ris') || name.includes('quinoa') ||
        name.includes('pasta') || name.includes('brød')) {
      return IngredientCategory.Grain
    }
    
    // Nuts and seeds
    if (name.includes('mandel') || name.includes('nød') || name.includes('frø') ||
        name.includes('chia') || name.includes('pumpkinfrø')) {
      return IngredientCategory.Nut
    }
    
    // Fats and oils
    if (name.includes('olie') || name.includes('oliven') || name.includes('kokos')) {
      return IngredientCategory.Fat
    }
    
    // Spices and herbs
    if (name.includes('peber') || name.includes('salt') || name.includes('timian') ||
        name.includes('rosmarin') || name.includes('persille') || name.includes('dild')) {
      return IngredientCategory.Spice
    }
    
    return IngredientCategory.Other
  }

  /**
   * Determine exclusions and allergens based on ingredient
   */
  determineExclusionsAndAllergens(ingredientName: string, category: IngredientCategory): {
    exclusions: string[]
    allergens: string[]
  } {
    const name = ingredientName.toLowerCase()
    const exclusions: string[] = []
    const allergens: string[] = []

    // Pork exclusions
    if (name.includes('svin') || name.includes('flæsk') || name.includes('bacon')) {
      exclusions.push('pork')
    }

    // Dairy exclusions
    if (category === IngredientCategory.Dairy || 
        name.includes('mælk') || name.includes('ost') || name.includes('fløde')) {
      exclusions.push('dairy')
      allergens.push('milk')
    }

    // Nut exclusions
    if (category === IngredientCategory.Nut || name.includes('nød')) {
      exclusions.push('nuts')
      allergens.push('nuts')
    }

    // Fish allergens
    if (name.includes('laks') || name.includes('torsk') || name.includes('fisk')) {
      allergens.push('fish')
    }

    // Gluten exclusions
    if (name.includes('hvede') || name.includes('rug') || name.includes('byg')) {
      exclusions.push('gluten')
      allergens.push('gluten')
    }

    return { exclusions, allergens }
  }

  /**
   * Process all unique ingredients from imported recipes
   */
  async processImportedIngredients(recipes: any[]): Promise<IngredientTag[]> {
    const uniqueIngredients = this.extractUniqueIngredients(recipes)
    const processedIngredients: IngredientTag[] = []

    console.log(`Processing ${uniqueIngredients.length} unique ingredients...`)

    for (const ingredientName of uniqueIngredients) {
      try {
        // Search Frida database
        const fridaData = await this.searchFridaIngredient(ingredientName)
        
        // Determine category
        const category = this.determineIngredientCategory(ingredientName, fridaData)
        
        // Determine exclusions and allergens
        const { exclusions, allergens } = this.determineExclusionsAndAllergens(ingredientName, category)
        
        // Convert nutritional data
        const nutritionalInfo = fridaData ? this.convertFridaToNutritionalInfo(fridaData) : undefined
        
        // Create ingredient tag
        const ingredientTag: IngredientTag = {
          id: this.generateIngredientId(ingredientName),
          name: ingredientName,
          category,
          exclusions,
          allergens,
          commonNames: [ingredientName], // Can be expanded later
          description: fridaData?.description || '',
          nutritionalInfo,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }

        processedIngredients.push(ingredientTag)
        
        // Add delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`Error processing ingredient ${ingredientName}:`, error)
      }
    }

    console.log(`Successfully processed ${processedIngredients.length} ingredients`)
    return processedIngredients
  }

  /**
   * Generate unique ingredient ID
   */
  private generateIngredientId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
} 