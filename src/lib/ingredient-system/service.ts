import { 
  IngredientTag, 
  IngredientCategory, 
  Recipe, 
  RecipeFilter, 
  RecipeCompatibility,
  ValidationResult,
  IngredientSearchFilters,
  RecipeSearchFilters,
  BulkImportResult,
  ImportError
} from './types';

export class IngredientTaggingService {
  private ingredients: Map<string, IngredientTag> = new Map();
  private recipes: Map<string, Recipe> = new Map();

  constructor() {
    this.initializeDefaultIngredients();
  }

  /**
   * Initialize with some default ingredients for testing
   */
  private initializeDefaultIngredients(): void {
    const defaultIngredients: IngredientTag[] = [
      {
        id: 'pork-1',
        name: 'Svinemørbrad',
        category: IngredientCategory.Protein,
        exclusions: ['pork'],
        allergens: [],
        commonNames: ['pork tenderloin', 'svinemørbrad'],
        description: 'Pork tenderloin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'chicken-1',
        name: 'Kyllingebryst',
        category: IngredientCategory.Protein,
        exclusions: [],
        allergens: [],
        commonNames: ['chicken breast', 'kyllingebryst'],
        description: 'Chicken breast',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'salmon-1',
        name: 'Laks',
        category: IngredientCategory.Protein,
        exclusions: ['fish'],
        allergens: ['fish'],
        commonNames: ['salmon', 'laks'],
        description: 'Salmon fish',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'milk-1',
        name: 'Mælk',
        category: IngredientCategory.Dairy,
        exclusions: ['dairy'],
        allergens: ['milk'],
        commonNames: ['milk', 'mælk'],
        description: 'Cow milk',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'almond-1',
        name: 'Mandler',
        category: IngredientCategory.Nut,
        exclusions: ['nuts'],
        allergens: ['nuts'],
        commonNames: ['almonds', 'mandler'],
        description: 'Almond nuts',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultIngredients.forEach(ingredient => {
      this.ingredients.set(ingredient.id, ingredient);
    });
  }

  /**
   * Create a new ingredient tag
   */
  createIngredientTag(ingredient: Omit<IngredientTag, 'id' | 'createdAt' | 'updatedAt'>): IngredientTag {
    const id = this.generateIngredientId(ingredient.name);
    const now = new Date();
    
    const newIngredient: IngredientTag = {
      ...ingredient,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.ingredients.set(id, newIngredient);
    return newIngredient;
  }

  /**
   * Get ingredient by ID
   */
  getIngredientById(id: string): IngredientTag | undefined {
    return this.ingredients.get(id);
  }

  /**
   * Get ingredient by name (case-insensitive)
   */
  getIngredientByName(name: string): IngredientTag | undefined {
    const normalizedName = name.toLowerCase();
    return Array.from(this.ingredients.values()).find(
      ingredient => ingredient.name.toLowerCase() === normalizedName ||
                   ingredient.commonNames.some(commonName => 
                     commonName.toLowerCase() === normalizedName
                   )
    );
  }

  /**
   * Update an ingredient tag
   */
  updateIngredientTag(id: string, updates: Partial<IngredientTag>): IngredientTag | null {
    const ingredient = this.ingredients.get(id);
    if (!ingredient) return null;

    const updatedIngredient: IngredientTag = {
      ...ingredient,
      ...updates,
      updatedAt: new Date()
    };

    this.ingredients.set(id, updatedIngredient);
    return updatedIngredient;
  }

  /**
   * Delete an ingredient tag
   */
  deleteIngredientTag(id: string): boolean {
    return this.ingredients.delete(id);
  }

  /**
   * Get all ingredients with optional filtering
   */
  getIngredients(filters?: IngredientSearchFilters): IngredientTag[] {
    let ingredients = Array.from(this.ingredients.values());

    if (filters) {
      if (filters.category) {
        ingredients = ingredients.filter(i => i.category === filters.category);
      }
      if (filters.isActive !== undefined) {
        ingredients = ingredients.filter(i => i.isActive === filters.isActive);
      }
      if (filters.hasAllergens) {
        ingredients = ingredients.filter(i => i.allergens.length > 0);
      }
      if (filters.excludedIngredients) {
        ingredients = ingredients.filter(i => 
          !filters.excludedIngredients!.some(excluded => 
            i.exclusions.includes(excluded)
          )
        );
      }
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        ingredients = ingredients.filter(i => 
          i.name.toLowerCase().includes(searchTerm) ||
          i.commonNames.some(name => name.toLowerCase().includes(searchTerm))
        );
      }
    }

    return ingredients;
  }

  /**
   * Add exclusion to ingredient
   */
  addExclusion(ingredientId: string, exclusion: string): boolean {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) return false;

    if (!ingredient.exclusions.includes(exclusion)) {
      ingredient.exclusions.push(exclusion);
      ingredient.updatedAt = new Date();
      this.ingredients.set(ingredientId, ingredient);
    }

    return true;
  }

  /**
   * Remove exclusion from ingredient
   */
  removeExclusion(ingredientId: string, exclusion: string): boolean {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) return false;

    const index = ingredient.exclusions.indexOf(exclusion);
    if (index > -1) {
      ingredient.exclusions.splice(index, 1);
      ingredient.updatedAt = new Date();
      this.ingredients.set(ingredientId, ingredient);
      return true;
    }

    return false;
  }

  /**
   * Check if recipe contains excluded ingredients
   */
  checkRecipeExclusions(recipe: Recipe, excludedIngredients: string[]): string[] {
    const violations: string[] = [];

    recipe.ingredients.forEach(recipeIngredient => {
      const ingredient = this.ingredients.get(recipeIngredient.ingredientId);
      if (ingredient) {
        // Check if ingredient has exclusions that match user preferences
        const matchingExclusions = ingredient.exclusions.filter(exclusion =>
          excludedIngredients.includes(exclusion)
        );
        
        if (matchingExclusions.length > 0) {
          violations.push(`${ingredient.name} (${matchingExclusions.join(', ')})`);
        }
      }
    });

    return violations;
  }

  /**
   * Filter recipes based on user preferences
   */
  filterRecipes(recipes: Recipe[], filter: RecipeFilter): Recipe[] {
    return recipes.filter(recipe => {
      // Check for excluded ingredients
      const violations = this.checkRecipeExclusions(recipe, filter.excludedIngredients);
      if (violations.length > 0) return false;

      // Check prep time
      if (filter.maxPrepTime && recipe.prepTime > filter.maxPrepTime) return false;

      // Check cook time
      if (filter.maxCookTime && recipe.cookTime > filter.maxCookTime) return false;

      // Check servings
      if (filter.minServings && recipe.servings < filter.minServings) return false;
      if (filter.maxServings && recipe.servings > filter.maxServings) return false;

      // Check categories
      if (filter.categories && filter.categories.length > 0) {
        const hasMatchingCategory = recipe.categories.some(category =>
          filter.categories!.includes(category)
        );
        if (!hasMatchingCategory) return false;
      }

      // Check calories
      if (filter.maxCalories && recipe.nutritionalInfo.caloriesPer100g > filter.maxCalories) return false;

      // Check dietary approach compatibility
      if (filter.dietaryApproachId) {
        const isCompatible = recipe.dietaryApproaches.includes(filter.dietaryApproachId);
        if (!isCompatible) return false;
      }

      return true;
    });
  }

  /**
   * Calculate recipe compatibility score
   */
  calculateRecipeCompatibility(recipe: Recipe, filter: RecipeFilter): RecipeCompatibility {
    let compatibilityScore = 100;
    const excludedIngredients: string[] = [];
    const recommendations: string[] = [];

    // Check ingredient exclusions
    recipe.ingredients.forEach(recipeIngredient => {
      const ingredient = this.ingredients.get(recipeIngredient.ingredientId);
      if (ingredient) {
        const violations = ingredient.exclusions.filter(exclusion =>
          filter.excludedIngredients.includes(exclusion)
        );
        
        if (violations.length > 0) {
          compatibilityScore -= 20; // Penalty for each excluded ingredient
          excludedIngredients.push(`${ingredient.name} (${violations.join(', ')})`);
        }
      }
    });

    // Check prep time
    if (filter.maxPrepTime && recipe.prepTime > filter.maxPrepTime) {
      compatibilityScore -= 10;
      recommendations.push('Consider prepping ingredients ahead of time');
    }

    // Check cook time
    if (filter.maxCookTime && recipe.cookTime > filter.maxCookTime) {
      compatibilityScore -= 10;
      recommendations.push('Consider using a pressure cooker or slow cooker');
    }

    // Calculate macro alignment (placeholder)
    const macroAlignment = 85; // This would be calculated based on dietary approach

    // Determine difficulty
    let difficulty = 'easy';
    if (recipe.prepTime + recipe.cookTime > 60) difficulty = 'medium';
    if (recipe.prepTime + recipe.cookTime > 120) difficulty = 'hard';

    return {
      recipeId: recipe.id,
      compatibilityScore: Math.max(0, compatibilityScore),
      excludedIngredients,
      macroAlignment,
      preparationTime: recipe.prepTime + recipe.cookTime,
      difficulty: difficulty as any,
      recommendations
    };
  }

  /**
   * Bulk import ingredients from CSV/JSON
   */
  async bulkImportIngredients(data: any[]): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      success: true,
      importedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const validation = this.validateIngredientData(row);
        if (validation.isValid) {
          const ingredient = this.createIngredientTag({
            name: row.name,
            category: row.category as IngredientCategory,
            exclusions: row.exclusions || [],
            allergens: row.allergens || [],
            commonNames: row.commonNames || [],
            description: row.description,
            isActive: row.isActive !== false
          });
          result.importedCount++;
        } else {
          result.failedCount++;
          result.errors.push({
            row: i + 1,
            field: validation.errors[0] || 'unknown',
            message: validation.errors.join(', '),
            value: row
          });
        }
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          row: i + 1,
          field: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          value: row
        });
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  /**
   * Validate ingredient data
   */
  private validateIngredientData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Name is required and must be a string');
    }

    if (!data.category || !Object.values(IngredientCategory).includes(data.category)) {
      errors.push('Category is required and must be a valid category');
    }

    if (data.exclusions && !Array.isArray(data.exclusions)) {
      errors.push('Exclusions must be an array');
    }

    if (data.allergens && !Array.isArray(data.allergens)) {
      errors.push('Allergens must be an array');
    }

    if (data.commonNames && !Array.isArray(data.commonNames)) {
      errors.push('Common names must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate unique ingredient ID
   */
  private generateIngredientId(name: string): string {
    const baseId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let id = baseId;
    let counter = 1;

    while (this.ingredients.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    return id;
  }

  /**
   * Get ingredient statistics
   */
  getIngredientStats() {
    const ingredients = Array.from(this.ingredients.values());
    const stats = {
      total: ingredients.length,
      byCategory: {} as Record<IngredientCategory, number>,
      withAllergens: ingredients.filter(i => i.allergens.length > 0).length,
      withExclusions: ingredients.filter(i => i.exclusions.length > 0).length,
      active: ingredients.filter(i => i.isActive).length
    };

    Object.values(IngredientCategory).forEach(category => {
      stats.byCategory[category] = ingredients.filter(i => i.category === category).length;
    });

    return stats;
  }
} 