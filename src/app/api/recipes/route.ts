import { NextRequest, NextResponse } from 'next/server'
import { getAllRecipesServer, getImportedRecipesCountServer } from '@/lib/recipe-storage-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    let recipes = getAllRecipesServer() // Uses server-side storage

    // Filter by category if specified
    if (category && category !== 'all') {
      recipes = recipes.filter(recipe =>
        recipe.dietaryCategories.some(dietaryCategory =>
          dietaryCategory.toLowerCase() === category.toLowerCase()
        )
      )
    }

    // Filter by search if specified
    if (search) {
      const searchTerm = search.toLowerCase()
      recipes = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(searchTerm) ||
        recipe.description.toLowerCase().includes(searchTerm) ||
        recipe.ingredients.some(ingredient =>
          ingredient.name.toLowerCase().includes(searchTerm)
        )
      )
    }

    return NextResponse.json({
      recipes,
      total: recipes.length,
      importedCount: getImportedRecipesCountServer() // Uses server-side storage
    })

  } catch (error) {
    console.error('Error getting recipes:', error)
    return NextResponse.json({
      error: 'Failed to get recipes'
    }, { status: 500 })
  }
} 