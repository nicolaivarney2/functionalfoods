'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface RecipeIngredient {
  id: string
  name: string
  category: string
  description: string
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

interface MatchSuggestion {
  groceryProduct: GroceryProduct
  confidence: number
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'category'
}

interface ProductIngredientMatch {
  recipeIngredient: RecipeIngredient
  suggestedMatch: MatchSuggestion | null
  selectedMatch: GroceryProduct | null
  isConfirmed: boolean
  isRejected: boolean
}

export default function ProductIngredientMatchingPage() {
  const [productMatches, setProductMatches] = useState<ProductIngredientMatch[]>([])
  const [groceryProducts, setGroceryProducts] = useState<GroceryProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
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
  }, [productMatches])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load current recipe ingredients
      const recipeIngredientsResponse = await fetch('/api/ingredients')
      const recipeIngredients = await recipeIngredientsResponse.json()
      
      // Mock grocery products for now - later this will come from real product database
      const mockGroceryProducts: GroceryProduct[] = [
        {
          id: '1',
          name: 'Kyllingebryst, fersk, 500g',
          category: 'Kød',
          store: 'REMA 1000',
          price: 25.00,
          originalPrice: 35.00,
          isOnSale: true,
          unit: 'g',
          quantity: 500
        },
        {
          id: '2',
          name: 'Laks, fersk, 400g',
          category: 'Fisk',
          store: 'Netto',
          price: 35.00,
          originalPrice: 45.00,
          isOnSale: true,
          unit: 'g',
          quantity: 400
        },
        {
          id: '3',
          name: 'Broccoli, økologisk, 400g',
          category: 'Grøntsager',
          store: 'REMA 1000',
          price: 8.50,
          originalPrice: 12.00,
          isOnSale: true,
          unit: 'g',
          quantity: 400
        },
        {
          id: '4',
          name: 'Bananer, 1kg',
          category: 'Frugt',
          store: 'Netto',
          price: 12.50,
          originalPrice: 18.00,
          isOnSale: true,
          unit: 'kg',
          quantity: 1
        },
        {
          id: '5',
          name: 'Havregryn, 1kg',
          category: 'Morgenmad',
          store: 'REMA 1000',
          price: 8.50,
          originalPrice: 12.00,
          isOnSale: true,
          unit: 'kg',
          quantity: 1
        },
        {
          id: '6',
          name: 'Sødmælk 3,5%, 1L',
          category: 'Mejeri',
          store: 'Netto',
          price: 12.50,
          originalPrice: 15.00,
          isOnSale: true,
          unit: 'L',
          quantity: 1
        },
        {
          id: '7',
          name: 'Olivenolie, ekstra virgin, 500ml',
          category: 'Kolonial',
          store: 'REMA 1000',
          price: 45.00,
          originalPrice: 45.00,
          isOnSale: false,
          unit: 'ml',
          quantity: 500
        },
        {
          id: '8',
          name: 'Hvidløg, 3 stk',
          category: 'Grøntsager',
          store: 'Netto',
          price: 8.00,
          originalPrice: 8.00,
          isOnSale: false,
          unit: 'stk',
          quantity: 3
        }
      ]
      
      setGroceryProducts(mockGroceryProducts)
      
      // Load existing matches from database (when we have them)
      // For now, create mock matches
      const mockMatches: ProductIngredientMatch[] = recipeIngredients.slice(0, 10).map((ingredient: RecipeIngredient) => {
        // Find potential matches based on simple keyword matching
        const potentialMatches = mockGroceryProducts.filter(product => 
          product.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
          ingredient.name.toLowerCase().includes(product.name.toLowerCase())
        )
        
        let suggestedMatch: MatchSuggestion | null = null
        if (potentialMatches.length > 0) {
          const bestMatch = potentialMatches[0]
          suggestedMatch = {
            groceryProduct: bestMatch,
            confidence: 85, // Mock confidence
            matchType: 'fuzzy' as const
          }
        }
        
        return {
          recipeIngredient: ingredient,
          suggestedMatch,
          selectedMatch: null,
          isConfirmed: false,
          isRejected: false
        }
      })
      
      setProductMatches(mockMatches)
      
      console.log(`📊 Loaded ${mockGroceryProducts.length} grocery products`)
      console.log(`📋 Created ${mockMatches.length} mock matches`)
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const confirmMatch = async (recipeIngredientId: string) => {
    const idx = productMatches.findIndex(m => m.recipeIngredient.id === recipeIngredientId)
    if (idx === -1) return
    
    const updated = [...productMatches]
    updated[idx].isConfirmed = true
    updated[idx].isRejected = false
    updated[idx].selectedMatch = updated[idx].suggestedMatch?.groceryProduct || null
    setProductMatches(updated)
    
    // TODO: Auto-save to database when we have the API
    // For now, just update stats
    setTimeout(() => {
      const total = updated.length
      const confirmed = updated.filter(m => m.isConfirmed).length
      const rejected = updated.filter(m => m.isRejected).length
      const pending = total - confirmed - rejected
      setStats({ total, confirmed, rejected, pending })
    }, 0)
  }

  const rejectMatch = (recipeIngredientId: string) => {
    const idx = productMatches.findIndex(m => m.recipeIngredient.id === recipeIngredientId)
    if (idx === -1) return
    
    const updated = [...productMatches]
    updated[idx].isRejected = true
    updated[idx].isConfirmed = false
    updated[idx].selectedMatch = null
    setProductMatches(updated)
    
    setTimeout(() => {
      const total = updated.length
      const confirmed = updated.filter(m => m.isConfirmed).length
      const rejected = updated.filter(m => m.isRejected).length
      const pending = total - confirmed - rejected
      setStats({ total, confirmed, rejected, pending })
    }, 0)
  }

  const selectManualMatch = async (recipeIngredientId: string, groceryProduct: GroceryProduct) => {
    const idx = productMatches.findIndex(m => m.recipeIngredient.id === recipeIngredientId)
    if (idx === -1) return
    
    const updated = [...productMatches]
    updated[idx].selectedMatch = groceryProduct
    updated[idx].isConfirmed = true
    updated[idx].isRejected = false
    setProductMatches(updated)
    
    // TODO: Auto-save to database when we have the API
    setTimeout(() => {
      const total = updated.length
      const confirmed = updated.filter(m => m.isConfirmed).length
      const rejected = updated.filter(m => m.isRejected).length
      const pending = total - confirmed - rejected
      setStats({ total, confirmed, rejected, pending })
    }, 0)
  }

  const updateStats = () => {
    const total = productMatches.length
    const confirmed = productMatches.filter(m => m.isConfirmed).length
    const rejected = productMatches.filter(m => m.isRejected).length
    const pending = total - confirmed - rejected
    
    setStats({ total, confirmed, rejected, pending })
  }

  const saveAllMatches = async () => {
    try {
      const confirmedMatches = productMatches
        .filter(m => m.isConfirmed && m.selectedMatch)
        .map(m => ({
          recipeIngredientId: m.recipeIngredient.id,
          groceryProductId: m.selectedMatch!.id,
          confidence: m.suggestedMatch?.confidence || 100
        }))
      
      console.log(`💾 Attempting to save ${confirmedMatches.length} matches:`, confirmedMatches)
      
      // TODO: Implement API endpoint for saving product-ingredient matches
      alert(`Would save ${confirmedMatches.length} product-ingredient matches! (API not implemented yet)`)
      
      // For now, just remove saved matches from UI
      const savedIngredientIds = confirmedMatches.map(m => m.recipeIngredientId)
      const updatedMatches = productMatches.filter(m => 
        !savedIngredientIds.includes(m.recipeIngredient.id)
      )
      setProductMatches(updatedMatches)
      
      setTimeout(() => {
        const total = updatedMatches.length
        const confirmed = updatedMatches.filter(m => m.isConfirmed).length
        const rejected = updatedMatches.filter(m => m.isRejected).length
        const pending = total - confirmed - rejected
        setStats({ total, confirmed, rejected, pending })
      }, 0)
      
    } catch (error) {
      console.error('Error saving matches:', error)
      alert('Error saving matches')
    }
  }

  const filteredMatches = productMatches.filter(match => {
    const matchesSearch = match.recipeIngredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || match.recipeIngredient.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-100'
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getMatchTypeIcon = (matchType: string) => {
    switch (matchType) {
      case 'exact': return '🎯'
      case 'synonym': return '🔄'
      case 'fuzzy': return '🔍'
      case 'category': return '📂'
      default: return '❓'
    }
  }

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
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Ingredients</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            <div className="text-sm text-gray-600">Confirmed Matches</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">Rejected Matches</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Ingredients
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <option value="kød">Kød</option>
                <option value="fisk">Fisk</option>
                <option value="grøntsager">Grøntsager</option>
                <option value="frugt">Frugt</option>
                <option value="mejeri">Mejeri</option>
                <option value="fedt">Fedt</option>
                <option value="andre">Andre</option>
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
                <option value="Føtex">Føtex</option>
                <option value="Bilka">Bilka</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={saveAllMatches}
                disabled={stats.confirmed === 0}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save All Matches ({stats.confirmed})
              </button>
            </div>
          </div>
        </div>

        {/* Product-Ingredient Matches */}
        <div className="space-y-4">
          {filteredMatches.map((match, index) => (
            <div key={match.recipeIngredient.id} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recipe Ingredient */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Recipe Ingredient
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="font-medium text-gray-900">{match.recipeIngredient.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Category: {match.recipeIngredient.category}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {match.recipeIngredient.description}
                      </div>
                    </div>
                  </div>

                  {/* Suggested Match */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Suggested Grocery Product
                    </h3>
                    
                    {match.suggestedMatch ? (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900">
                            {match.suggestedMatch.groceryProduct.name}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(match.suggestedMatch.confidence)}`}>
                              {match.suggestedMatch.confidence}% {getMatchTypeIcon(match.suggestedMatch.matchType)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          Store: {match.suggestedMatch.groceryProduct.store}
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          Category: {match.suggestedMatch.groceryProduct.category}
                        </div>
                        
                        {/* Price Information */}
                        <div className="text-sm text-gray-700 mb-3">
                          <strong>Price:</strong> {' '}
                          {match.suggestedMatch.groceryProduct.isOnSale ? (
                            <span>
                              <span className="text-red-600 font-medium">
                                {match.suggestedMatch.groceryProduct.price} kr
                              </span>
                              {' '}
                              <span className="line-through text-gray-500">
                                {match.suggestedMatch.groceryProduct.originalPrice} kr
                              </span>
                              {' '}
                              <span className="text-green-600">
                                (Sparer {match.suggestedMatch.groceryProduct.originalPrice! - match.suggestedMatch.groceryProduct.price} kr!)
                              </span>
                            </span>
                          ) : (
                            <span className="font-medium">
                              {match.suggestedMatch.groceryProduct.price} kr
                            </span>
                          )}
                          {' '}
                          per {match.suggestedMatch.groceryProduct.quantity}{match.suggestedMatch.groceryProduct.unit}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => confirmMatch(match.recipeIngredient.id)}
                            disabled={match.isConfirmed}
                            className="flex items-center px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300 text-sm"
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            {match.isConfirmed ? 'Confirmed' : 'Confirm'}
                          </button>
                          
                          <button
                            onClick={() => rejectMatch(match.recipeIngredient.id)}
                            disabled={match.isRejected}
                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 text-sm"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            {match.isRejected ? 'Rejected' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-gray-500 text-center">
                          No automatic match found
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Selection */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Manual Selection
                  </h4>
                  <GroceryProductSelector
                    groceryProducts={groceryProducts}
                    selectedProduct={match.selectedMatch}
                    onSelect={(groceryProduct) => selectManualMatch(match.recipeIngredient.id, groceryProduct)}
                    placeholder="Search and select a grocery product..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMatches.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No ingredients found matching your criteria</div>
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
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.store.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="max-h-48 overflow-auto">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  onSelect(product)
                  setIsOpen(false)
                  setSearchTerm('')
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
        </div>
      )}
    </div>
  )
}
