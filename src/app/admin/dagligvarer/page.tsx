'use client'

import { useState, useEffect } from 'react'
import { Play, Square, RefreshCw, Database, Settings, AlertCircle, CheckCircle, Clock, Save, TrendingUp, Search } from 'lucide-react'
import Link from 'next/link'

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

interface SupermarketProduct {
  id: string
  external_id: string
  name: string
  description: string | null
  category: string | null
  subcategory: string | null
  price: number
  original_price: number
  unit: string | null
  amount: number | null
  quantity: string | null
  unit_price: number | null
  currency: string
  store: string
  store_url: string | null
  image_url: string | null
  available: boolean
  last_updated: string
  source: string
}

export default function SupermarketScraperPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [storageResult, setStorageResult] = useState<StorageResult | null>(null)
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [lastScraping, setLastScraping] = useState<string | null>(null)
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [products, setProducts] = useState<SupermarketProduct[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [isTestingDelta, setIsTestingDelta] = useState(false)
  const [importResult, setImportResult] = useState<{success: boolean, message: string} | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Batch processing states
  const [isBatchImporting, setIsBatchImporting] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{
    current: number
    total: number
    processed: number
    success: number
    errors: number
  } | null>(null)
  const [batchResults, setBatchResults] = useState<Array<{
    batchNumber: number
    success: boolean
    message: string
    productsProcessed: number
    newProducts: number
    updatedProducts: number
    errors: string[]
  }>>([])

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
      // Use pagination to get all products
      let allProducts: any[] = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        const response = await fetch(`/api/admin/dagligvarer/test-rema?page=${page}&limit=1000`, {
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
          allProducts = [...allProducts, ...result.products]
          hasMore = result.pagination?.hasMore || false
          page++
        } else {
          break
        }
      }
      
      setProducts(allProducts)
      console.log(`✅ Loaded ${allProducts.length} products in admin`)
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
      const response = await fetch('/api/admin/dagligvarer/test-rema?limit=10000', {
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

  const handleScrapeAndStore = async () => {
    setIsScraping(true)
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
      setIsScraping(false)
    }
  }

  const handleTestDeltaCapabilities = async () => {
    setIsTestingDelta(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/test-rema', {
        method: 'GET'
      })
      const result: TestResult = await response.json()
      setTestResult(result)
      if (result.success) {
        console.log('✅ REMA delta update test successful:', result)
      } else {
        console.error('❌ REMA delta update test failed:', result)
      }
    } catch (error) {
      console.error('Error testing REMA delta update:', error)
      setTestResult({
        success: false,
        message: 'Test failed due to network error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsTestingDelta(false)
    }
  }

  const importTestProducts = async () => {
    setIsLoading(true)
    setImportResult(null)
    try {
      const response = await fetch('/api/admin/dagligvarer/import-rema-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: true,
          limit: 5
        })
      })
      const result = await response.json()
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `✅ Test import successful! ${result.import?.newProducts || result.newProducts || 0} new, ${result.import?.updatedProducts || result.updatedProducts || 0} updated products`
        })
        // Refresh database stats
        fetchDatabaseStats()
        loadLatestProducts()
      } else {
        setImportResult({
          success: false,
          message: `❌ Import failed: ${result.error || 'Unknown error'}`
        })
      }
    } catch (error) {
      console.error('Error importing test products:', error)
      setImportResult({
        success: false,
        message: '❌ Import failed due to network error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const importAllProducts = async () => {
    setIsLoading(true)
    setImportResult(null)
    try {
      const response = await fetch('/api/admin/dagligvarer/import-rema-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          test: false
        })
      })
      const result = await response.json()
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `✅ Full import successful! ${result.import?.newProducts || result.newProducts || 0} new, ${result.import?.updatedProducts || result.updatedProducts || 0} updated products`
        })
        // Refresh database stats
        fetchDatabaseStats()
        loadLatestProducts()
      } else {
        setImportResult({
          success: false,
          message: `❌ Import failed: ${result.error || 'Unknown error'}`
        })
      }
    } catch (error) {
      console.error('Error importing all products:', error)
      setImportResult({
        success: false,
        message: '❌ Import failed due to network error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fixExistingProducts = async () => {
    setIsLoading(true)
    setImportResult(null)
    try {
      const response = await fetch('/api/admin/dagligvarer/import-rema-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fixExistingProducts'
        })
      })
      const result = await response.json()
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `✅ Fix successful! ${result.fixedProducts || 0} products fixed`
        })
        // Refresh database stats
        fetchDatabaseStats()
        loadLatestProducts()
      } else {
        setImportResult({
          success: false,
          message: `❌ Fix failed: ${result.error || 'Unknown error'}`
        })
      }
    } catch (error) {
      console.error('Error fixing existing products:', error)
      setImportResult({
        success: false,
        message: '❌ Fix failed due to network error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  // Batch processing function
  const processBatch = async (products: any[], batchNumber: number, batchSize: number): Promise<{
    success: boolean
    message: string
    productsProcessed: number
    newProducts: number
    updatedProducts: number
    errors: string[]
  }> => {
    try {
      const response = await fetch('/api/admin/dagligvarer/import-rema-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          products: products,
          batchNumber: batchNumber,
          batchSize: batchSize
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        return {
          success: true,
          message: `✅ Batch ${batchNumber} successful`,
          productsProcessed: products.length,
          newProducts: result.import?.newProducts || 0,
          updatedProducts: result.import?.updatedProducts || 0,
          errors: result.import?.errors || []
        }
      } else {
        return {
          success: false,
          message: `❌ Batch ${batchNumber} failed: ${result.error || 'Unknown error'}`,
          productsProcessed: products.length,
          newProducts: 0,
          updatedProducts: 0,
          errors: [result.error || 'Unknown error']
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Batch ${batchNumber} network error`,
        productsProcessed: products.length,
        newProducts: 0,
        updatedProducts: 0,
        errors: [error instanceof Error ? error.message : 'Network error']
      }
    }
  }

  const uploadAndImport = async () => {
    if (!selectedFile) return
    
    setIsLoading(true)
    setImportResult(null)
    
    try {
      // Read the file content
      const text = await selectedFile.text()
      let products
      
      try {
        // Try to parse as JSON
        if (selectedFile.name.endsWith('.json')) {
          products = JSON.parse(text)
        } else if (selectedFile.name.endsWith('.jsonl')) {
          // Parse JSONL (one JSON object per line)
          products = text.trim().split('\n').map(line => JSON.parse(line))
        } else {
          throw new Error('Unsupported file format')
        }
      } catch (parseError) {
        throw new Error('Invalid JSON format in file')
      }
      
      // Start batch processing
      setIsBatchImporting(true)
      setBatchProgress({
        current: 1,
        total: Math.ceil(products.length / 100),
        processed: 0,
        success: 0,
        errors: 0
      })
      setBatchResults([])
      
      const batchSize = 100
      const totalBatches = Math.ceil(products.length / 100)
      let totalNewProducts = 0
      let totalUpdatedProducts = 0
      let totalErrors = 0
      
      // Process products in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batchNumber = Math.floor(i / batchSize) + 1
        const batch = products.slice(i, i + batchSize)
        
        // Update progress
        setBatchProgress(prev => prev ? {
          ...prev,
          current: batchNumber,
          processed: i + batch.length
        } : null)
        
        // Process this batch
        const batchResult = await processBatch(batch, batchNumber, batchSize)
        
        // Add to results with batch number
        setBatchResults(prev => [...prev, { ...batchResult, batchNumber }])
        
        // Update totals
        if (batchResult.success) {
          totalNewProducts += batchResult.newProducts
          totalUpdatedProducts += batchResult.updatedProducts
          totalErrors += batchResult.errors.length
          setBatchProgress(prev => prev ? { ...prev, success: totalNewProducts + totalUpdatedProducts } : null)
        } else {
          totalErrors += batchResult.productsProcessed
          setBatchProgress(prev => prev ? { ...prev, errors: totalErrors } : null)
        }
        
        // Small delay between batches to be respectful
        if (batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      // Final result
      setImportResult({
        success: totalErrors === 0,
        message: `✅ Batch import completed! ${totalNewProducts} new, ${totalUpdatedProducts} updated products. ${totalErrors} errors.`
      })
      
      // Clear file selection
      setSelectedFile(null)
      // Refresh database stats
      fetchDatabaseStats()
      loadLatestProducts()
    } catch (error) {
      console.error('Error importing from file:', error)
      setImportResult({
        success: false,
        message: `❌ Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsLoading(false)
      setIsBatchImporting(false)
      setBatchProgress(null)
    }
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

            {/* Database Lagring */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Database Lagring</h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleScrapeAndStore}
                  disabled={isScraping}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Database className="h-5 w-5" />
                  <span>{isScraping ? 'Scraper...' : 'Scrape & Gem Produkter'}</span>
                </button>
                
                {/* Test Delta Capabilities Button */}
                <button
                  onClick={handleTestDeltaCapabilities}
                  disabled={isTestingDelta}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>{isTestingDelta ? 'Tester...' : 'Test Delta Update Endpoints'}</span>
                </button>
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

            {/* Import Products */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Database size={20} className="mr-2" />
                Import Produkter
              </h2>
              
              <div className="space-y-4">
                {/* File Upload Section */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-medium text-green-800 mb-3">📁 Upload JSON Fil</h3>
                  <p className="text-sm text-green-700 mb-3">
                    Upload en JSON fil med REMA 1000 produkter
                  </p>
                  
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept=".json,.jsonl"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700"
                    />
                    
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle size={16} />
                        Valgt fil: {selectedFile.name}
                      </div>
                    )}
                    
                    <button
                      onClick={uploadAndImport}
                      disabled={!selectedFile || isLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Database size={16} />
                      {isLoading ? 'Importerer...' : 'Upload & Import'}
                    </button>
                  </div>
                </div>

                {/* Quick Import Section */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-800 mb-3">⚡ Hurtig Import</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Import fra foruddefinerede data filer
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => importTestProducts()}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Database size={16} />
                      {isLoading ? 'Importerer...' : 'Import Test (5 produkter)'}
                    </button>
                    
                    <button
                      onClick={() => importAllProducts()}
                      disabled={isLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <TrendingUp size={16} />
                      {isLoading ? 'Importerer...' : 'Import Alle Produkter'}
                    </button>
                    
                    <button
                      onClick={() => fixExistingProducts()}
                      disabled={isLoading}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      {isLoading ? 'Fikser...' : 'Fix Eksisterende Produkter'}
                    </button>
                  </div>
                </div>
                
                {importResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {importResult.message}
                    </p>
                  </div>
                )}

                {/* Batch Progress */}
                {isBatchImporting && batchProgress && (
                  <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-800">Batch Import Progress</h4>
                      <span className="text-sm text-blue-600">
                        {batchProgress.current}/{batchProgress.total} batches
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(batchProgress.processed / (batchProgress.total * 100)) * 100}%` }}
                      ></div>
                    </div>
                    
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-blue-600 font-semibold">{batchProgress.processed}</div>
                        <div className="text-blue-500">Processed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">{batchProgress.success}</div>
                        <div className="text-green-500">Success</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600 font-semibold">{batchProgress.errors}</div>
                        <div className="text-red-500">Errors</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Batch Results */}
                {batchResults.length > 0 && (
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-3">Batch Results</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {batchResults.map((result, index) => (
                        <div key={index} className={`text-xs p-2 rounded ${
                          result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          <div className="font-medium">Batch {result.batchNumber}</div>
                          <div>{result.message}</div>
                          <div className="text-gray-600">
                            {result.productsProcessed} products, {result.newProducts} new, {result.updatedProducts} updated
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    {/* Product Image */}
                    {product.image_url && (
                      <div className="mb-3 flex justify-center">
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg shadow-sm"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      {product.price < product.original_price && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full ml-2 flex-shrink-0">
                          TILBUD
                        </span>
                      )}
                    </div>
                    
                    {/* Product Info section */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/dagligvarer/produkt/${product.id}`}
                        className="block hover:bg-gray-100 rounded p-1 -m-1 transition-colors"
                      >
                        <h4 className="font-medium text-gray-900 text-sm line-clamp-2 cursor-pointer hover:text-green-600">
                          {product.name}
                        </h4>
                      </Link>
                      
                      {/* Price and quantity info */}
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Pris:</span>
                          <span className="text-right font-medium">
                            {product.price ? `${product.price.toFixed(2)} kr` : 'Ikke tilgængelig'}
                          </span>
                        </div>
                        
                        {/* Show amount and unit separately if available */}
                        {product.amount && product.unit && (
                          <div className="flex justify-between">
                            <span>Mængde:</span>
                            <span className="text-right font-medium">
                              {product.amount} {product.unit}
                            </span>
                          </div>
                        )}
                        
                        {/* Show quantity as fallback */}
                        {product.quantity && !product.amount && (
                          <div className="flex justify-between">
                            <span>Mængde:</span>
                            <span className="text-right font-medium">
                              {product.quantity}
                            </span>
                          </div>
                        )}
                        
                        {/* Show unit price if available */}
                        {product.unit_price && product.unit_price > 0 && (
                          <div className="flex justify-between">
                            <span>Pris pr. {product.unit || 'enhed'}:</span>
                            <span className="text-right font-medium">
                              {product.unit_price.toFixed(2)} kr
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {product.description && !product.description.match(/^\d+\s+(GR|ML|L|KG|G|CL|DL)/i) && (
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
