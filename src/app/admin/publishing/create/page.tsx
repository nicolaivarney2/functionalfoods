'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface RecipeCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

const RECIPE_CATEGORIES: RecipeCategory[] = [
  {
    id: 'familiemad',
    name: 'Familiemad',
    description: 'Klassiske, næringsrige retter der passer til hele familien',
    icon: '👨‍👩‍👧‍👦',
    color: 'bg-blue-500',
    difficulty: 'Easy'
  },
  {
    id: 'keto',
    name: 'Keto',
    description: 'Lav-kulhydrat, høj-fedt retter for ketose',
    icon: '🥑',
    color: 'bg-green-500',
    difficulty: 'Medium'
  },
  {
    id: 'sense',
    name: 'Sense',
    description: 'Sunde, balancerede retter med fokus på næring',
    icon: '🧠',
    color: 'bg-purple-500',
    difficulty: 'Easy'
  },
  {
    id: 'paleo',
    name: 'Paleo/LCHF',
    description: 'Præhistorisk kost med lav kulhydrat, høj fedt',
    icon: '🦕',
    color: 'bg-orange-500',
    difficulty: 'Medium'
  },
  {
    id: 'antiinflammatorisk',
    name: 'Antiinflammatorisk',
    description: 'Retter der bekæmper inflammation i kroppen',
    icon: '🌿',
    color: 'bg-emerald-500',
    difficulty: 'Medium'
  },
  {
    id: 'fleksitarisk',
    name: 'Fleksitarisk',
    description: 'Primært plantebaseret med mulighed for kød',
    icon: '🌱',
    color: 'bg-teal-500',
    difficulty: 'Easy'
  },
  {
    id: '5-2',
    name: '5:2 Faste',
    description: 'Retter til 5:2 faste dage (500-600 kalorier)',
    icon: '⏰',
    color: 'bg-indigo-500',
    difficulty: 'Hard'
  },
  {
    id: 'meal-prep',
    name: 'Meal Prep (3 dage)',
    description: 'Avancerede meal prep retter til 3 dage',
    icon: '📦',
    color: 'bg-red-500',
    difficulty: 'Hard'
  }
]

interface GeneratedRecipe {
  title: string
  description: string
  ingredients: Array<{
    name: string
    amount: number
    unit: string
    notes?: string
  }>
  instructions: Array<{
    stepNumber: number
    instruction: string
    time?: number
    tips?: string
  }>
  servings: number
  prepTime: number
  cookTime: number
  difficulty: string
  dietaryCategories: string[]
  nutritionalInfo: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

export default function CreateRecipePage() {
  const { isAdmin, checking } = useAdminAuth()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  // Redirect if not admin
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Tjekker admin adgang...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Adgang nægtet</h1>
          <p className="text-gray-600">Du har ikke adgang til denne side.</p>
        </div>
      </div>
    )
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setGeneratedRecipe(null)
    setError(null)
  }

  const handleGenerateRecipe = async () => {
    if (!selectedCategory) return

    setIsGenerating(true)
    setError(null)
    setProgress('Initialiserer...')

    try {
      const category = RECIPE_CATEGORIES.find(c => c.id === selectedCategory)
      if (!category) throw new Error('Kategori ikke fundet')

      setProgress('Tjekker eksisterende opskrifter...')
      
      // Check existing recipes
      const existingResponse = await fetch('/api/admin/recipes')
      const existingRecipes = await existingResponse.json()
      
      setProgress('Genererer ny opskrift med AI...')
      
      // Generate new recipe
      const generateResponse = await fetch('/api/admin/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: selectedCategory,
          categoryName: category.name,
          existingRecipes: existingRecipes.recipes || []
        })
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        throw new Error(errorData.error || 'Fejl ved generering af opskrift')
      }

      const recipeData = await generateResponse.json()
      
      setProgress('Validerer opskrift...')
      
      // Validate recipe
      const validateResponse = await fetch('/api/admin/validate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe: recipeData.recipe
        })
      })

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json()
        throw new Error(errorData.error || 'Validering fejlede')
      }

      const validationData = await validateResponse.json()
      
      if (!validationData.isValid) {
        throw new Error(`Validering fejlede: ${validationData.reasons.join(', ')}`)
      }

      setProgress('Genererer billede...')
      
      // Generate image via Make webhook
      const imageResponse = await fetch('/api/admin/generate-recipe-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe: recipeData.recipe,
          category: category.name
        })
      })

      if (!imageResponse.ok) {
        console.warn('Billede generering fejlede, fortsætter uden billede')
      }

      const imageData = await imageResponse.ok ? await imageResponse.json() : { imageUrl: null }

      setGeneratedRecipe({
        ...recipeData.recipe,
        imageUrl: imageData.imageUrl || '/images/recipe-placeholder.jpg'
      })

      setProgress('Færdig!')
      
    } catch (error) {
      console.error('Error generating recipe:', error)
      setError(error instanceof Error ? error.message : 'Ukendt fejl')
    } finally {
      setIsGenerating(false)
      setProgress('')
    }
  }

  const handleSaveRecipe = async () => {
    if (!generatedRecipe) return

    try {
      setProgress('Gemmer opskrift...')
      
      const response = await fetch('/api/admin/save-generated-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe: generatedRecipe,
          category: selectedCategory
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fejl ved gemning')
      }

      alert('✅ Opskrift gemt succesfuldt!')
      setGeneratedRecipe(null)
      setSelectedCategory(null)
      
    } catch (error) {
      console.error('Error saving recipe:', error)
      setError(error instanceof Error ? error.message : 'Fejl ved gemning')
    } finally {
      setProgress('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Opret Opskrift</h1>
          <p className="text-gray-600">Generer nye opskrifter med AI baseret på valgt kategori</p>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800 font-medium">{progress}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Selection */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vælg Kategori</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RECIPE_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    disabled={isGenerating}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedCategory === category.id
                        ? `${category.color} text-white border-transparent`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className={`text-sm mt-1 ${
                          selectedCategory === category.id ? 'text-white/90' : 'text-gray-600'
                        }`}>
                          {category.description}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            selectedCategory === category.id 
                              ? 'bg-white/20 text-white' 
                              : category.difficulty === 'Easy' 
                                ? 'bg-green-100 text-green-800'
                                : category.difficulty === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                          }`}>
                            {category.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            {selectedCategory && (
              <div className="pt-4">
                <button
                  onClick={handleGenerateRecipe}
                  disabled={isGenerating}
                  className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${
                    isGenerating
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isGenerating ? 'Genererer...' : '🚀 Generer Opskrift'}
                </button>
              </div>
            )}
          </div>

          {/* Generated Recipe Preview */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Forhåndsvisning</h2>
            
            {!generatedRecipe ? (
              <div className="p-8 text-center bg-gray-100 rounded-lg">
                <p className="text-gray-500">Vælg en kategori og generer en opskrift for at se forhåndsvisning</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Recipe Header */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{generatedRecipe.title}</h3>
                  <p className="text-gray-600 mb-4">{generatedRecipe.description}</p>
                  
                  {/* Recipe Meta */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Portioner:</span>
                      <p className="text-gray-600">{generatedRecipe.servings}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Forberedelse:</span>
                      <p className="text-gray-600">{generatedRecipe.prepTime} min</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tilberedning:</span>
                      <p className="text-gray-600">{generatedRecipe.cookTime} min</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Sværhedsgrad:</span>
                      <p className="text-gray-600">{generatedRecipe.difficulty}</p>
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Ingredienser</h4>
                  <ul className="space-y-2">
                    {generatedRecipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex justify-between">
                        <span className="text-gray-700">
                          {ingredient.amount} {ingredient.unit} {ingredient.name}
                        </span>
                        {ingredient.notes && (
                          <span className="text-gray-500 text-sm">({ingredient.notes})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Fremgangsmåde</h4>
                  <ol className="space-y-3">
                    {generatedRecipe.instructions.map((step, index) => (
                      <li key={index} className="flex">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                          {step.stepNumber}
                        </span>
                        <div className="flex-1">
                          <p className="text-gray-700">{step.instruction}</p>
                          {step.time && (
                            <p className="text-sm text-gray-500 mt-1">⏱️ {step.time} minutter</p>
                          )}
                          {step.tips && (
                            <p className="text-sm text-blue-600 mt-1">💡 {step.tips}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Nutrition Info */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Næringsindhold (per portion)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Kalorier</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.calories}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Protein</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.protein}g</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Kulhydrater</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.carbs}g</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Fedt</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.fat}g</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Fiber</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.fiber}g</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSaveRecipe}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    💾 Gem Opskrift
                  </button>
                  <button
                    onClick={() => setGeneratedRecipe(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    🔄 Generer Ny
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
