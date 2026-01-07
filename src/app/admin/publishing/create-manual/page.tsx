'use client'

import { useState } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Recipe, Ingredient, RecipeStep } from '@/types/recipe'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'

export default function CreateManualRecipePage() {
  const { isAdmin, checking } = useAdminAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Recipe form state
  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    title: '',
    slug: '',
    description: '',
    shortDescription: '',
    preparationTime: 0,
    cookingTime: 0,
    totalTime: 0,
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    mainCategory: 'Aftensmad',
    subCategories: ['Aftensmad'],
    dietaryCategories: [],
    ingredients: [],
    instructions: [],
    imageUrl: '/images/recipe-placeholder.jpg',
    imageAlt: '',
    servings: 2,
    difficulty: 'Mellem',
    author: 'Ketoliv',
    status: 'draft'
  })

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

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleTitleChange = (title: string) => {
    setRecipe(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      metaTitle: title ? `${title} - [Keto] | Functional Foods` : '',
      metaDescription: title ? `${title} - [Keto]` : '',
      imageAlt: title ? `${title} - Ketoliv` : ''
    }))
  }

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: `temp-${Date.now()}`,
      name: '',
      amount: 0,
      unit: 'gram',
      notes: ''
    }
    setRecipe(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), newIngredient]
    }))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients?.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      ) || []
    }))
  }

  const removeIngredient = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index) || []
    }))
  }

  const addInstruction = () => {
    const newInstruction: RecipeStep = {
      id: `temp-${Date.now()}`,
      stepNumber: (recipe.instructions?.length || 0) + 1,
      instruction: ''
    }
    setRecipe(prev => ({
      ...prev,
      instructions: [...(prev.instructions || []), newInstruction]
    }))
  }

  const updateInstruction = (index: number, field: keyof RecipeStep, value: any) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      ) || []
    }))
  }

  const removeInstruction = (index: number) => {
    setRecipe(prev => ({
      ...prev,
      instructions: prev.instructions?.filter((_, i) => i !== index) || []
    }))
  }

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !recipe.keywords?.includes(keyword.trim())) {
      setRecipe(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), keyword.trim()]
      }))
    }
  }

  const removeKeyword = (keyword: string) => {
    setRecipe(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keyword) || []
    }))
  }

  const addDietaryCategory = (category: string) => {
    if (category.trim() && !recipe.dietaryCategories?.includes(category.trim())) {
      setRecipe(prev => ({
        ...prev,
        dietaryCategories: [...(prev.dietaryCategories || []), category.trim()]
      }))
    }
  }

  const removeDietaryCategory = (category: string) => {
    setRecipe(prev => ({
      ...prev,
      dietaryCategories: prev.dietaryCategories?.filter(c => c !== category) || []
    }))
  }

  const calculateTotalTime = () => {
    const prep = recipe.preparationTime || 0
    const cook = recipe.cookingTime || 0
    setRecipe(prev => ({ ...prev, totalTime: prep + cook }))
  }

  const handleSave = async () => {
    if (!recipe.title || !recipe.description || !recipe.ingredients?.length || !recipe.instructions?.length) {
      setError('Udfyld alle påkrævede felter')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Transform data to match API expectations
      const apiRecipe = {
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients?.map(ing => ({
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          notes: ing.notes
        })) || [],
        instructions: recipe.instructions?.map(inst => ({
          stepNumber: inst.stepNumber,
          instruction: inst.instruction,
          time: inst.time,
          tips: inst.tips
        })) || [],
        servings: recipe.servings || 2,
        prepTime: recipe.preparationTime || 0,
        cookTime: recipe.cookingTime || 0,
        difficulty: recipe.difficulty || 'Mellem',
        dietaryCategories: recipe.dietaryCategories || [],
        nutritionalInfo: {
          calories: 0, // Will be calculated later
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0
        },
        imageUrl: recipe.imageUrl || '/images/recipe-placeholder.jpg'
      }

      const response = await fetch('/api/admin/save-generated-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe: apiRecipe,
          category: 'manual' // Use a default category for manual recipes
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Kunne ikke gemme opskrift')
      }

      setSuccess(true)
      // Reset form
      setRecipe({
        title: '',
        slug: '',
        description: '',
        shortDescription: '',
        preparationTime: 0,
        cookingTime: 0,
        totalTime: 0,
        metaTitle: '',
        metaDescription: '',
        keywords: [],
        mainCategory: 'Aftensmad',
        subCategories: ['Aftensmad'],
        dietaryCategories: [],
        ingredients: [],
        instructions: [],
        imageUrl: '/images/recipe-placeholder.jpg',
        imageAlt: '',
        servings: 2,
        difficulty: 'Mellem',
        author: 'Ketoliv',
        status: 'draft'
      })
    } catch (error) {
      console.error('Error saving recipe:', error)
      setError(error instanceof Error ? error.message : 'Ukendt fejl')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <a
              href="/admin/publishing"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tilbage til Publishing
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Opret Opskrift Manuelt</h1>
          <p className="mt-2 text-gray-600">
            Udfyld alle felter for at oprette en ny opskrift. Ernæringsindholdet beregnes automatisk efter oprettelse.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">✅ Opskrift oprettet succesfuldt!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Grundlæggende Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={recipe.title || ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Indtast opskriftens titel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={recipe.slug || ''}
                  onChange={(e) => setRecipe(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="opskrift-slug"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beskrivelse *
                </label>
                <textarea
                  value={recipe.description || ''}
                  onChange={(e) => setRecipe(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Beskriv opskriften"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kort beskrivelse
                </label>
                <textarea
                  value={recipe.shortDescription || ''}
                  onChange={(e) => setRecipe(prev => ({ ...prev, shortDescription: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kort beskrivelse af opskriften"
                />
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tidsforbrug</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forberedelsestid (min)
                </label>
                <input
                  type="number"
                  value={recipe.preparationTime || 0}
                  onChange={(e) => {
                    setRecipe(prev => ({ ...prev, preparationTime: parseInt(e.target.value) || 0 }))
                    calculateTotalTime()
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tilberedningstid (min)
                </label>
                <input
                  type="number"
                  value={recipe.cookingTime || 0}
                  onChange={(e) => {
                    setRecipe(prev => ({ ...prev, cookingTime: parseInt(e.target.value) || 0 }))
                    calculateTotalTime()
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total tid (min)
                </label>
                <input
                  type="number"
                  value={recipe.totalTime || 0}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Kategorier</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hovedkategori
                </label>
                <select
                  value={recipe.mainCategory || 'Aftensmad'}
                  onChange={(e) => setRecipe(prev => ({ ...prev, mainCategory: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Aftensmad">Aftensmad</option>
                  <option value="Frokost">Frokost</option>
                  <option value="Morgenmad">Morgenmad</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Is">Is</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Antal portioner
                </label>
                <input
                  type="number"
                  value={recipe.servings || 2}
                  onChange={(e) => setRecipe(prev => ({ ...prev, servings: parseInt(e.target.value) || 2 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sværhedsgrad
                </label>
                <select
                  value={recipe.difficulty || 'Mellem'}
                  onChange={(e) => setRecipe(prev => ({ ...prev, difficulty: e.target.value as 'Nem' | 'Mellem' | 'Svær' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Nem">Nem</option>
                  <option value="Mellem">Mellem</option>
                  <option value="Svær">Svær</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dietary Categories */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Kostkategorier</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {recipe.dietaryCategories?.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {category}
                    <button
                      onClick={() => removeDietaryCategory(category)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tilføj kostkategori (f.eks. Keto, Paleo, LCHF)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addDietaryCategory(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement
                    addDietaryCategory(input.value)
                    input.value = ''
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tilføj
                </button>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Ingredienser *</h2>
              <button
                onClick={addIngredient}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tilføj ingrediens
              </button>
            </div>
            <div className="space-y-4">
              {recipe.ingredients?.map((ingredient, index) => (
                <div key={ingredient.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Navn
                    </label>
                    <input
                      type="text"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ingrediens navn"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mængde
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={(() => {
                        if (ingredient.amount === 0 || ingredient.amount === null || ingredient.amount === undefined) {
                          return ''
                        }
                        const str = String(ingredient.amount)
                        if (str.includes('.')) {
                          return str.replace('.', ',')
                        }
                        return str
                      })()}
                      onChange={(e) => {
                        let value = e.target.value
                        // Tillad kun tal, komma og punktum
                        value = value.replace(/[^\d,.]/g, '')
                        
                        // Tillad kun ét komma eller ét punktum
                        const commaIndex = value.indexOf(',')
                        const dotIndex = value.indexOf('.')
                        if (commaIndex !== -1 && dotIndex !== -1) {
                          if (commaIndex < dotIndex) {
                            value = value.replace(/\./g, '')
                          } else {
                            value = value.replace(/,/g, '')
                          }
                        }
                        
                        // Opdater input-værdien direkte
                        e.target.value = value
                        
                        // Hvis tom eller kun komma, sæt til 0
                        if (value === '' || value === ',') {
                          updateIngredient(index, 'amount', 0)
                          return
                        }
                        
                        // Konverter komma til punktum for parsing
                        const normalizedValue = value.replace(',', '.')
                        const numValue = parseFloat(normalizedValue)
                        
                        if (!isNaN(numValue) && isFinite(numValue)) {
                          updateIngredient(index, 'amount', numValue)
                        }
                      }}
                      onBlur={(e) => {
                        let value = e.target.value.trim()
                        if (value === '' || value === ',') {
                          updateIngredient(index, 'amount', 0)
                          return
                        }
                        const normalizedValue = value.replace(',', '.')
                        const numValue = parseFloat(normalizedValue)
                        if (!isNaN(numValue) && isFinite(numValue)) {
                          updateIngredient(index, 'amount', numValue)
                        } else {
                          updateIngredient(index, 'amount', 0)
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enhed
                    </label>
                    <select
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gram">gram</option>
                      <option value="ml">ml</option>
                      <option value="stk">stk</option>
                      <option value="spsk">spsk</option>
                      <option value="tsk">tsk</option>
                      <option value="bundt">bundt</option>
                      <option value="dåse">dåse</option>
                      <option value="pakke">pakke</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Fremgangsmåde *</h2>
              <button
                onClick={addInstruction}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tilføj trin
              </button>
            </div>
            <div className="space-y-4">
              {recipe.instructions?.map((instruction, index) => (
                <div key={instruction.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                    {instruction.stepNumber}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={instruction.instruction}
                      onChange={(e) => updateInstruction(index, 'instruction', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Beskriv trinnet"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => removeInstruction(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">SEO Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={recipe.metaTitle || ''}
                  onChange={(e) => setRecipe(prev => ({ ...prev, metaTitle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Meta title for søgemaskiner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta Description
                </label>
                <textarea
                  value={recipe.metaDescription || ''}
                  onChange={(e) => setRecipe(prev => ({ ...prev, metaDescription: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Meta description for søgemaskiner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords
                </label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {recipe.keywords?.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="ml-2 text-gray-600 hover:text-gray-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tilføj nøgleord"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addKeyword(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement
                        addKeyword(input.value)
                        input.value = ''
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Tilføj
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Gemmer...' : 'Gem Opskrift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
