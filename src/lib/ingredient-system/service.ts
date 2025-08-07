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
  ImportError,
  NutritionalInfo,
  VitaminInfo,
  MineralInfo
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
        id: 'svinemor-1',
        name: 'Svinemørbrad',
        category: IngredientCategory.Protein,
        exclusions: ['svinekød'],
        allergens: [],
        commonNames: ['pork tenderloin', 'svinemørbrad'],
        description: 'Svinekød - mørbrad, afpudset',
        nutritionalInfo: {
          caloriesPer100g: 143,
          proteinPer100g: 21.0,
          fatPer100g: 6.0,
          carbsPer100g: 0.0,
          fiberPer100g: 0.0,
          sugarPer100g: 0.0,
          sodiumPer100g: 62,
          vitamins: [
            { vitamin: 'A', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'D', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'E', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'K', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'C', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B1', amountPer100g: 0.8, unit: 'mg' },
            { vitamin: 'B2', amountPer100g: 0.2, unit: 'mg' },
            { vitamin: 'B3', amountPer100g: 5.2, unit: 'mg' },
            { vitamin: 'B5', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B6', amountPer100g: 0.4, unit: 'mg' },
            { vitamin: 'B7', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B9', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B12', amountPer100g: 0.8, unit: 'μg' }
          ],
          minerals: [
            { mineral: 'Calcium', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Iron', amountPer100g: 0.9, unit: 'mg' },
            { mineral: 'Magnesium', amountPer100g: 22.0, unit: 'mg' },
            { mineral: 'Phosphorus', amountPer100g: 180.0, unit: 'mg' },
            { mineral: 'Potassium', amountPer100g: 350.0, unit: 'mg' },
            { mineral: 'Sodium', amountPer100g: 62.0, unit: 'mg' },
            { mineral: 'Zinc', amountPer100g: 2.1, unit: 'mg' },
            { mineral: 'Copper', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Manganese', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Selenium', amountPer100g: 18.0, unit: 'μg' },
            { mineral: 'Iodine', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Chromium', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Molybdenum', amountPer100g: 0.0, unit: 'μg' }
          ]
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'kylling-1',
        name: 'Kyllingebryst',
        category: IngredientCategory.Protein,
        exclusions: [],
        allergens: [],
        commonNames: ['chicken breast', 'kyllingebryst'],
        description: 'Kyllingebryst, kød og skind',
        nutritionalInfo: {
          caloriesPer100g: 165,
          proteinPer100g: 31.0,
          fatPer100g: 3.6,
          carbsPer100g: 0.0,
          fiberPer100g: 0.0,
          sugarPer100g: 0.0,
          sodiumPer100g: 74,
          vitamins: [
            { vitamin: 'A', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'D', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'E', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'K', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'C', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B1', amountPer100g: 0.6, unit: 'mg' },
            { vitamin: 'B2', amountPer100g: 0.1, unit: 'mg' },
            { vitamin: 'B3', amountPer100g: 13.7, unit: 'mg' },
            { vitamin: 'B5', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B6', amountPer100g: 0.1, unit: 'mg' },
            { vitamin: 'B7', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B9', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B12', amountPer100g: 0.3, unit: 'μg' }
          ],
          minerals: [
            { mineral: 'Calcium', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Iron', amountPer100g: 0.7, unit: 'mg' },
            { mineral: 'Magnesium', amountPer100g: 27.0, unit: 'mg' },
            { mineral: 'Phosphorus', amountPer100g: 200.0, unit: 'mg' },
            { mineral: 'Potassium', amountPer100g: 256.0, unit: 'mg' },
            { mineral: 'Sodium', amountPer100g: 74.0, unit: 'mg' },
            { mineral: 'Zinc', amountPer100g: 1.0, unit: 'mg' },
            { mineral: 'Copper', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Manganese', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Selenium', amountPer100g: 22.0, unit: 'μg' },
            { mineral: 'Iodine', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Chromium', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Molybdenum', amountPer100g: 0.0, unit: 'μg' }
          ]
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'laks-1',
        name: 'Laks',
        category: IngredientCategory.Protein,
        exclusions: ['fisk'],
        allergens: ['fisk'],
        commonNames: ['salmon', 'laks'],
        description: 'Laks, atlantisk, vild, rå',
        nutritionalInfo: {
          caloriesPer100g: 208,
          proteinPer100g: 25.0,
          fatPer100g: 12.0,
          carbsPer100g: 0.0,
          fiberPer100g: 0.0,
          sugarPer100g: 0.0,
          sodiumPer100g: 59,
          vitamins: [
            { vitamin: 'A', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'D', amountPer100g: 11.0, unit: 'μg' },
            { vitamin: 'E', amountPer100g: 3.6, unit: 'mg' },
            { vitamin: 'K', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'C', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B1', amountPer100g: 0.2, unit: 'mg' },
            { vitamin: 'B2', amountPer100g: 0.4, unit: 'mg' },
            { vitamin: 'B3', amountPer100g: 8.5, unit: 'mg' },
            { vitamin: 'B5', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B6', amountPer100g: 0.9, unit: 'mg' },
            { vitamin: 'B7', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B9', amountPer100g: 44.0, unit: 'μg' },
            { vitamin: 'B12', amountPer100g: 3.2, unit: 'μg' }
          ],
          minerals: [
            { mineral: 'Calcium', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Iron', amountPer100g: 0.3, unit: 'mg' },
            { mineral: 'Magnesium', amountPer100g: 27.0, unit: 'mg' },
            { mineral: 'Phosphorus', amountPer100g: 240.0, unit: 'mg' },
            { mineral: 'Potassium', amountPer100g: 363.0, unit: 'mg' },
            { mineral: 'Sodium', amountPer100g: 59.0, unit: 'mg' },
            { mineral: 'Zinc', amountPer100g: 0.4, unit: 'mg' },
            { mineral: 'Copper', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Manganese', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Selenium', amountPer100g: 36.0, unit: 'μg' },
            { mineral: 'Iodine', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Chromium', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Molybdenum', amountPer100g: 0.0, unit: 'μg' }
          ]
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'maelk-1',
        name: 'Mælk',
        category: IngredientCategory.Mejeri,
        exclusions: ['mejeri'],
        allergens: ['mælk'],
        commonNames: ['milk', 'mælk'],
        description: 'Sødmælk, konventionel (ikke-økologisk)',
        nutritionalInfo: {
          caloriesPer100g: 63,
          proteinPer100g: 3.4,
          fatPer100g: 3.5,
          carbsPer100g: 4.8,
          fiberPer100g: 0.0,
          sugarPer100g: 4.8,
          sodiumPer100g: 44,
          vitamins: [
            { vitamin: 'A', amountPer100g: 46.0, unit: 'μg' },
            { vitamin: 'D', amountPer100g: 1.2, unit: 'μg' },
            { vitamin: 'E', amountPer100g: 0.1, unit: 'mg' },
            { vitamin: 'K', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'C', amountPer100g: 1.0, unit: 'mg' },
            { vitamin: 'B1', amountPer100g: 0.04, unit: 'mg' },
            { vitamin: 'B2', amountPer100g: 0.2, unit: 'mg' },
            { vitamin: 'B3', amountPer100g: 0.1, unit: 'mg' },
            { vitamin: 'B5', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B6', amountPer100g: 0.04, unit: 'mg' },
            { vitamin: 'B7', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B9', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B12', amountPer100g: 0.4, unit: 'μg' }
          ],
          minerals: [
            { mineral: 'Calcium', amountPer100g: 113.0, unit: 'mg' },
            { mineral: 'Iron', amountPer100g: 0.03, unit: 'mg' },
            { mineral: 'Magnesium', amountPer100g: 10.0, unit: 'mg' },
            { mineral: 'Phosphorus', amountPer100g: 93.0, unit: 'mg' },
            { mineral: 'Potassium', amountPer100g: 132.0, unit: 'mg' },
            { mineral: 'Sodium', amountPer100g: 44.0, unit: 'mg' },
            { mineral: 'Zinc', amountPer100g: 0.4, unit: 'mg' },
            { mineral: 'Copper', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Manganese', amountPer100g: 0.0, unit: 'mg' },
            { mineral: 'Selenium', amountPer100g: 3.7, unit: 'μg' },
            { mineral: 'Iodine', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Chromium', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Molybdenum', amountPer100g: 0.0, unit: 'μg' }
          ]
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'mandler-1',
        name: 'Mandler',
        category: IngredientCategory.Nodder,
        exclusions: ['nødder'],
        allergens: ['nødder'],
        commonNames: ['almonds', 'mandler'],
        description: 'Mandler, rå',
        nutritionalInfo: {
          caloriesPer100g: 606,
          proteinPer100g: 21.2,
          fatPer100g: 52.1,
          carbsPer100g: 7.8,
          fiberPer100g: 10.6,
          sugarPer100g: 4.8,
          sodiumPer100g: 1,
          vitamins: [
            { vitamin: 'A', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'D', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'E', amountPer100g: 23.4, unit: 'mg' },
            { vitamin: 'K', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'C', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B1', amountPer100g: 0.137, unit: 'mg' },
            { vitamin: 'B2', amountPer100g: 0.939, unit: 'mg' },
            { vitamin: 'B3', amountPer100g: 5.83, unit: 'mg' },
            { vitamin: 'B5', amountPer100g: 0.0, unit: 'mg' },
            { vitamin: 'B6', amountPer100g: 0.1, unit: 'mg' },
            { vitamin: 'B7', amountPer100g: 0.0, unit: 'μg' },
            { vitamin: 'B9', amountPer100g: 44.0, unit: 'μg' },
            { vitamin: 'B12', amountPer100g: 0.0, unit: 'μg' }
          ],
          minerals: [
            { mineral: 'Calcium', amountPer100g: 269.0, unit: 'mg' },
            { mineral: 'Iron', amountPer100g: 3.7, unit: 'mg' },
            { mineral: 'Magnesium', amountPer100g: 270.0, unit: 'mg' },
            { mineral: 'Phosphorus', amountPer100g: 481.0, unit: 'mg' },
            { mineral: 'Potassium', amountPer100g: 733.0, unit: 'mg' },
            { mineral: 'Sodium', amountPer100g: 1.0, unit: 'mg' },
            { mineral: 'Zinc', amountPer100g: 3.1, unit: 'mg' },
            { mineral: 'Copper', amountPer100g: 1.0, unit: 'mg' },
            { mineral: 'Manganese', amountPer100g: 2.2, unit: 'mg' },
            { mineral: 'Selenium', amountPer100g: 4.1, unit: 'μg' },
            { mineral: 'Iodine', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Chromium', amountPer100g: 0.0, unit: 'μg' },
            { mineral: 'Molybdenum', amountPer100g: 0.0, unit: 'μg' }
          ]
        },
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
   * Get all ingredient tags
   */
  getAllIngredientTags(): IngredientTag[] {
    return Array.from(this.ingredients.values())
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