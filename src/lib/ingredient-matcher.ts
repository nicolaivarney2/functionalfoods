import { databaseService } from './database-service'

export interface IngredientMatch {
  existingIngredient: any
  newIngredient: any
  confidence: number
  matchType: 'exact' | 'fuzzy' | 'none'
}

export class IngredientMatcher {
  private existingIngredients: any[] = []
  private ingredientCache: Map<string, any> = new Map()

  async initialize() {
    try {
      this.existingIngredients = await databaseService.getIngredients()
      
      this.ingredientCache.clear()
      this.existingIngredients.forEach(ingredient => {
        const normalizedName = this.normalizeName(ingredient.name)
        this.ingredientCache.set(normalizedName, ingredient)
      })
      
      console.log(`🔍 IngredientMatcher initialized with ${this.existingIngredients.length} existing ingredients`)
    } catch (error) {
      console.error('❌ Error initializing IngredientMatcher:', error)
    }
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ')
  }

  findExactMatch(ingredientName: string): any | null {
    const normalizedName = this.normalizeName(ingredientName)
    return this.ingredientCache.get(normalizedName) || null
  }

  async processIngredients(newIngredients: any[]): Promise<{
    newIngredients: any[]
    matchedIngredients: IngredientMatch[]
    skippedCount: number
  }> {
    const processedIngredients: any[] = []
    const matchedIngredients: IngredientMatch[] = []
    let skippedCount = 0

    for (const newIngredient of newIngredients) {
      const exactMatch = this.findExactMatch(newIngredient.name)
      
      if (exactMatch) {
        matchedIngredients.push({
          existingIngredient: exactMatch,
          newIngredient: newIngredient,
          confidence: 1.0,
          matchType: 'exact'
        })
        skippedCount++
        continue
      }

      processedIngredients.push(newIngredient)
    }

    return {
      newIngredients: processedIngredients,
      matchedIngredients,
      skippedCount
    }
  }
}

export const ingredientMatcher = new IngredientMatcher() 