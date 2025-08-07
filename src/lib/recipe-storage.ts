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
  return recipes.filter(recipe =>
    recipe.dietaryCategories.some(dietaryCategory =>
      dietaryCategory.toLowerCase() === category.toLowerCase()
    )
  )
}

// Search recipes
export async function searchRecipes(query: string): Promise<Recipe[]> {
  const recipes = await getAllRecipes()
  const searchTerm = query.toLowerCase()
  return recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm) ||
    recipe.description.toLowerCase().includes(searchTerm) ||
    recipe.ingredients.some(ingredient =>
      ingredient.name.toLowerCase().includes(searchTerm)
    )
  )
}

// Database-based functions - no longer need localStorage or importedRecipes

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[æøå]/g, (match) => {
      const replacements: { [key: string]: string } = {
        'æ': 'ae',
        'ø': 'oe',
        'å': 'aa'
      }
      return replacements[match] || match
    })
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
} 