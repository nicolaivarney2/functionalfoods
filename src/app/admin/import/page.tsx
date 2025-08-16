'use client'

import { useState, useRef } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { Upload, Database, CheckCircle, AlertCircle, Loader2, BarChart3, FileText } from 'lucide-react'
import { ImportProcessor } from '@/lib/import-processor'
import { RawRecipeData } from '@/lib/recipe-import'
import { databaseService } from '@/lib/database-service'
import { ingredientMatcher } from '@/lib/ingredient-matcher'

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [dbStats, setDbStats] = useState<any>(null)

  const importProcessor = new ImportProcessor()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)
    setImportResult(null)
    setSaveStatus(null)

    try {
      const text = await file.text()
      const rawData = JSON.parse(text)

      console.log('📁 Processing uploaded file...')
      console.log('🔍 Detected format:', rawData.length > 0 && rawData[0].ingredients_flat ? 'Ketoliv' : 'Standard')
      
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

  const handleSaveRecipes = async () => {
    if (!importResult) return

    setIsSaving(true)
    setSaveStatus('Initialiserer ingredient matcher...')

    try {
      // Initialize ingredient matcher
      await ingredientMatcher.initialize()
      
      setSaveStatus('Behandler ingredienser for duplikater...')
      
      // Process ingredients to remove duplicates
      const { newIngredients, matchedIngredients, skippedCount } = await ingredientMatcher.processIngredients(importResult.ingredients)
      
      console.log('🔍 Ingredient matching results:')
      console.log(`  - Total ingredients: ${importResult.ingredients.length}`)
      console.log(`  - New ingredients: ${newIngredients.length}`)
      console.log(`  - Skipped duplicates: ${skippedCount}`)
      
      setSaveStatus(`Gemmer ${importResult.recipes.length} opskrifter og ${newIngredients.length} nye ingredienser (server-side)...`)

      // Save via server-side API (downloads images + bypasses RLS)
      const saveRes = await fetch('/api/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes: importResult.recipes, ingredients: newIngredients })
      })
      const saveJson = await saveRes.json().catch(() => ({}))

      console.log('🔍 Save API response:', {
        status: saveRes.status,
        ok: saveRes.ok,
        response: saveJson
      })

      if (saveRes.ok && saveJson.success) {
        setSaveStatus(`✅ Opskrifter gemt succesfuldt! ${skippedCount} duplikater undgået.`)
        
        // Get updated database stats
        const newDbStats = await databaseService.getDatabaseStats()
        setDbStats(newDbStats)
        
        // Clear the import result after successful save
        setTimeout(() => {
          setImportResult(null)
          setSaveStatus(null)
        }, 3000)
      } else {
        console.error('❌ Save API error:', {
          status: saveRes.status,
          response: saveJson,
          debug: saveJson.debug
        })
        setSaveStatus(`❌ Fejl ved gemning til database${saveJson?.message ? `: ${saveJson.message}` : ''}`)
        
        // Show detailed error info
        if (saveJson.debug) {
          console.error('🔍 Debug info:', saveJson.debug)
        }
      }
      
    } catch (err) {
      console.error('❌ Save failed:', err)
      setSaveStatus('❌ Fejl ved gemning af opskrifter')
    } finally {
      setIsSaving(false)
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

  const handleCheckDatabase = async () => {
    try {
      // First test connection
      const connectionOk = await databaseService.testConnection()
      if (!connectionOk) {
        console.error('❌ Database connection failed')
        return
      }
      
      const structure = await databaseService.checkDatabaseStructure()
      const stats = await databaseService.getDatabaseStats()
      setDbStats(stats)
      
      console.log('📊 Database structure:', structure)
      console.log('📈 Database stats:', stats)
      
    } catch (error) {
      console.error('❌ Error checking database:', error)
    }
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Recipe Import</h1>
                <p className="text-gray-600">Import recipes with automatic ingredient tagging and nutritional calculation</p>
              </div>
              <button
                onClick={handleCheckDatabase}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Database size={16} />
                <span>Check Database</span>
              </button>
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

          {/* Database Stats */}
          {dbStats && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Database Status</h2>
                <button
                  onClick={handleCheckDatabase}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Database size={16} />
                  <span>Check Database</span>
                </button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-600">Recipes in Database</p>
                  <p className="text-2xl font-bold text-blue-900">{dbStats.recipeCount}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-600">Ingredients in Database</p>
                  <p className="text-2xl font-bold text-green-900">{dbStats.ingredientCount}</p>
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

          {/* Save buttons */}
          <div className="flex space-x-4 mt-6">
            <button
              onClick={handleSaveRecipes}
              disabled={!importResult || isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              <span>Gem Opskrifter</span>
            </button>
            
            <button
              onClick={async () => {
                if (!importResult) return
                setIsSaving(true)
                setSaveStatus('Gemmer kun opskrifter...')
                try {
                  const recipesSaved = await databaseService.saveRecipes(importResult.recipes)
                  if (recipesSaved) {
                    setSaveStatus('✅ Kun opskrifter gemt succesfuldt!')
                    const newDbStats = await databaseService.getDatabaseStats()
                    setDbStats(newDbStats)
                    setTimeout(() => { setSaveStatus(null); }, 3000)
                  } else {
                    setSaveStatus('❌ Fejl ved gemning af opskrifter')
                  }
                } catch (err) {
                  console.error('❌ Save failed:', err)
                  setSaveStatus('❌ Fejl ved gemning af opskrifter')
                } finally {
                  setIsSaving(false)
                }
              }}
              disabled={!importResult || isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-text">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
                <line x1="10" x2="8" y1="9" y2="9"/>
              </svg>
              <span>Gem Kun Opskrifter</span>
            </button>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Import Results</h2>
                <button
                  onClick={handleSaveRecipes}
                  disabled={isSaving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Gemmer...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Gem Opskrifter</span>
                    </>
                  )}
                </button>
              </div>

              {saveStatus && (
                <div className={`mb-4 p-3 rounded-lg ${
                  saveStatus.includes('✅') ? 'bg-green-50 text-green-800' : 
                  saveStatus.includes('❌') ? 'bg-red-50 text-red-800' : 
                  'bg-blue-50 text-blue-800'
                }`}>
                  {saveStatus}
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-yellow-600">Images Fetched</p>
                  <p className="text-2xl font-bold text-yellow-900">{importResult.stats.imagesFetched || 0}</p>
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
    </AdminLayout>
  )
} 