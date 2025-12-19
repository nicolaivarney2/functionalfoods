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
    icon: '✋',
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
  imageUrl?: string
}

export default function CreateRecipePage() {
  const { isAdmin, checking } = useAdminAuth()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editableRecipe, setEditableRecipe] = useState<GeneratedRecipe | null>(null)
  const [recipeStatus, setRecipeStatus] = useState<'ai-preview' | 'ready-to-save' | 'saved'>('ai-preview')
  const [midjourneyPrompt, setMidjourneyPrompt] = useState<string>('')
  const [aiTips, setAiTips] = useState<string>('')

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
    setMidjourneyPrompt('') // Clear previous prompt

    try {
      const category = RECIPE_CATEGORIES.find(c => c.id === selectedCategory)
      if (!category) throw new Error('Kategori ikke fundet')

      setProgress('Tjekker eksisterende opskrifter...')
      
      // Check existing recipes in batches to respect Supabase limit
      const existingRecipes = await loadExistingRecipes()
      
      setProgress(`Genererer ${category.name} opskrift med dedikeret AI assistent...`)
      
      // Generate new recipe using category-specific ChatGPT assistant
      const generateResponse = await fetch(`/api/admin/generate-recipe-${selectedCategory}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          categoryName: category.name,
          existingRecipes: existingRecipes
        })
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        throw new Error(errorData.error || 'Fejl ved generering af opskrift')
      }

      const recipeData = await generateResponse.json()
      
      // Store Midjourney prompt if available
      if (recipeData.midjourneyPrompt) {
        setMidjourneyPrompt(recipeData.midjourneyPrompt)
      }
      
      // Store AI tips if available
      if (recipeData.aiTips) {
        setAiTips(recipeData.aiTips)
      }
      
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

      setProgress('Opskrift genereret!')
      
      const finalRecipe = {
        ...recipeData.recipe,
        imageUrl: '/images/recipe-placeholder.jpg' // Placeholder - upload billede manuelt
      }

      // Set as AI-kladde for editing
      setGeneratedRecipe(finalRecipe)
      setEditableRecipe({ ...finalRecipe })
      setIsEditing(true)

      setProgress('Færdig! AI-kladde klar til redigering')
      
    } catch (error) {
      console.error('Error generating recipe:', error)
      setError(error instanceof Error ? error.message : 'Ukendt fejl')
    } finally {
      setIsGenerating(false)
      setProgress('')
    }
  }

  const loadExistingRecipes = async () => {
    const allRecipes = []
    let page = 0
    const limit = 1000 // Supabase limit
    
    while (true) {
      const response = await fetch(`/api/admin/recipes?page=${page}&limit=${limit}`)
      const data = await response.json()
      
      if (!data.recipes || data.recipes.length === 0) break
      
      allRecipes.push(...data.recipes)
      page++
      
      if (data.recipes.length < limit) break // No more data
    }
    
    return allRecipes
  }

  const handleSaveRecipe = async () => {
    if (!editableRecipe) return

    // Check if image is uploaded
    if (recipeStatus !== 'ready-to-save') {
      alert('⚠️ Du skal uploade et billede før opskriften kan gemmes som kladde')
      return
    }

    try {
      setProgress('Gemmer AI-kladde som rigtig kladde...')
      
      const response = await fetch('/api/admin/save-ai-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe: editableRecipe,
          category: selectedCategory,
          aiTips: aiTips
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fejl ved gemning')
      }

      alert('✅ AI-kladde gemt som rigtig kladde! Du kan nu finde den i Publishing siden.')
      setGeneratedRecipe(null)
      setEditableRecipe(null)
      setIsEditing(false)
      setSelectedCategory(null)
      setRecipeStatus('saved')
      
    } catch (error) {
      console.error('Error saving recipe:', error)
      setError(error instanceof Error ? error.message : 'Fejl ved gemning')
    } finally {
      setProgress('')
    }
  }

  const handleEditRecipe = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditableRecipe(generatedRecipe)
  }

  const handleUpdateEditableRecipe = (field: string, value: any) => {
    if (!editableRecipe) return
    
    setEditableRecipe(prev => {
      if (!prev) return null
      
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        const parentValue = prev[parent as keyof GeneratedRecipe] as any
        return {
          ...prev,
          [parent]: {
            ...(parentValue || {}),
            [child]: value
          }
        }
      }
      
      return {
        ...prev,
        [field]: value
      }
    })
  }

  const handleUpdateIngredient = (index: number, field: string, value: any) => {
    if (!editableRecipe) return
    
    setEditableRecipe(prev => {
      if (!prev) return null
      
      const newIngredients = [...prev.ingredients]
      newIngredients[index] = {
        ...newIngredients[index],
        [field]: value
      }
      
      return {
        ...prev,
        ingredients: newIngredients
      }
    })
  }

  const handleAddIngredient = () => {
    if (!editableRecipe) return

    setEditableRecipe(prev => {
      if (!prev) return null

      return {
        ...prev,
        ingredients: [
          ...(prev.ingredients || []),
          {
            name: '',
            amount: 1,
            unit: 'stk',
            notes: ''
          }
        ]
      }
    })
  }

  const handleUpdateInstruction = (index: number, field: string, value: any) => {
    if (!editableRecipe) return
    
    setEditableRecipe(prev => {
      if (!prev) return null
      
      const newInstructions = [...prev.instructions]
      newInstructions[index] = {
        ...newInstructions[index],
        [field]: value
      }
      
      return {
        ...prev,
        instructions: newInstructions
      }
    })
  }

  const handleAddInstruction = () => {
    if (!editableRecipe) return

    setEditableRecipe(prev => {
      if (!prev) return null

      const nextStepNumber =
        (prev.instructions || []).reduce((max, step) => Math.max(max, step?.stepNumber || 0), 0) + 1

      return {
        ...prev,
        instructions: [
          ...(prev.instructions || []),
          {
            stepNumber: nextStepNumber,
            instruction: '',
            time: undefined,
            tips: ''
          }
        ]
      }
    })
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Filen skal være et billede')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Filen er for stor (max 5MB)')
      return
    }

    try {
      setProgress('Uploader billede...')
      
      const formData = new FormData()
      formData.append('image', file)
      formData.append('recipeId', 'temp-' + Date.now()) // Temporary ID for upload

      const response = await fetch('/api/admin/upload-recipe-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload fejlede')
      }

      const data = await response.json()
      
      // Update editable recipe with new image URL
      setEditableRecipe(prev => prev ? {
        ...prev,
        imageUrl: data.imageUrl
      } : null)

      // Update status to ready-to-save when image is uploaded
      setRecipeStatus('ready-to-save')

      setProgress('Billede uploadet! Opskrift klar til at gemmes')
      setTimeout(() => setProgress(''), 3000)

    } catch (error: any) {
      console.error('Image upload error:', error)
      alert(`Fejl ved upload: ${error.message}`)
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vælg Kategori & Generer Opskrift</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RECIPE_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedCategory === category.id
                        ? `${category.color} text-white border-transparent`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3 mb-3">
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
                    
                    <button
                      onClick={() => {
                        setSelectedCategory(category.id)
                        handleGenerateRecipe()
                      }}
                      disabled={isGenerating}
                      className={`w-full py-2 px-3 rounded-lg transition-colors text-sm font-medium ${
                        selectedCategory === category.id
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isGenerating && selectedCategory === category.id ? 'Genererer...' : `🤖 Generer ${category.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Generated Recipe Preview */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditing ? 'Rediger AI-kladde' : 'AI-kladde Forhåndsvisning'}
                </h2>
                {generatedRecipe && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      recipeStatus === 'ai-preview' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : recipeStatus === 'ready-to-save'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {recipeStatus === 'ai-preview' 
                        ? '🤖 AI-Preview (venter på billede)' 
                        : recipeStatus === 'ready-to-save'
                        ? '✅ Klar til at gemmes'
                        : '💾 Gemt som kladde'
                      }
                    </span>
                  </div>
                )}
              </div>
              {generatedRecipe && !isEditing && (
                <button
                  onClick={handleEditRecipe}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ✏️ Rediger
                </button>
              )}
            </div>
            
            {!generatedRecipe ? (
              <div className="p-8 text-center bg-gray-100 rounded-lg">
                <p className="text-gray-500">Vælg en kategori og generer en opskrift for at se AI-kladde</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Recipe Header */}
                <div>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                        <input
                          type="text"
                          value={editableRecipe?.title || ''}
                          onChange={(e) => handleUpdateEditableRecipe('title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                        <textarea
                          value={editableRecipe?.description || ''}
                          onChange={(e) => handleUpdateEditableRecipe('description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{generatedRecipe.title}</h3>
                      <p className="text-gray-600 mb-4">{generatedRecipe.description}</p>
                    </>
                  )}
                  
                  {/* Recipe Image */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Billede 
                      {recipeStatus === 'ai-preview' && (
                        <span className="ml-2 text-yellow-600 text-sm font-normal">(Påkrævet for at gemme)</span>
                      )}
                    </h4>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={editableRecipe?.imageUrl || '/images/recipe-placeholder.jpg'} 
                            alt="Recipe" 
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="flex-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Max 5MB, JPG/PNG/WebP</p>
                            {recipeStatus === 'ai-preview' && (
                              <p className="text-xs text-yellow-600 mt-1">⚠️ Upload et billede for at kunne gemme opskriften</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={generatedRecipe.imageUrl} 
                        alt={generatedRecipe.title} 
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                  </div>
                  
                  {/* Midjourney Prompt */}
                  {midjourneyPrompt && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        🎨 Midjourney Prompt
                        <span className="ml-2 text-gray-500 text-sm font-normal">(Kopier til Midjourney)</span>
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <textarea
                          value={midjourneyPrompt}
                          readOnly
                          rows={3}
                          className="w-full bg-transparent border-none resize-none text-sm text-gray-700 font-mono"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(midjourneyPrompt)
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            📋 Kopier
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
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
                  {isEditing ? (
                    <div className="space-y-3">
                      {editableRecipe?.ingredients.map((ingredient, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={ingredient.amount}
                              onChange={(e) => handleUpdateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Antal"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={ingredient.unit}
                              onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Enhed"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={ingredient.name}
                              onChange={(e) => handleUpdateIngredient(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Ingrediens navn"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={ingredient.notes || ''}
                              onChange={(e) => handleUpdateIngredient(index, 'notes', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Note"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleAddIngredient}
                          className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
                        >
                          + Tilføj ingrediens
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Fremgangsmåde</h4>
                  {isEditing ? (
                    <div className="space-y-4">
                      {editableRecipe?.instructions.map((step, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                              {step.stepNumber}
                            </span>
                            <span className="text-sm font-medium text-gray-700">Trin {step.stepNumber}</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Instruktion</label>
                              <textarea
                                value={step.instruction}
                                onChange={(e) => handleUpdateInstruction(index, 'instruction', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tid (min)</label>
                                <input
                                  type="number"
                                  value={step.time || ''}
                                  onChange={(e) => handleUpdateInstruction(index, 'time', parseInt(e.target.value) || null)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Tid"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                                <input
                                  type="text"
                                  value={step.tips || ''}
                                  onChange={(e) => handleUpdateInstruction(index, 'tips', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Tip"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleAddInstruction}
                          className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
                        >
                          + Tilføj trin
                        </button>
                      </div>
                    </div>
                  ) : (
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
                  )}
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
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveRecipe}
                        disabled={recipeStatus !== 'ready-to-save'}
                        className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                          recipeStatus === 'ready-to-save'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : recipeStatus === 'ai-preview'
                            ? 'bg-yellow-500 text-white cursor-not-allowed'
                            : 'bg-gray-400 text-white cursor-not-allowed'
                        }`}
                      >
                        {recipeStatus === 'ai-preview' 
                          ? '📸 Upload billede først' 
                          : recipeStatus === 'ready-to-save'
                          ? '💾 Gem som Rigtig Kladde'
                          : '✅ Gemt'
                        }
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        ❌ Annuller
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditRecipe}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        ✏️ Rediger AI-kladde
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedRecipe(null)
                          setEditableRecipe(null)
                          setIsEditing(false)
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        🔄 Generer Ny
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
