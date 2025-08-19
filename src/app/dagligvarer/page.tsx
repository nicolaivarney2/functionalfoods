'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Heart, TrendingUp, Store, Tag, Grid, X, ChevronLeft, ChevronRight } from 'lucide-react'

// Mock data for development
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

const mockCategories = [
  { id: 1, name: 'Frugt og grønt', icon: '🍎', count: 1250 },
  { id: 2, name: 'Kød og fisk', icon: '🥩', count: 890 },
  { id: 3, name: 'Mejeri og køl', icon: '🥛', count: 1100 },
  { id: 4, name: 'Kolonial', icon: '🌾', count: 2100 },
  { id: 5, name: 'Frost', icon: '❄️', count: 750 },
  { id: 6, name: 'Brød og kager', icon: '🥐', count: 450 },
  { id: 7, name: 'Drikkevarer', icon: '☕', count: 680 },
  { id: 8, name: 'Slik og snacks', icon: '🍪', count: 320 },
  { id: 9, name: 'Nemt og hurtigt', icon: '⚡', count: 280 },
  { id: 10, name: 'Diverse', icon: '📦', count: 150 },
  { id: 11, name: 'Baby og småbørn', icon: '👶', count: 120 },
  { id: 12, name: 'Husholdning', icon: '🏠', count: 200 },
  { id: 13, name: 'Personlig pleje', icon: '🧴', count: 180 }
]

const mockStores = [
  { id: 1, name: 'REMA 1000', color: 'bg-blue-600', isSelected: true },
  { id: 2, name: 'Netto', color: 'bg-yellow-500', isSelected: true },
  { id: 3, name: 'Føtex', color: 'bg-blue-500', isSelected: false },
  { id: 4, name: 'Bilka', color: 'bg-blue-700', isSelected: false },
  { id: 5, name: 'Nemlig.com', color: 'bg-orange-500', isSelected: false },
  { id: 6, name: 'MENY', color: 'bg-red-600', isSelected: false },
  { id: 7, name: 'Spar', color: 'bg-red-500', isSelected: false }
]

export default function DagligvarerPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all'])
  const [showOnlyOffers, setShowOnlyOffers] = useState(false)
  const [selectedStores, setSelectedStores] = useState([1, 2]) // REMA 1000 and Netto
  const [groupByDepartment, setGroupByDepartment] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [sortBy, setSortBy] = useState('discount')
  const [products, setProducts] = useState(mockProducts)
  const [currentSlide, setCurrentSlide] = useState(0)

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategories.includes('all') || selectedCategories.includes(product.category)
    const matchesOffers = !showOnlyOffers || product.isOnSale
    const matchesStores = selectedStores.includes(product.store === 'REMA 1000' ? 1 : 2)
    
    return matchesSearch && matchesCategory && matchesOffers && matchesStores
  })

  const toggleStore = (storeId: number) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
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

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % Math.ceil(filteredProducts.length / 3))
  }

  const prevSlide = () => {
    setCurrentSlide(prev => prev === 0 ? Math.ceil(filteredProducts.length / 3) - 1 : prev - 1)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
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
                  className="w-full pl-10 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
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
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes('all')}
                      onChange={() => toggleCategory('all')}
                      className="text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">Alle kategorier</span>
                  </div>
                  <span className="text-xs text-gray-500">({mockCategories.reduce((sum, cat) => sum + cat.count, 0)})</span>
                </button>
              </div>
              
              <div className="max-h-48 overflow-y-auto">
                {mockCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.name)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors border-b border-gray-100 last:border-b-0 ${
                      selectedCategories.includes(category.name) 
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => toggleCategory(category.name)}
                        className="text-blue-600 rounded"
                      />
                      <span className="text-base">{category.icon}</span>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">({category.count})</span>
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
                    className="text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Kun tilbudsvarer</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupByDepartment}
                    onChange={(e) => setGroupByDepartment(e.target.checked)}
                    className="text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Gruppér efter kategori</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFavorites}
                    onChange={(e) => setShowFavorites(e.target.checked)}
                    className="text-blue-600 rounded"
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
                {mockStores.map(store => (
                  <label key={store.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStores.includes(store.id)}
                      onChange={() => toggleStore(store.id)}
                      className="text-blue-600 rounded"
                    />
                    <div className={`w-4 h-4 rounded-full ${store.color}`}></div>
                    <span className="text-sm text-gray-700">{store.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setShowOnlyOffers(false)
                setSelectedStores([1, 2])
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
                  {selectedCategory !== 'all' && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                      {selectedCategory}
                      <button
                        onClick={() => setSelectedCategory('all')}
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
                  {selectedStores.map(storeId => {
                    const store = mockStores.find(s => s.id === storeId)
                    return (
                      <span key={storeId} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center">
                        {store?.name}
                        <button
                          onClick={() => toggleStore(storeId)}
                          className="ml-2 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )
                  })}
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
                {filteredProducts.length} produkter fundet
              </p>
            </div>

            {/* Products Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100">
                  {/* Product Image */}
                  <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100">
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
                    {product.isOnSale && (
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                        {product.discount}% rabat
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                      {product.store}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-tight">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3 bg-gray-50 px-2 py-1 rounded-full inline-block">
                      {product.unit}
                    </p>
                    
                    {/* Price */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-xl font-bold text-gray-900">
                        {product.currentPrice.toFixed(2)} kr
                      </span>
                      {product.isOnSale && (
                        <span className="text-sm text-gray-500 line-through">
                          {product.originalPrice.toFixed(2)} kr
                        </span>
                      )}
                    </div>
                    
                    {/* Unit Price */}
                    <p className="text-sm text-gray-600 mb-4">
                      {product.unitPrice.toFixed(2)} kr/{product.unit === 'stk' ? 'stk' : 'kg'}
                    </p>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-xs font-medium transition-colors shadow-sm">
                        Tilføj
                      </button>
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-xs transition-colors">
                        <TrendingUp size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Slider */}
            <div className="md:hidden">
              <div className="relative">
                <div className="flex overflow-hidden">
                  <div 
                    className="flex transition-transform duration-300 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {Array.from({ length: Math.ceil(filteredProducts.length / 3) }).map((_, slideIndex) => (
                      <div key={slideIndex} className="w-full flex-shrink-0 px-2">
                        <div className="grid grid-cols-3 gap-2">
                          {filteredProducts.slice(slideIndex * 3, slideIndex * 3 + 3).map(product => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                              {/* Product Image */}
                              <div className="relative h-24 bg-gradient-to-br from-gray-50 to-gray-100">
                                <div className="absolute top-1 right-1">
                                  <button
                                    onClick={() => toggleFavorite(product.id)}
                                    className={`p-1 rounded-full shadow-sm ${
                                      product.isFavorite 
                                        ? 'bg-red-500 text-white' 
                                        : 'bg-white text-gray-400 hover:text-red-500 hover:bg-red-50'
                                    } transition-all duration-200`}
                                  >
                                    <Heart size={12} fill={product.isFavorite ? 'currentColor' : 'none'} />
                                  </button>
                                </div>
                                {product.isOnSale && (
                                  <div className="absolute top-1 left-1 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                                    {product.discount}% rabat
                                  </div>
                                )}
                                <div className="absolute bottom-1 left-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-xs font-medium shadow-sm">
                                  {product.store}
                                </div>
                              </div>

                              {/* Product Info */}
                              <div className="p-2">
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-xs leading-tight">
                                  {product.name}
                                </h3>
                                <p className="text-xs text-gray-500 mb-1 bg-gray-50 px-1 py-0.5 rounded-full inline-block">
                                  {product.unit}
                                </p>
                                
                                {/* Price */}
                                <div className="flex items-center space-x-1 mb-1">
                                  <span className="text-sm font-bold text-gray-900">
                                    {product.currentPrice.toFixed(2)} kr
                                  </span>
                                  {product.isOnSale && (
                                    <span className="text-xs text-gray-500 line-through">
                                      {product.originalPrice.toFixed(2)} kr
                                    </span>
                                  )}
                                </div>
                                
                                {/* Unit Price */}
                                <p className="text-xs text-gray-600 mb-2">
                                  {product.unitPrice.toFixed(2)} kr/{product.unit === 'stk' ? 'stk' : 'kg'}
                                </p>

                                {/* Actions */}
                                <div className="flex space-x-1">
                                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-1 rounded text-xs font-medium transition-colors shadow-sm">
                                    Tilføj
                                  </button>
                                  <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-1 rounded text-xs transition-colors">
                                    <TrendingUp size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Navigation Arrows */}
                {filteredProducts.length > 3 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-gray-200 hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={20} className="text-gray-600" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-gray-200 hover:bg-white transition-colors"
                    >
                      <ChevronRight size={20} className="text-gray-600" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Dots Indicator */}
              {filteredProducts.length > 3 && (
                <div className="flex justify-center mt-4 space-x-2">
                  {Array.from({ length: Math.ceil(filteredProducts.length / 3) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* No Products */}
            {filteredProducts.length === 0 && (
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
