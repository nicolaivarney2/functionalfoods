import { Recipe } from '@/types/recipe'
import { sampleRecipes } from './sample-data'

// Simple in-memory storage for development
let importedRecipes: Recipe[] = []

// Get all recipes (sample + imported)
export function getAllRecipes(): Recipe[] {
  return [...sampleRecipes, ...importedRecipes]
}

// Add imported recipes
export function addImportedRecipes(recipes: Recipe[]): void {
  // Generate unique IDs for imported recipes
  const recipesWithIds = recipes.map((recipe, index) => ({
    ...recipe,
    id: `imported-${Date.now()}-${index}`,
    slug: recipe.slug || generateSlug(recipe.title)
  }))
  
  importedRecipes = [...importedRecipes, ...recipesWithIds]
  
  // Save to localStorage for persistence
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('importedRecipes', JSON.stringify(importedRecipes))
      console.log(`Saved ${recipesWithIds.length} recipes to localStorage`)
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }
  
  console.log(`Added ${recipesWithIds.length} imported recipes`)
  console.log('Total recipes:', getAllRecipes().length)
}

// Get recipe by slug
export function getRecipeBySlug(slug: string): Recipe | undefined {
  return getAllRecipes().find(recipe => recipe.slug === slug)
}

// Get recipes by category
export function getRecipesByCategory(category: string): Recipe[] {
  return getAllRecipes().filter(recipe =>
    recipe.dietaryCategories.some(dietaryCategory =>
      dietaryCategory.toLowerCase() === category.toLowerCase()
    )
  )
}

// Search recipes
export function searchRecipes(query: string): Recipe[] {
  const searchTerm = query.toLowerCase()
  return getAllRecipes().filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm) ||
    recipe.description.toLowerCase().includes(searchTerm) ||
    recipe.ingredients.some(ingredient =>
      ingredient.name.toLowerCase().includes(searchTerm)
    )
  )
}

// Get imported recipes count
export function getImportedRecipesCount(): number {
  return importedRecipes.length
}

// Clear imported recipes (for testing)
export function clearImportedRecipes(): void {
  importedRecipes = []
  if (typeof window !== 'undefined') {
    localStorage.removeItem('importedRecipes')
  }
}

// Load recipes from localStorage on client side
export function loadRecipesFromStorage(): void {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('importedRecipes')
      if (stored) {
        importedRecipes = JSON.parse(stored).map((recipe: any) => ({
          ...recipe,
          publishedAt: new Date(recipe.publishedAt),
          updatedAt: new Date(recipe.updatedAt)
        }))
        console.log(`Loaded ${importedRecipes.length} recipes from localStorage`)
      }
    } catch (error) {
      console.error('Error loading recipes from localStorage:', error)
    }
  }
}

// Initialize recipes on client side
if (typeof window !== 'undefined') {
  loadRecipesFromStorage()
}

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