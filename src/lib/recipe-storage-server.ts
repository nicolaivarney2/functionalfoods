import { Recipe } from '@/types/recipe'
import { databaseService } from './database-service'

// Get all recipes from database - SERVER ONLY
export async function getAllRecipesServer(): Promise<Recipe[]> {
  try {
    return await databaseService.getRecipes()
  } catch (error) {
    console.error('Error fetching recipes from database:', error)
    return []
  }
}

// Database-based functions - no longer need file storage or importedRecipes