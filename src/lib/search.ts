import { Recipe } from '@/types/recipe'

export interface SearchFilters {
  query?: string
  category?: string
  dietary?: string[]
  difficulty?: string[]
  maxTime?: number
  maxCalories?: number
  ingredients?: string[]
}

export function searchRecipes(recipes: Recipe[], filters: SearchFilters): Recipe[] {
  return recipes.filter(recipe => {
    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase()
      const searchText = [
        recipe.title,
        recipe.description,
        recipe.shortDescription,
        ...recipe.ingredients.map(i => i.name),
        ...recipe.dietaryCategories,
        recipe.mainCategory
      ].join(' ').toLowerCase()
      
      if (!searchText.includes(query)) return false
    }
    
    // Category filter
    if (filters.category && recipe.mainCategory !== filters.category) {
      return false
    }
    
    // Dietary filter
    if (filters.dietary && filters.dietary.length > 0) {
      const hasMatchingDietary = filters.dietary.some(dietary =>
        recipe.dietaryCategories.some(cat => 
          cat.toLowerCase() === dietary.toLowerCase()
        )
      )
      if (!hasMatchingDietary) return false
    }
    
    // Difficulty filter
    if (filters.difficulty && filters.difficulty.length > 0) {
      if (!filters.difficulty.includes(recipe.difficulty)) {
        return false
      }
    }
    
    // Time filter
    if (filters.maxTime && recipe.totalTime > filters.maxTime) {
      return false
    }
    
    // Calories filter
    if (filters.maxCalories && recipe.calories && recipe.calories > filters.maxCalories) {
      return false
    }
    
    // Ingredients filter
    if (filters.ingredients && filters.ingredients.length > 0) {
      const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase())
      const hasAllIngredients = filters.ingredients.every(ingredient =>
        recipeIngredients.some(recipeIngredient =>
          recipeIngredient.includes(ingredient.toLowerCase())
        )
      )
      if (!hasAllIngredients) return false
    }
    
    return true
  })
}

export function sortRecipes(recipes: Recipe[], sortBy: string): Recipe[] {
  const sorted = [...recipes]
  
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    
    case 'oldest':
      return sorted.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())
    
    case 'time-asc':
      return sorted.sort((a, b) => a.totalTime - b.totalTime)
    
    case 'time-desc':
      return sorted.sort((a, b) => b.totalTime - a.totalTime)
    
    case 'calories-asc':
      return sorted.sort((a, b) => (a.calories || 0) - (b.calories || 0))
    
    case 'calories-desc':
      return sorted.sort((a, b) => (b.calories || 0) - (a.calories || 0))
    
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    
    case 'popularity':
      return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    
    default:
      return sorted
  }
} 