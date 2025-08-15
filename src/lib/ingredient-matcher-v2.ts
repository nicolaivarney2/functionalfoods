/**
 * Advanced Ingredient Matching System for Frida DTU Database
 * Handles fuzzy matching, synonyms, and normalization
 */

interface FridaIngredient {
  id: string
  name: string
  category?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

interface MatchResult {
  fridaIngredient: FridaIngredient | null
  confidence: number // 0-100
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'category' | 'none'
  originalInput: string
  normalizedInput: string
  fridaName?: string
}

export class AdvancedIngredientMatcher {
  private fridaIngredients: FridaIngredient[] = []
  private synonymMap: Map<string, string> = new Map()
  private categoryFallbacks: Map<string, FridaIngredient[]> = new Map()

  constructor(fridaData: FridaIngredient[]) {
    this.fridaIngredients = fridaData
    this.buildSynonymMap()
    this.buildCategoryIndex()
  }

  /**
   * Find the best matching Frida ingredient for a recipe ingredient
   */
  public findMatch(recipeIngredient: string): MatchResult {
    const normalized = this.normalizeIngredientName(recipeIngredient)
    
    // 1. Try exact match first
    const exactMatch = this.findExactMatch(normalized)
    if (exactMatch) {
      return {
        fridaIngredient: exactMatch,
        confidence: 100,
        matchType: 'exact',
        originalInput: recipeIngredient,
        normalizedInput: normalized,
        fridaName: exactMatch.name
      }
    }

    // 2. Try synonym match
    const synonymMatch = this.findSynonymMatch(normalized)
    if (synonymMatch) {
      return {
        fridaIngredient: synonymMatch,
        confidence: 95,
        matchType: 'synonym',
        originalInput: recipeIngredient,
        normalizedInput: normalized,
        fridaName: synonymMatch.name
      }
    }

    // 3. Try fuzzy match
    const fuzzyMatch = this.findFuzzyMatch(normalized)
    if (fuzzyMatch.ingredient && fuzzyMatch.confidence > 70) {
      return {
        fridaIngredient: fuzzyMatch.ingredient,
        confidence: fuzzyMatch.confidence,
        matchType: 'fuzzy',
        originalInput: recipeIngredient,
        normalizedInput: normalized,
        fridaName: fuzzyMatch.ingredient.name
      }
    }

    // 4. Try category fallback
    const categoryMatch = this.findCategoryFallback(normalized)
    if (categoryMatch) {
      return {
        fridaIngredient: categoryMatch,
        confidence: 50,
        matchType: 'category',
        originalInput: recipeIngredient,
        normalizedInput: normalized,
        fridaName: categoryMatch.name
      }
    }

    // 5. No match found
    return {
      fridaIngredient: null,
      confidence: 0,
      matchType: 'none',
      originalInput: recipeIngredient,
      normalizedInput: normalized
    }
  }

  /**
   * Normalize ingredient names for better matching
   */
  private normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remove quantities and units
      .replace(/\d+\s*(g|gram|kg|kilogram|ml|liter|l|stk|styk|dl|tsk|spsk|spise|te)(\s|$)/gi, '')
      // Remove common prefixes
      .replace(/^(frisk|tørret|hakket|revet|kogt|rå|økologisk|øko)\s+/gi, '')
      // Remove articles
      .replace(/^(en|et|den|det|de)\s+/gi, '')
      // Remove punctuation
      .replace(/[,\.!?;:]/g, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Build synonym mapping for common ingredient variations
   */
  private buildSynonymMap(): void {
    const synonyms = {
      // Nødder og kerner
      'mandler': 'mandel',
      'mandel': 'mandel',
      'valnød': 'valnød',
      'valnødder': 'valnød',
      'hasselnød': 'hasselnød',
      'hasselnødder': 'hasselnød',
      
      // Kød og fisk
      'kylling': 'kyllingebryst',
      'kyllingebryst': 'kyllingebryst',
      'oksekød': 'oksekød',
      'svinekød': 'svinekød',
      'laks': 'laks',
      'torsk': 'torsk',
      
      // Mejeriprodukter
      'mælk': 'mælk',
      'fløde': 'fløde',
      'smør': 'smør',
      'ost': 'ost',
      'revet ost': 'ost',
      'parmesan': 'parmesanost',
      
      // Olier og fedtstoffer
      'olivenolie': 'olie, oliven',
      'rapsolie': 'olie, raps',
      'solsikkeolie': 'olie, solsikke',
      'kokosolie': 'olie, kokos',
      
      // Grøntsager
      'tomat': 'tomat',
      'tomater': 'tomat',
      'løg': 'løg',
      'hvidløg': 'hvidløg',
      'gulerødder': 'gulerod',
      'gulerod': 'gulerod',
      'spinat': 'spinat',
      'broccoli': 'broccoli',
      
      // Krydderier
      'salt': 'salt',
      'peber': 'peber',
      'oregano': 'oregano',
      'basilikum': 'basilikum',
      'persille': 'persille',
      
      // Korn og mel
      'hvede': 'hvede',
      'hvedemel': 'mel, hvede',
      'rugmel': 'mel, rug',
      'havregryn': 'havre',
      'ris': 'ris',
      
      // Bælgfrugter
      'bønner': 'bønner',
      'linser': 'linser',
      'kikærter': 'kikærter',
      
      // Frugt
      'æbler': 'æble',
      'æble': 'æble',
      'banan': 'banan',
      'bananer': 'banan',
      'appelsin': 'appelsin',
      'citron': 'citron'
    }

    for (const [key, value] of Object.entries(synonyms)) {
      this.synonymMap.set(key, value)
    }
  }

  /**
   * Build category-based fallback index
   */
  private buildCategoryIndex(): void {
    const categories = new Map<string, FridaIngredient[]>()
    
    for (const ingredient of this.fridaIngredients) {
      const category = ingredient.category || 'unknown'
      if (!categories.has(category)) {
        categories.set(category, [])
      }
      categories.get(category)!.push(ingredient)
    }
    
    this.categoryFallbacks = categories
  }

  /**
   * Find exact match in Frida database
   */
  private findExactMatch(normalized: string): FridaIngredient | null {
    return this.fridaIngredients.find(ingredient => 
      this.normalizeIngredientName(ingredient.name) === normalized
    ) || null
  }

  /**
   * Find match using synonym mapping
   */
  private findSynonymMatch(normalized: string): FridaIngredient | null {
    const synonym = this.synonymMap.get(normalized)
    if (!synonym) return null
    
    return this.fridaIngredients.find(ingredient => 
      this.normalizeIngredientName(ingredient.name).includes(synonym) ||
      ingredient.name.toLowerCase().includes(synonym)
    ) || null
  }

  /**
   * Find fuzzy match using string similarity
   */
  private findFuzzyMatch(normalized: string): { ingredient: FridaIngredient | null, confidence: number } {
    let bestMatch: FridaIngredient | null = null
    let bestScore = 0

    for (const ingredient of this.fridaIngredients) {
      const fridaNormalized = this.normalizeIngredientName(ingredient.name)
      const score = this.calculateSimilarity(normalized, fridaNormalized)
      
      if (score > bestScore) {
        bestScore = score
        bestMatch = ingredient
      }
    }

    return {
      ingredient: bestMatch,
      confidence: Math.round(bestScore * 100)
    }
  }

  /**
   * Find fallback match based on ingredient category
   */
  private findCategoryFallback(normalized: string): FridaIngredient | null {
    // Simple category detection based on keywords
    const categoryKeywords = {
      'kød': ['kylling', 'oksekød', 'svinekød', 'kød'],
      'fisk': ['laks', 'torsk', 'fisk', 'tuna'],
      'mejeriprodukter': ['mælk', 'ost', 'fløde', 'smør'],
      'grøntsager': ['tomat', 'løg', 'spinat', 'gulerod'],
      'frugt': ['æble', 'banan', 'appelsin', 'citron'],
      'nødder': ['mandel', 'valnød', 'hasselnød'],
      'olie': ['olie', 'fedtstof']
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => normalized.includes(keyword))) {
        const categoryItems = this.categoryFallbacks.get(category)
        if (categoryItems && categoryItems.length > 0) {
          // Return the first item as fallback
          return categoryItems[0]
        }
      }
    }

    return null
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    if (len1 === 0) return len2 === 0 ? 1 : 0
    if (len2 === 0) return 0

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    // Calculate similarity (1 - normalized distance)
    const maxLength = Math.max(len1, len2)
    return 1 - (matrix[len2][len1] / maxLength)
  }

  /**
   * Batch match multiple ingredients
   */
  public batchMatch(recipeIngredients: string[]): MatchResult[] {
    return recipeIngredients.map(ingredient => this.findMatch(ingredient))
  }

  /**
   * Get matching statistics
   */
  public getMatchingStats(results: MatchResult[]): {
    exact: number
    synonym: number
    fuzzy: number
    category: number
    none: number
    averageConfidence: number
  } {
    const stats = {
      exact: 0,
      synonym: 0,
      fuzzy: 0,
      category: 0,
      none: 0,
      averageConfidence: 0
    }

    let totalConfidence = 0

    for (const result of results) {
      stats[result.matchType]++
      totalConfidence += result.confidence
    }

    stats.averageConfidence = results.length > 0 ? totalConfidence / results.length : 0

    return stats
  }
}

export default AdvancedIngredientMatcher