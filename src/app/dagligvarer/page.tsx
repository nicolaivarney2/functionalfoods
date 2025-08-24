'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Heart, Plus, TrendingUp, Store, Tag } from 'lucide-react'
import Link from 'next/link'

// Product Card Component
const ProductCard = ({ product, onToggleFavorite }: { 
  product: any, 
  onToggleFavorite: (id: number) => void 
}) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 relative">
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
      
      {/* Favorite Button */}
      <div className="absolute top-3 right-3">
        <button
          onClick={() => onToggleFavorite(product.id)}
          className={`p-2 rounded-full shadow-sm ${
            product.isFavorite 
              ? 'bg-red-500 text-white' 
              : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'
          } transition-all duration-200`}
        >
          <Heart size={16} fill={product.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      
      {/* Discount Badge */}
      {product.is_on_sale && (
        <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
          {product.discount_percentage ? `-${product.discount_percentage}%` : 'TILBUD'}
        </div>
      )}
      
      {/* Store Badge */}
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
)



export default function DagligvarerPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all'])
  const [showOnlyOffers, setShowOnlyOffers] = useState(true) // ✅ DEFAULT: Show only offers
  const [groupByCategory, setGroupByCategory] = useState(true) // ✅ DEFAULT: Group by category
  const [showFavorites, setShowFavorites] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalProducts, setTotalProducts] = useState(0)
  const [categoryCounts, setCategoryCounts] = useState<{[key: string]: number}>({})

  // Cache for products to avoid refetching
  const [productsCache, setProductsCache] = useState<{[key: string]: any[]}>({})
  
  // Debounce filter changes to prevent rapid API calls
  const [filterDebounceTimer, setFilterDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  // Fetch products with pagination
  const fetchProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (loading && !append) return
      
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
        limit: '20', // Increased to 20 products per page
        ...(selectedCategories.includes('all') ? {} : { category: selectedCategories[0] }),
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(showOnlyOffers ? { offers: 'true' } : {})
      })
      
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
        // Fix false offers - only show as offer if price is actually lower
        const fixedProducts = data.products.map((product: any) => {
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
        
        // ✅ API now handles deduplication, so we can use products directly
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
          
          // Then sort by name
          return a.name.localeCompare(b.name)
        })
        
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
        if (data.pagination?.total) {
          setTotalProducts(data.pagination.total)
        }
        
        if (data.categoryCounts) {
          setCategoryCounts(data.categoryCounts)
        }
      }
    } catch (error) {
      console.error('Failed to fetch category counts:', error)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchProducts(1, false)
    fetchCategoryCounts()
  }, [])

  // Refetch when search, category, or offers filter changes
  useEffect(() => {
    if (filterDebounceTimer) {
      clearTimeout(filterDebounceTimer)
    }
    
    const timer = setTimeout(() => {
      if (!loading) {
        fetchProducts(1, false)
      }
    }, 300)
    
    setFilterDebounceTimer(timer)
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [searchQuery, selectedCategories, showOnlyOffers])

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (hasMore && !loading && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        fetchProducts(currentPage + 1, true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, currentPage])

  // Get categories for display
  const getCategories = () => {
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
      'Kæledyr': '🐕'
    }

    return allCategories.map(categoryName => ({
      id: categoryName.toLowerCase().replace(/\s+/g, '-'),
      name: categoryName,
      icon: categoryIcons[categoryName] || '📦',
      count: categoryCounts[categoryName] || 0
    }))
  }

  // Get stores from products
  const getStores = () => {
    const storeCounts = products.reduce((acc: { [key: string]: number }, product) => {
      acc[product.store] = (acc[product.store] || 0) + 1
      return acc
    }, {})

    return Object.entries(storeCounts).map(([name, count]) => ({
      name,
      count
    }))
  }

  // Apply local filters
  const filteredProducts = products.filter(product => {
    const matchesFavorites = !showFavorites || product.isFavorite
    return matchesFavorites
  })

  // Group products by category if enabled
  const groupedByCategory = groupByCategory 
    ? filteredProducts.reduce((groups: { [key: string]: any[] }, product) => {
        const category = product.category || 'Ukategoriseret'
        if (!groups[category]) groups[category] = []
        groups[category].push(product)
        return groups
      }, {})
    : {}

  // Toggle functions
  const toggleCategory = (categoryName: string) => {
    if (categoryName === 'all') {
      setSelectedCategories(['all'])
    } else {
      setSelectedCategories(prev => {
        if (prev.includes('all')) {
          return [categoryName]
        }
        if (prev.includes(categoryName)) {
          return ['all']
        } else {
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

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategories(['all'])
    setShowOnlyOffers(true) // ✅ Keep offers enabled by default
    setGroupByCategory(true) // ✅ Keep category grouping enabled by default
    setShowFavorites(false)
  }

  const refreshProducts = () => {
    setProductsCache({})
    fetchProducts(1, false)
    fetchCategoryCounts()
  }

  return (
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
          <div className="lg:w-1/5 space-y-6">
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
                  <span className="text-xs text-gray-500">({totalProducts})</span>
                </button>
              </div>
              
              <div className="max-h-48 overflow-y-auto">
                {getCategories().map(category => (
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
                    <span className="text-xs text-gray-500">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 text-xs">Filtre</h3>
              
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
                
                {/* Group by category checkbox */}
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByCategory}
                    onChange={(e) => setGroupByCategory(e.target.checked)}
                    className="text-green-600 rounded"
                  />
                  <span className="text-xs">Gruppér efter kategori</span>
                </label>

                {/* Show favorites checkbox */}
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
                {getStores().map(store => (
                  <div key={store.name} className="flex items-center justify-between">
                    <span className="text-xs">{store.name}</span>
                    <span className="text-xs text-gray-500">({store.count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={resetFilters}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-xs"
              >
                Nulstil filtre
              </button>
              
              <button
                onClick={refreshProducts}
                className="w-full bg-blue-100 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors text-xs"
              >
                🔄 Opdater produkter
              </button>
            </div>
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

            {/* Products Display */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Henter produkter...</h3>
                <p className="text-gray-600">Vent venligst</p>
              </div>
            ) : groupByCategory ? (
              // ✅ Grouped by category display
              <div className="space-y-8">
                {Object.entries(groupedByCategory).map(([category, categoryProducts]) => (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Tag size={20} className="text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                      <span className="text-sm text-gray-500">({categoryProducts.length} produkter)</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {categoryProducts.map(product => (
                        <ProductCard 
                          key={product.id} 
                          product={product} 
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Normal grid display
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
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
  )
}