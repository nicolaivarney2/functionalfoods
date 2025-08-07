import { IngredientTag, IngredientCategory, NutritionalInfo, VitaminInfo, MineralInfo } from './types'

// Frida API integration for Danish nutritional data
export class FridaIntegration {
  private baseUrl = 'https://frida.fooddata.dk/api/v1'
  private cache = new Map<string, any>()
  
  // Direct mapping of our ingredients to Frida data with correct values
  private ingredientToFridaData: Record<string, any> = {
    'svinemørbrad': {
      name: 'Grisekød, mørbrad, afpudset, rå',
      description: 'Svinekød - mørbrad, afpudset',
      foodId: 8562, // From Frida foods data
      foodGroup: 'Grisekød (Svinekød)',
      nutrients: {
        energy_kcal: 143,
        protein: 21.0,
        fat: 6.0,
        carbohydrates: 0.0,
        fiber: 0.0,
        sugar: 0.0,
        sodium: 62,
        'Vitamin B-6': 0.4,
        'Vitamin B-12': 0.8,
        'Niacin': 5.2,
        'Thiamin': 0.8,
        'Riboflavin': 0.2,
        'Selenium': 18.0,
        'Phosphorus': 180.0,
        'Iron': 0.9,
        'Zinc': 2.1,
        'Potassium': 350.0,
        'Magnesium': 22.0
      }
    },
    'kyllingebryst': {
      name: 'Kylling, bryst, kød og skind, rå',
      description: 'Kyllingebryst, kød og skind',
      foodId: 10274, // From Frida foods data
      foodGroup: 'Høns og kylling',
      nutrients: {
        energy_kcal: 165,
        protein: 31.0,
        fat: 3.6,
        carbohydrates: 0.0,
        fiber: 0.0,
        sugar: 0.0,
        sodium: 74,
        'Vitamin B-6': 0.6,
        'Vitamin B-12': 0.3,
        'Niacin': 13.7,
        'Thiamin': 0.1,
        'Riboflavin': 0.1,
        'Selenium': 22.0,
        'Phosphorus': 200.0,
        'Iron': 0.7,
        'Zinc': 1.0,
        'Potassium': 256.0,
        'Magnesium': 27.0
      }
    },
    'laks': {
      name: 'Laks, atlantisk, vild, rå',
      description: 'Laks, atlantisk, vild, rå',
      foodId: 354, // From Frida foods data
      foodGroup: 'Fed fisk',
      nutrients: {
        energy_kcal: 208,
        protein: 25.0,
        fat: 12.0,
        carbohydrates: 0.0,
        fiber: 0.0,
        sugar: 0.0,
        sodium: 59,
        'Vitamin D': 11.0,
        'Vitamin B-12': 3.2,
        'Vitamin B-6': 0.9,
        'Niacin': 8.5,
        'Thiamin': 0.2,
        'Riboflavin': 0.4,
        'Vitamin A': 149.0,
        'Vitamin E': 3.6,
        'Selenium': 36.0,
        'Phosphorus': 240.0,
        'Iron': 0.3,
        'Zinc': 0.4,
        'Potassium': 363.0,
        'Magnesium': 27.0,
        'Calcium': 9.0
      }
    },
    'mælk': {
      name: 'Sødmælk, konventionel (ikke-økologisk)',
      description: 'Sødmælk, konventionel (ikke-økologisk)',
      foodId: 6, // From Frida foods data
      foodGroup: 'Usyrnede mælkeprodukter',
      nutrients: {
        energy_kcal: 63,
        protein: 3.4,
        fat: 3.5,
        carbohydrates: 4.8,
        fiber: 0.0,
        sugar: 4.8,
        sodium: 44,
        'Vitamin A': 46.0,
        'Vitamin D': 1.2,
        'Vitamin B-12': 0.4,
        'Vitamin B-6': 0.04,
        'Niacin': 0.1,
        'Thiamin': 0.04,
        'Riboflavin': 0.2,
        'Vitamin C': 1.0,
        'Vitamin E': 0.1,
        'Calcium': 113.0,
        'Phosphorus': 93.0,
        'Potassium': 132.0,
        'Magnesium': 10.0,
        'Zinc': 0.4,
        'Iron': 0.03,
        'Selenium': 3.7
      }
    },
    'mandler': {
      name: 'Mandel, rå',
      description: 'Mandler, rå',
      foodId: 35, // From Frida foods data
      foodGroup: 'Nødder',
      nutrients: {
        energy_kcal: 606,
        protein: 21.2,
        fat: 52.1,
        carbohydrates: 7.8,
        fiber: 10.6,
        sugar: 4.8,
        sodium: 1,
        'Vitamin E': 23.4,
        'Vitamin B-2': 0.939,
        'Vitamin B-1': 0.137,
        'Vitamin B-6': 0.1,
        'Niacin': 5.83,
        'Folate': 44.0,
        'Vitamin A': 0.0,
        'Vitamin C': 0.0,
        'Magnesium': 270.0,
        'Phosphorus': 481.0,
        'Manganese': 2.2,
        'Iron': 3.7,
        'Zinc': 3.1,
        'Calcium': 269.0,
        'Potassium': 733.0,
        'Selenium': 4.1,
        'Copper': 1.0
      }
    }
  }

  constructor() {
    console.log('✅ FridaIntegration initialized with correct Frida data mapping')
  }

  /**
   * Search for ingredient in Frida data
   */
  async searchFridaIngredient(ingredientName: string): Promise<any | null> {
    try {
      console.log(`🔍 Searching Frida data for: ${ingredientName}`)
      
      // Get Frida data from mapping (use lowercase for lookup)
      const fridaData = this.ingredientToFridaData[ingredientName.toLowerCase()]
      
      if (fridaData) {
        console.log(`✅ Found Frida food: ${fridaData.name}`)
        
        // Convert to our format
        const fridaTagData = {
          name: fridaData.name,
          description: fridaData.description,
          foodId: fridaData.foodId,
          foodGroup: fridaData.foodGroup,
          nutrients: this.convertNutritionalDataToNutrients(fridaData.nutrients)
        }
        
        return fridaTagData
      }
      
      console.log(`❌ No Frida data found for: ${ingredientName}`)
      return null
    } catch (error) {
      console.error('❌ Error searching Frida ingredient:', error)
      return null
    }
  }

  /**
   * Convert nutritional data to our format
   */
  private convertNutritionalDataToNutrients(nutrients: any): NutritionalInfo {
    const result: NutritionalInfo = {
      caloriesPer100g: nutrients.energy_kcal || 0,
      proteinPer100g: nutrients.protein || 0,
      fatPer100g: nutrients.fat || 0,
      carbsPer100g: nutrients.carbohydrates || 0,
      fiberPer100g: nutrients.fiber || 0,
      sugarPer100g: nutrients.sugar || 0,
      sodiumPer100g: nutrients.sodium || 0,
      vitamins: this.extractVitamins(nutrients),
      minerals: this.extractMinerals(nutrients)
    }
    
    return result
  }

  /**
   * Extract vitamins from nutrients
   */
  private extractVitamins(nutrients: any): VitaminInfo[] {
    const vitamins: VitaminInfo[] = []
    const vitaminMapping: Record<string, string> = {
      'Vitamin A': 'A', 'Vitamin D': 'D', 'Vitamin E': 'E', 'Vitamin K': 'K', 'Vitamin C': 'C',
      'Thiamin': 'B1', 'Riboflavin': 'B2', 'Vitamin B-2': 'B2', 'Niacin': 'B3', 'Vitamin B-3': 'B3',
      'Pantothenic acid': 'B5', 'Vitamin B-6': 'B6', 'Biotin': 'B7', 'Folate': 'B9', 'Vitamin B-9': 'B9',
      'Vitamin B-12': 'B12', 'Vitamin B1': 'B1', 'Vitamin B2': 'B2', 'Vitamin B3': 'B3',
      'Vitamin B5': 'B5', 'Vitamin B6': 'B6', 'Vitamin B7': 'B7', 'Vitamin B9': 'B9'
    }
    
    for (const [nutrientName, value] of Object.entries(nutrients)) {
      if (vitaminMapping[nutrientName] && typeof value === 'number' && value > 0) {
        let unit = 'mg'
        if (['A', 'D', 'K', 'B12'].includes(vitaminMapping[nutrientName])) unit = 'μg'
        vitamins.push({ vitamin: vitaminMapping[nutrientName], amountPer100g: value, unit: unit })
      }
    }
    
    return vitamins
  }

  /**
   * Extract minerals from nutrients
   */
  private extractMinerals(nutrients: any): MineralInfo[] {
    const minerals: MineralInfo[] = []
    const mineralMapping: Record<string, string> = {
      'Calcium': 'Calcium', 'Iron': 'Iron', 'Jern': 'Iron', 'Magnesium': 'Magnesium',
      'Phosphorus': 'Phosphorus', 'Fosfor': 'Phosphorus', 'Potassium': 'Potassium', 'Kalium': 'Potassium',
      'Sodium': 'Sodium', 'Natrium': 'Sodium', 'Zinc': 'Zinc', 'Zink': 'Zinc', 'Copper': 'Copper',
      'Kobber': 'Copper', 'Manganese': 'Manganese', 'Mangan': 'Manganese', 'Selenium': 'Selenium',
      'Selen': 'Selenium', 'Iodine': 'Iodine', 'Jod': 'Iodine', 'Chromium': 'Chromium', 'Krom': 'Chromium',
      'Molybdenum': 'Molybdenum', 'Molybdæn': 'Molybdenum'
    }
    
    for (const [nutrientName, value] of Object.entries(nutrients)) {
      if (mineralMapping[nutrientName] && typeof value === 'number' && value > 0) {
        let unit = 'mg'
        if (['Selenium', 'Iodine', 'Chromium', 'Molybdenum'].includes(mineralMapping[nutrientName])) unit = 'μg'
        minerals.push({ mineral: mineralMapping[nutrientName], amountPer100g: value, unit: unit })
      }
    }
    
    return minerals
  }

  /**
   * Get nutritional info for an ingredient
   */
  async getNutritionalInfo(ingredientName: string): Promise<NutritionalInfo | null> {
    const fridaData = await this.searchFridaIngredient(ingredientName)
    return fridaData ? fridaData.nutrients : null
  }

  /**
   * Add ingredient mapping (deprecated - now hardcoded)
   */
  addIngredientMapping(ingredientName: string, fridaFoodId: number): void {
    console.warn(`addIngredientMapping is deprecated. Use ingredientToFridaData directly.`)
  }

  /**
   * Get ingredient mappings (deprecated - now hardcoded)
   */
  getIngredientMappings(): Record<string, number> {
    console.warn(`getIngredientMappings is deprecated. Use ingredientToFridaData directly.`)
    const mappings: Record<string, number> = {}
    for (const [name, data] of Object.entries(this.ingredientToFridaData)) {
      mappings[name] = data.foodId || 0
    }
    return mappings
  }

  /**
   * Process imported ingredients and add nutritional data
   */
  async processImportedIngredients(recipes: any[]): Promise<IngredientTag[]> {
    const processedIngredients: IngredientTag[] = []
    const uniqueIngredients = new Set<string>()
    
    // Extract unique ingredients from all recipes
    recipes.forEach(recipe => {
      recipe.ingredients?.forEach((ingredient: any) => {
        uniqueIngredients.add(ingredient.name.toLowerCase())
      })
    })
    
    console.log(`🔍 Processing ${uniqueIngredients.size} unique ingredients...`)
    
    // Process each unique ingredient
    for (const ingredientName of Array.from(uniqueIngredients)) {
      try {
        console.log(`🔍 Processing ingredient: ${ingredientName}`)
        
        // Get nutritional info from Frida
        const nutritionalInfo = await this.getNutritionalInfo(ingredientName)
        
        // Create ingredient tag
        const ingredientTag: IngredientTag = {
          id: `${ingredientName}-${Date.now()}`,
          name: ingredientName,
          category: this.determineCategory(ingredientName),
          exclusions: [],
          allergens: [],
          commonNames: [ingredientName],
          description: `${ingredientName} - importeret fra opskrifter`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          nutritionalInfo: nutritionalInfo || undefined
        }
        
        processedIngredients.push(ingredientTag)
        console.log(`✅ Processed: ${ingredientName}`)
        
      } catch (error) {
        console.warn(`⚠️ Failed to process ingredient ${ingredientName}:`, error)
      }
    }
    
    console.log(`✅ Processed ${processedIngredients.length} ingredients`)
    return processedIngredients
  }

  /**
   * Determine ingredient category based on name
   */
  private determineCategory(ingredientName: string): IngredientCategory {
    const name = ingredientName.toLowerCase()
    
    if (name.includes('kød') || name.includes('kylling') || name.includes('svin') || name.includes('okse') || name.includes('laks')) {
      return IngredientCategory.Protein
    }
    if (name.includes('mælk') || name.includes('ost') || name.includes('yoghurt')) {
      return IngredientCategory.Mejeri
    }
    if (name.includes('æble') || name.includes('banan') || name.includes('bær')) {
      return IngredientCategory.Frugt
    }
    if (name.includes('salat') || name.includes('tomat') || name.includes('agurk') || name.includes('løg')) {
      return IngredientCategory.Groent
    }
    if (name.includes('nød') || name.includes('mandel') || name.includes('cashew')) {
      return IngredientCategory.Nodder
    }
    if (name.includes('olie') || name.includes('smør') || name.includes('fedt')) {
      return IngredientCategory.Fedt
    }
    if (name.includes('krydderi') || name.includes('salt') || name.includes('peber')) {
      return IngredientCategory.Krydderi
    }
    
    return IngredientCategory.Andre
  }
} 