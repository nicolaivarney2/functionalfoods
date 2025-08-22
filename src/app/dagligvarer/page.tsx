'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Filter, Heart, TrendingUp, TrendingDown, Store, Tag, Grid, X, Plus } from 'lucide-react'

// Mock data for development (fallback)
const mockProducts = [
  {
    id: 1,
    name: 'Appelsin Sydafrika',
    store: 'REMA 1000',
    category: 'Frugt og grønt',
    currentPrice: 3.50,
    originalPrice: 5.00,
    discount: 30,
    unit: 'stk',
    unitPrice: 3.50,
    image: '/images/products/appelsin.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 2,
    name: 'Hytteost 1.5%',
    store: 'REMA 1000',
    category: 'Mejeri og køl',
    currentPrice: 15.50,
    originalPrice: 19.95,
    discount: 22,
    unit: '250g',
    unitPrice: 62.00,
    image: '/images/products/hytteost.jpg',
    isFavorite: true,
    isOnSale: true
  },
  {
    id: 3,
    name: 'Laksefileter',
    store: 'REMA 1000',
    category: 'Kød, fisk & fjerkræ',
    currentPrice: 39.00,
    originalPrice: 49.95,
    discount: 22,
    unit: '225g',
    unitPrice: 173.33,
    image: '/images/products/laks.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 4,
    name: 'Bananner Ecuador',
    store: 'Netto',
    category: 'Frugt og grønt',
    currentPrice: 12.95,
    originalPrice: 19.95,
    discount: 35,
    unit: '1kg',
    unitPrice: 12.95,
    image: '/images/products/bananer.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 5,
    name: 'Kyllingebryst',
    store: 'Føtex',
    category: 'Kød, fisk & fjerkræ',
    currentPrice: 45.00,
    originalPrice: 59.95,
    discount: 25,
    unit: '500g',
    unitPrice: 90.00,
    image: '/images/products/kylling.jpg',
    isFavorite: true,
    isOnSale: true
  },
  {
    id: 6,
    name: 'Grovt rugbrød',
    store: 'REMA 1000',
    category: 'Brød og kager',
    currentPrice: 18.50,
    originalPrice: 24.95,
    discount: 26,
    unit: '800g',
    unitPrice: 23.13,
    image: '/images/products/rugbrød.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 7,
    name: 'Mælk 3.5%',
    store: 'Netto',
    category: 'Mejeri og køl',
    currentPrice: 8.95,
    originalPrice: 12.95,
    discount: 31,
    unit: '1L',
    unitPrice: 8.95,
    image: '/images/products/mælk.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 8,
    name: 'Tomatpuré',
    store: 'Bilka',
    category: 'Kolonial',
    currentPrice: 6.95,
    originalPrice: 9.95,
    discount: 30,
    unit: '140g',
    unitPrice: 49.64,
    image: '/images/products/tomatpuré.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 9,
    name: 'Frosne grønne bønner',
    store: 'Føtex',
    category: 'Frost',
    currentPrice: 22.50,
    originalPrice: 29.95,
    discount: 25,
    unit: '400g',
    unitPrice: 56.25,
    image: '/images/products/bønner.jpg',
    isFavorite: true,
    isOnSale: true
  },
  {
    id: 10,
    name: 'Havregryn',
    store: 'REMA 1000',
    category: 'Kolonial',
    currentPrice: 14.95,
    originalPrice: 19.95,
    discount: 25,
    unit: '1kg',
    unitPrice: 14.95,
    image: '/images/products/havregryn.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 11,
    name: 'Æg fra fritgående høns',
    store: 'Netto',
    category: 'Mejeri og køl',
    currentPrice: 24.95,
    originalPrice: 34.95,
    discount: 29,
    unit: '15 stk',
    unitPrice: 1.66,
    image: '/images/products/æg.jpg',
    isFavorite: false,
    isOnSale: true
  },
  {
    id: 12,
    name: 'Løg',
    store: 'Bilka',
    category: 'Frugt og grønt',
    currentPrice: 8.95,
    originalPrice: 12.95,
    discount: 31,
    unit: '1kg',
    unitPrice: 8.95,
    image: '/images/products/løg.jpg',
    isFavorite: false,
    isOnSale: true
  }
]

// Dynamisk kategorier baseret på REMA data
const getDynamicCategories = (products: any[]) => {
  if (!products || products.length === 0) return []
  
  const categoryCounts = products.reduce((acc, product) => {
    const category = product.category || 'Ukategoriseret'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // Konverter til array format med ikoner
  const categoryIcons: Record<string, string> = {
    'Frugt & grønt': '🍎',
    'Kolonial': '🌾',
    'Kød, fisk & fjerkræ': '🥩',
    'Mejeri': '🥛',
    'Brød & kager': '🥐',
    'Drikkevarer': '☕',
    'Snacks & slik': '🍪',
    'Husholdning & rengøring': '🏠',
    'Baby & børn': '👶',
    'Kæledyr': '🐕',
    'Ukategoriseret': '📦'
  }
  
  return Object.entries(categoryCounts).map(([name, count], id) => ({
    id: id + 1,
    name,
    icon: categoryIcons[name] || '📦',
    count
  }))
}

const mockStores = [
  { id: 1, name: 'REMA 1000', color: 'bg-blue-600', isSelected: true },
  { id: 2, name: 'Netto', color: 'bg-yellow-500', isSelected: true },
  { id: 3, name: 'Føtex', color: 'bg-blue-500', isSelected: false },
  { id: 4, name: 'Bilka', color: 'bg-blue-700', isSelected: false },
  { id: 5, name: 'Nemlig.com', color: 'bg-orange-500', isSelected: false },
  { id: 6, name: 'MENY', color: 'bg-red-600', isSelected: false },
  { id: 7, name: 'Spar', color: 'bg-red-500', isSelected: false }
]

// 🚀 MINI PRICE CHART FOR HOVER CARDS
function MiniPriceChart({ data }: { data: any[] }) {
  if (!data || data.length < 2) return null
  
  const chartWidth = 280
  const chartHeight = 80
  const padding = 10
  
  const prices = data.map(d => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1
  
  // Create path
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding)
    const y = padding + ((maxPrice - d.price) / priceRange) * (chartHeight - 2 * padding)
    return `${x},${y}`
  })
  
  const path = `M${points.join(' L')}`
  
  // Calculate trend
  const priceChange = data[data.length - 1].price - data[0].price
  const isPositive = priceChange >= 0
  
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 text-xs ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="font-medium">
          {isPositive ? '+' : ''}{priceChange.toFixed(2)} kr siden start
        </span>
      </div>
      
      <svg width={chartWidth} height={chartHeight} className="w-full">
        {/* Simple area fill */}
        <path
          d={`${path} L${chartWidth - padding},${chartHeight - padding} L${padding},${chartHeight - padding} Z`}
          fill={isPositive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}
        />
        
        {/* Price line */}
        <path
          d={path}
          fill="none"
          stroke={isPositive ? '#EF4444' : '#22C55E'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Points */}
        {data.map((point, i) => {
          const x = padding + (i / (data.length - 1)) * (chartWidth - 2 * padding)
          const y = padding + ((maxPrice - point.price) / priceRange) * (chartHeight - 2 * padding)
          
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill={isPositive ? '#EF4444' : '#22C55E'}
            />
          )
        })}
      </svg>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>{minPrice.toFixed(2)} kr</span>
        <span>{maxPrice.toFixed(2)} kr</span>
      </div>
    </div>
  )
}

export default function DagligvarerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all'])
  const [showOnlyOffers, setShowOnlyOffers] = useState(false)
  const [selectedStores, setSelectedStores] = useState(['REMA 1000']) // REMA 1000
  const [groupByDepartment, setGroupByDepartment] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [sortBy, setSortBy] = useState('discount')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredProduct, setHoveredProduct] = useState<any>(null)
  const [priceHistoryCache, setPriceHistoryCache] = useState<{[key: string]: any[]}>({})
  const [loadingHistory, setLoadingHistory] = useState<{[key: string]: boolean}>({})

  // Fetch real products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/admin/dagligvarer/test-rema', {
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
          setProducts(data.products)
        } else {
          // Fallback to mock data if API fails
          setProducts(mockProducts)
        }
      } catch (error) {
        console.error('Failed to fetch products:', error)
        // Fallback to mock data if API fails
        setProducts(mockProducts)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])


  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategories.includes('all') || selectedCategories.includes(product.category)
    const matchesOffers = !showOnlyOffers || product.is_on_sale
    const matchesStores = selectedStores.includes(product.store)
    
    return matchesSearch && matchesCategory && matchesOffers && matchesStores
  })

  const toggleStore = (storeName: string) => {
    setSelectedStores(prev => 
      prev.includes(storeName) 
        ? prev.filter(name => name !== storeName)
        : [...prev, storeName]
    )
  }

  const toggleCategory = (categoryName: string) => {
    if (categoryName === 'all') {
      setSelectedCategories(['all'])
    } else {
      setSelectedCategories(prev => {
        const newCategories = prev.filter(cat => cat !== 'all')
        if (prev.includes(categoryName)) {
          return newCategories.filter(cat => cat !== categoryName)
        } else {
          return [...newCategories, categoryName]
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

  // 📈 Fetch price history for a product
  const fetchPriceHistory = async (productId: string) => {
    if (priceHistoryCache[productId] || loadingHistory[productId]) return
    
    try {
      setLoadingHistory(prev => ({ ...prev, [productId]: true }))
      
      const response = await fetch('/api/admin/dagligvarer/test-rema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetchPriceHistory',
          productId: productId
        })
      })

      const data = await response.json()
      if (data.success && data.priceHistory) {
        setPriceHistoryCache(prev => ({ ...prev, [productId]: data.priceHistory }))
      }
    } catch (err) {
      console.error('Error fetching price history:', err)
    } finally {
      setLoadingHistory(prev => ({ ...prev, [productId]: false }))
    }
  }

  // Handle product hover for price history
  const handleProductHover = (product: any) => {
    setHoveredProduct(product)
    if (product) {
      fetchPriceHistory(product.id.toString())
    }
  }

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
                  placeholder="Søg efter dagligvarer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
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
                      className="text-green-600 rounded"
                    />
                    <span className="text-sm font-medium">Alle kategorier</span>
                  </div>
                  <span className="text-xs text-gray-500">({products.length})</span>
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
                        className="text-green-600 rounded"
                      />
                      <span className="text-base">{category.icon}</span>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">({products.filter(p => p.category === category.name).length})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Yderligere filtre</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyOffers}
                    onChange={(e) => setShowOnlyOffers(e.target.checked)}
                    className="text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Kun tilbudsvarer</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByDepartment}
                    onChange={(e) => setGroupByDepartment(e.target.checked)}
                    className="text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Gruppér efter kategori</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFavorites}
                    onChange={(e) => setShowFavorites(e.target.checked)}
                    className="text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Mine favoritprodukter</span>
                </label>
              </div>
            </div>

            {/* Store Selection */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Store size={20} className="mr-2" />
                Butik
              </h3>
              <div className="space-y-2">
                {Array.from(new Set(products.map(p => p.store))).map(storeName => (
                  <label key={storeName} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(storeName)}
                      onChange={() => toggleStore(storeName)}
                      className="text-blue-600 rounded"
                    />
                    <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                    <span className="text-sm text-gray-700">{storeName}</span>
                    <span className="text-xs text-gray-500">({products.filter(p => p.store === storeName).length})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategories(['all'])
                setShowOnlyOffers(false)
                setSelectedStores(['REMA 1000'])
                setGroupByDepartment(false)
                setShowFavorites(false)
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors"
            >
              Nulstil alle filtre
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Top Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Active Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCategories.length > 0 && !selectedCategories.includes('all') && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                      {selectedCategories.join(', ')}
                      <button
                        onClick={() => setSelectedCategories(['all'])}
                        className="ml-2 hover:text-blue-600"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {showOnlyOffers && (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center">
                      På tilbud
                      <button
                        onClick={() => setShowOnlyOffers(false)}
                        className="ml-2 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {selectedStores.map(storeName => (
                    <span key={storeName} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center">
                      {storeName}
                      <button
                        onClick={() => toggleStore(storeName)}
                        className="ml-2 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="discount">Højeste rabat</option>
                  <option value="price">Laveste pris</option>
                  <option value="name">Navn A-Å</option>
                  <option value="store">Butik</option>
                </select>
              </div>
            </div>

            {/* Product Count */}
            <div className="mb-4">
              <p className="text-gray-600">
                {loading ? 'Henter produkter...' : `${filteredProducts.length} produkter fundet`}
              </p>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search size={48} className="mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henter produkter...</h3>
                  <p className="text-gray-600">Vent venligst</p>
                </div>
              ) : filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 relative"
                  onMouseEnter={() => handleProductHover(product)}
                  onMouseLeave={() => setHoveredProduct(null)}
                >
                  {/* Product Image */}
                  <div className="relative h-20 bg-gradient-to-br from-gray-50 to-gray-100">
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
                        TILBUD
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                      {product.store}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-6">
                    <Link href={`/dagligvarer/produkt/${product.id}`}>
                      <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 text-sm leading-tight hover:text-green-600 cursor-pointer">
                      {product.name}
                    </h3>
                    </Link>
                    <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-2 py-1 rounded-full inline-block">
                      {product.unit || 'stk'}
                    </p>
                    
                    {/* Price */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-xl font-bold text-gray-900">
                        {product.price?.toFixed(2)} kr
                      </span>
                      {product.is_on_sale && (
                        <span className="text-sm text-gray-500 line-through">
                          {product.original_price?.toFixed(2)} kr
                        </span>
                      )}
                    </div>
                    
                    {/* Unit Price */}
                    <p className="text-sm text-gray-600 mb-5">
                      {product.unit_price?.toFixed(2)} kr/{product.unit === 'stk' ? 'stk' : 'kg'}
                    </p>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-transparent hover:bg-green-50 text-green-600 border border-green-300 py-1.5 px-2 rounded text-xs font-medium transition-colors">
                        <Plus size={12} className="inline mr-1" />
                        Tilføj
                      </button>
                      <button className="bg-transparent hover:bg-gray-50 text-gray-500 border border-gray-300 py-1.5 px-2 rounded text-xs transition-colors">
                        <TrendingUp size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

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
