'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Heart, Plus, ChevronDown } from 'lucide-react'
import ComingSoonWrapper from '@/components/ComingSoonWrapper'


// Types
interface Product {
  id: string
  name: string
  description?: string
  category?: string
  price: number
  original_price?: number
  unit: string
  unit_price?: number
  is_on_sale: boolean
  discount_percentage?: number
  image_url?: string
  store: string
  amount?: string
  isFavorite?: boolean
}

interface ProductCounts {
  total: number
  categories: {[key: string]: number}
  offers: number
}

// Product Card Component
const ProductCard = ({ product, onToggleFavorite, onOpenModal }: { 
  product: Product, 
  onToggleFavorite: (id: string) => void,
  onOpenModal: (product: Product) => void
}) => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 relative group">
    {/* Product Image */}
    <div className="relative h-40 bg-white flex items-center justify-center p-3 cursor-pointer" onClick={() => onOpenModal(product)}>
      {product.image_url ? (
        <img 
          src={product.image_url} 
          alt={product.name}
          className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-105"
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
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="p-2 rounded-full shadow-sm bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <Heart size={16} />
        </button>
      </div>
      
      {/* No discount badges on image anymore */}
      
      {/* Store Badge with color coding */}
      <div className={`absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border-2 ${
        product.store === 'Netto' ? 'border-yellow-400' :
        product.store === 'REMA 1000' ? 'border-blue-900' :
        product.store === 'Føtex' ? 'border-blue-950' :
        product.store === 'Bilka' ? 'border-blue-400' :
        product.store === 'Nemlig' ? 'border-orange-600' :
        product.store === 'MENY' ? 'border-red-800' :
        product.store === 'Spar' ? 'border-red-600' :
        'border-gray-300'
      }`}>
        {product.store}
            </div>
            </div>

    {/* Product Info */}
    <div className="p-4">
      <div onClick={() => onOpenModal(product)} className="cursor-pointer">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-tight hover:text-green-600">
          {product.name}
          {product.amount && (
            <span className="text-xs text-gray-500 font-normal ml-1">
              ({product.amount} {product.unit || 'stk'})
            </span>
          )}
        </h3>
      </div>
      
      {/* Price Section */}
      <div className="mb-3">
        {product.is_on_sale && product.discount_percentage ? (
          // Product on sale - show both prices with clear indicators
          <div className="space-y-2">
            {/* Offer Price with "TILBUD" tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-red-600">
                {(product.price || 0).toFixed(2)} kr
              </span>
              <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                TILBUD
              </span>
            </div>
            
            {/* Normal Price (crossed out) */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 line-through">
                Normalpris: {(product.original_price || 0).toFixed(2)} kr
              </span>
            </div>
            
            {/* Savings Information */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                SPAR {product.discount_percentage}%
        </span>
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">
                Besparelse: {((product.original_price || 0) - (product.price || 0)).toFixed(2)} kr
            </span>
            </div>
          </div>
        ) : (
          // Normal product - show price and normal price for transparency
          <div className="space-y-1">
            <span className="text-lg font-bold text-gray-900">
              {(product.price || 0).toFixed(2)} kr
            </span>
            {product.original_price && (
              <div className="text-xs text-gray-500">
                Normalpris: {(product.original_price || 0).toFixed(2)} kr
              </div>
            )}
          </div>
        )}
          </div>
      
      {/* Unit Price */}
      {product.unit_price && !isNaN(product.unit_price) && (
      <p className="text-xs text-gray-600 mb-3">
          {product.unit_price.toFixed(2)} kr/{product.unit === 'stk' ? 'stk' : 'kg'}
      </p>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button className="flex-1 bg-transparent hover:bg-green-50 text-green-600 border border-green-300 py-1.5 px-2 rounded text-xs font-medium transition-colors">
          <Plus size={12} className="inline mr-1" />
          Tilføj
        </button>
        <button 
          onClick={() => onOpenModal(product)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 px-2 rounded text-xs font-medium transition-colors"
        >
            Se mere
          </button>
      </div>
    </div>
  </div>
)

// Loading Skeleton
const ProductSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-pulse">
    <div className="h-40 bg-gray-200 flex items-center justify-center">
      <div className="w-20 h-20 bg-gray-300 rounded"></div>
    </div>
    <div className="p-4">
      <div className="h-4 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-1/4 mb-3"></div>
      <div className="flex space-x-2">
        <div className="flex-1 h-7 bg-gray-200 rounded"></div>
        <div className="h-7 w-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )

// Sort options
const SORT_OPTIONS = [
  { value: 'discount', label: 'Højeste rabat' },
  { value: 'relevance', label: 'Relevans' },
  { value: 'price_low', label: 'Laveste kilopris' },
  { value: 'price_high', label: 'Laveste literpris' },
  { value: 'unit_price', label: 'Laveste stk pris' },
  { value: 'price_low_to_high', label: 'Pris: Lav til høj' },
  { value: 'price_high_to_low', label: 'Pris: Høj til lav' },
  { value: 'name_a_to_z', label: 'Navn: A til Å' },
  { value: 'name_z_to_a', label: 'Navn: Å til A' }
]

// Categories - ALL categories from database with appropriate icons
const CATEGORIES = [
  { id: 'Frugt & grønt', name: 'Frugt & grønt', icon: '🍎' },
  { id: 'Brød & kager', name: 'Brød & kager', icon: '🍞' },
  { id: 'Drikkevarer', name: 'Drikkevarer', icon: '🥤' },
  { id: 'Færdigretter & takeaway', name: 'Færdigretter & takeaway', icon: '🍱' },
  { id: 'Husholdning & rengøring', name: 'Husholdning & rengøring', icon: '🧽' },
  { id: 'Kiosk', name: 'Kiosk', icon: '🏪' },
  { id: 'Kød, fisk & fjerkræ', name: 'Kød, fisk & fjerkræ', icon: '🥩' },
  { id: 'Kolonial', name: 'Kolonial', icon: '🌾' },
  { id: 'Mejeri', name: 'Mejeri', icon: '🥛' },
  { id: 'Nemt & hurtigt', name: 'Nemt & hurtigt', icon: '⚡' },
  { id: 'Ost & mejeri', name: 'Ost & mejeri', icon: '🧀' },
  { id: 'Personlig pleje', name: 'Personlig pleje', icon: '🧴' },
  { id: 'Snacks & slik', name: 'Snacks & slik', icon: '🍿' },
  { id: 'Ukategoriseret', name: 'Ukategoriseret', icon: '📦' },
  { id: 'Ukategoriseret (dept 110: Baby og småbørn)', name: 'Baby og småbørn', icon: '👶' }
]

// Available stores
const STORES = [
  { id: 'REMA 1000', name: 'REMA 1000', icon: '🟦' },
  { id: 'Netto', name: 'Netto', icon: '🟨' },
  { id: 'Føtex', name: 'Føtex', icon: '🔵' },
  { id: 'Bilka', name: 'Bilka', icon: '🔷' },
  { id: 'Nemlig', name: 'Nemlig', icon: '🟠' },
  { id: 'MENY', name: 'MENY', icon: '🔴' },
  { id: 'Spar', name: 'Spar', icon: '🔺' }
]

export default function DagligvarerPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('discount')
  const [showOnlyOffers, setShowOnlyOffers] = useState(true)
  const [showOnlyFoodProducts, setShowOnlyFoodProducts] = useState(false)
  const [groupByCategory, setGroupByCategory] = useState(false)
  
  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [counts, setCounts] = useState<ProductCounts>({ total: 0, categories: {}, offers: 0 })
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  // UI state
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const [categoryAccordionOpen, setCategoryAccordionOpen] = useState(true)
  const [storeAccordionOpen, setStoreAccordionOpen] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const loadingRef = useRef(false)

  // Fetch product counts
  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/supermarket/products?counts=true')
      const data = await response.json()
      if (data.success && data.counts) {
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch counts:', error)
    }
  }, [])

  // Modal functions
  const openProductModal = useCallback((product: Product) => {
    setSelectedProduct(product)
    setModalOpen(true)
  }, [])

  const closeProductModal = useCallback(() => {
    setModalOpen(false)
    setSelectedProduct(null)
  }, [])

  const toggleFavorite = useCallback((productId: string) => {
    console.log('Toggle favorite for product:', productId)
    setProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, isFavorite: !product.isFavorite }
          : product
      )
    )
  }, [])


  // Fetch products
  const fetchProducts = useCallback(async (page: number = 1, append: boolean = false) => {
    // Prevent concurrent requests
    if (loadingRef.current) return
    loadingRef.current = true
    
    try {
      if (!append) setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })

      // Add filters
      if (selectedCategories.length > 0) params.append('categories', selectedCategories.join(','))
      if (selectedStores.length > 0) params.append('stores', selectedStores.join(','))
      if (searchQuery.trim()) {
        console.log('🔍 Frontend search query:', searchQuery.trim())
        params.append('search', searchQuery.trim())
      }
      if (showOnlyOffers) params.append('offers', 'true')

      const url = `/api/supermarket/products?${params}`
      console.log('🔍 Frontend API URL:', url)
      const response = await fetch(url)
      const data = await response.json()
      console.log('🔍 Frontend API response:', data)

      if (data.success && data.products) {
        let newProducts = data.products

        // Apply sorting
        newProducts = sortProducts(newProducts, sortBy)
        
        if (append) {
          // Prevent duplicates when appending
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id))
            const uniqueNewProducts = newProducts.filter((p: Product) => !existingIds.has(p.id))
            return [...prev, ...uniqueNewProducts]
          })
        } else {
          setProducts(newProducts)
        }
        
        setCurrentPage(page)
        setHasMore(data.pagination?.hasMore || false)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [selectedCategories, selectedStores, searchQuery, showOnlyOffers, sortBy])

  // Sort products function - ALWAYS prioritize offers first
  const sortProducts = (products: Product[], sortBy: string): Product[] => {
    const sorted = [...products]
    
    return sorted.sort((a, b) => {
      // 🔥 ALWAYS show offers first, regardless of sort option
      if (a.is_on_sale && !b.is_on_sale) return -1
      if (!a.is_on_sale && b.is_on_sale) return 1
      
      // Both are offers OR both are non-offers - apply secondary sorting
      switch (sortBy) {
        case 'discount':
          // If both are on sale, sort by highest discount percentage
          if (a.is_on_sale && b.is_on_sale && a.discount_percentage && b.discount_percentage) {
            return b.discount_percentage - a.discount_percentage
          }
          // Fall back to name sorting
          return a.name.localeCompare(b.name)
        case 'price_low_to_high':
          return a.price - b.price
        case 'price_high_to_low':
          return b.price - a.price
        case 'name_a_to_z':
          return a.name.localeCompare(b.name)
        case 'name_z_to_a':
          return b.name.localeCompare(a.name)
        case 'unit_price':
          return (a.unit_price || 0) - (b.unit_price || 0)
        default:
          return a.name.localeCompare(b.name)
      }
    })
  }

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1)
      fetchProducts(1, false)
    }, 300)
  }

  // Filter change handlers
  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId)
      } else {
        return [...prev, categoryId]
      }
    })
    setCurrentPage(1)
  }

  const handleStoreToggle = (storeId: string) => {
    setSelectedStores(prev => {
      if (prev.includes(storeId)) {
        return prev.filter(id => id !== storeId)
      } else {
        return [...prev, storeId]
      }
    })
    setCurrentPage(1)
  }

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
    setSortDropdownOpen(false)
    // Re-sort current products
    setProducts(prev => sortProducts(prev, sort))
  }

  const handleOffersToggle = () => {
    setShowOnlyOffers(!showOnlyOffers)
    setCurrentPage(1)
  }

  // Re-fetch when filters change
  useEffect(() => {
    setCurrentPage(1)
    fetchProducts(1, false)
  }, [showOnlyOffers, selectedCategories, selectedStores, fetchProducts])



  // Reset filters
  const resetFilters = () => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedStores([])
    setSortBy('discount')
    setShowOnlyOffers(true) // Keep offers active by default
    setShowOnlyFoodProducts(false)
    setGroupByCategory(false)
    setCurrentPage(1)
    fetchProducts(1, false)
  }

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        hasMore && 
        !loading && 
        !loadingRef.current &&
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500
      ) {
        fetchProducts(currentPage + 1, true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, currentPage, fetchProducts])

  // Initial load
  useEffect(() => {
    fetchCounts()
    fetchProducts(1, false)
  }, [fetchCounts, fetchProducts])

  // Get filter summary text
  const getFilterSummary = () => {
    const parts = []
    if (selectedCategories.length > 0) {
      if (selectedCategories.length === 1) {
        const category = CATEGORIES.find(c => c.id === selectedCategories[0])
        parts.push(category?.name || selectedCategories[0])
      } else {
        parts.push(`${selectedCategories.length} kategorier`)
      }
    }
    if (selectedStores.length > 0) {
      if (selectedStores.length === 1) {
        const store = STORES.find(s => s.id === selectedStores[0])
        parts.push(store?.name || selectedStores[0])
      } else {
        parts.push(`${selectedStores.length} butikker`)
      }
    }
    return parts.length > 0 ? parts.join(' + ') : 'Alle produkter'
  }

  return (
    <ComingSoonWrapper
      modalTitle="Dagligvarer - Kommer snart!"
      modalContent={
        <>
          <p>
            Vi er ved at udvikle et dagligvarer-setup, der gør, at du kan lave automatiske madplaner ud fra ugens og næste ugens tilbud i alle dagligvarerforretninger.
          </p>
          <p>
            Her på siden vil du kunne se tilbud og priser på alle dagligvarer i Danmark.
          </p>
          <p>
            Både madplaner, vægttabsplaner og meget mere.
          </p>
          <p className="font-semibold text-blue-600 mt-4">
            Færdigt i starten af 2026. Stay tuned!
          </p>
        </>
      }
    >
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dagligvarer</h1>
          <p className="text-gray-600">Find de bedste tilbud fra dine foretrukne supermarkeder</p>
          <p className="text-sm text-gray-500 mt-2">
            {counts.total.toLocaleString()} produkter tilgængelige
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtre</h2>
              
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Søg produkter..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>


              {/* Quick toggles */}
              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyOffers}
                    onChange={handleOffersToggle}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Kun tilbudsvarer ({counts.offers})</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyFoodProducts}
                    onChange={(e) => setShowOnlyFoodProducts(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Kun fødevarer</span>
                </label>
              </div>

              {/* Categories Accordion */}
              <div className="border-t pt-4 mb-4">
                <button
                  onClick={() => setCategoryAccordionOpen(!categoryAccordionOpen)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <span>Kategorier ({selectedCategories.length})</span>
                  <ChevronDown size={16} className={`transform transition-transform ${categoryAccordionOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {categoryAccordionOpen && (
                  <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {CATEGORIES.map(category => (
                      <label key={category.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded text-sm">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs">{category.icon}</span>
                        <span className="text-xs flex-1 truncate">{category.name}</span>
                        <span className="text-xs text-gray-500">
                          ({counts.categories[category.id] || 0})
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Stores Accordion */}
              <div className="border-t pt-4 mb-4">
                <button
                  onClick={() => setStoreAccordionOpen(!storeAccordionOpen)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <span>Butikker ({selectedStores.length})</span>
                  <ChevronDown size={16} className={`transform transition-transform ${storeAccordionOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {storeAccordionOpen && (
                  <div className="mt-3 space-y-2">
                    {STORES.map(store => (
                      <label key={store.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStores.includes(store.id)}
                          onChange={() => handleStoreToggle(store.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs">{store.icon}</span>
                        <span className="text-xs">{store.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset button */}
              <button
                onClick={resetFilters}
                className="w-full text-sm text-blue-600 hover:text-blue-700 underline border-t pt-4"
              >
                Nulstil alle filtre
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            {/* Top bar with sort and filter summary */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Filter Summary */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Viser:</span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    {getFilterSummary()}
                  </span>
                </div>

                {/* Sort */}
                <div className="relative">
                  <button
                    onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                    className="flex items-center justify-between w-48 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="truncate">
                      {SORT_OPTIONS.find(opt => opt.value === sortBy)?.label}
                    </span>
                    <ChevronDown size={16} className={`transform transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {sortDropdownOpen && (
                    <div className="absolute top-full right-0 w-48 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {SORT_OPTIONS.map(option => (
                        <button
                          key={option.value}
                          onClick={() => handleSortChange(option.value)}
                          className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${sortBy === option.value ? 'bg-blue-50 text-blue-700' : ''}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="mb-4">
              <p className="text-gray-600">
                {loading ? 'Henter produkter...' : `Viser ${products.length} produkter`}
                {hasMore && !loading && (
                  <span className="ml-2 text-sm text-gray-500">• Scroll ned for at se flere</span>
                )}
              </p>
            </div>

            {/* Product Grid */}
            {loading && products.length === 0 ? (
              // Loading skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 20 }, (_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpenModal={openProductModal}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              // No products found
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search size={48} className="mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen produkter fundet</h3>
                <p className="text-gray-600 mb-4">
                  Prøv at ændre dine filtre eller søgekriterier
                </p>
              </div>
            )}
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={() => fetchProducts(currentPage + 1, true)}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Indlæser...' : 'Indlæs flere produkter'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading more indicator */}
      {hasMore && products.length > 0 && (
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Indlæser flere produkter...</span>
            </div>
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && products.length === 0 && (
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen produkter fundet</h3>
            <p className="text-gray-600">Prøv at justere dine filtre eller søge på noget andet</p>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {modalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50" onClick={closeProductModal}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-lg font-semibold text-gray-900">Produktdetaljer</h2>
              <button 
                onClick={closeProductModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus size={20} className="rotate-45 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* Product Image */}
              <div className="relative h-56 bg-white rounded-xl mb-4 flex items-center justify-center p-4 border border-gray-100">
                {selectedProduct.image_url ? (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Intet billede tilgængeligt</span>
                  </div>
                )}
                
                {/* Store Badge */}
                <div className={`absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm border-2 ${
                  selectedProduct.store === 'Netto' ? 'border-yellow-400' :
                  selectedProduct.store === 'REMA 1000' ? 'border-blue-900' :
                  selectedProduct.store === 'Føtex' ? 'border-blue-950' :
                  selectedProduct.store === 'Bilka' ? 'border-blue-400' :
                  selectedProduct.store === 'Nemlig' ? 'border-orange-600' :
                  selectedProduct.store === 'MENY' ? 'border-red-800' :
                  selectedProduct.store === 'Spar' ? 'border-red-600' :
                  'border-gray-300'
                }`}>
                  {selectedProduct.store}
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-4">
                {/* Product Name and Amount */}
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-1">
                    {selectedProduct.name}
                  </h1>
                  {selectedProduct.amount && (
                    <p className="text-sm text-gray-500">
                      {selectedProduct.amount} {selectedProduct.unit || 'stk'}
                    </p>
                  )}
                </div>

                {/* Price Section */}
                <div className="bg-gray-50 rounded-xl p-4">
                  {selectedProduct.is_on_sale && selectedProduct.discount_percentage ? (
                    // Product on sale
                    <div className="space-y-3">
                      {/* Offer Price with "TILBUD" tag */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl font-bold text-red-600">
                          {(selectedProduct.price || 0).toFixed(2)} kr
                        </span>
                        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                          TILBUD
                        </div>
                      </div>
                      
                      {/* Normal Price (crossed out) */}
                      {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                        <div className="text-sm text-gray-500">
                          <span className="line-through">Normalpris: {selectedProduct.original_price.toFixed(2)} kr</span>
                        </div>
                      )}
                      
                      {/* Savings badges */}
                      <div className="flex gap-2 flex-wrap">
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                          SPAR {selectedProduct.discount_percentage}%
                        </div>
                        {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                            Besparelse: {(selectedProduct.original_price - selectedProduct.price).toFixed(2)} kr
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Regular product
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {(selectedProduct.price || 0).toFixed(2)} kr
                      </div>
                      {selectedProduct.original_price && (
                        <div className="text-sm text-gray-500">
                          Normalpris: {selectedProduct.original_price.toFixed(2)} kr
                        </div>
                      )}
                      {selectedProduct.unit_price && !isNaN(selectedProduct.unit_price) && (
                        <div className="text-sm text-gray-500">
                          {selectedProduct.unit_price.toFixed(2)} kr/kg
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Product Description/Details */}
                {selectedProduct.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Beskrivelse</h3>
                    <p className="text-gray-700 text-sm">{selectedProduct.description}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                  <div className="flex gap-3">
                    <button className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors">
                      Tilføj til kurv
                    </button>
                    <button 
                      onClick={() => toggleFavorite(selectedProduct.id)}
                      className="p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Heart size={20} className="text-gray-600" />
                    </button>
                  </div>
                  
                  {/* Price History Link */}
                  <a 
                    href={`/dagligvarer/produkt/${selectedProduct.id}`}
                    className="block w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 px-4 rounded-xl font-medium text-center transition-colors border border-blue-200"
                  >
                    📈 Se pris-historik
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ComingSoonWrapper>
  )
}