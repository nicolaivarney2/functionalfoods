'use client'

import AdminLayout from '@/components/AdminLayout'
import { useState, useEffect } from 'react'
import { Recipe } from '@/types/recipe'
import { useAdminAuth } from '@/hooks/useAdminAuth'
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
  TrendingUp
} from 'lucide-react'

interface RecipeWithStatus extends Recipe {
  status?: 'draft' | 'scheduled' | 'published'
}

export default function AdminRecipesPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [recipes, setRecipes] = useState<RecipeWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Tjekker admin rettigheder...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect via useAdminAuth
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alle Opskrifter</h1>
          <p className="mt-2 text-gray-600">
            Administrer alle opskrifter i systemet. Nye opskrifter starter som kladder og er ikke synlige offentligt.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <EyeOff className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Nye opskrifter starter som kladder
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Når du importerer opskrifter, gemmes de som kladder og er ikke synlige offentligt. 
                  Du skal manuelt udgive dem via Publishing siden.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recipes Table */}
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
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
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
    </AdminLayout>
  )
}