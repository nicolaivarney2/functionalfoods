'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Heart, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'

// Mini Price Chart Component
const MiniPriceChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null
  
  const maxPrice = Math.max(...data.map(d => d.price))
  const minPrice = Math.min(...data.map(d => d.price))
  const priceRange = maxPrice - minPrice
  
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * 280
    const y = 60 - ((point.price - minPrice) / priceRange) * 40
    return `${x},${y}`
  }).join(' ')
  
  return (
    <div className="mt-4">
      <h5 className="text-xs font-medium text-gray-700 mb-2">📈 Prisudvikling (Sidste 8 uger)</h5>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3">
        <svg width="280" height="60" className="w-full">
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          <polygon
            points={`0,60 ${points} 280,60`}
            fill="url(#priceGradient)"
          />
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 280
            const y = 60 - ((point.price - minPrice) / priceRange) * 40
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="#1D4ED8"
                className="drop-shadow-sm"
              />
            )
          })}
        </svg>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
          <span>8 uger siden</span>
          <div className="text-center">
            <div className="font-medium text-blue-600">
              {data[data.length - 1]?.price?.toFixed(2)} kr
            </div>
            <div className="text-xs">
              {data[0]?.price < data[data.length - 1]?.price ? '📈' : '📉'} 
              {Math.abs(((data[data.length - 1]?.price - data[0]?.price) / data[0]?.price) * 100).toFixed(1)}%
            </div>
          </div>
          <span>Nu</span>
        </div>
      </div>
    </div>
  )
}

export default function DagligvarerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all'])
  const [showOnlyOffers, setShowOnlyOffers] = useState(false) // Show all products by default, but offers first
  const [selectedStores, setSelectedStores] = useState(['REMA 1000']) // REMA 1000
  const [groupByDepartment, setGroupByDepartment] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [sortBy, setSortBy] = useState('discount')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredProduct, setHoveredProduct] = useState<any>(null)
  const [priceHistoryCache, setPriceHistoryCache] = useState<{[key: string]: any[]}>({})
  const [loadingHistory, setLoadingHistory] = useState<{[key: string]: boolean}>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalProducts, setTotalProducts] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({})

  // Cache for products to avoid refetching
  const [productsCache, setProductsCache] = useState<{[key: string]: any[]}>({})
  
  // Track if offers are available in the database
  const [offersAvailableInDB, setOffersAvailableInDB] = useState<number>(0)
  
  // Cache for categories to prevent infinite re-renders - V2
  const [cachedCategories, setCachedCategories] = useState<any[]>([])
  const [lastCategoryUpdate, setLastCategoryUpdate] = useState<number>(0)

  // Fetch products with REAL pagination - only 10 products at a time
  const fetchProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true)
      
      // Build cache key
      const cacheKey = `${selectedCategories.join(',')}-${searchQuery}-${showOnlyOffers}-${page}`
      
      // Check cache first (but skip cache for offers to ensure fresh data)
      if (productsCache[cacheKey] && !append && !showOnlyOffers) {
        console.log('🚀 Using cached products for:', cacheKey)
        setProducts(productsCache[cacheKey])
        setLoading(false)
        return
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10', // ONLY 10 products per page
        ...(selectedCategories.includes('all') ? {} : { category: selectedCategories[0] }),
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(showOnlyOffers ? { offers: 'true' } : {})
      })
      
      console.log(`🔄 Fetching page ${page} with limit 10...`)
      
      const response = await fetch(`/api/admin/dagligvarer/test-rema?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fetchAllProducts'
        })
      })

      const data = await response.json()
      if (data.success && data.products) {
        console.log(`✅ Got ${data.products.length} products for page ${page}`)
        
        // Check if we're filtering for offers
        if (showOnlyOffers) {
          const rawOffersCount = data.products.filter((p: any) => p.is_on_sale).length
          console.log(`🎯 Offers filter: ${rawOffersCount}/${data.products.length} products on sale`)
        }
        
        // Fix false offers - only show as offer if price is actually lower
        const fixedProducts = data.products.map((product: any) => {
          // Better price comparison with tolerance for floating-point precision
          const hasValidOriginalPrice = product.original_price && typeof product.original_price === 'number'
          const hasValidPrice = product.price && typeof product.price === 'number'
          const isActuallyOnSale = product.is_on_sale && hasValidOriginalPrice && hasValidPrice
          
          // Use a small tolerance (0.005 kr = 0.5 øre) for floating-point comparison
          const priceDifference = hasValidOriginalPrice && hasValidPrice ? product.original_price - product.price : 0
          const isPriceLower = priceDifference > 0.005
          
          // Calculate discount percentage
          let discountPercentage = 0
          if (hasValidOriginalPrice && hasValidPrice && isPriceLower) {
            discountPercentage = Math.round(((product.original_price - product.price) / product.original_price) * 100)
          }
          
          const finalIsOnSale = isActuallyOnSale && isPriceLower
          
          
          
          return {
          ...product,
            is_on_sale: finalIsOnSale,
            discount_percentage: discountPercentage
          }
        })
        
        // Check offer status
        const offersCount = fixedProducts.filter((p: any) => p.is_on_sale && p.discount_percentage > 0).length
        if (offersCount === 0) {
          console.log('❌ No offers found in current products')
        }
        
        // Smart sorting: Offers ALWAYS first by discount percentage, then meat category, then others
        const sortedProducts = fixedProducts.sort((a: any, b: any) => {
          // First: Offers (is_on_sale = true) - ALWAYS PRIORITY, sorted by discount percentage
          if (a.is_on_sale && a.discount_percentage > 0 && !b.is_on_sale) return -1
          if (!a.is_on_sale && b.is_on_sale && b.discount_percentage > 0) return 1
          
          // If both are offers, sort by discount percentage (highest first)
          if (a.is_on_sale && a.discount_percentage > 0 && b.is_on_sale && b.discount_percentage > 0) {
            const aDiscount = a.discount_percentage || 0
            const bDiscount = b.discount_percentage || 0
            if (aDiscount !== bDiscount) {
              return bDiscount - aDiscount // Highest discount first
            }
          }
          
          // Second: Meat category comes first (among non-offer products)
          const aIsMeat = a.category === 'Kød, fisk & fjerkræ'
          const bIsMeat = b.category === 'Kød, fisk & fjerkræ'
          if (aIsMeat && !bIsMeat) return -1
          if (!aIsMeat && bIsMeat) return 1
          
          // Third: Sort by name
          return a.name.localeCompare(b.name)
        })
        
        // Check if sorting actually prioritized offers
        const offersInFirst5 = sortedProducts.slice(0, 5).filter((p: any) => p.is_on_sale && p.discount_percentage > 0)
        console.log(`🎯 Sorting result: ${offersInFirst5.length}/5 first products are offers`)
        
        // Check for duplicate products
        const productIds = sortedProducts.map((p: any) => p.id)
        const uniqueIds = new Set(productIds)
        if (productIds.length !== uniqueIds.size) {
          console.log('⚠️ DUPLICATE PRODUCTS DETECTED!')
          const duplicates = productIds.filter((id: any, index: number) => productIds.indexOf(id) !== index)
          console.log('⚠️ Duplicate IDs:', duplicates)
        }
        
        // Update offers availability state
        const offersAvailable = sortedProducts.some((p: any) => p.is_on_sale && p.discount_percentage > 0)
        setHasOffersAvailable(offersAvailable)
        
        if (append) {
          setProducts(prev => [...prev, ...sortedProducts])
        } else {
          setProducts(sortedProducts)
          // Cache the results
          setProductsCache(prev => ({ ...prev, [cacheKey]: sortedProducts }))
        }
        
        setHasMore(data.pagination?.hasMore || false)
        setTotalProducts(data.pagination?.total || 0)
        setCurrentPage(page)
        
        console.log(`📊 Page ${page}: ${data.pagination?.total || 0} total, ${offersAvailable ? 'has offers' : 'no offers'}`)
      } else {
        if (!append) setProducts([])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      if (!append) setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch category counts efficiently
  const fetchCategoryCounts = async () => {
    try {
      // Get total count and category breakdown without fetching all products
      const response = await fetch('/api/admin/dagligvarer/test-rema?limit=1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fetchCategoryCounts'
        })
      })

      const data = await response.json()
      if (data.success) {
        // Set total count from pagination
        if (data.pagination?.total) {
          setTotalProducts(data.pagination.total)
        }
        
        // Set category counts if available
        if (data.categoryCounts) {
        setCategoryCounts(data.categoryCounts)
        }
      }
    } catch (error) {
      console.error('Failed to fetch category counts:', error)
    }
  }

  // Check if there are offers available in the database
  const checkForOffers = async () => {
    try {
      const response = await fetch('/api/admin/dagligvarer/test-rema?page=1&limit=5&offers=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'fetchAllProducts'
        })
      })
      
      const data = await response.json()
      if (data.success && data.products) {
        const offersCount = data.products.filter((p: any) => p.is_on_sale && p.original_price && p.price < p.original_price).length
        setOffersAvailableInDB(offersCount)
      }
    } catch (error) {
      console.error('Failed to check for offers:', error)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchProducts(1, false)
    fetchCategoryCounts()
    checkForOffers() // Check if there are offers available
  }, [])

  // Refetch when search, category, or offers filter changes
  useEffect(() => {
    fetchProducts(1, false)
  }, [searchQuery, selectedCategories, showOnlyOffers])

  // Infinite scroll - load more products when scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (hasMore && !loading && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        fetchProducts(currentPage + 1, true) // Append next page
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, currentPage])

  // Dynamic categories from products - but always show all available categories
  const getDynamicCategories = (products: any[]) => {
    // Use cached categories if available and recent (less than 5 seconds old)
    const now = Date.now()
    if (cachedCategories.length > 0 && (now - lastCategoryUpdate) < 5000) {
      return cachedCategories
    }
    
    // Instead of using only visible products, get all categories from the database
    // This ensures categories don't disappear when filtering
    const allCategories = [
      'Frugt & grønt',
      'Kolonial', 
      'Kød, fisk & fjerkræ',
      'Mejeri',
      'Brød & kager',
      'Drikkevarer',
      'Snacks & slik',
      'Husholdning & rengøring',
      'Baby & børn',
      'Kæledyr'
    ]
    
    // Use categoryCounts from state if available, otherwise estimate from visible products
    const categoryCountsMap = allCategories.reduce((acc: { [key: string]: number }, categoryName) => {
      if (categoryCounts[categoryName]) {
        // Use the actual count from database
        acc[categoryName] = categoryCounts[categoryName]
      } else {
        // Fallback: count from visible products
        acc[categoryName] = products.filter(p => p.category === categoryName).length
      }
      return acc
    }, {})
    
    // Add "Alle kategorier" with total count
    categoryCountsMap['Alle kategorier'] = totalProducts || products.length

    const categoryIcons: { [key: string]: string } = {
      'Frugt & grønt': '🍎',
      'Kolonial': '🌾',
      'Kød, fisk & fjerkræ': '🥩',
      'Mejeri': '🥛',
      'Brød & kager': '🍞',
      'Drikkevarer': '🥤',
      'Snacks & slik': '🍿',
      'Husholdning & rengøring': '🧽',
      'Baby & børn': '👶',
      'Kæledyr': '🐕',
      'Ukategoriseret': '📦'
    }

    const result = allCategories.map(categoryName => ({
      id: categoryName.toLowerCase().replace(/\s+/g, '-'),
      name: categoryName,
      icon: categoryIcons[categoryName] || '📦',
      count: categoryCountsMap[categoryName] || 0
    }))
    
    // Cache the result and update timestamp
    setCachedCategories(result)
    setLastCategoryUpdate(now)
    
    return result
  }

  // Helper function to get category counts for display
  const getCategoryCountsForDisplay = () => {
    const allCategories = [
      'Frugt & grønt',
      'Kolonial', 
      'Kød, fisk & fjerkræ',
      'Mejeri',
      'Brød & kager',
      'Drikkevarer',
      'Snacks & slik',
      'Husholdning & rengøring',
      'Baby & børn',
      'Kæledyr'
    ]
    
    const categoryCountsMap = allCategories.reduce((acc: { [key: string]: number }, categoryName) => {
      if (categoryCounts[categoryName]) {
        acc[categoryName] = categoryCounts[categoryName]
      } else {
        acc[categoryName] = products.filter(p => p.category === categoryName).length
      }
      return acc
    }, {})
    
    categoryCountsMap['Alle kategorier'] = totalProducts || products.length
    return categoryCountsMap
  }

  // Dynamic stores from products
  const getDynamicStores = (products: any[]) => {
    const storeCounts = products.reduce((acc: { [key: string]: number }, product) => {
      acc[product.store] = (acc[product.store] || 0) + 1
      return acc
    }, {})

    return Object.entries(storeCounts).map(([name, count]) => ({
      name,
      count
    }))
  }

  // Apply local filters that aren't handled by the API
  const filteredProducts = products.filter(product => {
    const matchesStores = selectedStores.includes(product.store)
    const matchesFavorites = !showFavorites || product.isFavorite
    
    return matchesStores && matchesFavorites
  })

  // Group products by category if enabled
  const groupedProducts = groupByDepartment 
    ? filteredProducts.reduce((groups: { [key: string]: any[] }, product) => {
        const category = product.category || 'Ukategoriseret'
        if (!groups[category]) groups[category] = []
        groups[category].push(product)
        return groups
      }, {})
    : {}

  // Get products to display
  const productsToDisplay = groupByDepartment 
    ? Object.entries(groupedProducts).flatMap(([category, products]: [string, any[]]) => products)
    : filteredProducts

  const toggleStore = (storeName: string) => {
    setSelectedStores(prev => 
      prev.includes(storeName) 
        ? prev.filter(name => name !== storeName)
        : [...prev, storeName]
    )
  }

  const toggleCategory = (categoryName: string) => {
    if (categoryName === 'all') {
      // Selecting 'all' clears other selections
      setSelectedCategories(['all'])
    } else {
      setSelectedCategories(prev => {
        // If 'all' is currently selected, replace it with this category
        if (prev.includes('all')) {
          return [categoryName]
        }
        // If this category is already selected, remove it and go back to 'all'
        if (prev.includes(categoryName)) {
          return ['all']
        } else {
          // Add this category to existing selection (multiple categories allowed)
          return [...prev, categoryName]
        }
      })
    }
  }

  const toggleFavorite = (productId: number) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, isFavorite: !product.isFavorite }
          : product
      )
    )
  }

  // 📈 Fetch price history for a product - DISABLED FOR PERFORMANCE
  const fetchPriceHistory = async (productId: string) => {
    // DISABLED: Performance optimization
    return
  }

  // Handle product hover for price history - DISABLED FOR PERFORMANCE
  const handleProductHover = (product: any) => {
    // DISABLED: Performance optimization
    return
  }

  // Check if there are any offers available in the current product set
  const [hasOffersAvailable, setHasOffersAvailable] = useState(false)
  
  // Remove the problematic useEffect - we update hasOffersAvailable inside fetchProducts

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-50 border-b border-green-200">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Dagligvarer</h1>
          <p className="text-lg text-gray-600">Find de bedste tilbud fra dine foretrukne supermarkeder</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:w-80 space-y-6">
            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Søg produkter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="border-b border-gray-200">
                <button
                  onClick={() => toggleCategory('all')}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                    selectedCategories.includes('all') 
                      ? 'bg-green-50 text-green-700 border-r-2 border-green-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes('all')}
                      onChange={() => toggleCategory('all')}
                      className="text-green-600 rounded cursor-pointer"
                    />
                    <span className="text-sm font-medium">Alle kategorier</span>
                  </div>
                  <span className="text-xs text-gray-500">({getCategoryCountsForDisplay()['Alle kategorier'] || totalProducts})</span>
                </button>
              </div>
              
              <div className="max-h-48 overflow-y-auto">
                {getDynamicCategories(products).map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.name)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors border-b border-gray-100 last:border-b-0 ${
                      selectedCategories.includes(category.name) 
                        ? 'bg-green-50 text-green-700 border-r-2 border-green-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => toggleCategory(category.name)}
                        className="text-green-600 rounded cursor-pointer"
                      />
                      <span className="text-xs">{category.icon}</span>
                      <span className="text-xs font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">({getCategoryCountsForDisplay()[category.name] || products.filter(p => p.category === category.name).length})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-xs">Yderligere filtre</h3>
              
              <div className="space-y-3">
                {/* Show only offers checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyOffers}
                    onChange={(e) => setShowOnlyOffers(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Vis kun tilbud ({products.filter(p => p.is_on_sale && p.discount_percentage > 0).length})
                  </span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!showOnlyOffers}
                    onChange={(e) => setShowOnlyOffers(!e.target.checked)}
                    className="text-blue-600 rounded"
                  />
                  <span className="text-xs">Vis alle produkter (tilbud først)</span>
                  <span className="ml-auto text-xs text-blue-600 font-medium">
                    ({totalProducts})
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByDepartment}
                    onChange={(e) => setGroupByDepartment(e.target.checked)}
                    className="text-green-600 rounded"
                  />
                  <span className="text-xs">Gruppér efter kategori</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFavorites}
                    onChange={(e) => setShowFavorites(e.target.checked)}
                    className="text-green-600 rounded"
                  />
                  <span className="text-xs">Mine favoritprodukter</span>
                  <span className="ml-auto text-xs text-gray-500">
                    ({products.filter(p => p.isFavorite).length})
                  </span>
                </label>
              </div>
            </div>

            {/* Stores */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-xs">Butikker</h3>
              <div className="space-y-2">
                {getDynamicStores(products).map(store => (
                  <label key={store.name} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.name)}
                      onChange={() => toggleStore(store.name)}
                      className="text-green-600 rounded"
                    />
                    <span className="text-xs">{store.name}</span>
                    <span className="ml-auto text-xs text-gray-500">({store.count})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategories(['all'])
                setShowOnlyOffers(false) // Show all products by default
                setSelectedStores(['REMA 1000'])
                setGroupByDepartment(false)
                setShowFavorites(false)
              }}
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-xs"
            >
              Nulstil filtre
            </button>
            
            {/* Force Refresh Products */}
            <button
              onClick={() => {
                setProductsCache({}) // Clear cache
                fetchProducts(1, false) // Refresh first page
                fetchCategoryCounts() // Refresh counts
              }}
              className="w-full bg-blue-100 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors text-xs mt-2"
            >
              🔄 Opdater produkter
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Product Count */}
            <div className="mb-6 flex items-center justify-between">
              
              <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Produkter</h2>
              <div className="text-right">
                <p className="text-xs text-gray-400">
                  {loading ? 'Henter produkter...' : `${products.length} af ${totalProducts} produkter vist`}
                </p>
                {hasMore && (
                  <p className="text-xs text-gray-400">Scroll ned for at se flere</p>
                )}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henter produkter...</h3>
                <p className="text-gray-600">Vent venligst</p>
              </div>
            ) : groupByDepartment ? (
              // Grouped display by category
              <div className="space-y-8">
                {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                  <div key={category} className="space-y-4">
                    {/* Category Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                      <span className="text-sm text-gray-500">
                        Viser {Math.min(categoryProducts.length, 5)} ud af {categoryProducts.length} produkter
                      </span>
                    </div>
                    
                    {/* Category Products Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {categoryProducts.slice(0, 5).map(product => (
                        <div 
                          key={product.id} 
                          className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 relative"
                          onMouseEnter={() => handleProductHover(product)}
                          onMouseLeave={() => setHoveredProduct(null)}
                        >
                          {/* Product Image */}
                          <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-400 text-sm">Intet billede</span>
                              </div>
                            )}
                            
                            <div className="absolute top-3 right-3">
                              <button
                                onClick={() => toggleFavorite(product.id)}
                                className={`p-2 rounded-full shadow-sm ${
                                  product.isFavorite 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'
                                } transition-all duration-200`}
                              >
                                <Heart size={16} fill={product.isFavorite ? 'currentColor' : 'none'} />
                              </button>
                            </div>
                            {product.is_on_sale && (
                              <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                                {product.discount_percentage ? `-${product.discount_percentage}%` : 'TILBUD'}
                              </div>
                            )}
                            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                              {product.store}
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="p-4">
                            <Link href={`/dagligvarer/produkt/${product.id}`}>
                              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-tight hover:text-green-600 cursor-pointer">
                                {product.name}
                              </h3>
                            </Link>
                            
                            {/* Quantity and Unit */}
                            <p className="text-xs text-gray-500 mb-2 bg-gray-50 px-2 py-1 rounded-full inline-block">
                              {product.amount} {product.unit || 'stk'}
                            </p>
                            
                            {/* Price */}
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-lg font-bold text-gray-900">
                                {product.price?.toFixed(2)} kr
                              </span>
                              {product.is_on_sale && (
                                <>
                                  <span className="text-xs text-gray-500 line-through">
                                    {product.original_price?.toFixed(2)} kr
                                  </span>
                                  <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded-full">
                                    -{product.discount_percentage}%
                                  </span>
                                </>
                              )}
                            </div>
                            
                            {/* Unit Price */}
                            <p className="text-xs text-gray-600 mb-3">
                              {product.unit_price?.toFixed(2)} kr/{product.unit === 'stk' ? 'stk' : 'kg'}
                            </p>

                            {/* Actions */}
                            <div className="flex space-x-2">
                              <button className="flex-1 bg-transparent hover:bg-green-50 text-green-600 border border-green-300 py-1.5 px-2 rounded text-xs font-medium transition-colors">
                                <Plus size={12} className="inline mr-1" />
                                Tilføj
                              </button>
                              <Link href={`/dagligvarer/produkt/${product.id}`}>
                                <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 px-2 rounded text-xs font-medium transition-colors">
                                  Se mere
                                </button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* See More Button */}
                    {categoryProducts.length > 5 && (
                      <div className="text-center">
                        <button 
                          onClick={() => toggleCategory(category)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Se {Math.min(10, categoryProducts.length - 5)} mere fra '{category}'
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Normal grid display
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {productsToDisplay.map(product => (
                  <div 
                    key={product.id} 
                    className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 relative"
                    onMouseEnter={() => handleProductHover(product)}
                    onMouseLeave={() => setHoveredProduct(null)}
                  >
                    {/* Product Image */}
                    <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-400 text-sm">Intet billede</span>
                        </div>
                      )}
                      
                      <div className="absolute top-3 right-3">
                        <button
                          onClick={() => toggleFavorite(product.id)}
                          className={`p-2 rounded-full shadow-sm ${
                            product.isFavorite 
                              ? 'bg-red-500 text-white' 
                              : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'
                          } transition-all duration-200`}
                        >
                          <Heart size={16} fill={product.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      {product.is_on_sale && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                          {product.discount_percentage ? `-${product.discount_percentage}%` : 'TILBUD'}
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                        {product.store}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <Link href={`/dagligvarer/produkt/${product.id}`}>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-tight hover:text-green-600 cursor-pointer">
                          {product.name}
                        </h3>
                      </Link>
                      
                      {/* Quantity and Unit */}
                      <p className="text-xs text-gray-500 mb-2 bg-gray-50 px-2 py-1 rounded-full inline-block">
                        {product.amount} {product.unit || 'stk'}
                      </p>
                      
                      {/* Price */}
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {product.price?.toFixed(2)} kr
                        </span>
                        {product.is_on_sale && (
                          <>
                            <span className="text-xs text-gray-500 line-through">
                              {product.original_price?.toFixed(2)} kr
                            </span>
                            <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded-full">
                              -{product.discount_percentage}%
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Unit Price */}
                      <p className="text-xs text-gray-600 mb-3">
                        {product.unit_price?.toFixed(2)} kr/{product.unit === 'stk' ? 'stk' : 'kg'}
                      </p>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-transparent hover:bg-green-50 text-green-600 border border-green-300 py-1.5 px-2 rounded text-xs font-medium transition-colors">
                          <Plus size={12} className="inline mr-1" />
                          Tilføj
                        </button>
                        <Link href={`/dagligvarer/produkt/${product.id}`}>
                          <button className="bg-transparent hover:bg-gray-50 text-gray-500 border border-gray-300 py-1.5 px-2 rounded text-xs transition-colors">
                            <TrendingUp size={12} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 🚀 FLOATING PRICE HISTORY CARD */}
            {hoveredProduct && (
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
                <div 
                  className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 max-w-sm"
                  style={{
                    animation: 'fadeIn 0.2s ease-out',
                    '--tw-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden">
                      {hoveredProduct.image_url ? (
                        <img 
                          src={hoveredProduct.image_url} 
                          alt={hoveredProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">📦</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm line-clamp-2">
                        {hoveredProduct.name}
                      </h4>
                      <p className="text-xs text-gray-500">{hoveredProduct.price?.toFixed(2)} kr</p>
                    </div>
                  </div>
                  
                  {loadingHistory[hoveredProduct.id] ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : priceHistoryCache[hoveredProduct.id] && priceHistoryCache[hoveredProduct.id].length > 1 ? (
                    <MiniPriceChart data={priceHistoryCache[hoveredProduct.id]} />
                  ) : (
                    <div className="py-6 text-center">
                      <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Ingen prishistorik tilgængelig</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading Indicator for Infinite Scroll */}
            {hasMore && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-sm">Indlæser flere produkter...</span>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Viser {products.length} af {totalProducts} produkter
                </p>
              </div>
            )}

            {/* No Products */}
            {filteredProducts.length === 0 && products.length > 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen produkter fundet</h3>
                <p className="text-gray-600">Prøv at justere dine filtre eller søge på noget andet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}