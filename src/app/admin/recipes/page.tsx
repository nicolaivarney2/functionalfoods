'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink, RefreshCw, Image, FileText, Star, Target } from 'lucide-react'

interface Recipe {
  id: number
  title: string
  slug: string
  description: string
  imageUrl?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  dietaryCategories?: string[]
  difficulty?: string
  totalTime?: number
  servings?: number
  nutritionalInfo?: any
}

export default function RecipeAdminPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRecalculating, setIsRecalculating] = useState<number | null>(null)

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      setRecipes(data)
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const recalculateNutrition = async (recipeId: number, recipeName: string) => {
    if (!confirm(`Recalculate nutrition for "${recipeName}"?`)) return
    
    setIsRecalculating(recipeId)
    
    try {
      const response = await fetch('/api/recalculate-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message}\n\nMatched: ${data.matchedIngredients}/${data.totalIngredients} ingredients`)
        await loadRecipes() // Refresh the list
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error recalculating nutrition:', error)
      alert(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRecalculating(null)
    }
  }

  const getStatusIcon = (condition: boolean, trueIcon: React.ReactNode, falseIcon: React.ReactNode) => (
    <span className={condition ? 'text-green-600' : 'text-red-500'}>
      {condition ? trueIcon : falseIcon}
    </span>
  )

  const hasNutrition = (recipe: Recipe) => 
    (recipe.calories && recipe.calories > 0) || (recipe.nutritionalInfo)

  const hasImage = (recipe: Recipe) => 
    recipe.imageUrl && !recipe.imageUrl.includes('recipe-placeholder.jpg')

  const isOptimized = (recipe: Recipe) => 
    recipe.description && recipe.description.length > 50 && recipe.dietaryCategories && recipe.dietaryCategories.length > 0

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading recipes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recipe Management</h1>
        <p className="text-gray-600">Compact overview of all recipes with quick actions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{recipes.length}</div>
          <div className="text-sm text-gray-600">Total Recipes</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{recipes.filter(hasNutrition).length}</div>
          <div className="text-sm text-gray-600">With Nutrition</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{recipes.filter(hasImage).length}</div>
          <div className="text-sm text-gray-600">With Images</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-purple-600">{recipes.filter(isOptimized).length}</div>
          <div className="text-sm text-gray-600">SEO Optimized</div>
        </div>
      </div>

      {/* Recipes Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3 text-sm font-medium text-gray-900">Recipe</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-900">Category</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-900">Nutrition</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recipes.map((recipe) => (
                <tr key={recipe.id} className="hover:bg-gray-50">
                  {/* Recipe Info */}
                  <td className="px-4 py-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <img
                          src={recipe.imageUrl || '/images/recipe-placeholder.jpg'}
                          alt={recipe.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {recipe.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {recipe.description?.substring(0, 60)}...
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">ID: {recipe.id}</span>
                          {recipe.difficulty && (
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {recipe.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Icons */}
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(hasNutrition(recipe), <Target className="h-4 w-4" />, <Target className="h-4 w-4" />)}
                      {getStatusIcon(hasImage(recipe), <Image className="h-4 w-4" />, <Image className="h-4 w-4" />)}
                      {getStatusIcon(isOptimized(recipe), <FileText className="h-4 w-4" />, <FileText className="h-4 w-4" />)}
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {recipe.dietaryCategories?.slice(0, 2).map((cat, index) => (
                        <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {cat}
                        </span>
                      ))}
                      {(recipe.dietaryCategories?.length || 0) > 2 && (
                        <span className="text-xs text-gray-500">+{(recipe.dietaryCategories?.length || 0) - 2}</span>
                      )}
                    </div>
                  </td>

                  {/* Nutrition Info */}
                  <td className="px-4 py-3">
                    {hasNutrition(recipe) ? (
                      <div className="text-xs text-gray-600">
                        <div>{recipe.calories || Math.round(recipe.nutritionalInfo?.calories || 0)} kcal</div>
                        <div className="text-gray-400">
                          P: {recipe.protein || Math.round(recipe.nutritionalInfo?.protein || 0)}g | 
                          C: {recipe.carbs || Math.round(recipe.nutritionalInfo?.carbs || 0)}g | 
                          F: {recipe.fat || Math.round(recipe.nutritionalInfo?.fat || 0)}g
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-red-500">No nutrition data</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Link
                        href={`/opskrift/${recipe.slug}`}
                        target="_blank"
                        className="text-blue-600 hover:text-blue-800"
                        title="View recipe"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => recalculateNutrition(recipe.id, recipe.title)}
                        disabled={isRecalculating === recipe.id}
                        className={`p-1 rounded ${
                          isRecalculating === recipe.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                        }`}
                        title="Recalculate nutrition"
                      >
                        <RefreshCw className={`h-4 w-4 ${isRecalculating === recipe.id ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No recipes found</p>
        </div>
      )}
    </div>
  )
}