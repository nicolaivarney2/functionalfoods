'use client'

import AdminLayout from '@/components/AdminLayout'
import { useState, useEffect } from 'react'
import { Recipe } from '@/types/recipe'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import RecipeNutritionRecalculator from '@/components/RecipeNutritionRecalculator'
import { 
  Target,
  Image, 
  FileText, 
  Star, 
  Trash2,
  Eye,
  EyeOff,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  ImageIcon,
  Calculator,
  TrendingUp,
  Upload,
  Download,
  Play,
  Pause
} from 'lucide-react'

interface RecipeWithStatus extends Recipe {
  status?: 'draft' | 'scheduled' | 'published'
}

interface BatchImportProgress {
  isRunning: boolean
  progress: number
  currentBatch: number
  totalBatches: number
  successfulRecipes: number
  failedRecipes: number
  totalRecipes: number
  errors: Array<{
    recipeTitle: string
    error: string
    batchNumber: number
  }>
}

export default function AdminRecipesPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [recipes, setRecipes] = useState<RecipeWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Batch import states
  const [batchImportProgress, setBatchImportProgress] = useState<BatchImportProgress>({
    isRunning: false,
    progress: 0,
    currentBatch: 0,
    totalBatches: 0,
    successfulRecipes: 0,
    failedRecipes: 0,
    totalRecipes: 0,
    errors: []
  })
  const [batchSize, setBatchSize] = useState(5)
  const [delayBetweenBatches, setDelayBetweenBatches] = useState(1000)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/recipes')
      if (!response.ok) {
        throw new Error('Kunne ikke hente opskrifter')
      }
      
      const data = await response.json()
      // API returns recipes array directly, not wrapped in data.recipes
      setRecipes(Array.isArray(data) ? data : [])
      
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteRecipe = async (recipeSlug: string, recipeName: string) => {
    if (!confirm(`Er du sikker på at du vil slette opskriften "${recipeName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/recipes/${recipeSlug}/delete`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message}`)
        await loadRecipes()
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/json') {
      setSelectedFile(file)
    } else {
      alert('Vælg venligst en JSON fil')
    }
  }

  const startBatchImport = async () => {
    if (!selectedFile) {
      alert('Vælg venligst en fil først')
      return
    }

    try {
      setBatchImportProgress(prev => ({ ...prev, isRunning: true }))
      
      const fileContent = await selectedFile.text()
      const recipeData = JSON.parse(fileContent)
      
      const totalRecipes = recipeData.length
      const totalBatches = Math.ceil(totalRecipes / batchSize)
      
      setBatchImportProgress(prev => ({
        ...prev,
        totalRecipes,
        totalBatches,
        progress: 0,
        currentBatch: 0,
        successfulRecipes: 0,
        failedRecipes: 0,
        errors: []
      }))

      // Start batch import via API
      const response = await fetch('/api/admin/recipes/batch-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipes: recipeData,
          batchSize,
          delayBetweenBatches
        })
      })

      if (!response.ok) {
        throw new Error('Import fejlede')
      }

      const result = await response.json()
      
      if (result.success) {
        alert(`✅ Import gennemført! ${result.stats.successfulRecipes} opskrifter importeret`)
        await loadRecipes() // Reload recipes
      } else {
        alert(`❌ Import fejlede: ${result.error}`)
      }

    } catch (error) {
      console.error('Import error:', error)
      alert(`❌ Import fejlede: ${error instanceof Error ? error.message : 'Ukendt fejl'}`)
    } finally {
      setBatchImportProgress(prev => ({ ...prev, isRunning: false }))
      setSelectedFile(null)
    }
  }

  const stopBatchImport = () => {
    setBatchImportProgress(prev => ({ ...prev, isRunning: false }))
    // Note: This only stops the UI - the actual import continues on the server
    // You'd need to implement a proper cancellation mechanism for full control
  }

  const getStatusIcon = (hasData: boolean, icon: React.ReactNode, fallbackIcon: React.ReactNode) => {
    return hasData ? icon : fallbackIcon
  }

  const hasNutrition = (recipe: RecipeWithStatus) => {
    return recipe.calories && recipe.calories > 0
  }

  const hasImage = (recipe: RecipeWithStatus) => {
    return recipe.imageUrl && recipe.imageUrl !== ''
  }

  const isOptimized = (recipe: RecipeWithStatus) => {
    return recipe.imageUrl && recipe.imageUrl.includes('.webp')
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Tjekker admin rettigheder...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-32 w-32 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Adgang nægtet</h1>
          <p className="text-gray-600 mt-2">Du har ikke rettigheder til at se denne side.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Indlæser opskrifter...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin - Opskrifter</h1>
                <p className="mt-2 text-gray-600">Administrer alle opskrifter i systemet</p>
              </div>
              
              {/* Batch Import Controls */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Batch størrelse:</label>
                  <select 
                    value={batchSize} 
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    disabled={batchImportProgress.isRunning}
                  >
                    <option value={3}>3</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Pause (ms):</label>
                  <select 
                    value={delayBetweenBatches} 
                    onChange={(e) => setDelayBetweenBatches(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    disabled={batchImportProgress.isRunning}
                  >
                    <option value={500}>500ms</option>
                    <option value={1000}>1s</option>
                    <option value={2000}>2s</option>
                    <option value={3000}>3s</option>
                  </select>
                </div>
                
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="recipe-file-input"
                  disabled={batchImportProgress.isRunning}
                />
                <label 
                  htmlFor="recipe-file-input"
                  className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    batchImportProgress.isRunning 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Vælg JSON
                </label>
                
                {selectedFile && (
                  <span className="text-sm text-gray-600">
                    {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
                  </span>
                )}
                
                {selectedFile && !batchImportProgress.isRunning && (
                  <button
                    onClick={startBatchImport}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Import
                  </button>
                )}
                
                {batchImportProgress.isRunning && (
                  <button
                    onClick={stopBatchImport}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Import
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Batch Import Progress */}
          {batchImportProgress.isRunning && (
            <div className="mb-6 px-4 sm:px-0">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Batch Import Status</h3>
                
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Fremskridt</span>
                      <span>{batchImportProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${batchImportProgress.progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{batchImportProgress.currentBatch}</div>
                      <div className="text-sm text-gray-600">Nuværende Batch</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600">{batchImportProgress.totalBatches}</div>
                      <div className="text-sm text-gray-600">Total Batches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{batchImportProgress.successfulRecipes}</div>
                      <div className="text-sm text-gray-600">Succesfulde</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{batchImportProgress.failedRecipes}</div>
                      <div className="text-sm text-gray-600">Fejlede</div>
                    </div>
                  </div>
                  
                  {/* Errors */}
                  {batchImportProgress.errors.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2">Fejl ({batchImportProgress.errors.length})</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {batchImportProgress.errors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-sm text-red-600">
                            {error.recipeTitle}: {error.error}
                          </div>
                        ))}
                        {batchImportProgress.errors.length > 5 && (
                          <div className="text-sm text-gray-500">
                            ... og {batchImportProgress.errors.length - 5} flere fejl
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Existing recipes table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Opskrifter ({recipes?.length || 0})
                  </h3>
                  <p className="mt-2 text-sm text-gray-700">
                    En liste over alle opskrifter i systemet med deres status og metadata.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Opskrift
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Metadata
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Handlinger
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {recipes.map((recipe) => (
                            <tr key={recipe.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    {recipe.imageUrl ? (
                                      <img 
                                        className="h-10 w-10 rounded-lg object-cover" 
                                        src={recipe.imageUrl} 
                                        alt={recipe.title}
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                        <Image className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {recipe.title}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {recipe.description?.substring(0, 100)}...
                                    </div>
                                  </div>
                                </div>
                              </td>
                              
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  {/* Publishing Status */}
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                                    recipe.status === 'published' ? 'bg-green-100 text-green-800' :
                                    recipe.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {recipe.status === 'published' ? 'Udgivet' :
                                     recipe.status === 'scheduled' ? 'Planlagt' :
                                     'Kladde'}
                                  </span>
                                  
                                  {/* Technical Status Icons */}
                                  {getStatusIcon(Boolean(hasNutrition(recipe)), <Target className="h-4 w-4" />, <Target className="h-4 w-4" />)}
                                  {getStatusIcon(Boolean(hasImage(recipe)), <Image className="h-4 w-4" />, <Image className="h-4 w-4" />)}
                                  {getStatusIcon(Boolean(isOptimized(recipe)), <FileText className="h-4 w-4" />, <FileText className="h-4 w-4" />)}
                                  <Star className="h-4 w-4 text-yellow-500" />
                                </div>
                              </td>
                              
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="space-y-1">
                                  <div>Kalorier: {recipe.calories || 'Ikke beregnet'}</div>
                                  <div>Protein: {recipe.protein || 'Ikke beregnet'}g</div>
                                  <div>Kulhydrater: {recipe.carbs || 'Ikke beregnet'}g</div>
                                  <div>Fedt: {recipe.fat || 'Ikke beregnet'}g</div>
                                </div>
                              </td>
                              
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <a
                                    href={`/opskrift/${recipe.slug}`}
                                    target="_blank"
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Se opskrift"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </a>
                                  
                                  {/* Nutrition Recalculator */}
                                  <div className="inline-block">
                                    <RecipeNutritionRecalculator 
                                      recipeId={recipe.id} 
                                      recipeName={recipe.title}
                                    />
                                  </div>
                                  
                                  <button
                                    onClick={() => deleteRecipe(recipe.slug, recipe.title)}
                                    className="text-red-600 hover:text-red-900"
                                    title="Slet opskrift"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}