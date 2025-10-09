'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import SlotScheduler from '@/components/SlotScheduler'
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
  const [matchingStats, setMatchingStats] = useState({
    totalProducts: 0,
    matchedProducts: 0,
    unmatchedProducts: 0,
    matchPercentage: 0
  })
  const [aiMatching, setAiMatching] = useState(false)
  const [matchingProgress, setMatchingProgress] = useState({ current: 0, total: 0, matches: 0 })

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

    const loadMatchingStats = async () => {
      try {
        const response = await fetch('/api/admin/product-ingredient-stats')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setMatchingStats({
              totalProducts: data.stats.totalProducts,
              matchedProducts: data.stats.matchedProducts,
              unmatchedProducts: data.stats.unmatchedProducts,
                              matchPercentage: data.stats.matchPercentage
            })
          }
        }
      } catch (error) {
        console.error('Error loading matching stats:', error)
      }
    }

    if (isAdmin) {
      loadRecipes()
      loadMatchingStats()
    }
  }, [isAdmin])

  const runAiMatching = async () => {
    setAiMatching(true)
    setMatchingProgress({ current: 0, total: 0, matches: 0 })

    let page = 1
    let hasMore = true
    let totalMatches = 0
    let batchCount = 0

    try {
      while (hasMore) {
        batchCount++
        setMatchingProgress({ current: batchCount, total: batchCount, matches: totalMatches })

        console.log(`🤖 Processing AI matching batch ${batchCount} (page ${page})...`)

        const response = await fetch(`/api/admin/ai-match-products?page=${page}&limit=10`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          throw new Error(`AI matching failed with status ${response.status}`)
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(`AI matching failed: ${data.message}`)
        }

        totalMatches += data.data.totalMatches || 0
        hasMore = data.data.pagination.hasMore || false
        page = data.data.pagination.page + 1

        console.log(`✅ Batch ${batchCount} completed: ${data.data.totalMatches} matches found`)

        // Small delay between batches
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // Reload stats after matching
      const loadMatchingStats = async () => {
        try {
          const response = await fetch('/api/admin/product-ingredient-stats')
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setMatchingStats({
                totalProducts: data.stats.totalProducts,
                matchedProducts: data.stats.matchedProducts,
                unmatchedProducts: data.stats.unmatchedProducts,
                matchPercentage: data.stats.matchPercentage
              })
            }
          }
        } catch (error) {
          console.error('Error loading matching stats:', error)
        }
      }
      
      await loadMatchingStats()

      alert(`🎉 AI matching completed!\n\n📊 Results:\n- Total matches found: ${totalMatches}\n- Batches processed: ${batchCount}`)

    } catch (error) {
      console.error('AI matching error:', error)
      alert(`❌ AI matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setAiMatching(false)
      setMatchingProgress({ current: 0, total: 0, matches: 0 })
    }
  }

  const runBatchScraper = async () => {
    setBatchScraping(true)
    setBatchProgress({ current: 0, total: 0, products: 0 })
    
    try {
      console.log('🚀 Starting REMA batch scraper...')
      
      // Use the fixed auto-batch-scrape endpoint that handles all departments
      const response = await fetch('/api/admin/dagligvarer/auto-batch-scrape', {
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
      
      console.log('✅ Auto batch scrape completed:', data)
      
      alert(`🎉 REMA Scraper completed!\n\n📊 Results:\n- Total products found: ${data.totalProducts}\n- Products added: ${data.totalAdded}\n- Products updated: ${data.totalUpdated}\n- Batches processed: ${data.batchesProcessed}\n- Departments processed: ${data.departmentsProcessed}`)
      
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

        {/* Product-Ingredient Matching Stats */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Product-Ingredient Matching</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Database className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Products</p>
                    <p className="text-2xl font-semibold text-gray-900">{matchingStats.totalProducts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Matched Products</p>
                    <p className="text-2xl font-semibold text-gray-900">{matchingStats.matchedProducts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Unmatched Products</p>
                    <p className="text-2xl font-semibold text-gray-900">{matchingStats.unmatchedProducts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Match Percentage</p>
                    <p className="text-2xl font-semibold text-gray-900">{matchingStats.matchPercentage}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Hurtige Handlinger</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

              <button
                onClick={runAiMatching}
                disabled={aiMatching}
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div>
                  {aiMatching ? (
                    <RefreshCw className="h-6 w-6 text-purple-600 animate-spin" />
                  ) : (
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {aiMatching ? 'AI Matching...' : 'AI Product Matching'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {aiMatching 
                      ? `Batch ${matchingProgress.current} - ${matchingProgress.matches} matches`
                      : 'Match produkter med ingredienser'
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

          {/* Slot Scheduler Overview */}
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Publikation Slots</h2>
            <SlotScheduler />
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