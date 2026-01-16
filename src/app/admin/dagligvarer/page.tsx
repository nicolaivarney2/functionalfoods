'use client'

import { useState, useEffect } from 'react'
import { Play, RefreshCw, Clock, AlertCircle, Store, Database, TrendingUp } from 'lucide-react'

interface ScrapingStats {
  totalProducts: number
  productsOnSale: number
  categories: string[]
  lastUpdate: string | null
  averagePrice: number
}

interface ScrapingProgress {
  isRunning: boolean
  currentBatch: number
  totalBatches: number
  processed: number
  total: number
  updated: number
  inserted: number
  errors: number
  timeElapsed: number
}

export default function AdminDagligvarerPage() {
  const [selectedShop, setSelectedShop] = useState('rema1000')
  const [stats, setStats] = useState<ScrapingStats | null>(null)
  const [fullScrapeProgress] = useState<ScrapingProgress | null>(null)
  const [priceScrapeProgress, setPriceScrapeProgress] = useState<ScrapingProgress | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const shops = [
    { id: 'rema1000', name: 'REMA 1000', status: 'active' },
    { id: 'netto', name: 'Netto', status: 'planned' },
    { id: 'foetex', name: 'Føtex', status: 'planned' },
    { id: 'bilka', name: 'Bilka', status: 'planned' }
  ]

  useEffect(() => {
    loadStats()
  }, [selectedShop])

  const loadStats = async () => {
    try {
      const response = await fetch(`/api/admin/dagligvarer/stats?shop=${selectedShop}`)
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }



  const startPriceScrape = async () => {
    if (isLoading) return
    setIsLoading(true)
    setPriceScrapeProgress({
      isRunning: true,
      currentBatch: 0,
      totalBatches: 0,
      processed: 0,
      total: 0,
      updated: 0,
      inserted: 0,
      errors: 0,
      timeElapsed: 0
    })

    try {
      const response = await fetch(`/api/admin/dagligvarer/price-scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop: selectedShop })
      })

      const result = await response.json()
      
      if (result.success) {
        setPriceScrapeProgress({
          isRunning: false,
          currentBatch: result.batches?.completed || 0,
          totalBatches: result.batches?.total || 0,
          processed: result.stats?.processed || 0,
          total: result.stats?.total || 0,
          updated: result.stats?.updated || 0,
          inserted: result.stats?.inserted || 0,
          errors: result.stats?.errors || 0,
          timeElapsed: result.timeElapsed || 0
        })
        
        alert(`✅ Price scrape completed!\n\nProcessed: ${result.stats?.processed || 0}\nUpdated: ${result.stats?.updated || 0}\nTime: ${Math.round((result.timeElapsed || 0) / 1000)}s`)
        await loadStats()
      } else {
        throw new Error(result.message || 'Price scrape failed')
      }
    } catch (error) {
      console.error('Price scrape error:', error)
      alert(`❌ Price scrape failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setPriceScrapeProgress(null)
    } finally {
      setIsLoading(false)
    }
  }

  const ProgressBar = ({ progress }: { progress: ScrapingProgress }) => (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {progress.isRunning ? '🔄 Running...' : '✅ Completed'}
        </span>
        <span className="text-xs text-gray-500">
          {Math.round(progress.timeElapsed / 1000)}s
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            progress.isRunning ? 'bg-blue-500' : 'bg-green-500'
          }`}
          style={{ width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%` }}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Processed: {progress.processed}/{progress.total}</div>
        <div>Updated: {progress.updated}</div>
        <div>New: {progress.inserted}</div>
        <div>Errors: {progress.errors}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Store size={24} />
              Dagligvare Scraper Admin
            </h1>
            <div className="flex flex-wrap gap-2">
              <a
                href="/admin/dagligvarer/goma"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
              >
                <Store size={16} />
                GOMA sync
              </a>
            </div>
          </div>

          {/* Shop Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vælg butik
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {shops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => setSelectedShop(shop.id)}
                  disabled={shop.status === 'planned'}
                  className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    selectedShop === shop.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : shop.status === 'planned'
                      ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {shop.name}
                  {shop.status === 'planned' && (
                    <div className="text-xs text-gray-400 mt-1">Kommer snart</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Current Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Produkter</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">{stats.totalProducts}</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">På tilbud</span>
                </div>
                <div className="text-2xl font-bold text-green-900">{stats.productsOnSale}</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Store size={16} className="text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Kategorier</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">{stats.categories.length}</div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Gns. pris</span>
                </div>
                <div className="text-2xl font-bold text-orange-900">{stats.averagePrice.toFixed(0)} kr</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Sidst opdateret</span>
                </div>
                <div className="text-sm text-gray-900">
                  {stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleDateString('da-DK') : 'Aldrig'}
                </div>
              </div>
            </div>
          )}

          {/* Scraping Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Full Scrape */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Fuld Scraping</h3>
              <p className="text-sm text-gray-600 mb-4">
                🚀 Scraper alle produkter fra {shops.find(s => s.id === selectedShop)?.name}'s API. 
                Opdaterer eksisterende produkter og tilføjer nye. Bevarer prishistorik.
              </p>
              
              {selectedShop === 'rema1000' && (
                <button
                  onClick={async () => {
                    if (isLoading) return
                    setIsLoading(true)
                    
                    try {
                      // Test med department 20 (Frugt & grønt) først
                      const response = await fetch('/api/public/batch-scrape?page=1', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ departmentId: 20, limit: 5 })
                      })
                      
                      const result = await response.json()
                      console.log('Test result:', result)
                      
                      if (result.success) {
                        alert(`✅ Test successful!\n\nFound: ${result.productsFound}\nAdded: ${result.productsAdded}\nUpdated: ${result.productsUpdated}`)
                        
                        // Hvis test virker, kør alle departments
                        const departments = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 160]
                        let totalFound = 0
                        let totalAdded = 0
                        let totalUpdated = 0
                        
                        for (const deptId of departments) {
                          console.log(`Processing department ${deptId}...`)
                          
                          let page = 1
                          let hasMore = true
                          
                          while (hasMore) {
                            const deptResponse = await fetch(`/api/public/batch-scrape?page=${page}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ departmentId: deptId, limit: 100 })
                            })
                            
                            const deptResult = await deptResponse.json()
                            
                            if (deptResult.success) {
                              totalFound += deptResult.productsFound
                              totalAdded += deptResult.productsAdded
                              totalUpdated += deptResult.productsUpdated
                              
                              hasMore = deptResult.hasMore
                              page++
                              
                              // Small delay
                              await new Promise(resolve => setTimeout(resolve, 100))
                            } else {
                              console.error(`Department ${deptId} failed:`, deptResult.message)
                              hasMore = false
                            }
                          }
                        }
                        
                        alert(`🎉 All departments completed!\n\nTotal found: ${totalFound}\nTotal added: ${totalAdded}\nTotal updated: ${totalUpdated}`)
                        await loadStats()
                      } else {
                        alert(`❌ Test failed: ${result.message}`)
                      }
                    } catch (error) {
                      console.error('Scraper error:', error)
                      alert(`❌ Scraper failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
                >
                  <Play size={16} />
                  {isLoading ? 'Running...' : 'Start REMA Scraper'}
                </button>
              )}

              {selectedShop === 'netto' && (
                <button
                  onClick={async () => {
                    if (isLoading) return
                    setIsLoading(true)
                    
                    try {
                      const response = await fetch('/api/admin/dagligvarer/netto-scraper', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      })
                      
                      const result = await response.json()
                      
                      if (result.success) {
                        alert(`✅ Netto scraper completed!\n\n` +
                              `Products found: ${result.data.totalProducts}\n` +
                              `Added: ${result.data.productsAdded}\n` +
                              `Updated: ${result.data.productsUpdated}\n` +
                              `Stores processed: ${result.data.storesProcessed}/${result.data.totalStores}`)
                        await loadStats()
                      } else {
                        alert(`❌ Netto scraper failed: ${result.message}`)
                      }
                    } catch (error) {
                      console.error('Netto scraper error:', error)
                      alert(`❌ Netto scraper failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
                    } finally {
                      setIsLoading(false)
                    }
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
                >
                  <Play size={16} />
                  {isLoading ? 'Running...' : 'Start Netto Scraper'}
                </button>
              )}

              {selectedShop !== 'rema1000' && selectedShop !== 'netto' && (
                <div className="text-center py-8 text-gray-500">
                  <Store size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Scraper for {shops.find(s => s.id === selectedShop)?.name} kommer snart!</p>
                </div>
              )}

              {fullScrapeProgress && <ProgressBar progress={fullScrapeProgress} />}
            </div>

            {/* Price Scrape */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Pris/Tilbud Scraping</h3>
              <p className="text-sm text-gray-600 mb-4">
                💰 Tjekker priser og tilbud på eksisterende produkter. 
                Hurtig opdatering af tilbudsinfo. Bevarer al anden data.
              </p>
              
              <button
                onClick={startPriceScrape}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                <RefreshCw size={16} />
                Start Pris Scraping
              </button>

              {priceScrapeProgress && <ProgressBar progress={priceScrapeProgress} />}
            </div>

            {/* Discontinued Products Handler */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Udgåede Produkter</h3>
              <p className="text-sm text-gray-600 mb-4">
                🗑️ Finder og håndterer produkter som ikke længere er tilgængelige i REMA's API. 
                Skjuler dem fra frontend men bevarer prishistorik.
              </p>
              
              <button
                onClick={async () => {
                  if (isLoading) return
                  setIsLoading(true)
                  
                  try {
                    const response = await fetch('/api/admin/dagligvarer/handle-discontinued', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    })
                    
                    const result = await response.json()
                    
                    if (result.success) {
                      alert(`✅ Discontinued products handled!\n\n` +
                            `Discontinued: ${result.discontinued}\n` +
                            `Hidden: ${result.hidden}\n` +
                            `Price removed: ${result.priceRemoved}\n` +
                            `Current REMA products: ${result.currentRemaProducts}\n` +
                            `Total in database: ${result.totalInDatabase}`)
                      await loadStats()
                    } else {
                      alert(`❌ Failed to handle discontinued products: ${result.message}`)
                    }
                  } catch (error) {
                    console.error('Discontinued handler error:', error)
                    alert(`❌ Discontinued handler failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
                  } finally {
                    setIsLoading(false)
                  }
                }}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                <AlertCircle size={16} />
                {isLoading ? 'Processing...' : 'Handle Discontinued Products'}
              </button>
            </div>
          </div>

          {/* Debug Section */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">🔧 Debug & Test</h4>
            <p className="text-sm text-yellow-800 mb-3">
              Test REMA 1000's endpoints for at finde ud af hvorfor scraping ikke virker.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/dagligvarer/debug-rema')
                    const result = await response.json()
                    console.log('🔍 Debug results:', result)
                    alert('Check console for detailed debug results!')
                  } catch (error) {
                    console.error('Debug failed:', error)
                    alert('Debug test failed - check console')
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
              >
                Test REMA Endpoints
              </button>
              
              <button
                onClick={async () => {
                  try {
                    setIsLoading(true)
                    const response = await fetch('/api/admin/dagligvarer/debug-zyte', {
                      method: 'POST'
                    })
                    const result = await response.json()
                    console.log('🔍 Zyte debug results:', result)
                    
                    if (result.success) {
                      alert(`✅ Zyte debug completed!\n\nCheck console for detailed results.\n\nFound ${result.results?.length || 0} test results.`)
                    } else {
                      alert(`❌ Zyte debug failed: ${result.message}`)
                    }
                  } catch (error) {
                    console.error('Zyte debug failed:', error)
                    alert('Zyte debug failed - check console')
                  } finally {
                    setIsLoading(false)
                  }
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                Debug Zyte API
              </button>
              
              <button
                onClick={async () => {
                  try {
                    setIsLoading(true)
                    const response = await fetch('/api/admin/dagligvarer/test-zyte-playground', {
                      method: 'POST'
                    })
                    const result = await response.json()
                    console.log('🧪 Zyte playground results:', result)
                    
                    if (result.success) {
                      const summary = result.summary
                      alert(`✅ Zyte Playground Test Completed!\n\n` +
                            `Tests: ${summary.successfulTests}/${summary.totalTests} successful\n` +
                            `Products Found: ${summary.totalProductsFound}\n\n` +
                            `Check console for detailed results!`)
                    } else {
                      alert(`❌ Zyte playground test failed: ${result.message}`)
                    }
                  } catch (error) {
                    console.error('Zyte playground test failed:', error)
                    alert('Zyte playground test failed - check console')
                  } finally {
                    setIsLoading(false)
                  }
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                Test Zyte Playground
              </button>
              
              <button
                onClick={async () => {
                  try {
                    setIsLoading(true)
                    const response = await fetch('/api/admin/dagligvarer/simple-rema-scraper', {
                      method: 'POST'
                    })
                    const result = await response.json()
                    console.log('🔍 Simple scraper results:', result)
                    
                    if (result.success) {
                      alert(`✅ Simple scraper success!\n\nFound: ${result.stats?.found || 0}\nUpdated: ${result.stats?.updated || 0}\nNew: ${result.stats?.inserted || 0}\nApproach: ${result.approach || 'unknown'}`)
                      await loadStats()
                    } else {
                      alert(`❌ Simple scraper failed: ${result.message}`)
                    }
                  } catch (error) {
                    console.error('Simple scraper failed:', error)
                    alert('Simple scraper failed - check console')
                  } finally {
                    setIsLoading(false)
                  }
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                Test Simple Scraper
              </button>
            </div>
          </div>

          {/* Information */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">🚀 Zyte API Integration</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Fuld Scraping:</strong> Bruger Zyte til at omgå anti-bot beskyttelse og scrape alle produkter</li>
              <li>• <strong>Pris Scraping:</strong> Zyte-baseret prisopdatering på eksisterende produkter</li>
              <li>• <strong>Konfiguration:</strong> Tilføj ZYTE_API_KEY til environment variables</li>
              <li>• Prishistorik bevares altid - ingen data går tabt</li>
              <li>• Automatisk endpoint discovery og fejlhåndtering</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}