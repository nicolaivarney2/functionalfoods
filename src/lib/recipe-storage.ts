import { Recipe } from '@/types/recipe'
import { databaseService } from './database-service'

// Get all recipes from database
export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    return await databaseService.getRecipes()
  } catch (error) {
    console.error('Error fetching recipes from database:', error)
    return []
  }
}

// Add imported recipes
export function addImportedRecipes(recipes: Recipe[]): void {
  // DISABLED: This function is no longer used - recipes are saved directly to database
  void recipes
  console.log('addImportedRecipes is disabled - recipes are saved directly to database')
}

// Get recipe by slug
export async function getRecipeBySlug(slug: string): Promise<Recipe | undefined> {
  const recipes = await getAllRecipes()
  return recipes.find(recipe => recipe.slug === slug)
}

// Get recipes by category
export async function getRecipesByCategory(category: string): Promise<Recipe[]> {
  const recipes = await getAllRecipes()
  return recipes.filter(recipe => {
    // Ensure dietaryCategories exists and is an array before filtering
    if (!recipe.dietaryCategories || !Array.isArray(recipe.dietaryCategories)) {
      return false
    }
    return recipe.dietaryCategories.some(
      (dietaryCategory) =>
        typeof dietaryCategory === 'string' &&
        dietaryCategory.toLowerCase() === category.toLowerCase()
    )
  })
}

// Search recipes
export async function searchRecipes(query: string): Promise<Recipe[]> {
  const recipes = await getAllRecipes()
  const searchTerm = query.toLowerCase()
  return recipes.filter(recipe => {
    // Check title
    if (recipe.title.toLowerCase().includes(searchTerm)) {
      return true
    }
    // Check description
    if (recipe.description?.toLowerCase().includes(searchTerm)) {
      return true
    }
    // Check ingredients (ensure it's an array)
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      if (recipe.ingredients.some(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm)
      )) {
        return true
      }
    }
    return false
  })
}

// Database-based functions - no longer need localStorage or importedRecipes