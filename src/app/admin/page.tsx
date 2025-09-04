'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { 
  BookOpen, 
  Calendar, 
  Database, 
  Image, 
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  RefreshCw,
  Play
} from 'lucide-react'

interface Recipe {
  id: string
  title: string
  dietaryCategories?: string[]
  status?: string
  publishedAt?: Date
}

export default function AdminDashboard() {
  const { isAdmin, checking } = useAdminAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [batchScraping, setBatchScraping] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, products: 0 })

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const response = await fetch('/api/admin/recipes')
        if (response.ok) {
          const data = await response.json()
          // API returns recipes array directly, not wrapped in data.recipes
          setRecipes(Array.isArray(data) ? data : [])
        } else {
          console.error('Failed to load recipes:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('Error loading recipes:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      loadRecipes()
    }
  }, [isAdmin])

  const runBatchScraper = async () => {
    setBatchScraping(true)
    setBatchProgress({ current: 0, total: 0, products: 0 })
    
    let page = 1
    let hasMore = true
    let totalProducts = 0
    let totalAdded = 0
    let totalUpdated = 0
    let batchCount = 0
    
    try {
      while (hasMore) {
        batchCount++
        setBatchProgress({ current: batchCount, total: batchCount, products: totalProducts })
        
        console.log(`🔄 Processing batch ${batchCount} (page ${page})...`)
        
        const response = await fetch(`/api/admin/dagligvarer/batch-scrape?page=${page}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) {
          throw new Error(`Batch scrape failed with status ${response.status}`)
        }
        
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(`Batch scrape failed: ${data.message}`)
        }
        
        totalProducts += data.productsFound || 0
        totalAdded += data.productsAdded || 0
        totalUpdated += data.productsUpdated || 0
        hasMore = data.hasMore || false
        page = data.nextPage || page + 1
        
        console.log(`✅ Batch ${batchCount} completed: ${data.productsFound} found, ${data.productsAdded} added, ${data.productsUpdated} updated`)
        
        // Small delay between batches
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      alert(`🎉 Batch scrape completed!\n\n📊 Results:\n- Total products found: ${totalProducts}\n- Products added: ${totalAdded}\n- Products updated: ${totalUpdated}\n- Batches processed: ${batchCount}`)
      
    } catch (error) {
      console.error('Batch scrape error:', error)
      alert(`❌ Batch scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setBatchScraping(false)
      setBatchProgress({ current: 0, total: 0, products: 0 })
    }
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

  const stats = {
    totalRecipes: recipes.length,
    ketoRecipes: recipes.filter(r => {
      const categories = r.dietaryCategories
      return Array.isArray(categories) && categories.includes('Keto')
    }).length,
    senseRecipes: recipes.filter(r => {
      const categories = r.dietaryCategories
      return Array.isArray(categories) && categories.includes('SENSE')
    }).length,
    publishedToday: recipes.filter(r => {
      const today = new Date()
      const recipeDate = r.publishedAt ? new Date(r.publishedAt) : null
      return recipeDate ? recipeDate.toDateString() === today.toDateString() : false
    }).length,
    importedRecipes: recipes.length
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Velkommen til Functional Foods admin panel. Her kan du administrere alle aspekter af systemet.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BookOpen className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Opskrifter</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? 'Loading...' : stats.totalRecipes}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Keto Opskrifter</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? 'Loading...' : stats.ketoRecipes}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">SENSE Opskrifter</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? 'Loading...' : stats.senseRecipes}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Udgivet I Dag</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? 'Loading...' : stats.publishedToday}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Hurtige Handlinger</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/admin/publishing"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div>
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Planlæg Udgivelse</p>
                  <p className="text-sm text-gray-500">Planlæg nye opskrifter</p>
                </div>
              </a>

              <a
                href="/admin/recipes"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div>
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Alle Opskrifter</p>
                  <p className="text-sm text-gray-500">Administrer opskrifter</p>
                </div>
              </a>

              <a
                href="/admin/import"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div>
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Bulk Import</p>
                  <p className="text-sm text-gray-500">Importer mange opskrifter</p>
                </div>
              </a>

              <button
                onClick={runBatchScraper}
                disabled={batchScraping}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div>
                  {batchScraping ? (
                    <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                  ) : (
                    <Play className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {batchScraping ? 'Scraper...' : 'REMA Batch Scraper'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {batchScraping 
                      ? `Batch ${batchProgress.current} - ${batchProgress.products} produkter`
                      : 'Scrape alle REMA produkter'
                    }
                  </p>
                </div>
              </button>

              <a
                href="/admin/settings"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <div>
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Indstillinger</p>
                  <p className="text-sm text-gray-500">System konfiguration</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
} 