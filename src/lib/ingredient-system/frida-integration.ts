import { IngredientTag, IngredientCategory, NutritionalInfo, VitaminInfo, MineralInfo } from './types'

// Frida API integration for Danish nutritional data
export class FridaIntegration {
  private baseUrl = 'https://frida.fooddata.dk/api/v1'
  private cache = new Map<string, any>()
  private fridaFoods: any[] = []
  private fridaNutritionalData: any[] = []

  constructor() {
    this.loadFridaData()
  }

  /**
   * Load Frida data from JSON files
   */
  private async loadFridaData() {
    try {
      // In a real implementation, these would be loaded from the JSON files
      // For now, we'll use a subset of the data
      this.fridaFoods = [
        {
          FoodID: 682,
          FødevareNavn: "Kråse, kylling, rå",
          FoodName: "Chicken, breast, raw",
          FoodGroupID: 1,
          FødevareGruppe: "Kød og kødprodukter"
        },
        {
          FoodID: 30,
          FødevareNavn: "Laks, atlantisk, vild, rå",
          FoodName: "Salmon, atlantic, wild, raw",
          FoodGroupID: 2,
          FødevareGruppe: "Fisk og skaldyr"
        },
        {
          FoodID: 6,
          FødevareNavn: "Sødmælk, konventionel (ikke-økologisk)",
          FoodName: "Milk, whole, conventional (not organic), 3.5 % fat",
          FoodGroupID: 3,
          FødevareGruppe: "Mejeri"
        }
      ]

      // Sample nutritional data for these foods
      this.fridaNutritionalData = [
        // Kyllingebryst data
        { FoodID: 682, ParameterNavn: "Energi (kcal)", ResVal: 165 },
        { FoodID: 682, ParameterNavn: "Protein", ResVal: 31.0 },
        { FoodID: 682, ParameterNavn: "Fedt", ResVal: 3.6 },
        { FoodID: 682, ParameterNavn: "Tilgængelig kulhydrat", ResVal: 0.0 },
        { FoodID: 682, ParameterNavn: "Kostfibre", ResVal: 0.0 },
        { FoodID: 682, ParameterNavn: "B6-vitamin", ResVal: 0.6 },
        { FoodID: 682, ParameterNavn: "B12-vitamin", ResVal: 0.3 },
        { FoodID: 682, ParameterNavn: "Niacin", ResVal: 13.7 },
        { FoodID: 682, ParameterNavn: "Selen", ResVal: 22.0 },
        { FoodID: 682, ParameterNavn: "Fosfor", ResVal: 200.0 },
        
        // Laks data
        { FoodID: 30, ParameterNavn: "Energi (kcal)", ResVal: 208 },
        { FoodID: 30, ParameterNavn: "Protein", ResVal: 25.0 },
        { FoodID: 30, ParameterNavn: "Fedt", ResVal: 12.0 },
        { FoodID: 30, ParameterNavn: "Tilgængelig kulhydrat", ResVal: 0.0 },
        { FoodID: 30, ParameterNavn: "Kostfibre", ResVal: 0.0 },
        { FoodID: 30, ParameterNavn: "D-vitamin", ResVal: 11.0 },
        { FoodID: 30, ParameterNavn: "B12-vitamin", ResVal: 3.2 },
        { FoodID: 30, ParameterNavn: "B6-vitamin", ResVal: 0.9 },
        { FoodID: 30, ParameterNavn: "Selen", ResVal: 36.0 },
        { FoodID: 30, ParameterNavn: "Fosfor", ResVal: 240.0 },
        
        // Mælk data
        { FoodID: 6, ParameterNavn: "Energi (kcal)", ResVal: 64 },
        { FoodID: 6, ParameterNavn: "Protein", ResVal: 3.4 },
        { FoodID: 6, ParameterNavn: "Fedt", ResVal: 3.5 },
        { FoodID: 6, ParameterNavn: "Tilgængelig kulhydrat", ResVal: 4.8 },
        { FoodID: 6, ParameterNavn: "Kostfibre", ResVal: 0.0 },
        { FoodID: 6, ParameterNavn: "A-vitamin", ResVal: 46.0 },
        { FoodID: 6, ParameterNavn: "D-vitamin", ResVal: 1.2 },
        { FoodID: 6, ParameterNavn: "B12-vitamin", ResVal: 0.4 },
        { FoodID: 6, ParameterNavn: "Calcium", ResVal: 113.0 },
        { FoodID: 6, ParameterNavn: "Fosfor", ResVal: 93.0 }
      ]

      console.log(`✅ Loaded ${this.fridaFoods.length} Frida foods and ${this.fridaNutritionalData.length} nutritional entries`)
    } catch (error) {
      console.error('❌ Error loading Frida data:', error)
    }
  }

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

      console.log(`🔍 Searching Frida data for: ${ingredientName}`)
      
      // Search in Frida foods
      const matchingFood = this.fridaFoods.find(food => 
        food.FødevareNavn.toLowerCase().includes(ingredientName.toLowerCase()) ||
        food.FoodName.toLowerCase().includes(ingredientName.toLowerCase())
      )
      
      if (matchingFood) {
        console.log(`✅ Found Frida food: ${matchingFood.FødevareNavn}`)
        
        // Get nutritional data for this food
        const nutritionalData = this.fridaNutritionalData.filter(data => 
          data.FoodID === matchingFood.FoodID
        )
        
        // Convert to our format
        const fridaData = {
          name: matchingFood.FødevareNavn,
          description: matchingFood.FoodName,
          foodId: matchingFood.FoodID,
          foodGroup: matchingFood.FødevareGruppe,
          nutrients: this.convertNutritionalDataToNutrients(nutritionalData)
        }
        
        this.cache.set(ingredientName, fridaData)
        return fridaData
      }
      
      console.log(`❌ No Frida data found for ${ingredientName}`)
      return null
      
    } catch (error) {
      console.error(`❌ Error searching Frida for ${ingredientName}:`, error)
      return null
    }
  }

  /**
   * Convert Frida nutritional data to nutrients object
   */
  private convertNutritionalDataToNutrients(nutritionalData: any[]): any {
    const nutrients: any = {}
    
    nutritionalData.forEach(data => {
      const parameterName = data.ParameterNavn
      const value = data.ResVal
      
      // Map Frida parameters to our nutrient names
      switch (parameterName) {
        case 'Energi (kcal)':
          nutrients.energy_kcal = value
          break
        case 'Protein':
          nutrients.protein = value
          break
        case 'Fedt':
          nutrients.fat = value
          break
        case 'Tilgængelig kulhydrat':
          nutrients.carbohydrates = value
          break
        case 'Kostfibre':
          nutrients.fiber = value
          break
        case 'A-vitamin':
          nutrients['Vitamin A'] = value
          break
        case 'D-vitamin':
          nutrients['Vitamin D'] = value
          break
        case 'E-vitamin':
          nutrients['Vitamin E'] = value
          break
        case 'C-vitamin':
          nutrients['Vitamin C'] = value
          break
        case 'B6-vitamin':
          nutrients['Vitamin B-6'] = value
          break
        case 'B12-vitamin':
          nutrients['Vitamin B-12'] = value
          break
        case 'Niacin':
          nutrients['Niacin'] = value
          break
        case 'Calcium':
          nutrients['Calcium'] = value
          break
        case 'Fosfor':
          nutrients['Phosphorus'] = value
          break
        case 'Selen':
          nutrients['Selenium'] = value
          break
        case 'Jern':
          nutrients['Iron'] = value
          break
        case 'Zink':
          nutrients['Zinc'] = value
          break
        default:
          // Store other nutrients with their original names
          nutrients[parameterName] = value
      }
    })
    
    return nutrients
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