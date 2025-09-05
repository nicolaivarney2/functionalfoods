'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface Ingredient {
  id: string
  name: string
  category: string
  description?: string
}

interface GroceryProduct {
  id: string
  name: string
  category: string
  store: string
  price: number
  originalPrice?: number
  isOnSale: boolean
  unit: string
  quantity: number
}

interface ExistingMatch {
  id: string
  ingredient_id: string
  product_external_id: string
  confidence: number
  match_type: string
  ingredient_name: string
  product_name: string
  product_category: string
  product_store: string
  product_price: number
  product_original_price?: number
  product_is_on_sale: boolean
}

export default function ProductIngredientMatchingPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [groceryProducts, setGroceryProducts] = useState<GroceryProduct[]>([])
  const [existingMatches, setExistingMatches] = useState<ExistingMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [selectedStore, setSelectedStore] = useState('all')
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    rejected: 0,
    pending: 0
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Update stats when matches change
  useEffect(() => {
    updateStats()
  }, [existingMatches])

  const loadData = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 Starting to load data...')
      
      // Load ingredients in batches
      console.log('🧄 Loading ingredients...')
      const allIngredients = await loadIngredientsInBatches()
      console.log(`✅ Loaded ${allIngredients.length} ingredients`)
      
      // Load products in batches
      console.log('📦 Loading products...')
      const allProducts = await loadProductsInBatches()
      console.log(`✅ Loaded ${allProducts.length} products`)
      
      // Load existing matches from database
      console.log('🔗 Loading existing matches...')
      const existingMatchesData = await loadExistingMatches()
      console.log(`✅ Loaded ${existingMatchesData.length} existing matches`)
      
      // Set all data
      setIngredients(allIngredients)
      setGroceryProducts(allProducts)
      setExistingMatches(existingMatchesData)
      
      console.log(`📊 Loaded ${allProducts.length} grocery products`)
      console.log(`📋 Loaded ${existingMatchesData.length} existing matches`)
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadIngredientsInBatches = async (): Promise<Ingredient[]> => {
    const allIngredients: Ingredient[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      try {
        const response = await fetch(`/api/admin/ingredients-for-matching?page=${page}&limit=100`)
        const data = await response.json()
        
        if (data.success && data.data.ingredients) {
          allIngredients.push(...data.data.ingredients.map((ing: any) => ({
            id: ing.id,
            name: ing.name,
            category: ing.category || 'Andre',
            description: `${ing.name} - importeret fra opskrifter`
          })))
          
          hasMore = data.data.pagination.hasMore
          page++
        } else {
          hasMore = false
        }
      } catch (error) {
        console.error('Error loading ingredients batch:', error)
        hasMore = false
      }
    }

    return allIngredients
  }

  const loadProductsInBatches = async (): Promise<GroceryProduct[]> => {
    const allProducts: GroceryProduct[] = []
    let page = 1
    let hasMore = true
    const maxPages = 10 // Limit to 1000 products for testing

    while (hasMore && page <= maxPages) {
      try {
        console.log(`📦 Loading products page ${page}...`)
        const response = await fetch(`/api/admin/products-for-matching?page=${page}&limit=100`)
        const data = await response.json()
        
        if (data.success && data.data.products) {
          allProducts.push(...data.data.products.map((prod: any) => ({
            id: prod.external_id,
            name: prod.name,
            category: prod.category || 'Andre',
            store: prod.store,
            price: prod.price,
            originalPrice: prod.original_price,
            isOnSale: prod.is_on_sale || false,
            unit: 'stk', // Default unit
            quantity: 1 // Default quantity
          })))
          
          hasMore = data.data.pagination.hasMore
          page++
          console.log(`✅ Loaded ${allProducts.length} products so far...`)
        } else {
          hasMore = false
        }
      } catch (error) {
        console.error('Error loading products batch:', error)
        hasMore = false
      }
    }

    return allProducts
  }

  const loadExistingMatches = async (): Promise<ExistingMatch[]> => {
    try {
      const response = await fetch('/api/admin/existing-matches')
      const data = await response.json()
      
      if (data.success) {
        return data.matches.map((match: any) => ({
          id: match.id,
          ingredient_id: match.ingredient_id,
          product_external_id: match.product_external_id,
          confidence: match.confidence,
          match_type: match.match_type,
          ingredient_name: match.ingredient_name,
          product_name: match.product_name,
          product_category: match.product_category,
          product_store: match.product_store,
          product_price: match.product_price,
          product_original_price: match.product_original_price,
          product_is_on_sale: match.product_is_on_sale
        }))
      }
      return []
    } catch (error) {
      console.error('Error loading existing matches:', error)
      return []
    }
  }

  const updateStats = () => {
    const total = ingredients.length
    const confirmed = existingMatches.length
    const rejected = 0 // We don't track rejected matches
    const pending = total - confirmed
    
    setStats({ total, confirmed, rejected, pending })
  }

  // Get products matched to a specific ingredient
  const getProductsForIngredient = (ingredientId: string): ExistingMatch[] => {
    return existingMatches.filter(match => match.ingredient_id === ingredientId)
  }

  // Add a product match to an ingredient
  const addProductMatch = async (ingredientId: string, product: GroceryProduct) => {
    try {
      const response = await fetch('/api/admin/add-product-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          product_external_id: product.id,
          confidence: 100,
          match_type: 'manual'
        })
      })
      
      if (response.ok) {
        // Add to local state
        const newMatch: ExistingMatch = {
          id: Date.now().toString(), // Temporary ID
          ingredient_id: ingredientId,
          product_external_id: product.id,
          confidence: 100,
          match_type: 'manual',
          ingredient_name: ingredients.find(i => i.id === ingredientId)?.name || '',
          product_name: product.name,
          product_category: product.category,
          product_store: product.store,
          product_price: product.price,
          product_original_price: product.originalPrice,
          product_is_on_sale: product.isOnSale
        }
        
        setExistingMatches(prev => [...prev, newMatch])
      }
    } catch (error) {
      console.error('Error adding product match:', error)
    }
  }

  // Remove a product match from an ingredient
  const removeProductMatch = async (matchId: string) => {
    try {
      const response = await fetch('/api/admin/remove-product-match', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId })
      })
      
      if (response.ok) {
        setExistingMatches(prev => prev.filter(match => match.id !== matchId))
      }
    } catch (error) {
      console.error('Error removing product match:', error)
    }
  }

  // Filter ingredients based on search and category
  const filteredIngredients = ingredients.filter(ingredient => {
    const matchesSearch = ingredient.name && 
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || ingredient.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentIngredients = filteredIngredients.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products and ingredients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product-Ingredient Matching</h1>
              <p className="mt-2 text-gray-600">
                Match recipe ingredients with grocery products and offers
              </p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Ingredients</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-600">Matched Products</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Unmatched Ingredients</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">
              {stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">Match Rate</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Ingredients
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Kød og fisk">Kød og fisk</option>
                <option value="Grøntsager">Grøntsager</option>
                <option value="Mejeri">Mejeri</option>
                <option value="Brød og kager">Brød og kager</option>
                <option value="Krydderier">Krydderier</option>
                <option value="Andre">Andre</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store
              </label>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Stores</option>
                <option value="REMA 1000">REMA 1000</option>
                <option value="Netto">Netto</option>
                <option value="Fakta">Fakta</option>
                <option value="Bilka">Bilka</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="space-y-4">
          {currentIngredients.map((ingredient, index) => {
            const matchedProducts = getProductsForIngredient(ingredient.id)
            
            return (
              <div key={ingredient.id} className="bg-white rounded-lg shadow">
                <div className="p-6">
                  {/* Ingredient Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{ingredient.name}</h3>
                      <div className="text-sm text-gray-600 mt-1">
                        Category: {ingredient.category}
                      </div>
                      {ingredient.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {ingredient.description}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {matchedProducts.length} product{matchedProducts.length !== 1 ? 's' : ''} matched
                    </div>
                  </div>

                  {/* Matched Products */}
                  {matchedProducts.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold text-gray-900 mb-3">Matched Products:</h4>
                      <div className="flex flex-wrap gap-2">
                        {matchedProducts.map((match) => (
                          <div key={match.id} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center space-x-2">
                            <span className="text-sm font-medium text-blue-900">{match.product_name}</span>
                            <span className="text-xs text-blue-600">({match.product_store})</span>
                            <span className="text-xs text-gray-500">{match.product_price} kr</span>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeProductMatch(match.id)
                              }}
                              className="text-red-500 hover:text-red-700 ml-1 p-1 rounded hover:bg-red-100"
                              title="Remove product match"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Product Dropdown */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Add Product Match:
                    </h4>
                    <GroceryProductSelector
                      groceryProducts={groceryProducts}
                      selectedProduct={null}
                      onSelect={(product) => addProductMatch(ingredient.id, product)}
                      placeholder="Search for a product to match..."
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredIngredients.length)} of {filteredIngredients.length} ingredients
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Component for selecting grocery products
function GroceryProductSelector({ 
  groceryProducts, 
  selectedProduct, 
  onSelect, 
  placeholder 
}: {
  groceryProducts: GroceryProduct[]
  selectedProduct: GroceryProduct | null
  onSelect: (product: GroceryProduct) => void
  placeholder: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const filteredProducts = groceryProducts.filter(product =>
    (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (product.store && product.store.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            // Focus the search input when opening
            setTimeout(() => {
              const input = document.querySelector('.product-search-input') as HTMLInputElement
              if (input) input.focus()
            }, 100)
          }
        }}
        className="w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {selectedProduct ? (
          <div className="flex items-center justify-between">
            <span className="text-gray-900">{selectedProduct.name}</span>
            <span className="text-sm text-gray-500">{selectedProduct.store}</span>
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDownIcon className="h-5 w-5 absolute right-3 top-3 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="product-search-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          <div className="max-h-48 overflow-auto">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  onSelect(product)
                  // Don't close dropdown - allow multiple selections
                  // setIsOpen(false)
                  // setSearchTerm('')
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{product.name}</div>
                <div className="text-sm text-gray-600">
                  {product.store} • {product.category} • {product.price} kr per {product.quantity}{product.unit}
                  {product.isOnSale && (
                    <span className="text-green-600 ml-2">🔥 På tilbud!</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="px-3 py-2 text-gray-500 text-center">
              No products found
            </div>
          )}
          
          {/* Close button */}
          <div className="p-2 border-t border-gray-200">
            <button
              onClick={() => {
                setIsOpen(false)
                setSearchTerm('')
              }}
              className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
