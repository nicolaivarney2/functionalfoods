'use client'

import { useState, useEffect } from 'react'

export default function TestRecipesPage() {
  const [recipes, setRecipes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        console.log('🔄 Loading recipes...')
        const response = await fetch('/api/recipes')
        console.log('📡 Response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Loaded ${data.length} recipes`)
          console.log('📋 First recipe:', data[0])
          setRecipes(data)
        } else {
          const errorText = await response.text()
          console.error('❌ API error:', response.status, errorText)
          setError(`API Error: ${response.status} - ${errorText}`)
        }
      } catch (err) {
        console.error('❌ Fetch error:', err)
        setError(`Fetch Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadRecipes()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Test Recipes Loading</h1>
          <div className="text-center">
            <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading recipes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Test Recipes Loading</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Test Recipes Loading</h1>
        
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          <strong>Success!</strong> Loaded {recipes.length} recipes
        </div>

        <div className="grid gap-4">
          {recipes.map((recipe, index) => (
            <div key={recipe.id} className="bg-white p-4 rounded-lg border">
              <h3 className="font-semibold text-lg">{recipe.title}</h3>
              <p className="text-gray-600 text-sm">{recipe.description}</p>
              <div className="mt-2 text-sm text-gray-500">
                <span>Time: {recipe.totalTime} min</span>
                <span className="ml-4">Servings: {recipe.servings}</span>
                <span className="ml-4">Difficulty: {recipe.difficulty}</span>
              </div>
              {recipe.dietaryCategories && (
                <div className="mt-2">
                  <span className="text-sm text-gray-500">Categories: </span>
                  {recipe.dietaryCategories.map((cat: string) => (
                    <span key={cat} className="inline-block bg-gray-200 px-2 py-1 rounded text-xs mr-1">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 