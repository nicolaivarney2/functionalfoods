'use client'

import { useState, useEffect } from 'react'
import { Play, Square, RefreshCw, Database, Settings, AlertCircle, CheckCircle, Clock, Save, TrendingUp, Search, Upload, Store, Download } from 'lucide-react'
import Link from 'next/link'

interface ScrapingResult {
  success: boolean
  storeName: string
  productsCount: number
  timestamp: string
  duration: number
  errors: string[]
}

interface DatabaseStats {
  totalProducts: number
  productsOnSale: number
  categories: string[]
  lastUpdate: string | null
  averagePrice: number
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
  const [scrapingStatus, setScrapingStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [lastScraping, setLastScraping] = useState<string | null>(null)
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [selectedStore, setSelectedStore] = useState<string>('rema1000')
  const [importResult, setImportResult] = useState<{success: boolean, message: string, jsonUrl?: string | null, storagePath?: string} | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [latestScraping, setLatestScraping] = useState<{
    timestamp: string
    productsCount: number
    status: string
    metadataId: string
  } | null>(null)
  
  // Store options
  const storeOptions = [
    { value: 'rema1000', label: 'REMA 1000', description: 'Dansk dagligvarekæde' },
    { value: 'netto', label: 'Netto', description: 'Dansk discountkæde (kommer snart)' },
    { value: 'foetex', label: 'Føtex', description: 'Dansk supermarkeds-kæde (kommer snart)' },
    { value: 'bilka', label: 'Bilka', description: 'Dansk hypermarkeds-kæde (kommer snart)' }
  ]
  
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
    loadDatabaseStats()
    loadLatestProducts()
  }, [])

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/admin/dagligvarer/import-rema-products?t=' + Date.now())
      const result = await response.json()
      
      if (result.success) {
        setDatabaseStats(result.statistics)
        setLatestScraping(result.latestScraping)
        console.log('✅ Database stats loaded:', result.statistics)
        console.log('✅ Latest scraping info:', result.latestScraping)
      } else {
        console.error('❌ Failed to load database stats:', result.error)
      }
    } catch (error) {
      console.error('Error loading database stats:', error)
    }
  }

  const downloadLatestScrapedJSON = async () => {
    try {
      const response = await fetch('/api/admin/dagligvarer/import-rema-products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'downloadLatestJSON'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // Create and download the JSON file
        const blob = new Blob([result.data], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rema1000-scraped-${new Date(result.timestamp).toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        console.log('✅ JSON downloaded successfully')
      } else {
        console.error('❌ Failed to download JSON:', result.error)
      }
    } catch (error) {
      console.error('Error downloading JSON:', error)
    }
  }

  const loadLatestProducts = async () => {
    setIsLoading(true)
    try {
      // Only load first 50 products for admin display (much faster)
      const response = await fetch('/api/admin/dagligvarer/test-rema?limit=50')
      const result = await response.json()
      if (result.success && result.products) {
        // setProducts(result.products) // This state is no longer used
        console.log(`✅ Loaded ${result.products.length} products in admin (fast mode)`)
        
        // Check if any products are on sale
        const productsOnSale = result.products.filter((p: any) => p.is_on_sale)
        console.log(`🎯 Admin loaded ${result.products.length} products already on sale`, productsOnSale.slice(0, 3))
        
        // Refresh database stats
        loadDatabaseStats()
      }
    } catch (error) {
      console.error('Failed to load products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startScraping = async () => {
    setIsLoading(true)
    setScrapingStatus('running')
    try {
      const response = await fetch('/api/admin/dagligvarer/store-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ store: selectedStore })
        })
      const result = await response.json()
      
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

  const handleFullScrapeOverwrite = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/full-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      if (result.success) {
        console.log('✅ Full scrape completed:', result)
        alert(`🎉 Full scrape completed!\n\nScraped: ${result.scrape?.totalScraped ?? 0}\nNew products: ${result.scrape?.newProducts ?? 0}\nUpdated: ${result.scrape?.updatedProducts ?? 0}`)
        loadDatabaseStats()
        loadLatestProducts()
      } else {
        console.error('❌ Full scrape failed:', result)
        alert(`❌ Full scrape failed: ${result.message || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('Error running full scrape:', e)
      alert('❌ Network error while running full scrape')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSimpleDelta = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/simple-delta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      if (result.success) {
        console.log('✅ Simple delta completed:', result)
        alert(`🎉 Simple delta completed!\n\nUpdated: ${result.results?.updated ?? 0}\nUnchanged: ${result.results?.unchanged ?? 0}\nErrors: ${result.results?.errors ?? 0}`)
        loadDatabaseStats()
        loadLatestProducts()
      } else {
        console.error('❌ Simple delta failed:', result)
        alert(`❌ Simple delta failed: ${result.message || 'Unknown error'}`)
      }
    } catch (e) {
      console.error('Error running simple delta:', e)
      alert('❌ Network error while running simple delta')
    } finally {
      setIsLoading(false)
    }
  }

  const stopScraping = () => {
    setScrapingStatus('idle')
  }

  const handleTestDeltaCapabilities = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/test-rema', {
        method: 'GET'
      })
      const result = await response.json()
      // setTestResult(result) // This state is no longer used
      if (result.success) {
        console.log('✅ REMA delta update test successful:', result)
      } else {
        console.error('❌ REMA delta update test failed:', result)
      }
    } catch (error) {
      console.error('Error testing REMA delta update:', error)
      // setTestResult({
      //   success: false,
      //   message: 'Test failed due to network error',
      //   timestamp: new Date().toISOString()
      // })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeltaUpdate = async () => {
    setIsLoading(true)
    
    // Show initial message
    alert('🔄 Starting Delta Update...\n\nThis will check ALL ~3770 REMA products for changes.\nExpected time: 6-10 minutes.\n\nCheck the browser console for progress updates.')
    
    try {
      const response = await fetch('/api/admin/dagligvarer/delta-update?t=' + Date.now(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Delta update successful:', result)
        alert(`🎉 Delta update completed!\n\n📊 Results:\n• Updated: ${result.delta.updated} products\n• New: ${result.delta.new} products\n• Unchanged: ${result.delta.unchanged} products\n• Total checked: ${result.delta.updated + result.delta.unchanged} products\n\nCheck the console for detailed change logs.`)
        
        // Refresh data after delta update
        loadDatabaseStats()
        loadLatestProducts()
      } else {
        console.error('❌ Delta update failed:', result)
        alert(`❌ Delta update failed:\n${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error running delta update:', error)
      alert('❌ Network error while running delta update')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncFromScraperLatest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/sync-from-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(latestScraping?.metadataId ? { metadataId: latestScraping.metadataId } : {})
      })
      const result = await response.json()
      if (result.success) {
        console.log('✅ DB-diff sync successful:', result)
        alert(`🎉 DB-diff sync completed!\n\nOpdaterede: ${result.changes?.updated ?? 0}\nIndsat nye: ${result.changes?.inserted ?? 0}\nKilde: ${result.source ? JSON.stringify(result.source) : 'ukendt'}`)
        loadDatabaseStats()
        loadLatestProducts()
      } else {
        console.error('❌ DB-diff sync failed:', result)
        alert(`❌ DB-diff sync failed: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error running DB-diff sync:', error)
      alert('❌ Network error while running DB-diff sync')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncFromUrl = async () => {
    const url = prompt('Indsæt URL til fuld scraped JSON (https://...)')
    if (!url) return
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/sync-from-scraper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      })
      const result = await response.json()
      if (result.success) {
        console.log('✅ DB-diff sync (URL) successful:', result)
        alert(`🎉 DB-diff sync (URL) completed!\n\nOpdaterede: ${result.changes?.updated ?? 0}\nIndsat nye: ${result.changes?.inserted ?? 0}`)
        loadDatabaseStats()
        loadLatestProducts()
      } else {
        console.error('❌ DB-diff sync (URL) failed:', result)
        alert(`❌ DB-diff sync (URL) failed: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error running DB-diff sync (URL):', error)
      alert('❌ Network error while running DB-diff sync (URL)')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFixMissingOriginalPrices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dagligvarer/fix-missing-original-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      const result = await response.json()
      
      if (result.success) {
        // setPriceFixResult({ // This state is no longer used
        //   success: true,
        //   message: result.message,
        //   fixed: result.fixed || []
        // })
        console.log('✅ Original prices fixed:', result)
        
        // Refresh data after fixing prices
        loadDatabaseStats()
        loadLatestProducts()
      } else {
        // setPriceFixResult({ // This state is no longer used
        //   success: false,
        //   message: result.error || 'Failed to fix original prices',
        //   fixed: []
        // })
        console.error('❌ Failed to fix original prices:', result)
      }
    } catch (error) {
      console.error('Error fixing original prices:', error)
      // setPriceFixResult({ // This state is no longer used
      //   success: false,
      //   message: 'Network error while fixing prices',
      //   fixed: []
      // })
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
          test: false,
          store: selectedStore
        })
      })
      const result = await response.json()
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `✅ Full import successful! ${result.import?.newProducts || result.newProducts || 0} new, ${result.import?.updatedProducts || result.updatedProducts || 0} updated products`,
          jsonUrl: result.metadata?.jsonUrl || null,
          storagePath: result.metadata?.storagePath || 'scraper-data/rema/latest.json'
        })
        // Refresh database stats
        loadDatabaseStats()
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
          limit: 5,
          store: selectedStore
        })
      })
      const result = await response.json()
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `✅ Test import successful! ${result.import?.newProducts || result.newProducts || 0} new, ${result.import?.updatedProducts || result.updatedProducts || 0} updated products`
        })
        // Refresh database stats
        loadDatabaseStats()
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
          action: 'fixExistingProducts',
          store: selectedStore
        })
      })
      const result = await response.json()
      
      if (result.success) {
        setImportResult({
          success: true,
          message: `✅ Fix successful! ${result.fixedProducts || 0} products fixed`
        })
        // Refresh database stats
        loadDatabaseStats()
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
          batchSize: batchSize,
          store: selectedStore
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
      loadDatabaseStats()
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
            {/* Store Selection */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Store size={20} className="mr-2" />
                Vælg Supermarked
              </h2>
              <div className="space-y-3">
                {storeOptions.map((store) => (
                <button
                    key={store.value}
                    onClick={() => setSelectedStore(store.value)}
                    className={`w-full px-4 py-2 rounded-lg text-left ${
                      selectedStore === store.value
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{store.label}</span>
                      <span className="text-xs text-gray-500">{store.description}</span>
                    </div>
                </button>
                ))}
              </div>
            </div>

            {/* Scraping Control */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
                              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Play size={20} className="mr-2" />
                  Scraping Kontrol
                </h2>
              
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  {/* Quick Scrape removed */}
                  {false && (
                    <button
                      onClick={startScraping}
                      disabled={scrapingStatus === 'running' || isLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Play size={16} />
                      Quick Scrape (sample)
                    </button>
                  )}
                  
                  <button
                    onClick={stopScraping}
                    disabled={scrapingStatus !== 'running'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Square size={16} />
                    Stop Scraping
                  </button>

                  {/* Delta Update removed */}
                  {false && (
                    <button
                      onClick={handleDeltaUpdate}
                      disabled={isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <RefreshCw size={16} />
                      Delta Update
                    </button>
                  )}

                  <button
                    onClick={handleSimpleDelta}
                    disabled={isLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Simple Delta Update
                  </button>

                  <button
                    onClick={handleFullScrapeOverwrite}
                    disabled={isLoading}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Full Scrape (DB overwrite)
                  </button>

                  <button
                    onClick={handleSyncFromScraperLatest}
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    DB Diff Sync (Seneste)
                  </button>

                  <button
                    onClick={handleSyncFromUrl}
                    disabled={isLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    DB Diff Sync (URL)
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

            {/* Scraper Configuration */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Settings size={20} className="mr-2" />
                Konfiguration
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Selected Store</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {storeOptions.find(s => s.value === selectedStore)?.label}
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

              {/* Delta Update Info */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">🔄 Delta Update</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Delta update tjekker ALLE REMA produkter for ændringer i priser og tilbud. 
                  Dette er hurtigere end en fuld import men tager stadig nogle minutter.
                </p>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Tjekker alle ~3770 REMA produkter for ændringer</li>
                  <li>• Opdaterer priser og tilbud på eksisterende produkter</li>
                  <li>• Finder nye produkter</li>
                  <li>• Fixer manglende original priser på tilbud</li>
                  <li>• Viser progress hver 100. produkt</li>
                </ul>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⏱️ Forventet tid: 6-10 minutter for alle produkter
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Import Products */}
          <div className="space-y-6">
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
                      <Upload size={16} />
                      {isLoading ? 'Importerer...' : 'Upload & Import'}
                    </button>
                  </div>
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {importResult.message}
                    </p>
                    {importResult.success && (
                      <div className="mt-2 text-xs text-green-700 space-y-1">
                        {importResult.jsonUrl && (
                          <div>
                            Public URL: <a className="underline" href={importResult.jsonUrl} target="_blank" rel="noreferrer">{importResult.jsonUrl}</a>
                          </div>
                        )}
                        {importResult.storagePath && (
                          <div>Storage path: {importResult.storagePath}</div>
                        )}
                      </div>
                    )}
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
                <Database size={20} className="mr-2" />
                Database Statistikker
              </h2>
              
              {databaseStats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{databaseStats.totalProducts}</div>
                      <div className="text-sm text-blue-800">Total Produkter</div>
                  </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{databaseStats.productsOnSale}</div>
                      <div className="text-sm text-green-800">På Tilbud</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <div>Kategorier: {databaseStats.categories.length}</div>
                    <div>Gns. Pris: {databaseStats.averagePrice} kr</div>
                    <div>Sidst Opdateret: {databaseStats.lastUpdate ? new Date(databaseStats.lastUpdate).toLocaleString('da-DK') : 'Aldrig'}</div>
                  </div>
                  
                  {/* 🔥 NEW: Latest Scraping Info */}
                  {latestScraping && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h3 className="font-medium text-yellow-800 mb-2">📊 Seneste Scraping</h3>
                      <div className="text-sm text-yellow-700 space-y-1">
                        <div>Tidspunkt: {new Date(latestScraping.timestamp).toLocaleString('da-DK')}</div>
                        <div>Produkter: {latestScraping.productsCount}</div>
                        <div>Status: {latestScraping.status}</div>
                  </div>
                  
                      <button
                        onClick={downloadLatestScrapedJSON}
                        className="mt-3 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center gap-2"
                      >
                        <Download size={16} />
                        Download Seneste JSON
                      </button>
                  </div>
                  )}
                  
                  <button
                    onClick={loadDatabaseStats}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No data available</div>
                  <button
                    onClick={loadDatabaseStats}
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

        {/* Product List Section - Removed for now */}
        {/* This section will be reimplemented when we have proper product fetching */}

        {/* Loading state for products */}
        {isLoading && (
          <div className="mt-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin mr-3" />
                <span className="text-gray-600">Processing...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
