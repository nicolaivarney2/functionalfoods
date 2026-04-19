'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface Ingredient {
  id: string
  name: string
  category: string
  description?: string
  is_basis?: boolean
  grams_per_unit?: number | null
  created_at?: string | null
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

const categoryOptions = [
  'Frugt og grønt',
  'Kød og fisk',
  'Mejeri og køl',
  'Brød og kager',
  'Kolonial',
  'Frost',
  'Drikkevarer',
  'Slik og snacks',
  'Andre'
]

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
  const [hideLowPriorityCategories, setHideLowPriorityCategories] = useState(true)
  /** Kun ingredienser uden mindst ét match i databasen — standard på for en ren arbejdskø. */
  const [onlyUnmatched, setOnlyUnmatched] = useState(true)
  const [pendingMatchIds, setPendingMatchIds] = useState<Set<string>>(new Set())
  const [isSyncingMatches, setIsSyncingMatches] = useState(false)
  const [copySourceByIngredient, setCopySourceByIngredient] = useState<Record<string, string>>({})
  const [gramsDraftByIngredient, setGramsDraftByIngredient] = useState<Record<string, string>>({})
  const [savingGramsByIngredient, setSavingGramsByIngredient] = useState<Record<string, boolean>>({})
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    rejected: 0,
    pending: 0
  })

  // Load data on component mount
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update stats when matches change
  useEffect(() => {
    updateStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingMatches])

  useEffect(() => {
    setCurrentPage(1)
  }, [onlyUnmatched, searchTerm, selectedCategory, hideLowPriorityCategories])

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
      if (existingMatchesData) {
      console.log(`✅ Loaded ${existingMatchesData?.length ?? 0} existing matches`)
      }
      
      // Set all data
      setIngredients(allIngredients)
      setGroceryProducts(allProducts)
      if (existingMatchesData) {
        setExistingMatches(existingMatchesData)
      }
      
      console.log(`📊 Loaded ${allProducts.length} grocery products`)
      console.log(`📋 Loaded ${existingMatchesData?.length ?? 0} existing matches`)
      
      // Log store distribution
      const storeCounts = allProducts.reduce((acc: any, prod: any) => {
        acc[prod.store] = (acc[prod.store] || 0) + 1
        return acc
      }, {})
      console.log(`🏪 Store distribution:`, storeCounts)
      
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
        const response = await fetch(`/api/admin/ingredients-for-matching?page=${page}&limit=100&sort=newest`)
        const data = await response.json()
        
        if (data.success && data.data.ingredients) {
          allIngredients.push(...data.data.ingredients.map((ing: any) => ({
            id: ing.id,
            name: ing.name,
            category: ing.category || 'Andre',
            description: `${ing.name} - importeret fra opskrifter`,
            is_basis: ing.is_basis || false,
            grams_per_unit: ing.grams_per_unit ?? null,
            created_at: ing.created_at ?? null
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

  // Don't load all products upfront - we'll load them on-demand when searching
  const loadProductsInBatches = async (): Promise<GroceryProduct[]> => {
    // Return empty array - products will be loaded on-demand via search
    return []
  }

  const loadExistingMatches = async (): Promise<ExistingMatch[] | null> => {
    try {
      console.log('🔄 Loading existing matches from API...')
      const response = await fetch(`/api/admin/existing-matches?t=${Date.now()}`)
      const data = await response.json()
      
      console.log('📥 API response:', data)
      
      if (data.success) {
        const matches = data.matches.map((match: any) => ({
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
        console.log(`✅ Loaded ${matches.length} matches:`, matches.map((m: ExistingMatch) => ({ 
          ingredient_id: m.ingredient_id, 
          ingredient_name: m.ingredient_name,
          product_name: m.product_name 
        })))
        return matches
      }
      console.warn('⚠️ API returned success: false', data)
      return null
    } catch (error) {
      console.error('❌ Error loading existing matches:', error)
      return null
    }
  }

  const updateStats = () => {
    const total = ingredients.length
    const confirmed = existingMatches.length
    const rejected = 0 // We don't track rejected matches
    const pending = total - confirmed
    
    setStats({ total, confirmed, rejected, pending })
  }

  const getGramsInputValue = (ingredient: Ingredient): string => {
    const draft = gramsDraftByIngredient[ingredient.id]
    if (draft !== undefined) return draft
    if (ingredient.grams_per_unit === null || ingredient.grams_per_unit === undefined) return ''
    return String(ingredient.grams_per_unit)
  }

  const saveGramsPerUnit = async (ingredient: Ingredient) => {
    const raw = getGramsInputValue(ingredient).trim()
    const parsed = raw === '' ? null : Number(raw)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      alert('Vægt pr. stk skal være et positivt tal')
      return
    }

    const current = ingredient.grams_per_unit ?? null
    if (current === parsed) return

    setSavingGramsByIngredient((prev) => ({ ...prev, [ingredient.id]: true }))
    try {
      const response = await fetch(`/api/ingredients/${ingredient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grams_per_unit: parsed })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setIngredients((prev) =>
          prev.map((ing) =>
            ing.id === ingredient.id ? { ...ing, grams_per_unit: parsed } : ing
          )
        )
      } else {
        console.error('❌ Failed to update grams_per_unit:', data.error)
        alert(`Failed to update: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error updating grams_per_unit:', error)
      alert('Error updating grams per unit')
    } finally {
      setSavingGramsByIngredient((prev) => ({ ...prev, [ingredient.id]: false }))
    }
  }

  const matchesByIngredient = useMemo(() => {
    const map = new Map<string, ExistingMatch[]>()
    for (const match of existingMatches) {
      const key = String(match.ingredient_id).trim()
      const existing = map.get(key)
      if (existing) {
        existing.push(match)
      } else {
        map.set(key, [match])
      }
    }
    return map
  }, [existingMatches])

  const ingredientOptions = useMemo(
    () =>
      ingredients
        .map((ing) => ({ id: ing.id, name: ing.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ingredients]
  )

  // Get products matched to a specific ingredient
  const getProductsForIngredient = (ingredientId: string): ExistingMatch[] => {
    const key = String(ingredientId).trim()
    return matchesByIngredient.get(key) || []
  }

  // Add a product match to an ingredient
  const matchQueueRef = useRef<Array<{ ingredientId: string; product: GroceryProduct; tempId: string }>>([])
  const isProcessingQueueRef = useRef(false)

  const processMatchQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return
    isProcessingQueueRef.current = true

    while (matchQueueRef.current.length > 0) {
      const next = matchQueueRef.current.shift()
      if (!next) continue

      try {
        const response = await fetch('/api/admin/add-product-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredient_id: next.ingredientId,
            product_external_id: next.product.id,
            confidence: 100,
            match_type: 'manual'
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setExistingMatches(prev =>
            prev.map(match =>
              match.id === next.tempId && data.data?.id
                ? { ...match, id: data.data.id }
                : match
            )
          )
        } else {
          const errorMessage = data.details || data.message || 'Unknown error'
          const errorHint = data.hint ? `\n\nHint: ${data.hint}` : ''
          setExistingMatches(prev => prev.filter(match => match.id !== next.tempId))
          alert(`Failed to add product match: ${errorMessage}${errorHint}`)
        }
      } catch (error) {
        console.error('❌ Error adding product match:', error)
        setExistingMatches(prev => prev.filter(match => match.id !== next.tempId))
        alert('Error adding product match')
      } finally {
        setPendingMatchIds(prev => {
          const nextSet = new Set(prev)
          nextSet.delete(next.tempId)
          return nextSet
        })
      }
    }

    isProcessingQueueRef.current = false
  }, [])

  const addProductMatch = async (ingredientId: string, product: GroceryProduct): Promise<boolean> => {
    const existingMatch = existingMatches.find(match => 
      match.ingredient_id === ingredientId && match.product_external_id === product.id
    )
    if (existingMatch) {
      alert('This product is already matched to this ingredient')
      return true
    }

    const ingredient = ingredients.find(ing => ing.id === ingredientId)
    const tempId = `pending-${Date.now()}-${ingredientId}-${product.id}`

    const newMatch: ExistingMatch = {
      id: tempId,
      ingredient_id: ingredientId,
      product_external_id: product.id,
      confidence: 100,
      match_type: 'manual',
      ingredient_name: ingredient?.name || '',
      product_name: product.name,
      product_category: product.category,
      product_store: product.store,
      product_price: product.price,
      product_original_price: product.originalPrice,
      product_is_on_sale: product.isOnSale
    }

    setExistingMatches(prev => [newMatch, ...prev])
    setPendingMatchIds(prev => {
      const nextSet = new Set(prev)
      nextSet.add(tempId)
      return nextSet
    })

    matchQueueRef.current.push({ ingredientId, product, tempId })
    processMatchQueue()
    return true
  }

  // Remove a product match from an ingredient
  const removeProductMatch = async (matchId: string) => {
    try {
      console.log('🗑️ Removing product match:', matchId)
      
      const response = await fetch('/api/admin/remove-product-match', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId })
      })
      
      const data = await response.json()
      console.log('🗑️ Remove response:', data)
      
      if (response.ok && data.success) {
        setExistingMatches(prev => prev.filter(match => match.id !== matchId))
        console.log('✅ Product match removed successfully')
      } else {
        console.error('❌ Failed to remove product match:', data.message)
        alert(`Failed to remove product match: ${data.message}`)
      }
    } catch (error) {
      console.error('❌ Error removing product match:', error)
      alert('Error removing product match')
    }
  }

  // Filter ingredients based on search and category
  const filteredIngredients = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    const lowPriorityCategories = new Set(['krydderi', 'urter'])

    return ingredients
      .filter((ingredient) => {
        const matchesSearch = ingredient.name && ingredient.name.toLowerCase().includes(searchLower)
        const matchesCategory = selectedCategory === 'all' || ingredient.category === selectedCategory
        const ingredientCategory = (ingredient.category || '').toLowerCase().trim()
        const keepByPriority = !hideLowPriorityCategories || !lowPriorityCategories.has(ingredientCategory)
        const matchList = matchesByIngredient.get(String(ingredient.id).trim()) || []
        const hasAnyMatch = matchList.length > 0
        const keepByMatchFilter = !onlyUnmatched || !hasAnyMatch
        return matchesSearch && matchesCategory && keepByPriority && keepByMatchFilter
      })
      .sort((a, b) => {
        const aHasMatch = (matchesByIngredient.get(String(a.id).trim()) || []).length > 0
        const bHasMatch = (matchesByIngredient.get(String(b.id).trim()) || []).length > 0

        // Unmatched first (the active work queue)
        if (aHasMatch !== bHasMatch) return aHasMatch ? 1 : -1

        // Newest first
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        if (aTime !== bTime) return bTime - aTime

        return a.name.localeCompare(b.name)
      })
  }, [ingredients, searchTerm, selectedCategory, hideLowPriorityCategories, onlyUnmatched, matchesByIngredient])

  // Pagination
  const totalPages = useMemo(
    () => Math.ceil(filteredIngredients.length / itemsPerPage),
    [filteredIngredients.length]
  )
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage])
  const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex])
  const currentIngredients = useMemo(
    () => filteredIngredients.slice(startIndex, endIndex),
    [filteredIngredients, startIndex, endIndex]
  )

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

        <div className="flex items-center justify-end mb-6">
          <button
            onClick={async () => {
              setIsSyncingMatches(true)
              const updatedMatches = await loadExistingMatches()
              if (updatedMatches) {
                setExistingMatches(updatedMatches)
              }
              setIsSyncingMatches(false)
            }}
            className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-60"
            disabled={isSyncingMatches}
          >
            {isSyncingMatches ? 'Syncing matches...' : 'Sync all matches'}
          </button>
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
                {categoryOptions.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
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
                <option value="Bilka">Bilka</option>
                <option value="Lidl">Lidl</option>
                <option value="365 Discount">365 Discount</option>
                <option value="Nemlig">Nemlig</option>
                <option value="MENY">MENY</option>
                <option value="Spar">Spar</option>
                <option value="Kvickly">Kvickly</option>
                <option value="Super Brugsen">Super Brugsen</option>
                <option value="Brugsen">Brugsen</option>
                <option value="Løvbjerg">Løvbjerg</option>
                <option value="ABC Lavpris">ABC Lavpris</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyUnmatched}
                onChange={(e) => setOnlyUnmatched(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Kun umatch ingredienser (skjul dem der allerede har produktmatch)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hideLowPriorityCategories}
                onChange={(e) => setHideLowPriorityCategories(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Skjul krydderier og urter (viser de mest relevante nye først)
            </label>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="space-y-4">
          {currentIngredients.map((ingredient) => {
            const matchedProducts = getProductsForIngredient(ingredient.id)
            return (
              <div key={ingredient.id} className="bg-white rounded-lg shadow">
                <div className="p-6">
                  {/* Ingredient Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{ingredient.name}</h3>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ingredient.is_basis || false}
                            onChange={async (e) => {
                              const newIsBasis = e.target.checked
                              try {
                                const response = await fetch(`/api/ingredients/${ingredient.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ is_basis: newIsBasis })
                                })
                                const data = await response.json()
                                if (response.ok && data.success) {
                                  // Update local state
                                  setIngredients(prev => prev.map(ing => 
                                    ing.id === ingredient.id 
                                      ? { ...ing, is_basis: newIsBasis }
                                      : ing
                                  ))
                                  console.log(`✅ Updated basis flag for ${ingredient.name} to ${newIsBasis}`)
                                } else {
                                  console.error('❌ Failed to update basis flag:', data.error)
                                  alert(`Failed to update basis flag: ${data.error || 'Unknown error'}`)
                                }
                              } catch (error) {
                                console.error('❌ Error updating basis flag:', error)
                                alert('Error updating basis flag')
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Basis</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="text-sm text-gray-600">
                          Category:
                        </div>
                        <select
                          value={ingredient.category || 'Andre'}
                          onChange={async (e) => {
                            const newCategory = e.target.value
                            try {
                              const response = await fetch(`/api/ingredients/${ingredient.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ category: newCategory })
                              })
                              const data = await response.json()
                              if (response.ok && data.success) {
                                // Update local state
                                setIngredients(prev => prev.map(ing => 
                                  ing.id === ingredient.id 
                                    ? { ...ing, category: newCategory }
                                    : ing
                                ))
                                console.log(`✅ Updated category for ${ingredient.name} to ${newCategory}`)
                              } else {
                                console.error('❌ Failed to update category:', data.error)
                                alert(`Failed to update category: ${data.error || 'Unknown error'}`)
                              }
                            } catch (error) {
                              console.error('❌ Error updating category:', error)
                              alert('Error updating category')
                            }
                          }}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {categoryOptions.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <label htmlFor={`grams-${ingredient.id}`}>Vægt pr. stk (g):</label>
                          <input
                            id={`grams-${ingredient.id}`}
                            type="number"
                            min={0}
                            step={1}
                            placeholder="—"
                            value={getGramsInputValue(ingredient)}
                            onChange={(e) => {
                              const raw = e.target.value
                              setGramsDraftByIngredient((prev) => ({ ...prev, [ingredient.id]: raw }))
                            }}
                            onBlur={() => {
                              saveGramsPerUnit(ingredient)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            disabled={savingGramsByIngredient[ingredient.id] === true}
                            className="w-20 text-sm border border-gray-300 rounded-md px-2 py-1 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
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
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-gray-900">
                        Matched Products: {matchedProducts.length}
                      </h4>
                      <button
                        onClick={async () => {
                          console.log('🔄 Manually reloading matches...')
                          const updatedMatches = await loadExistingMatches()
                          if (updatedMatches) {
                            setExistingMatches(updatedMatches)
                            console.log(`✅ Reloaded ${updatedMatches.length} matches`)
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Reload matches
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 h-20 overflow-y-auto pr-1">
                      {matchedProducts.length > 0 ? (
                        matchedProducts.map((match) => (
                          <div
                            key={match.id}
                            className={`bg-blue-50 border border-blue-200 rounded px-2 py-1 flex items-center space-x-1 ${
                              pendingMatchIds.has(match.id) ? 'opacity-60' : ''
                            }`}
                          >
                            <span className="text-xs font-medium text-blue-900">{match.product_name}</span>
                            <span className="text-xs text-blue-600">({match.product_store})</span>
                            <span className="text-xs text-gray-500">{match.product_price} kr</span>
                            {!pendingMatchIds.has(match.id) && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeProductMatch(match.id)
                                }}
                                className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-100"
                                title="Remove product match"
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500 italic">
                          Ingen matches endnu. Tilføj et produkt nedenfor.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Copy Matches */}
                  <div className="mb-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <label className="text-sm text-gray-700">Copy matches from:</label>
                      <select
                        value={copySourceByIngredient[ingredient.id] || ''}
                        onChange={(e) =>
                          setCopySourceByIngredient((prev) => ({
                            ...prev,
                            [ingredient.id]: e.target.value
                          }))
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select ingredient...</option>
                        {ingredientOptions
                          .filter((opt) => opt.id !== ingredient.id)
                          .map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                      </select>
                      <button
                        onClick={async () => {
                          const sourceId = copySourceByIngredient[ingredient.id]
                          if (!sourceId) return

                          const sourceMatches = getProductsForIngredient(sourceId)
                          const existingIds = new Set(
                            matchedProducts.map((m) => m.product_external_id)
                          )
                          const matchesToCopy = sourceMatches.filter(
                            (m) => !existingIds.has(m.product_external_id)
                          )

                          if (matchesToCopy.length === 0) {
                            alert('No new matches to copy.')
                            return
                          }

                          for (const match of matchesToCopy) {
                            await addProductMatch(ingredient.id, {
                              id: match.product_external_id,
                              name: match.product_name,
                              category: match.product_category,
                              store: match.product_store,
                              price: match.product_price,
                              originalPrice: match.product_original_price ?? undefined,
                              isOnSale: match.product_is_on_sale,
                              unit: 'stk',
                              quantity: 1
                            })
                          }
                        }}
                        className="px-3 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
                        disabled={!copySourceByIngredient[ingredient.id]}
                      >
                        Copy products
                      </button>
                    </div>
                  </div>

                  {/* Add Product Dropdown */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Add Product Match:
                    </h4>
                    <GroceryProductSelector
                      groceryProducts={groceryProducts.filter(product => 
                        selectedStore === 'all' || product.store === selectedStore
                      )}
                      selectedProduct={null}
                      onSelect={(product) => addProductMatch(ingredient.id, product)}
                      placeholder="Search for a product to match..."
                      ingredientId={ingredient.id}
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

// Simple cache for search results (shared across all instances to reduce duplicate requests)
const searchCache = new Map<string, { products: GroceryProduct[], timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const SEARCH_CACHE_VERSION = 'v2'

// Component for selecting grocery products
function GroceryProductSelector({ 
  groceryProducts, 
  selectedProduct, 
  onSelect, 
  placeholder,
  ingredientId
}: {
  groceryProducts: GroceryProduct[]
  selectedProduct: GroceryProduct | null
  onSelect: (product: GroceryProduct) => Promise<boolean>
  placeholder: string
  ingredientId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<GroceryProduct[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set())
  const [productCategoryFilter, setProductCategoryFilter] = useState('')

  // Reset local state when switching ingredient (each ingredient has its own dropdown)
  useEffect(() => {
    setSearchTerm('')
    setSearchResults([])
    setHiddenProductIds(new Set())
    setIsSearching(false)
    setProductCategoryFilter('')
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
  }, [ingredientId])
  
  // Search products on-demand when user types (minimum 2 characters)
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Only search if user has typed at least 2 characters
    if (searchTerm.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    
    // Debounce search by 500ms (increased from 300ms to reduce requests)
    setIsSearching(true)
    const timeout = setTimeout(async () => {
      try {
        // Check cache first (scoped by ingredient to avoid stale cross-ingredient exclusions)
        const cacheKey = `${SEARCH_CACHE_VERSION}::${ingredientId}::${searchTerm.toLowerCase().trim()}`
        const cached = searchCache.get(cacheKey)
        const now = Date.now()
        
        if (cached && (now - cached.timestamp) < CACHE_TTL) {
          console.log(`💾 Using cached results for "${searchTerm}"`)
          // Filter out already matched products for this ingredient
          const filtered = cached.products.filter((p: GroceryProduct) => !hiddenProductIds.has(p.id))
          setSearchResults(filtered)
          setIsSearching(false)
          return
        }
        
        console.log(`🔍 Searching for products: "${searchTerm}"`)
        const response = await fetch(
          `/api/admin/products-for-matching?search=${encodeURIComponent(searchTerm)}&limit=100&ingredient_id=${encodeURIComponent(ingredientId)}`
        )
        const data = await response.json()
        
        if (data.success && data.data.products) {
          const products = data.data.products.map((prod: any) => ({
            id: prod.external_id,
            name: prod.name,
            category: prod.category || 'Andre',
            store: prod.store,
            price: prod.price,
            originalPrice: prod.original_price,
            isOnSale: prod.is_on_sale || false,
            unit: 'stk',
            quantity: 1
          }))
          
          // Cache the results
          searchCache.set(cacheKey, { products, timestamp: now })
          
          // Filter out already matched products for this ingredient
          const filtered = products.filter((p: GroceryProduct) => !hiddenProductIds.has(p.id))
          setSearchResults(filtered)
          console.log(`✅ Found ${filtered.length} products matching "${searchTerm}"`)
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error('Error searching products:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500) // Increased debounce to 500ms
    
    searchTimeoutRef.current = timeout
    
    return () => {
      if (timeout) clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, ingredientId]) // Added ingredientId to dependencies
  
  // Use search results if available, otherwise filter from groceryProducts
  const normalizedCategoryFilter = productCategoryFilter.trim().toLowerCase()
  const filteredProducts = (searchTerm.length >= 2 
    ? searchResults 
    : groceryProducts.filter(product => {
        if (!product) return false
        const searchLower = searchTerm.toLowerCase()
        const nameMatch = product.name && product.name.toLowerCase().includes(searchLower)
        const categoryMatch = product.category && product.category.toLowerCase().includes(searchLower)
        const storeMatch = product.store && product.store.toLowerCase().includes(searchLower)
        return nameMatch || categoryMatch || storeMatch
      }))
    .filter(product => {
      if (!normalizedCategoryFilter) return true
      return product.category?.toLowerCase().includes(normalizedCategoryFilter)
    })
    // Instantly hide items user already clicked in this session (better UX on large lists)
    .filter(p => !hiddenProductIds.has(p.id))

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
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-auto">
          <div className="p-2 space-y-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="product-search-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Filter by product category (fx grø, kolonial)"
              value={productCategoryFilter}
              onChange={(e) => setProductCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="max-h-80 overflow-auto">
            {isSearching && searchTerm.length >= 2 && (
              <div className="px-3 py-2 text-gray-500 text-center text-sm">
                Søger efter "{searchTerm}"...
              </div>
            )}
            {!isSearching && searchTerm.length < 2 && (
              <div className="px-3 py-2 text-gray-500 text-center text-sm">
                Skriv mindst 2 bogstaver for at søge...
              </div>
            )}
            {!isSearching && searchTerm.length >= 2 && filteredProducts.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-center text-sm">
                Ingen produkter fundet for "{searchTerm}"
              </div>
            )}
            {!isSearching && filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={async () => {
                  // Hide immediately in UI so it's easy to pick many without clutter
                  setHiddenProductIds(prev => {
                    const next = new Set(prev)
                    next.add(product.id)
                    return next
                  })
                  setSearchResults(prev => prev.filter(p => p.id !== product.id))
                  const success = await onSelect(product)
                  if (!success) {
                    setHiddenProductIds(prev => {
                      const next = new Set(prev)
                      next.delete(product.id)
                      return next
                    })
                    setSearchResults(prev => [product, ...prev])
                  }
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
