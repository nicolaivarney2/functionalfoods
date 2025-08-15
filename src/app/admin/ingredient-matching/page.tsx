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

interface FridaIngredient {
  id: string
  name: string
  category: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  vitamins?: Record<string, number>
  minerals?: Record<string, number>
}

interface MatchSuggestion {
  fridaIngredient: FridaIngredient
  confidence: number
  matchType: 'exact' | 'synonym' | 'fuzzy' | 'category'
}

interface IngredientMatch {
  recipeIngredient: RecipeIngredient
  suggestedMatch: MatchSuggestion | null
  selectedMatch: FridaIngredient | null
  isConfirmed: boolean
  isRejected: boolean
}

export default function IngredientMatchingPage() {
  const [ingredientMatches, setIngredientMatches] = useState<IngredientMatch[]>([])
  const [fridaIngredients, setFridaIngredients] = useState<FridaIngredient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
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
  }, [ingredientMatches])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load current recipe ingredients
      const recipeIngredientsResponse = await fetch('/api/ingredients')
      const recipeIngredients = await recipeIngredientsResponse.json()
      
      // Load Frida ingredients (this will be the full database once uploaded)
      const fridaResponse = await fetch('/api/frida-ingredients')
      const fridaData = await fridaResponse.json()
      setFridaIngredients(fridaData)
      
      // Load existing matches from database
      const existingMatchesResponse = await fetch('/api/ingredient-matches')
      const existingMatches = await existingMatchesResponse.json()
      const existingMatchMap = new Map(
        existingMatches.map((match: any) => [match.recipe_ingredient_id, match.frida_ingredient_id])
      )
      
      console.log(`📋 Found ${existingMatches.length} existing matches in database`)
      
      // Filter out ingredients that already have matches
      // Ensure we compare normalized IDs (our import now uses stable slugs)
      const unmatchedIngredients = recipeIngredients.filter((ingredient: RecipeIngredient) => {
        return !existingMatchMap.has(ingredient.id)
      })
      
      console.log(`🔍 Processing ${unmatchedIngredients.length} unmatched ingredients (${recipeIngredients.length - unmatchedIngredients.length} already matched)`)
      
      // Get auto-match suggestions for unmatched ingredients only
      const matchesWithSuggestions = await Promise.all(
        unmatchedIngredients.map(async (ingredient: RecipeIngredient) => {
          const suggestion = await getMatchSuggestion(ingredient.name, fridaData)
          return {
            recipeIngredient: ingredient,
            suggestedMatch: suggestion,
            selectedMatch: null,
            isConfirmed: false,
            isRejected: false
          }
        })
      )
      
      setIngredientMatches(matchesWithSuggestions)
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getMatchSuggestion = async (ingredientName: string, fridaData: FridaIngredient[]): Promise<MatchSuggestion | null> => {
    // Use the advanced matching system we created
    // For now, simple mock implementation
    const normalized = ingredientName.toLowerCase().trim()
    
    // Try exact match first
    const exactMatch = fridaData.find(f => 
      f.name.toLowerCase().includes(normalized) || 
      normalized.includes(f.name.toLowerCase())
    )
    
    if (exactMatch) {
      return {
        fridaIngredient: exactMatch,
        confidence: 95,
        matchType: 'exact'
      }
    }
    
    // Try fuzzy match
    const fuzzyMatch = fridaData.find(f => {
      const fridaNormalized = f.name.toLowerCase()
      return fridaNormalized.includes(normalized.substring(0, 4)) || 
             normalized.includes(fridaNormalized.substring(0, 4))
    })
    
    if (fuzzyMatch) {
      return {
        fridaIngredient: fuzzyMatch,
        confidence: 75,
        matchType: 'fuzzy'
      }
    }
    
    return null
  }

  const confirmMatch = async (recipeIngredientId: string) => {
    const idx = ingredientMatches.findIndex(m => m.recipeIngredient.id === recipeIngredientId)
    if (idx === -1) return
    const updated = [...ingredientMatches]
    updated[idx].isConfirmed = true
    updated[idx].isRejected = false
    updated[idx].selectedMatch = updated[idx].suggestedMatch?.fridaIngredient || null
    setIngredientMatches(updated)
    
    // Auto-save this match immediately
    if (updated[idx].selectedMatch) {
      try {
        const matchToSave = {
          recipeIngredientId: updated[idx].recipeIngredient.id,
          fridaIngredientId: updated[idx].selectedMatch!.id,
          confidence: updated[idx].suggestedMatch?.confidence || 100
        }
        
        const response = await fetch('/api/ingredient-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matches: [matchToSave] })
        })
        
        if (response.ok) {
          // Remove saved match from UI
          const filteredMatches = updated.filter(m => m.recipeIngredient.id !== matchToSave.recipeIngredientId)
          setIngredientMatches(filteredMatches)
          
          // Update stats with filtered list
          setTimeout(() => {
            const total = filteredMatches.length
            const confirmed = filteredMatches.filter(m => m.isConfirmed).length
            const rejected = filteredMatches.filter(m => m.isRejected).length
            const pending = total - confirmed - rejected
            setStats({ total, confirmed, rejected, pending })
          }, 0)
          
          return // Exit early since match is saved and removed
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }
    
    // Update stats if auto-save failed
    setTimeout(() => {
      const total = updated.length
      const confirmed = updated.filter(m => m.isConfirmed).length
      const rejected = updated.filter(m => m.isRejected).length
      const pending = total - confirmed - rejected
      setStats({ total, confirmed, rejected, pending })
    }, 0)
  }

  const rejectMatch = (recipeIngredientId: string) => {
    const idx = ingredientMatches.findIndex(m => m.recipeIngredient.id === recipeIngredientId)
    if (idx === -1) return
    const updated = [...ingredientMatches]
    updated[idx].isRejected = true
    updated[idx].isConfirmed = false
    updated[idx].selectedMatch = null
    setIngredientMatches(updated)
    
    // Update stats immediately
    setTimeout(() => {
      const total = updated.length
      const confirmed = updated.filter(m => m.isConfirmed).length
      const rejected = updated.filter(m => m.isRejected).length
      const pending = total - confirmed - rejected
      setStats({ total, confirmed, rejected, pending })
    }, 0)
  }

  const selectManualMatch = async (recipeIngredientId: string, fridaIngredient: FridaIngredient) => {
    const idx = ingredientMatches.findIndex(m => m.recipeIngredient.id === recipeIngredientId)
    if (idx === -1) return
    const updated = [...ingredientMatches]
    updated[idx].selectedMatch = fridaIngredient
    updated[idx].isConfirmed = true
    updated[idx].isRejected = false
    setIngredientMatches(updated)
    
    // Auto-save this manual match immediately
    try {
        const matchToSave = {
          recipeIngredientId: updated[idx].recipeIngredient.id,
          fridaIngredientId: fridaIngredient.id,
          confidence: 100 // Manual selection = 100% confidence
        }
      
      const response = await fetch('/api/ingredient-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: [matchToSave] })
      })
      
      if (response.ok) {
        // Remove saved match from UI
          const filteredMatches = updated.filter(m => m.recipeIngredient.id !== matchToSave.recipeIngredientId)
        setIngredientMatches(filteredMatches)
        
        // Update stats with filtered list
        setTimeout(() => {
          const total = filteredMatches.length
          const confirmed = filteredMatches.filter(m => m.isConfirmed).length
          const rejected = filteredMatches.filter(m => m.isRejected).length
          const pending = total - confirmed - rejected
          setStats({ total, confirmed, rejected, pending })
        }, 0)
        
        return // Exit early since match is saved and removed
      }
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
    
    // Update stats if auto-save failed
    setTimeout(() => {
      const total = updated.length
      const confirmed = updated.filter(m => m.isConfirmed).length
      const rejected = updated.filter(m => m.isRejected).length
      const pending = total - confirmed - rejected
      setStats({ total, confirmed, rejected, pending })
    }, 0)
  }

  const updateStats = () => {
    const total = ingredientMatches.length
    const confirmed = ingredientMatches.filter(m => m.isConfirmed).length
    const rejected = ingredientMatches.filter(m => m.isRejected).length
    const pending = total - confirmed - rejected
    
    setStats({ total, confirmed, rejected, pending })
  }

  const saveAllMatches = async () => {
    try {
      const confirmedMatches = ingredientMatches
        .filter(m => m.isConfirmed && m.selectedMatch)
        .map(m => ({
          recipeIngredientId: m.recipeIngredient.id,
          fridaIngredientId: m.selectedMatch!.id,
          confidence: m.suggestedMatch?.confidence || 100
        }))
      
      console.log(`💾 Attempting to save ${confirmedMatches.length} matches:`, confirmedMatches)
      
      const response = await fetch('/api/ingredient-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: confirmedMatches })
      })
      
      const result = await response.json()
      console.log('📋 Save response:', result)
      
      if (response.ok) {
        alert(`Saved ${confirmedMatches.length} ingredient matches!`)
        
        // Remove saved matches from the UI
        const savedIngredientIds = confirmedMatches.map(m => m.recipeIngredientId)
        const updatedMatches = ingredientMatches.filter(m => 
          !savedIngredientIds.includes(m.recipeIngredient.id)
        )
        setIngredientMatches(updatedMatches)
        
        // Update stats immediately
        setTimeout(() => {
          const total = updatedMatches.length
          const confirmed = updatedMatches.filter(m => m.isConfirmed).length
          const rejected = updatedMatches.filter(m => m.isRejected).length
          const pending = total - confirmed - rejected
          setStats({ total, confirmed, rejected, pending })
        }, 0)
        
      } else {
        alert(`Error saving matches: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving matches:', error)
      alert('Error saving matches')
    }
  }

  const filteredMatches = ingredientMatches.filter(match => {
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
          <p className="mt-4 text-gray-600">Loading ingredients...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Ingredient Matching</h1>
              <p className="mt-2 text-gray-600">
                Match recipe ingredients with Frida DTU nutritional data
              </p>
            </div>
            <Link
              href="/admin/ingredient-matching/recent"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Seneste matches
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Ingredient Matches */}
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
                      Suggested Frida Match
                    </h3>
                    
                    {match.suggestedMatch ? (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900">
                            {match.suggestedMatch.fridaIngredient.name}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(match.suggestedMatch.confidence)}`}>
                              {match.suggestedMatch.confidence}% {getMatchTypeIcon(match.suggestedMatch.matchType)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          Category: {match.suggestedMatch.fridaIngredient.category}
                        </div>
                        
                        {/* Nutrition Preview */}
                        {match.suggestedMatch.fridaIngredient.calories && (
                          <div className="text-sm text-gray-700 mb-3">
                            <strong>Nutrition (per 100g):</strong> {' '}
                            {match.suggestedMatch.fridaIngredient.calories} kcal, {' '}
                            {match.suggestedMatch.fridaIngredient.protein}g protein, {' '}
                            {match.suggestedMatch.fridaIngredient.carbs}g carbs, {' '}
                            {match.suggestedMatch.fridaIngredient.fat}g fat
                          </div>
                        )}
                        
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
                  <FridaIngredientSelector
                    fridaIngredients={fridaIngredients}
                    selectedIngredient={match.selectedMatch}
                    onSelect={(fridaIngredient) => selectManualMatch(match.recipeIngredient.id, fridaIngredient)}
                    placeholder="Search and select a Frida ingredient..."
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

// Component for selecting Frida ingredients
function FridaIngredientSelector({ 
  fridaIngredients, 
  selectedIngredient, 
  onSelect, 
  placeholder 
}: {
  fridaIngredients: FridaIngredient[]
  selectedIngredient: FridaIngredient | null
  onSelect: (ingredient: FridaIngredient) => void
  placeholder: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredIngredients = fridaIngredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, searchTerm.length >= 2 ? 200 : 100) // Show more results when user is searching

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center justify-between">
          <span className={selectedIngredient ? 'text-gray-900' : 'text-gray-500'}>
            {selectedIngredient ? selectedIngredient.name : placeholder}
          </span>
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 bottom-full mb-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search Frida ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredIngredients.map((ingredient) => (
              <button
                key={ingredient.id}
                onClick={() => {
                  onSelect(ingredient)
                  setIsOpen(false)
                  setSearchTerm('')
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div className="font-medium text-gray-900">{ingredient.name}</div>
                <div className="text-sm text-gray-500">{ingredient.category}</div>
                {ingredient.calories && (
                  <div className="text-xs text-gray-400">
                    {ingredient.calories} kcal/100g
                  </div>
                )}
              </button>
            ))}
            
            {filteredIngredients.length === 0 && (
              <div className="px-3 py-2 text-gray-500 text-center">
                No ingredients found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}