'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, BarChart3 } from 'lucide-react'
import { ImportProcessor } from '@/lib/import-processor'
import { RawRecipeData } from '@/lib/recipe-import'

export default function ImportPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  const importProcessor = new ImportProcessor()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setImportResult(null)

    try {
      const text = await file.text()
      const rawData: RawRecipeData[] = JSON.parse(text)

      console.log('📁 Processing uploaded file...')
      const result = await importProcessor.processImport(rawData)

      setImportResult(result)
      setStats(importProcessor.getImportStats())
      
      console.log('✅ Import completed successfully!')
    } catch (err) {
      console.error('❌ Import failed:', err)
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTestImport = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Test with a single recipe
      const testRecipe: RawRecipeData = {
        title: 'Test Kyllingesalat',
        description: 'En sund salat med kylling og grøntsager',
        shortDescription: 'Sund kyllingesalat',
        preparationTime: 15,
        cookingTime: 20,
        calories: 320,
        protein: 28,
        carbs: 8,
        fat: 22,
        fiber: 6,
        mainCategory: 'Frokost',
        subCategories: ['Salat', 'Proteinrig'],
        dietaryCategories: ['Keto', 'LCHF'],
        ingredients: [
          { name: 'kyllingebryst', amount: 200, unit: 'g' },
          { name: 'salat', amount: 100, unit: 'g' },
          { name: 'tomat', amount: 2, unit: 'stk' },
          { name: 'olivenolie', amount: 2, unit: 'spsk' }
        ],
        instructions: [
          { stepNumber: 1, instruction: 'Steg kyllingen' },
          { stepNumber: 2, instruction: 'Bland med salat' }
        ],
        imageUrl: 'https://example.com/test.jpg',
        imageAlt: 'Test kyllingesalat',
        servings: 2,
        difficulty: 'Nem',
        author: 'Test',
        publishedAt: '2024-01-01'
      }

      const result = await importProcessor.processSingleRecipe(testRecipe)
      setImportResult({ recipes: [result], ingredients: [], stats: { totalRecipes: 1, totalIngredients: 4, processedIngredients: 4, recipesWithNutrition: 1, processingTime: 1000 } })
      setStats(importProcessor.getImportStats())
      
    } catch (err) {
      console.error('❌ Test import failed:', err)
      setError(err instanceof Error ? err.message : 'Test import failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFridaTest = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Test with a single recipe
      const testRecipe: RawRecipeData = {
        title: 'Test Kyllingesalat',
        description: 'En sund salat med kylling og grøntsager',
        shortDescription: 'Sund kyllingesalat',
        preparationTime: 15,
        cookingTime: 20,
        calories: 320,
        protein: 28,
        carbs: 8,
        fat: 22,
        fiber: 6,
        mainCategory: 'Frokost',
        subCategories: ['Salat', 'Proteinrig'],
        dietaryCategories: ['Keto', 'LCHF'],
        ingredients: [
          { name: 'kyllingebryst', amount: 200, unit: 'g' },
          { name: 'salat', amount: 100, unit: 'g' },
          { name: 'tomat', amount: 2, unit: 'stk' },
          { name: 'olivenolie', amount: 2, unit: 'spsk' }
        ],
        instructions: [
          { stepNumber: 1, instruction: 'Steg kyllingen' },
          { stepNumber: 2, instruction: 'Bland med salat' }
        ],
        imageUrl: 'https://example.com/test.jpg',
        imageAlt: 'Test kyllingesalat',
        servings: 2,
        difficulty: 'Nem',
        author: 'Test',
        publishedAt: '2024-01-01'
      }

      const result = await importProcessor.processSingleRecipe(testRecipe)
      setImportResult({ recipes: [result], ingredients: [], stats: { totalRecipes: 1, totalIngredients: 4, processedIngredients: 4, recipesWithNutrition: 1, processingTime: 1000 } })
      setStats(importProcessor.getImportStats())
      
    } catch (err) {
      console.error('❌ Frida test import failed:', err)
      setError(err instanceof Error ? err.message : 'Frida test import failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Recipe Import</h1>
              <p className="text-gray-600">Import recipes with automatic ingredient tagging and nutritional calculation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container">
          <nav className="flex space-x-8">
            <a href="/admin" className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300">
              Dashboard
            </a>
            <a href="/admin/ingredients" className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300">
              Ingredients
            </a>
            <a href="/admin/import" className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
              Import
            </a>
            <a href="/admin/recipes" className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300">
              Recipes
            </a>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Ingredients</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalIngredients}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart3 className="text-blue-600" size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">With Nutritional Data</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ingredientsWithNutrition}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <BarChart3 className="text-green-600" size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Coverage</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalIngredients > 0 ? Math.round((stats.ingredientsWithNutrition / stats.totalIngredients) * 100) : 0}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="text-purple-600" size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Categories</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.ingredientCategories || {}).length}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <BarChart3 className="text-orange-600" size={20} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Recipes</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Recipe JSON File
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <button
                  onClick={handleTestImport}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <FileText size={16} />
                  <span>Test Import</span>
                </button>
                <button
                  onClick={handleFridaTest}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <BarChart3 size={16} />
                  <span>Test Frida</span>
                </button>
              </div>
            </div>

            {isProcessing && (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="animate-spin" size={20} />
                <span>Processing import...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Import Results */}
        {importResult && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Results</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Total Recipes</p>
                <p className="text-2xl font-bold text-blue-900">{importResult.stats.totalRecipes}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-600">Total Ingredients</p>
                <p className="text-2xl font-bold text-green-900">{importResult.stats.totalIngredients}</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-purple-600">With Nutritional Data</p>
                <p className="text-2xl font-bold text-purple-900">{importResult.stats.processedIngredients}</p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-orange-600">Processing Time</p>
                <p className="text-2xl font-bold text-orange-900">{importResult.stats.processingTime}ms</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900">Processed Ingredients</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {importResult.ingredients.slice(0, 12).map((ingredient: any) => (
                  <div key={ingredient.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{ingredient.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ingredient.nutritionalInfo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ingredient.nutritionalInfo ? 'With Data' : 'No Data'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{ingredient.category}</p>
                    {ingredient.nutritionalInfo && (
                      <div className="text-xs text-gray-500 mt-2">
                        {ingredient.nutritionalInfo.caloriesPer100g} cal/100g
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {importResult.ingredients.length > 12 && (
                <p className="text-sm text-gray-500">
                  ... and {importResult.ingredients.length - 12} more ingredients
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 