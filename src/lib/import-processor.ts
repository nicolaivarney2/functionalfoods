import { RawRecipeData, convertKetolivToRawRecipeData, importRecipesWithImages, importRecipesInBatches, BatchImportOptions } from './recipe-import'
import { Recipe } from '@/types/recipe'
import { IngredientTag, IngredientCategory, NutritionalInfo as IngredientNutritionalInfo } from './ingredient-system/types'
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
  async processImport(
    rawRecipeData: any[],
    options: BatchImportOptions = {}
  ): Promise<{
    recipes: Recipe[]
    ingredients: IngredientTag[]
    stats: {
      totalRecipes: number
      totalIngredients: number
      processedIngredients: number
      recipesWithNutrition: number
      processingTime: number
      imagesFetched: number
      batchStats?: {
        totalBatches: number
        successfulBatches: number
        failedBatches: number
        progress: number
      }
    }
  }> {
    const startTime = Date.now()
    
    // Detect if this is Ketoliv format and convert
    let normalizedRaw: RawRecipeData[]
    if (rawRecipeData[0]?.ingredients_flat) {
      console.log('🔄 Detected Ketoliv format, converting...')
      normalizedRaw = convertKetolivToRawRecipeData(rawRecipeData)
    } else {
      console.log('🔄 Using raw recipe format...')
      normalizedRaw = rawRecipeData.map((r: any) => {
        // normalize imageUrl from various possible fields
        const imageUrl = r.imageUrl || r.image_url || r.image?.url || r.image?.src || r.image
        return {
          ...r,
          imageUrl: imageUrl || '/images/recipe-placeholder.jpg'
        }
      })
    }

    // Step 1: Import recipes with images using batch processing
    console.log('🖼️ Step 1: Importing recipes with images using batch processing...')
    
    const batchResult = await importRecipesInBatches(normalizedRaw, {
      batchSize: options.batchSize || 5,
      delayBetweenBatches: options.delayBetweenBatches || 1000,
      onProgress: (progress, currentBatch, totalBatches) => {
        console.log(`📊 Progress: ${progress}% (Batch ${currentBatch}/${totalBatches})`)
      },
      onBatchComplete: (batchNumber, successCount, errorCount) => {
        console.log(`✅ Batch ${batchNumber} complete: ${successCount} successful, ${errorCount} errors`)
      }
    })

    // Get successfully imported recipes
    const importedRecipes = normalizedRaw.filter(recipe => 
      !batchResult.errors.some(error => error.recipeTitle === recipe.title)
    ).map(recipe => {
      // Convert to Recipe format (simplified conversion)
      return {
        id: recipe.id || '',
        title: recipe.title,
        slug: this.generateSlug(recipe.title),
        description: recipe.description,
        shortDescription: recipe.shortDescription,
        preparationTime: recipe.preparationTime,
        cookingTime: recipe.cookingTime,
        totalTime: recipe.preparationTime + recipe.cookingTime,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        fiber: recipe.fiber,
        metaTitle: `${recipe.title} - ${recipe.dietaryCategories?.[0] || 'Opskrift'} | Functional Foods`,
        metaDescription: this.generateMetaDescription(recipe),
        keywords: this.generateKeywords(recipe),
        mainCategory: recipe.mainCategory,
        subCategories: recipe.subCategories || [],
        dietaryCategories: recipe.dietaryCategories || [],
        ingredients: recipe.ingredients?.map((ingredient: any, i: number) => ({
          id: `${recipe.id || 'temp'}-${i + 1}`,
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          notes: ingredient.notes,
        })) || [],
        instructions: recipe.instructions?.map((step: any, i: number) => ({
          id: `${recipe.id || 'temp'}-${i + 1}`,
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          time: step.time,
          tips: step.tips,
        })) || [],
        imageUrl: recipe.imageUrl,
        imageAlt: recipe.imageAlt,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        author: recipe.author,
        publishedAt: new Date(recipe.publishedAt),
        updatedAt: new Date(recipe.publishedAt),
        rating: recipe.rating,
        reviewCount: recipe.reviewCount,
        prepTimeISO: `PT${recipe.preparationTime}M`,
        cookTimeISO: `PT${recipe.cookingTime}M`,
        totalTimeISO: `PT${recipe.preparationTime + recipe.cookingTime}M`,
      } as Recipe
    })

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
      slug: recipe.slug || this.generateSlug(recipe.title)
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
      imagesFetched,
      batchStats: {
        totalBatches: Math.ceil(normalizedRaw.length / (options.batchSize || 5)),
        successfulBatches: batchResult.processedBatches,
        failedBatches: batchResult.errors.length > 0 ? 1 : 0,
        progress: batchResult.progress
      }
    }

    console.log('✅ Import completed successfully!')
    console.log(`📈 Stats:`, stats)
    console.log(`📦 Batch Stats:`, stats.batchStats)

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
    // Note: ingredientService.createIngredientTag is not async and not used in current flow
    console.log(`📋 Processed ${processedIngredients.length} ingredients with nutrition data`)
    
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
    // Note: ingredientService.getIngredients() is not async and not used in current flow
    // Return default stats for now
    return {
      totalIngredients: 0,
      ingredientsWithNutrition: 0,
      ingredientCategories: {}
    }
  }

  /**
   * Export ingredient data for backup
   */
  exportIngredientData(): IngredientTag[] {
    // Note: ingredientService.getIngredients() is not async and not used in current flow
    // Return empty array for now
    return []
  }

  /**
   * Import ingredient data from backup
   */
  importIngredientData(ingredients: IngredientTag[]): void {
    // This method is not currently used in the import flow
    // and the ingredientService calls were causing async/await issues
    console.log(`📋 Importing ${ingredients.length} ingredients (method not implemented)`)
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[æøå]/g, (m) => ({ 'æ': 'ae', 'ø': 'oe', 'å': 'aa' }[m] as string))
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  private generateMetaDescription(recipe: any): string {
    return `${recipe.shortDescription || recipe.description || recipe.title} - ${recipe.dietaryCategories?.[0] || 'Opskrift'}`
  }

  private generateKeywords(recipe: any): string[] {
    return [recipe.title, ...(recipe.subCategories || []), ...(recipe.dietaryCategories || [])]
  }
} 