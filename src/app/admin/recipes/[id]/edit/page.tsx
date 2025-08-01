'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Plus, X } from 'lucide-react'
import { sampleRecipes } from '@/lib/sample-data'
import { Recipe, Ingredient, RecipeStep } from '@/types/recipe'

interface RecipeFormData {
  title: string
  description: string
  shortDescription: string
  preparationTime: number
  cookingTime: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  mainCategory: string
  subCategories: string[]
  dietaryCategories: string[]
  ingredients: Ingredient[]
  instructions: RecipeStep[]
  imageUrl: string
  imageAlt: string
  servings: number
  difficulty: 'Nem' | 'Mellem' | 'Svær'
  author: string
}

export default function EditRecipe({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [recipe, setRecipe] = useState<RecipeFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const foundRecipe = sampleRecipes.find(r => r.id === params.id)
    if (foundRecipe) {
      setRecipe({
        title: foundRecipe.title,
        description: foundRecipe.description,
        shortDescription: foundRecipe.shortDescription,
        preparationTime: foundRecipe.preparationTime,
        cookingTime: foundRecipe.cookingTime,
        calories: foundRecipe.calories,
        protein: foundRecipe.protein,
        carbs: foundRecipe.carbs,
        fat: foundRecipe.fat,
        fiber: foundRecipe.fiber,
        mainCategory: foundRecipe.mainCategory,
        subCategories: foundRecipe.subCategories,
        dietaryCategories: foundRecipe.dietaryCategories,
        ingredients: foundRecipe.ingredients,
        instructions: foundRecipe.instructions,
        imageUrl: foundRecipe.imageUrl,
        imageAlt: foundRecipe.imageAlt,
        servings: foundRecipe.servings,
        difficulty: foundRecipe.difficulty,
        author: foundRecipe.author,
      })
    }
    setLoading(false)
  }, [params.id])

  const handleSave = async () => {
    setSaving(true)
    // Here you would save to your database
    console.log('Saving recipe:', recipe)
    setTimeout(() => {
      setSaving(false)
      router.push('/admin')
    }, 1000)
  }

  const addIngredient = () => {
    if (!recipe) return
    const newIngredient: Ingredient = {
      id: `temp-${Date.now()}`,
      name: '',
      amount: 0,
      unit: 'g'
    }
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, newIngredient]
    })
  }

  const removeIngredient = (index: number) => {
    if (!recipe) return
    setRecipe({
      ...recipe,
      ingredients: recipe.ingredients.filter((_, i) => i !== index)
    })
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    if (!recipe) return
    const updatedIngredients = [...recipe.ingredients]
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value }
    setRecipe({ ...recipe, ingredients: updatedIngredients })
  }

  const addInstruction = () => {
    if (!recipe) return
    const newInstruction: RecipeStep = {
      id: `temp-${Date.now()}`,
      stepNumber: recipe.instructions.length + 1,
      instruction: ''
    }
    setRecipe({
      ...recipe,
      instructions: [...recipe.instructions, newInstruction]
    })
  }

  const removeInstruction = (index: number) => {
    if (!recipe) return
    setRecipe({
      ...recipe,
      instructions: recipe.instructions.filter((_, i) => i !== index)
    })
  }

  const updateInstruction = (index: number, field: keyof RecipeStep, value: any) => {
    if (!recipe) return
    const updatedInstructions = [...recipe.instructions]
    updatedInstructions[index] = { ...updatedInstructions[index], [field]: value }
    setRecipe({ ...recipe, instructions: updatedInstructions })
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
  }

  if (!recipe) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Recipe not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Recipe</h1>
                <p className="text-gray-600">Update recipe details and content</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center space-x-2"
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Recipe'}</span>
              </button>
              <button className="btn-secondary flex items-center space-x-2">
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={recipe.title}
                    onChange={(e) => setRecipe({ ...recipe, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                  <input
                    type="text"
                    value={recipe.author}
                    onChange={(e) => setRecipe({ ...recipe, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
                  <input
                    type="text"
                    value={recipe.shortDescription}
                    onChange={(e) => setRecipe({ ...recipe, shortDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Description</label>
                  <textarea
                    rows={3}
                    value={recipe.description}
                    onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Categories</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Main Category</label>
                  <select
                    value={recipe.mainCategory}
                    onChange={(e) => setRecipe({ ...recipe, mainCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="Aftensmad">Aftensmad</option>
                    <option value="Frokost">Frokost</option>
                    <option value="Morgenmad">Morgenmad</option>
                    <option value="Salater">Salater</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    value={recipe.difficulty}
                    onChange={(e) => setRecipe({ ...recipe, difficulty: e.target.value as 'Nem' | 'Mellem' | 'Svær' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="Nem">Nem</option>
                    <option value="Mellem">Mellem</option>
                    <option value="Svær">Svær</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Ingredients</h2>
                <button
                  onClick={addIngredient}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  <Plus size={16} />
                  <span>Add Ingredient</span>
                </button>
              </div>
              <div className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Ingredient name"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Instructions</h2>
                <button
                  onClick={addInstruction}
                  className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  <Plus size={16} />
                  <span>Add Step</span>
                </button>
              </div>
              <div className="space-y-3">
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {instruction.stepNumber}
                    </div>
                    <div className="flex-1">
                      <textarea
                        rows={2}
                        placeholder="Instruction step"
                        value={instruction.instruction}
                        onChange={(e) => updateInstruction(index, 'instruction', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => removeInstruction(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timing */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Timing</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preparation Time (min)</label>
                  <input
                    type="number"
                    value={recipe.preparationTime}
                    onChange={(e) => setRecipe({ ...recipe, preparationTime: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cooking Time (min)</label>
                  <input
                    type="number"
                    value={recipe.cookingTime}
                    onChange={(e) => setRecipe({ ...recipe, cookingTime: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Servings</label>
                  <input
                    type="number"
                    value={recipe.servings}
                    onChange={(e) => setRecipe({ ...recipe, servings: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Nutrition */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Nutrition</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Calories</label>
                  <input
                    type="number"
                    value={recipe.calories || ''}
                    onChange={(e) => setRecipe({ ...recipe, calories: parseInt(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Protein (g)</label>
                    <input
                      type="number"
                      value={recipe.protein || ''}
                      onChange={(e) => setRecipe({ ...recipe, protein: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Carbs (g)</label>
                    <input
                      type="number"
                      value={recipe.carbs || ''}
                      onChange={(e) => setRecipe({ ...recipe, carbs: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fat (g)</label>
                    <input
                      type="number"
                      value={recipe.fat || ''}
                      onChange={(e) => setRecipe({ ...recipe, fat: parseFloat(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Image */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Image</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                  <input
                    type="url"
                    value={recipe.imageUrl}
                    onChange={(e) => setRecipe({ ...recipe, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alt Text</label>
                  <input
                    type="text"
                    value={recipe.imageAlt}
                    onChange={(e) => setRecipe({ ...recipe, imageAlt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                {recipe.imageUrl && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.imageAlt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 