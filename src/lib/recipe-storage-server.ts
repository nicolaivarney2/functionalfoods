import { Recipe } from '@/types/recipe'
import { sampleRecipes } from './sample-data'
import fs from 'fs'
import path from 'path'

const RECIPES_FILE = path.join(process.cwd(), 'data', 'imported-recipes.json')

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Load imported recipes from file
function loadImportedRecipes(): Recipe[] {
  try {
    if (fs.existsSync(RECIPES_FILE)) {
      const data = fs.readFileSync(RECIPES_FILE, 'utf8')
      const recipes = JSON.parse(data)
      return recipes.map((recipe: any) => ({
        ...recipe,
        publishedAt: new Date(recipe.publishedAt),
        updatedAt: new Date(recipe.updatedAt)
      }))
    }
  } catch (error) {
    console.error('Error loading recipes from file:', error)
  }
  return []
}

// Save imported recipes to file
function saveImportedRecipes(recipes: Recipe[]): void {
  try {
    fs.writeFileSync(RECIPES_FILE, JSON.stringify(recipes, null, 2))
    console.log(`Saved ${recipes.length} recipes to file`)
  } catch (error) {
    console.error('Error saving recipes to file:', error)
  }
}

// Server-side storage
let importedRecipes: Recipe[] = loadImportedRecipes()

// Get all recipes (sample + imported) - SERVER ONLY
export function getAllRecipesServer(): Recipe[] {
  return [...sampleRecipes, ...importedRecipes]
}

// Add imported recipes - SERVER ONLY
export function addImportedRecipesServer(recipes: Recipe[]): void {
  // DISABLED: This function is no longer used - recipes are saved directly to database
  console.log('addImportedRecipesServer is disabled - recipes are saved directly to database')
}

// Get recipe by slug - SERVER ONLY
export function getRecipeBySlugServer(slug: string): Recipe | undefined {
  return getAllRecipesServer().find(recipe => recipe.slug === slug)
}

// Get recipes by category - SERVER ONLY
export function getRecipesByCategoryServer(category: string): Recipe[] {
  return getAllRecipesServer().filter(recipe =>
    recipe.dietaryCategories.some(dietaryCategory =>
      dietaryCategory.toLowerCase() === category.toLowerCase()
    )
  )
}

// Search recipes - SERVER ONLY
export function searchRecipesServer(query: string): Recipe[] {
  const searchTerm = query.toLowerCase()
  return getAllRecipesServer().filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm) ||
    recipe.description.toLowerCase().includes(searchTerm) ||
    recipe.ingredients.some(ingredient =>
      ingredient.name.toLowerCase().includes(searchTerm)
    )
  )
}

// Get imported recipes count - SERVER ONLY
export function getImportedRecipesCountServer(): number {
  return importedRecipes.length
}

// Clear imported recipes (for testing) - SERVER ONLY
export function clearImportedRecipesServer(): void {
  importedRecipes = []
  saveImportedRecipes(importedRecipes)
}

// Export all recipes to JSON file (for backup) - SERVER ONLY
export function exportAllRecipesServer(): string {
  return JSON.stringify(getAllRecipesServer(), null, 2)
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