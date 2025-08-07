import { Recipe } from '@/types/recipe'

// Client-side storage using API routes
export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    const response = await fetch('/api/recipes')
    const data = await response.json()
    return data.recipes || []
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return []
  }
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | undefined> {
  try {
    const response = await fetch(`/api/recipes/${slug}`)
    if (response.ok) {
      return await response.json()
    }
    return undefined
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return undefined
  }
}

export async function getRecipesByCategory(category: string): Promise<Recipe[]> {
  try {
    const response = await fetch(`/api/recipes?category=${encodeURIComponent(category)}`)
    const data = await response.json()
    return data.recipes || []
  } catch (error) {
    console.error('Error fetching recipes by category:', error)
    return []
  }
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  try {
    const response = await fetch(`/api/recipes?search=${encodeURIComponent(query)}`)
    const data = await response.json()
    return data.recipes || []
  } catch (error) {
    console.error('Error searching recipes:', error)
    return []
  }
}

export async function getImportedRecipesCount(): Promise<number> {
  try {
    const response = await fetch('/api/recipes')
    const data = await response.json()
    return data.importedCount || 0
  } catch (error) {
    console.error('Error getting imported count:', error)
    return 0
  }
} 