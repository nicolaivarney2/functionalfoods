'use client'

import { useState, useEffect } from 'react'
import { Play, Square, RefreshCw, Database, Settings, AlertCircle, CheckCircle, Clock, Save, TrendingUp } from 'lucide-react'

interface ScrapingResult {
  success: boolean
  storeName: string
  productsCount: number
  timestamp: string
  duration: number
  errors: string[]
}

interface TestResult {
  success: boolean
  message: string
  testProduct?: any
  scrapingResult?: ScrapingResult
  timestamp: string
}

interface DatabaseStats {
  totalProducts: number
  productsOnSale: number
  categories: string[]
  lastUpdate: string | null
  averagePrice: number
}

interface StorageResult {
  success: boolean
  message: string
  scraping: {
    totalScraped: number
    newProducts: number
    updatedProducts: number
    errors: string[]
  }
  database: DatabaseStats
  timestamp: string
}

interface Product {
  id: string
  name: string
  description: string
  category: string
  subcategory: string
  price: number
  originalPrice: number
  unit: string
  unitPrice: number
  isOnSale: boolean
  saleEndDate: string | null
  imageUrl: string | null
  store: string
  available: boolean
  temperatureZone: string | null
  nutritionInfo: Record<string, string>
  labels: string[]
  lastUpdated: string
  source: string
}

export default function SupermarketScraperPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [storageResult, setStorageResult] = useState<StorageResult | null>(null)
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [lastScraping, setLastScraping] = useState<string | null>(null)
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // Fetch database statistics on component mount
  useEffect(() => {
    fetchDatabaseStats()
    loadLatestProducts()
  }, [])

  const fetchDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/dagligvarer/store-products')
      const data = await response.json()
      
      if (data.success) {
        setDatabaseStats(data.statistics)
      }
    } catch (error) {
      console.error('Failed to fetch database stats:', error)
    }
  }

  const loadLatestProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/test-rema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fetchAllProducts'
        })
      })
      
      const result = await response.json()
      if (result.success && result.products) {
        setProducts(result.products)
      }
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const testRemascraper = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/test-rema', {
        method: 'GET'
      })
      
      const result: TestResult = await response.json()
      setTestResult(result)
      
      if (result.success) {
        console.log('✅ REMA scraper test successful:', result)
      } else {
        console.error('❌ REMA scraper test failed:', result)
      }
    } catch (error) {
      console.error('Error testing REMA scraper:', error)
      setTestResult({
        success: false,
        message: 'Test failed due to network error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/test-rema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fetchAllProducts'
        })
      })
      
      const result = await response.json()
      console.log('📦 Fetched products:', result)
      
      if (result.success) {
        setTestResult({
          success: true,
          message: `Successfully fetched ${result.productsCount} products`,
          timestamp: new Date().toISOString()
        })
        
        // Update products list if available
        if (result.products) {
          setProducts(result.products)
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const storeProductsInDatabase = async () => {
    setIsLoading(true)
    setScrapingStatus('running')
    
    try {
      const response = await fetch('/api/admin/dagligvarer/store-products', {
        method: 'POST'
      })
      
      const result: StorageResult = await response.json()
      setStorageResult(result)
      
      if (result.success) {
        setScrapingStatus('completed')
        setLastScraping(new Date().toISOString())
        setDatabaseStats(result.database)
        
        console.log('✅ Products successfully stored:', result)
      } else {
        setScrapingStatus('error')
        console.error('❌ Failed to store products:', result)
      }
    } catch (error) {
      console.error('Error storing products:', error)
      setScrapingStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const startNightlyScraping = async () => {
    setScrapingStatus('running')
    // This would be implemented with a cron job or scheduled task
    setTimeout(() => {
      setScrapingStatus('completed')
      setLastScraping(new Date().toISOString())
    }, 3000)
  }

  const stopScraping = () => {
    setScrapingStatus('idle')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dagligvarer Scraper</h1>
          <p className="text-gray-600">Test og administrer automatisk indsamling af produktdata fra supermarkeder</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Scraper Testing & Database */}
          <div className="space-y-6">
            {/* REMA 1000 Scraper Test */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Database size={20} className="mr-2" />
                REMA 1000 Scraper Test
              </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={testRemascraper}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Play size={16} />
                    Test Scraper
                  </button>
                  
                  <button
                    onClick={fetchAllProducts}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Fetch Products
                  </button>
                </div>

                {/* Test Results */}
                {testResult && (
                  <div className={`p-4 rounded-lg border ${
                    testResult.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.success ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                      <span className={`font-medium ${
                        testResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResult.success ? 'Test Successful' : 'Test Failed'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      testResult.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {testResult.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(testResult.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Database Storage */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Save size={20} className="mr-2" />
                  Database Lagring
                </h2>
              
              <div className="space-y-4">
                <button
                  onClick={storeProductsInDatabase}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Database size={16} />
                  Scrape & Gem Produkter
                </button>

                {/* Storage Results */}
                {storageResult && (
                  <div className={`p-4 rounded-lg border ${
                    storageResult.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {storageResult.success ? (
                        <CheckCircle size={16} className="text-green-600" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600" />
                      )}
                      <span className={`font-medium ${
                        storageResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {storageResult.success ? 'Storage Successful' : 'Storage Failed'}
                      </span>
                    </div>
                    
                    {storageResult.success && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Scraped:</span>
                          <span className="font-medium">{storageResult.scraping.totalScraped}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>New Products:</span>
                          <span className="font-medium text-green-600">{storageResult.scraping.newProducts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Updated Products:</span>
                          <span className="font-medium text-blue-600">{storageResult.scraping.updatedProducts}</span>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(storageResult.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Scraper Configuration */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings size={20} className="mr-2" />
                  Konfiguration
                </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">REMA 1000 Scraper</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    Enabled
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Update Schedule</span>
                  <span className="text-sm text-gray-900">Every night at 2:00 AM</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Delay Between Requests</span>
                  <span className="text-sm text-gray-900">1 second</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Max Retries</span>
                  <span className="text-sm text-gray-900">3 attempts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Scraping Status & Statistics */}
          <div className="space-y-6">
            {/* Scraping Control */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Play size={20} className="mr-2" />
                  Scraping Kontrol
                </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={startNightlyScraping}
                    disabled={scrapingStatus === 'running'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Play size={16} />
                    Start Scraping
                  </button>
                  
                  <button
                    onClick={stopScraping}
                    disabled={scrapingStatus !== 'running'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Square size={16} />
                    Stop Scraping
                  </button>
                </div>

                {/* Status Display */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Status</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      scrapingStatus === 'idle' ? 'bg-gray-400' :
                      scrapingStatus === 'running' ? 'bg-yellow-400' :
                      scrapingStatus === 'completed' ? 'bg-green-400' :
                      'bg-red-400'
                    }`} />
                    <span className="text-sm text-gray-600 capitalize">
                      {scrapingStatus}
                    </span>
                  </div>
                  
                  {lastScraping && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last completed: {new Date(lastScraping).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Database Statistics */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp size={20} className="mr-2" />
                  Database Statistikker
                </h2>
              
              {databaseStats ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Products</span>
                    <span className="text-lg font-semibold text-gray-900">{databaseStats.totalProducts}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Products on Sale</span>
                    <span className="text-lg font-semibold text-green-600">{databaseStats.productsOnSale}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Categories</span>
                    <span className="text-sm text-gray-900">{databaseStats.categories.length}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Price</span>
                    <span className="text-sm text-gray-900">kr {databaseStats.averagePrice}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Update</span>
                    <span className="text-sm text-gray-900">
                      {databaseStats.lastUpdate 
                        ? new Date(databaseStats.lastUpdate).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  
                  <button
                    onClick={fetchDatabaseStats}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Refresh Stats
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-gray-400 mb-2">No data available</div>
                  <button
                    onClick={fetchDatabaseStats}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Load Statistics
                  </button>
                </div>
              )}
            </div>

            {/* Next Scheduled Run */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock size={20} className="mr-2" />
                  Næste Planlagte Kørsel
                </h2>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  02:00 AM
                </div>
                <p className="text-sm text-gray-600">
                  Tomorrow morning
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Automatically scrapes all enabled supermarkets
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Product List Section */}
        {products.length > 0 && (
          <div className="mt-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Database size={20} className="mr-2" />
                  Scraped Produkter ({products.length})
                </h2>
                <button
                  onClick={loadLatestProducts}
                  disabled={isLoadingProducts}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw size={16} className={isLoadingProducts ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      {product.isOnSale && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0">
                          TILBUD
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Pris:</span>
                        <div className="text-right">
                          {product.isOnSale ? (
                            <>
                              <span className="font-semibold text-red-600">kr {product.price}</span>
                              <span className="line-through text-gray-400 ml-2">kr {product.originalPrice}</span>
                            </>
                          ) : (
                            <span className="font-semibold">kr {product.price}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Kategori:</span>
                        <span className="text-right">{product.category}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Butik:</span>
                        <span className="text-right">{product.store}</span>
                      </div>
                      
                      {product.unit && (
                        <div className="flex justify-between">
                          <span>Enhed:</span>
                          <span className="text-right">{product.unit}</span>
                        </div>
                      )}
                    </div>
                    
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading state for products */}
        {isLoadingProducts && products.length === 0 && (
          <div className="mt-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin mr-3" />
                <span className="text-gray-600">Henter produkter...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
