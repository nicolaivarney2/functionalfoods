import { Recipe } from '@/types/recipe'
import { RawRecipeData, convertKetolivToRawRecipeData, importRecipesWithImages } from './recipe-import'
import { IngredientTag, IngredientCategory, NutritionalInfo as IngredientNutritionalInfo } from './ingredient-system/types'
import { ingredientService } from './ingredient-system'
import { FridaDTUMatcher } from './frida-dtu-matcher'
import { RecipeCalculator } from './recipe-calculator'

export interface ImportResult {
  recipes: Recipe[]
  ingredients: IngredientTag[]
  stats: {
    totalRecipes: number
    totalIngredients: number
    processedIngredients: number
    recipesWithNutrition: number
    processingTime: number
    imagesFetched: number
  }
}

export class ImportProcessor {
  private fridaDTUMatcher: FridaDTUMatcher
  private recipeCalculator: RecipeCalculator

  constructor() {
    this.fridaDTUMatcher = new FridaDTUMatcher()
    this.recipeCalculator = new RecipeCalculator()
  }

  /**
   * Process complete import of recipes with automatic ingredient tagging, nutritional calculation, and image fetching
   */
  async processImport(rawData: any[]): Promise<ImportResult> {
    const startTime = Date.now()
    
    console.log('🚀 Starting comprehensive recipe import...')
    console.log(`📊 Processing ${rawData.length} recipes`)

    // Detect if this is Ketoliv format and convert if needed
    let rawRecipeData: RawRecipeData[]
    if (rawData.length > 0 && rawData[0].ingredients_flat) {
      console.log('🔍 Detected Ketoliv format, converting...')
      rawRecipeData = convertKetolivToRawRecipeData(rawData)
    } else {
      console.log('🔍 Using standard format')
      rawRecipeData = rawData as RawRecipeData[]
    }

    // Step 1: Normalize & import recipes (do NOT fetch images on client)
    console.log('📝 Step 1: Importing recipes (no client fetch)...')
    const normalizedRaw: RawRecipeData[] = rawRecipeData.map((r: any) => {
      // normalize imageUrl from various possible fields
      const imageUrl = r.imageUrl || r.image_url || r.image?.url || r.image?.src || r.image
      return {
        ...r,
        imageUrl: imageUrl || '/images/recipe-placeholder.jpg'
      }
    })
    // Step 1: Import recipes with images
    console.log('🖼️ Step 1: Importing recipes with images...')
    const importedRecipes = await importRecipesWithImages(normalizedRaw)
    
    // Count successfully fetched images
    const imagesFetched = importedRecipes.filter(recipe => 
      recipe.imageUrl && !recipe.imageUrl.includes('recipe-placeholder.jpg')
    ).length
    
    // Step 2: Calculate nutritional values using Frida DTU for all recipes
    console.log('🧮 Step 2: Calculating nutritional values using Frida DTU...')
    const recipesWithNutrition = await Promise.all(importedRecipes.map(async recipe => {
      // Calculate nutrition using Frida DTU data
      const fridaNutrition = await this.fridaDTUMatcher.calculateRecipeNutrition(recipe.ingredients || [])
      
      return {
        ...recipe,
        calories: Math.round(fridaNutrition.calories),
        protein: Math.round(fridaNutrition.protein * 10) / 10,
        carbs: Math.round(fridaNutrition.carbs * 10) / 10,
        fat: Math.round(fridaNutrition.fat * 10) / 10,
        fiber: Math.round(fridaNutrition.fiber * 10) / 10,
        nutritionalInfo: fridaNutrition
      }
    }))
    
    // Step 3: Extract and process ingredients (simplified)
    console.log('🏷️ Step 3: Extracting unique ingredients...')
    const uniqueIngredients = new Set<string>()
    recipesWithNutrition.forEach(recipe => {
      recipe.ingredients?.forEach((ingredient: any) => {
        uniqueIngredients.add(ingredient.name.toLowerCase())
      })
    })
    
    const toSlug = (input: string) =>
      input
        .toLowerCase()
        .replace(/[æøå]/g, (m) => ({ 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }[m] as string))
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

    // Add slugs to recipes
    const recipesWithSlugs = recipesWithNutrition.map(recipe => ({
      ...recipe,
      slug: recipe.slug || toSlug(recipe.title)
    }))

    const processedIngredients: IngredientTag[] = Array.from(uniqueIngredients).map(name => ({
      id: toSlug(name),
      name: name,
      category: 'Andre' as any,
      exclusions: [],
      allergens: [],
      commonNames: [name],
      description: `${name} - importeret fra opskrifter`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      nutritionalInfo: undefined
    }))
    
    const processingTime = Date.now() - startTime
    
    const stats = {
      totalRecipes: importedRecipes.length,
      totalIngredients: processedIngredients.length,
      processedIngredients: processedIngredients.filter(ing => ing.nutritionalInfo).length,
      recipesWithNutrition: recipesWithNutrition.filter(recipe => (recipe.calories || 0) > 0).length,
      processingTime,
      imagesFetched
    }

    console.log('✅ Import completed successfully!')
    console.log(`📈 Stats:`, stats)

    return {
      recipes: recipesWithSlugs,
      ingredients: processedIngredients,
      stats
    }
  }

  /**
   * Process a single recipe import (for testing)
   */
  async processSingleRecipe(rawRecipeData: any): Promise<Recipe> {
    // Detect if this is Ketoliv format
    let convertedData: RawRecipeData
    if (rawRecipeData.ingredients_flat) {
      const converted = convertKetolivToRawRecipeData([rawRecipeData])
      convertedData = converted[0]
    } else {
      convertedData = rawRecipeData as RawRecipeData
    }

    const importedRecipes = await importRecipesWithImages([convertedData])
    // Process ingredients using the new Frida DTU matcher system
    const allIngredients = importedRecipes.flatMap(recipe => recipe.ingredients || [])
    const processedIngredients: IngredientTag[] = []
    
    for (const ingredient of allIngredients) {
      const result = await this.fridaDTUMatcher.matchIngredient(ingredient.name)
      if (result.nutrition) {
        // Convert to IngredientTag format
        const ingredientTag: IngredientTag = {
          id: ingredient.id || ingredient.name.toLowerCase().replace(/\s+/g, '-'),
          name: ingredient.name,
          category: IngredientCategory.Andre, // Default category
          exclusions: [],
          allergens: [],
          commonNames: [ingredient.name],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          nutritionalInfo: {
            caloriesPer100g: result.nutrition.calories,
            proteinPer100g: result.nutrition.protein,
            carbsPer100g: result.nutrition.carbs,
            fatPer100g: result.nutrition.fat,
            fiberPer100g: result.nutrition.fiber
          } as IngredientNutritionalInfo
        }
        processedIngredients.push(ingredientTag)
      }
    }
    
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
    
    // Add slug if missing
    const toSlug = (input: string) =>
      input
        .toLowerCase()
        .replace(/[æøå]/g, (m) => ({ 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }[m] as string))
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    
    return {
      ...recipeWithNutrition,
      slug: recipeWithNutrition.slug || toSlug(recipeWithNutrition.title)
    }
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