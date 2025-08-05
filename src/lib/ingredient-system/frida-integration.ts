import { IngredientTag, IngredientCategory, NutritionalInfo, VitaminInfo, MineralInfo } from './types'

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
        console.log(`📋 Using cached data for ${ingredientName}`)
        return this.cache.get(ingredientName)
      }

      console.log(`🔍 Searching Frida API for: ${ingredientName}`)
      
      // For now, use mock data since Frida API seems unavailable
      const mockData = this.getMockFridaData(ingredientName)
      if (mockData) {
        console.log(`✅ Found mock data for ${ingredientName}:`, mockData)
        this.cache.set(ingredientName, mockData)
        return mockData
      }
      
      console.log(`❌ No mock data found for ${ingredientName}`)
      return null
      
    } catch (error) {
      console.error(`❌ Error searching Frida for ${ingredientName}:`, error)
      return null
    }
  }

  /**
   * Get mock Frida data for testing
   */
  private getMockFridaData(ingredientName: string): any | null {
    const name = ingredientName.toLowerCase()
    
    const mockData: Record<string, any> = {
      'kyllingebryst': {
        name: 'Kyllingebryst',
        description: 'Kyllingebryst, rå',
        nutrients: {
          energy_kcal: 165,
          protein: 31.0,
          carbohydrates: 0.0,
          fat: 3.6,
          fiber: 0.0,
          sugar: 0.0,
          sodium: 74,
          'Vitamin B-6': 0.6,
          'Vitamin B-12': 0.3,
          'Niacin': 13.7,
          'Selenium': 22.0,
          'Phosphorus': 200.0
        }
      },
      'laks': {
        name: 'Laks',
        description: 'Laks, rå',
        nutrients: {
          energy_kcal: 208,
          protein: 25.0,
          carbohydrates: 0.0,
          fat: 12.0,
          fiber: 0.0,
          sugar: 0.0,
          sodium: 59,
          'Vitamin D': 11.0,
          'Vitamin B-12': 3.2,
          'Vitamin B-6': 0.9,
          'Selenium': 36.0,
          'Phosphorus': 240.0
        }
      },
      'mælk': {
        name: 'Mælk',
        description: 'Komælk, 3,5% fedt',
        nutrients: {
          energy_kcal: 64,
          protein: 3.4,
          carbohydrates: 4.8,
          fat: 3.5,
          fiber: 0.0,
          sugar: 4.8,
          sodium: 44,
          'Vitamin A': 46.0,
          'Vitamin D': 1.2,
          'Vitamin B-12': 0.4,
          'Calcium': 113.0,
          'Phosphorus': 93.0
        }
      },
      'mandler': {
        name: 'Mandler',
        description: 'Mandler, rå',
        nutrients: {
          energy_kcal: 579,
          protein: 21.2,
          carbohydrates: 21.7,
          fat: 49.9,
          fiber: 12.5,
          sugar: 4.8,
          sodium: 1,
          'Vitamin E': 25.6,
          'Vitamin B-2': 1.1,
          'Magnesium': 270.0,
          'Phosphorus': 481.0,
          'Manganese': 2.2
        }
      },
      'broccoli': {
        name: 'Broccoli',
        description: 'Broccoli, rå',
        nutrients: {
          energy_kcal: 34,
          protein: 2.8,
          carbohydrates: 7.0,
          fat: 0.4,
          fiber: 2.6,
          sugar: 1.5,
          sodium: 33,
          'Vitamin C': 89.2,
          'Vitamin K': 101.6,
          'Vitamin A': 623.0,
          'Folate': 63.0,
          'Iron': 0.7
        }
      },
      'olivenolie': {
        name: 'Olivenolie',
        description: 'Olivenolie, ekstra virgin',
        nutrients: {
          energy_kcal: 884,
          protein: 0.0,
          carbohydrates: 0.0,
          fat: 100.0,
          fiber: 0.0,
          sugar: 0.0,
          sodium: 2,
          'Vitamin E': 14.3,
          'Vitamin K': 60.2
        }
      }
    }
    
    // Try exact match first
    if (mockData[ingredientName]) {
      return mockData[ingredientName]
    }
    
    // Try partial matches
    for (const [key, data] of Object.entries(mockData)) {
      if (name.includes(key) || key.includes(name)) {
        return data
      }
    }
    
    return null
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
   * Extract vitamins from Frida nutrient data
   */
  private extractVitamins(nutrients: any): VitaminInfo[] {
    const vitamins: VitaminInfo[] = []
    
    const vitaminMapping: Record<string, string> = {
      'Vitamin A': 'A',
      'Vitamin D': 'D', 
      'Vitamin E': 'E',
      'Vitamin K': 'K',
      'Vitamin C': 'C',
      'Thiamin': 'B1',
      'Riboflavin': 'B2',
      'Niacin': 'B3',
      'Vitamin B-6': 'B6',
      'Folate': 'B9',
      'Vitamin B-12': 'B12',
      'Pantothenic acid': 'B5',
      'Biotin': 'B7'
    }
    
    for (const [nutrientName, value] of Object.entries(nutrients)) {
      if (vitaminMapping[nutrientName] && typeof value === 'number') {
        vitamins.push({
          vitamin: vitaminMapping[nutrientName],
          amountPer100g: value,
          unit: 'mg'
        })
      }
    }
    
    return vitamins
  }
  
  /**
   * Extract minerals from Frida nutrient data
   */
  private extractMinerals(nutrients: any): MineralInfo[] {
    const minerals: MineralInfo[] = []
    
    const mineralMapping: Record<string, string> = {
      'Calcium': 'Calcium',
      'Iron': 'Jern',
      'Magnesium': 'Magnesium',
      'Phosphorus': 'Fosfor',
      'Potassium': 'Kalium',
      'Sodium': 'Natrium',
      'Zinc': 'Zink',
      'Copper': 'Kobber',
      'Manganese': 'Mangan',
      'Selenium': 'Selen',
      'Iodine': 'Jod',
      'Chromium': 'Krom',
      'Molybdenum': 'Molybdæn'
    }
    
    for (const [nutrientName, value] of Object.entries(nutrients)) {
      if (mineralMapping[nutrientName] && typeof value === 'number') {
        minerals.push({
          mineral: mineralMapping[nutrientName],
          amountPer100g: value,
          unit: 'mg'
        })
      }
    }
    
    return minerals
  }

  /**
   * Determine ingredient category based on name and Frida data
   */
  determineIngredientCategory(ingredientName: string, fridaData: any): IngredientCategory {
    const name = ingredientName.toLowerCase()
    
    // Protein sources
    if (name.includes('kylling') || name.includes('høne') || name.includes('kalkun') ||
        name.includes('and') || name.includes('gås') || name.includes('fasan')) {
      return IngredientCategory.Protein
    }
    if (name.includes('svin') || name.includes('flæsk') || name.includes('hakket') ||
        name.includes('pølse') || name.includes('skinke') || name.includes('bacon')) {
      return IngredientCategory.Protein
    }
    if (name.includes('okse') || name.includes('kalv') || name.includes('lam') ||
        name.includes('hakket') || name.includes('bøf') || name.includes('steak')) {
      return IngredientCategory.Protein
    }
    if (name.includes('fisk') || name.includes('laks') || name.includes('torsk') ||
        name.includes('makrel') || name.includes('sild') || name.includes('rødspætte') ||
        name.includes('hornfisk') || name.includes('ørred') || name.includes('ørred')) {
      return IngredientCategory.Protein
    }
    if (name.includes('æg') || name.includes('egg')) {
      return IngredientCategory.Protein
    }
    
    // Vegetables
    if (name.includes('broccoli') || name.includes('blomkål') || name.includes('kål') ||
        name.includes('spinat') || name.includes('salat') || name.includes('agurk') ||
        name.includes('tomat') || name.includes('peber') || name.includes('løg') ||
        name.includes('hvidløg') || name.includes('gulerod') || name.includes('selleri') ||
        name.includes('asparges') || name.includes('artiskok') || name.includes('aubergine') ||
        name.includes('squash') || name.includes('zucchini') || name.includes('bønne') ||
        name.includes('ærter') || name.includes('majs')) {
      return IngredientCategory.Groent
    }
    
    // Fruits
    if (name.includes('æble') || name.includes('banan') || name.includes('pære') ||
        name.includes('appelsin') || name.includes('citron') || name.includes('lime') ||
        name.includes('druer') || name.includes('jordbær') || name.includes('hindbær') ||
        name.includes('blåbær') || name.includes('kirsebær') || name.includes('fersken') ||
        name.includes('abrikos') || name.includes('mango') || name.includes('ananas') ||
        name.includes('kiwi') || name.includes('granatæble') || name.includes('figen')) {
      return IngredientCategory.Frugt
    }
    
    // Grains
    if (name.includes('ris') || name.includes('pasta') || name.includes('havregryn') ||
        name.includes('rug') || name.includes('hvede') || name.includes('byg') ||
        name.includes('majs') || name.includes('quinoa') || name.includes('buckwheat') ||
        name.includes('bulgur') || name.includes('couscous') || name.includes('polenta')) {
      return IngredientCategory.Korn
    }
    
    // Dairy
    if (name.includes('mælk') || name.includes('fløde') || name.includes('ost') ||
        name.includes('yoghurt') || name.includes('smør') || name.includes('creme') ||
        name.includes('kærnemælk') || name.includes('kefir') || name.includes('quark')) {
      return IngredientCategory.Mejeri
    }
    
    // Fats and Oils
    if (name.includes('olie') || name.includes('oliven') || name.includes('kokos') ||
        name.includes('raps') || name.includes('solskin') || name.includes('sesam') ||
        name.includes('nødde') || name.includes('avocado') || name.includes('margarine')) {
      return IngredientCategory.Fedt
    }
    
    // Spices
    if (name.includes('peber') || name.includes('salt') || name.includes('kardemomme') ||
        name.includes('kanel') || name.includes('muskat') || name.includes('kurkuma') ||
        name.includes('ingefær') || name.includes('chili') || name.includes('paprika') ||
        name.includes('oregano') || name.includes('basilikum') || name.includes('timian') ||
        name.includes('rosmarin') || name.includes('salvie') || name.includes('løvstikke')) {
      return IngredientCategory.Krydderi
    }
    
    // Herbs
    if (name.includes('persille') || name.includes('dild') || name.includes('karse') ||
        name.includes('mynte') || name.includes('citronmelisse') || name.includes('kamille')) {
      return IngredientCategory.Urter
    }
    
    // Nuts and Seeds
    if (name.includes('mandel') || name.includes('valnød') || name.includes('cashew') ||
        name.includes('pistacie') || name.includes('hasselnød') || name.includes('pekan') ||
        name.includes('macadamia') || name.includes('paranød') || name.includes('kastanje')) {
      return IngredientCategory.Nodder
    }
    if (name.includes('frø') || name.includes('solsikke') || name.includes('pumpkin') ||
        name.includes('chia') || name.includes('hamp') || name.includes('sesam') ||
        name.includes('lin') || name.includes('poppy')) {
      return IngredientCategory.Fro
    }
    
    // Legumes
    if (name.includes('bønne') || name.includes('linser') || name.includes('kikærter') ||
        name.includes('ærter') || name.includes('soja') || name.includes('edamame')) {
      return IngredientCategory.Balg
    }
    
    // Sweeteners
    if (name.includes('sukker') || name.includes('honning') || name.includes('sirap') ||
        name.includes('agave') || name.includes('stevia') || name.includes('aspartam') ||
        name.includes('saccharin') || name.includes('xylitol') || name.includes('erythritol')) {
      return IngredientCategory.Soedstof
    }
    
    // Beverages
    if (name.includes('vand') || name.includes('juice') || name.includes('saft') ||
        name.includes('te') || name.includes('kaffe') || name.includes('kakao') ||
        name.includes('smoothie') || name.includes('shake')) {
      return IngredientCategory.Drikke
    }
    
    // Default to other if no match
    return IngredientCategory.Andre
  }

  /**
   * Determine exclusions and allergens based on ingredient name and category
   */
  determineExclusionsAndAllergens(ingredientName: string, category: IngredientCategory): { exclusions: string[], allergens: string[] } {
    const name = ingredientName.toLowerCase()
    const exclusions: string[] = []
    const allergens: string[] = []
    
    // Pork exclusions
    if (name.includes('svin') || name.includes('flæsk') || name.includes('hakket') ||
        name.includes('pølse') || name.includes('skinke') || name.includes('bacon') ||
        name.includes('svinemørbrad') || name.includes('svinesteg')) {
      exclusions.push('svinekød')
    }
    
    // Dairy exclusions and allergens
    if (name.includes('mælk') || name.includes('fløde') || name.includes('ost') ||
        name.includes('yoghurt') || name.includes('smør') || name.includes('creme') ||
        name.includes('kærnemælk') || name.includes('kefir') || name.includes('quark')) {
      exclusions.push('mejeri')
      allergens.push('mælk')
    }
    
    // Fish allergens
    if (name.includes('fisk') || name.includes('laks') || name.includes('torsk') ||
        name.includes('makrel') || name.includes('sild') || name.includes('rødspætte') ||
        name.includes('hornfisk') || name.includes('ørred')) {
      allergens.push('fisk')
    }
    
    // Nut allergens and exclusions
    if (name.includes('mandel') || name.includes('valnød') || name.includes('cashew') ||
        name.includes('pistacie') || name.includes('hasselnød') || name.includes('pekan') ||
        name.includes('macadamia') || name.includes('paranød') || name.includes('kastanje')) {
      exclusions.push('nødder')
      allergens.push('nødder')
    }
    
    // Gluten exclusions
    if (name.includes('hvede') || name.includes('rug') || name.includes('byg') ||
        name.includes('havre') || name.includes('spelt') || name.includes('kamut')) {
      exclusions.push('gluten')
      allergens.push('gluten')
    }
    
    // Egg allergens
    if (name.includes('æg') || name.includes('egg')) {
      allergens.push('æg')
    }
    
    // Soy allergens
    if (name.includes('soja') || name.includes('edamame') || name.includes('tofu')) {
      exclusions.push('soja')
      allergens.push('soja')
    }
    
    // Shellfish allergens
    if (name.includes('reje') || name.includes('krabbe') || name.includes('hummer') ||
        name.includes('musling') || name.includes('østers')) {
      allergens.push('skaldyr')
    }
    
    // Sulfite allergens
    if (name.includes('vin') || name.includes('øl') || name.includes('druer')) {
      allergens.push('sulfitter')
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