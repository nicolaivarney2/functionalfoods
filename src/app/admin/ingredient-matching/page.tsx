'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDownIcon, CheckIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface RecipeIngredient {
  id: string
  name: string
  category: string
  description: string
  createdAt?: string | Date
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
  /** Sandt når matchet allerede findes i ingredient_matches (kan findes via søgning) */
  hasStoredMatch: boolean
}

/**
 * Frida (DTU) bruger ofte "Løg, rød" i stedet for ordet "rødløg" — ren substring-match finder derfor intet.
 * Udvidelser: alle dele skal findes i navnet (typisk efter komma).
 */
const FRIDA_SEARCH_COMPOUNDS: Record<string, string[]> = {
  rødløg: ['rød', 'løg'],
  kyllingebryst: ['kylling', 'bryst'],
  blomkålsris: ['blomkål'],
  hakkedetomater: ['tomat'],
  'hakkede tomater': ['tomat'],
}

function ingredientNameMatchesQuery(name: string, rawQuery: string): boolean {
  const n = name.toLowerCase()
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  if (n.includes(q)) return true

  const compound = FRIDA_SEARCH_COMPOUNDS[q.replace(/\s+/g, '')] ?? FRIDA_SEARCH_COMPOUNDS[q]
  if (compound?.every((t) => n.includes(t.toLowerCase()))) return true

  const tokens = q.split(/[\s,]+/).filter((t) => t.length >= 2)
  if (tokens.length > 1 && tokens.every((t) => n.includes(t))) return true

  return false
}

/**
 * ingredients.category i DB følger IngredientCategory (fx groent, protein), ikke dropdown-værdier som "grøntsager".
 */
const INGREDIENT_MATCH_CATEGORY_FILTER: Record<string, string[]> = {
  kød: ['protein'],
  fisk: ['protein'],
  grøntsager: ['groent', 'grøntsager'],
  frugt: ['frugt'],
  mejeri: ['mejeri'],
  fedt: ['fedt'],
  andre: [
    'andre',
    'korn',
    'krydderi',
    'urter',
    'nodder',
    'fro',
    'balg',
    'forarbejdet',
    'soedstof',
    'drikke',
  ],
}

function recipeCategoryMatchesFilter(dbCategory: string | undefined, selected: string): boolean {
  if (selected === 'all') return true
  const allowed = INGREDIENT_MATCH_CATEGORY_FILTER[selected]
  if (!allowed?.length) return true
  const c = (dbCategory || '').toLowerCase().trim()
  return allowed.includes(c)
}

function findFridaByStoredId(fridaData: FridaIngredient[], storedId: string | undefined): FridaIngredient | undefined {
  if (!storedId) return undefined
  const s = String(storedId).trim()
  const numeric = s.replace(/^frida-/i, '')
  return fridaData.find(
    (f) => f.id === s || f.id === `frida-${numeric}` || f.id.replace(/^frida-/i, '') === numeric
  )
}

function isIngredientMatchedRow(m: IngredientMatch): boolean {
  return m.hasStoredMatch || (m.isConfirmed && !!m.selectedMatch)
}

/** Søg i opskrift-ingrediensnavn og i valgt/foreslået Frida-navn (fx "Løg, rød" når du søger rødløg) */
function rowMatchesSearch(match: IngredientMatch, rawQuery: string): boolean {
  const q = rawQuery.trim()
  if (!q) return true
  if (ingredientNameMatchesQuery(match.recipeIngredient.name, q)) return true
  const fridaName = match.selectedMatch?.name || match.suggestedMatch?.fridaIngredient?.name
  if (fridaName && ingredientNameMatchesQuery(fridaName, q)) return true
  return false
}

export default function IngredientMatchingPage() {
  const [ingredientMatches, setIngredientMatches] = useState<IngredientMatch[]>([])
  const [fridaIngredients, setFridaIngredients] = useState<FridaIngredient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [hideLowPriorityCategories, setHideLowPriorityCategories] = useState(true)
  /**
   * queue = kun uden match (standard — matchede «forsvinder» fra listen)
   * all = inkl. i forvejen matchet
   * matchedOnly = kun dem der allerede har match
   */
  const [matchFilter, setMatchFilter] = useState<'queue' | 'all' | 'matchedOnly'>('queue')
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    rejected: 0,
    pending: 0
  })
  const [manualIngredientName, setManualIngredientName] = useState('')
  const [manualIngredientCategory, setManualIngredientCategory] = useState('andre')
  const [manualIngredientDescription, setManualIngredientDescription] = useState('')
  const [isAddingIngredient, setIsAddingIngredient] = useState(false)

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

      const loadRecipeIngredients = async (): Promise<RecipeIngredient[]> => {
        // Primary source
        const recipeIngredientsResponse = await fetch('/api/ingredients')
        if (recipeIngredientsResponse.ok) {
          const recipeIngredients = await recipeIngredientsResponse.json()
          if (Array.isArray(recipeIngredients)) return recipeIngredients
        }

        // Fallback source so the page still works if /api/ingredients fails in dev
        const fallbackResponse = await fetch('/api/admin/ingredients-for-matching?limit=1000')
        if (!fallbackResponse.ok) {
          throw new Error('Kunne ikke hente ingredienser fra hverken primær- eller fallback-endpoint')
        }

        const fallbackData = await fallbackResponse.json()
        const fallbackIngredients = Array.isArray(fallbackData?.ingredients) ? fallbackData.ingredients : []
        return fallbackIngredients.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category || 'andre',
          description: '',
          createdAt: item.created_at || null,
        }))
      }

      const recipeIngredients = await loadRecipeIngredients()
      
      // Load Frida ingredients (this will be the full database once uploaded)
      const fridaResponse = await fetch('/api/frida-ingredients')
      const fridaData = await fridaResponse.json()
      setFridaIngredients(fridaData)

      // Load existing matches from database
      const existingMatchesResponse = await fetch('/api/ingredient-matches')
      const existingMatches = await existingMatchesResponse.json()
      const existingMatchesArray = Array.isArray(existingMatches) ? existingMatches : []
      const existingMatchMap = new Map(
        existingMatchesArray.map((match: any) => [match.recipe_ingredient_id, match.frida_ingredient_id])
      )

      console.log(`📋 Found ${existingMatchesArray.length} existing matches in database`)

      const matchesWithSuggestions = await Promise.all(
        recipeIngredients.map(async (ingredient: RecipeIngredient) => {
          const fridaId = existingMatchMap.get(ingredient.id) as string | undefined
          const hasStoredMatch = !!(fridaId != null && String(fridaId).trim() !== '')
          const selectedFromDb =
            hasStoredMatch && fridaId != null ? findFridaByStoredId(fridaData, String(fridaId)) : undefined

          const suggestion = hasStoredMatch ? null : await getMatchSuggestion(ingredient.name, fridaData)

          return {
            recipeIngredient: ingredient,
            suggestedMatch: suggestion,
            selectedMatch: selectedFromDb ?? null,
            isConfirmed: hasStoredMatch,
            isRejected: false,
            hasStoredMatch,
          } as IngredientMatch
        })
      )

      setIngredientMatches(matchesWithSuggestions)
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addManualIngredient = async () => {
    const name = manualIngredientName.trim()
    if (!name) {
      alert('Skriv et ingrediensnavn først')
      return
    }

    try {
      setIsAddingIngredient(true)
      const response = await fetch('/api/admin/ingredients-for-matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: manualIngredientCategory,
          description: manualIngredientDescription.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Kunne ikke tilføje ingrediens')
      }

      const alreadyExisted = Boolean(data?.data?.alreadyExisted)
      alert(
        alreadyExisted
          ? `Ingrediensen "${name}" findes allerede.`
          : `Ingrediensen "${name}" er tilføjet og klar til matching.`
      )

      setManualIngredientName('')
      setManualIngredientDescription('')
      await loadData()
    } catch (error) {
      console.error('Error adding manual ingredient:', error)
      alert(error instanceof Error ? error.message : 'Kunne ikke tilføje ingrediens')
    } finally {
      setIsAddingIngredient(false)
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
    const idx = ingredientMatches.findIndex((m) => m.recipeIngredient.id === recipeIngredientId)
    if (idx === -1) return
    const selected = ingredientMatches[idx].suggestedMatch?.fridaIngredient
    if (!selected) return

    try {
      const matchToSave = {
        recipeIngredientId,
        fridaIngredientId: selected.id,
        confidence: ingredientMatches[idx].suggestedMatch?.confidence || 100,
      }

      const response = await fetch('/api/ingredient-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: [matchToSave] }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.details || errorData?.error || 'Kunne ikke gemme match – prøv igen.'
        alert(errorMessage)
        return
      }

      setIngredientMatches((prev) => {
        const next = [...prev]
        const i = next.findIndex((m) => m.recipeIngredient.id === recipeIngredientId)
        if (i === -1) return prev
        next[i] = {
          ...next[i],
          isConfirmed: true,
          isRejected: false,
          hasStoredMatch: true,
          selectedMatch: selected,
        }
        return next
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
      alert('Kunne ikke gemme match.')
    }
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
    try {
      const matchToSave = {
        recipeIngredientId,
        fridaIngredientId: fridaIngredient.id,
        confidence: 100,
      }

      const response = await fetch('/api/ingredient-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: [matchToSave] }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.details || errorData?.error || 'Kunne ikke gemme match – prøv igen.'
        alert(errorMessage)
        return
      }

      setIngredientMatches((prev) => {
        const next = [...prev]
        const i = next.findIndex((m) => m.recipeIngredient.id === recipeIngredientId)
        if (i === -1) return prev
        next[i] = {
          ...next[i],
          selectedMatch: fridaIngredient,
          isConfirmed: true,
          isRejected: false,
          hasStoredMatch: true,
        }
        return next
      })
    } catch (error) {
      console.error('Auto-save failed:', error)
      alert('Kunne ikke gemme match.')
    }
  }

  const updateStats = () => {
    const total = ingredientMatches.length
    const confirmed = ingredientMatches.filter((m) => isIngredientMatchedRow(m)).length
    const rejected = ingredientMatches.filter((m) => m.isRejected).length
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

        const savedIds = new Set(confirmedMatches.map((m) => m.recipeIngredientId))
        setIngredientMatches((prev) =>
          prev.map((m) =>
            savedIds.has(m.recipeIngredient.id)
              ? { ...m, hasStoredMatch: true, isConfirmed: true }
              : m
          )
        )
      } else {
        alert(`Error saving matches: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving matches:', error)
      alert('Error saving matches')
    }
  }

  const filteredMatches = ingredientMatches
    .filter((match) => {
      if (matchFilter === 'queue' && isIngredientMatchedRow(match)) return false
      if (matchFilter === 'matchedOnly' && !isIngredientMatchedRow(match)) return false
      if (!rowMatchesSearch(match, searchTerm)) return false
      if (!recipeCategoryMatchesFilter(match.recipeIngredient.category, selectedCategory)) return false

      if (hideLowPriorityCategories) {
        const lowPriorityCategories = new Set(['krydderi', 'urter'])
        const ingredientCategory = (match.recipeIngredient.category || '').toLowerCase().trim()
        if (lowPriorityCategories.has(ingredientCategory)) return false
      }

      return true
    })
    .sort((a, b) => {
      const aMatched = isIngredientMatchedRow(a)
      const bMatched = isIngredientMatchedRow(b)

      // Unmatched first (work queue first)
      if (aMatched !== bMatched) return aMatched ? 1 : -1

      // Newest first
      const aTime = a.recipeIngredient.createdAt
        ? new Date(a.recipeIngredient.createdAt).getTime()
        : 0
      const bTime = b.recipeIngredient.createdAt
        ? new Date(b.recipeIngredient.createdAt).getTime()
        : 0
      if (aTime !== bTime) return bTime - aTime

      return a.recipeIngredient.name.localeCompare(b.recipeIngredient.name)
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

        {/* Manual ingredient add */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Tilføj manglende ingrediens manuelt</h2>
          <p className="text-sm text-gray-600 mb-4">
            Hvis en ny ingrediens ikke er kommet med i køen endnu (fx "røde linser"), kan du oprette den her,
            så den dukker op i ingredient matching-listen.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
              <input
                type="text"
                value={manualIngredientName}
                onChange={(e) => setManualIngredientName(e.target.value)}
                placeholder="fx. røde linser"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={manualIngredientCategory}
                onChange={(e) => setManualIngredientCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="protein">Protein</option>
                <option value="groent">Grønt</option>
                <option value="balg">Bælgfrugter</option>
                <option value="korn">Korn</option>
                <option value="forarbejdet">Konserves</option>
                <option value="mejeri">Mejeri</option>
                <option value="fedt">Fedt</option>
                <option value="krydderi">Krydderi</option>
                <option value="urter">Urter</option>
                <option value="nodder">Nødder/Frø</option>
                <option value="frugt">Frugt</option>
                <option value="andre">Andre</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse (valgfri)</label>
              <input
                type="text"
                value={manualIngredientDescription}
                onChange={(e) => setManualIngredientDescription(e.target.value)}
                placeholder="Kort note til teamet"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="lg:col-span-1 flex items-end">
              <button
                type="button"
                onClick={addManualIngredient}
                disabled={isAddingIngredient}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isAddingIngredient ? 'Tilføjer...' : 'Tilføj'}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Søg (opskrift- eller Frida-navn)
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Fx rødløg eller Løg, rød…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <span className="block text-sm font-medium text-gray-700 mb-2">Visning</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMatchFilter('queue')}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
                    matchFilter === 'queue'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Arbejdskø
                </button>
                <button
                  type="button"
                  onClick={() => setMatchFilter('all')}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
                    matchFilter === 'all'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Vis også ingredienser der allerede er matchet med Frida"
                >
                  Vis i forvejen matchet
                </button>
                <button
                  type="button"
                  onClick={() => setMatchFilter('matchedOnly')}
                  className={`px-3 py-2 rounded-md text-sm font-medium border transition ${
                    matchFilter === 'matchedOnly'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Kun matchede
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Standard er <strong>Arbejdskø</strong>: gemte matches skjules, så du ser hurtigt, hvad der mangler.
              </p>
              <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideLowPriorityCategories}
                  onChange={(e) => setHideLowPriorityCategories(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Skjul krydderier og urter (fokus på nye, relevante ingredienser)
              </label>
            </div>

            <div className="lg:col-span-1">
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

            <div className="lg:col-span-1 flex items-end">
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
          {filteredMatches.map((match) => (
            <div key={match.recipeIngredient.id} className="bg-white rounded-lg shadow">
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isIngredientMatchedRow(match)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {isIngredientMatchedRow(match) ? 'Matchet med Frida' : 'Ikke matchet'}
                  </span>
                </div>
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
                      {match.hasStoredMatch || (match.selectedMatch && !match.suggestedMatch)
                        ? 'Frida-match'
                        : 'Suggested Frida Match'}
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
                    ) : match.selectedMatch ? (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="font-medium text-gray-900">{match.selectedMatch.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{match.selectedMatch.category}</div>
                        <p className="text-sm text-green-800 mt-2">
                          Gemt Frida-vare — kan ændres via manuel valg nedenfor.
                        </p>
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

  const filteredIngredients = fridaIngredients.filter((ingredient) =>
    ingredientNameMatchesQuery(ingredient.name, searchTerm)
  )

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