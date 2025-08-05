import { importRecipes, RawRecipeData } from './recipe-import'
import { FridaIntegration } from './ingredient-system/frida-integration'
import { RecipeCalculator } from './recipe-calculator'
import { ingredientService } from './ingredient-system'
import { Recipe } from '@/types/recipe'
import { IngredientTag } from '@/lib/ingredient-system/types'

export interface ImportResult {
  recipes: Recipe[]
  ingredients: IngredientTag[]
  stats: {
    totalRecipes: number
    totalIngredients: number
    processedIngredients: number
    recipesWithNutrition: number
    processingTime: number
  }
}

export class ImportProcessor {
  private fridaIntegration: FridaIntegration
  private recipeCalculator: RecipeCalculator

  constructor() {
    this.fridaIntegration = new FridaIntegration()
    this.recipeCalculator = new RecipeCalculator()
  }

  /**
   * Process complete import of recipes with automatic ingredient tagging and nutritional calculation
   */
  async processImport(rawRecipeData: RawRecipeData[]): Promise<ImportResult> {
    const startTime = Date.now()
    
    console.log('🚀 Starting comprehensive recipe import...')
    console.log(`📊 Processing ${rawRecipeData.length} recipes`)

    // Step 1: Import recipes
    console.log('📝 Step 1: Importing recipes...')
    const importedRecipes = importRecipes(rawRecipeData)
    
    // Step 2: Extract and process ingredients
    console.log('🏷️ Step 2: Extracting and processing ingredients...')
    const processedIngredients = await this.fridaIntegration.processImportedIngredients(importedRecipes)
    
    // Step 3: Add ingredients to ingredient service
    console.log('💾 Step 3: Adding ingredients to ingredient service...')
    processedIngredients.forEach(ingredient => {
      try {
        ingredientService.createIngredientTag(ingredient)
      } catch (error) {
        console.warn(`Ingredient ${ingredient.name} already exists, skipping...`)
      }
    })
    
    // Step 4: Calculate nutritional values for recipes
    console.log('🧮 Step 4: Calculating nutritional values for recipes...')
    const recipesWithNutrition = this.recipeCalculator.processImportedRecipes(importedRecipes)
    
    const processingTime = Date.now() - startTime
    
    const stats = {
      totalRecipes: importedRecipes.length,
      totalIngredients: processedIngredients.length,
      processedIngredients: processedIngredients.filter(ing => ing.nutritionalInfo).length,
      recipesWithNutrition: recipesWithNutrition.filter(recipe => recipe.calories > 0).length,
      processingTime
    }

    console.log('✅ Import completed successfully!')
    console.log(`📈 Stats:`, stats)

    return {
      recipes: recipesWithNutrition,
      ingredients: processedIngredients,
      stats
    }
  }

  /**
   * Process a single recipe import (for testing)
   */
  async processSingleRecipe(rawRecipeData: RawRecipeData): Promise<Recipe> {
    const importedRecipes = importRecipes([rawRecipeData])
    const processedIngredients = await this.fridaIntegration.processImportedIngredients(importedRecipes)
    
    // Add ingredients to service
    processedIngredients.forEach(ingredient => {
      try {
        ingredientService.createIngredientTag(ingredient)
      } catch (error) {
        // Ingredient already exists
      }
    })
    
    // Calculate nutrition
    const recipeWithNutrition = this.recipeCalculator.processImportedRecipes(importedRecipes)[0]
    
    return recipeWithNutrition
  }

  /**
   * Get import statistics
   */
  getImportStats(): {
    totalIngredients: number
    ingredientsWithNutrition: number
    ingredientCategories: { [key: string]: number }
  } {
    const allIngredients = ingredientService.getIngredients()
    const categories: { [key: string]: number } = {}
    
    allIngredients.forEach(ingredient => {
      const category = ingredient.category
      categories[category] = (categories[category] || 0) + 1
    })

    return {
      totalIngredients: allIngredients.length,
      ingredientsWithNutrition: allIngredients.filter(ing => ing.nutritionalInfo).length,
      ingredientCategories: categories
    }
  }

  /**
   * Export ingredient data for backup
   */
  exportIngredientData(): IngredientTag[] {
    return ingredientService.getIngredients()
  }

  /**
   * Import ingredient data from backup
   */
  importIngredientData(ingredients: IngredientTag[]): void {
    ingredients.forEach(ingredient => {
      try {
        ingredientService.createIngredientTag(ingredient)
      } catch (error) {
        // Ingredient already exists, update instead
        ingredientService.updateIngredientTag(ingredient.id, ingredient)
      }
    })
  }
} 