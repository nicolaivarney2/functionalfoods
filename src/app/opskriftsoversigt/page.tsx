'use client'

import Link from 'next/link'
import { Search, Filter, Sparkles } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'
import MobileRecipeFilterBar from '@/components/MobileRecipeFilterBar'
import RecipeSignupMidGridCta, { buildRecipeSlotsWithMidCta } from '@/components/RecipeSignupMidGridCta'
import { useState, useEffect, useMemo } from 'react'
import { recipeMatchesOverviewCategory } from '@/lib/recipe-diet-matcher'

interface Recipe {
  id: string
  title: string
  slug: string
  description: string
  shortDescription: string
  imageUrl: string
  imageAlt: string
  preparationTime: number
  cookingTime: number
  totalTime: number
  servings: number
  difficulty: 'Nem' | 'Mellem' | 'Svær'
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  dietaryCategories: string[]
  mainCategory: string
  subCategories: string[]
  ingredients: Array<{
    id: string
    name: string
    amount: number
    unit: string
    notes?: string
  }>
  instructions: Array<{
    id: string
    stepNumber: number
    instruction: string
    time?: number
    tips?: string
  }>
  publishedAt: Date
  updatedAt: Date
  metaTitle: string
  metaDescription: string
  keywords: string[]
  author: string
}

// Extended dietary categories — Keto først (mest populær)
const extendedDietaryCategories = [
  {
    id: 'Keto',
    name: 'Keto',
    slug: 'keto',
    description: 'Ketogene opskrifter til vægttab og sundhed',
    color: 'bg-purple-500',
    icon: '🥑',
    imageUrl: '/images/categories/keto.webp',
    imageAlt: 'Keto mad med bacon, æg og grønne grøntsager'
  },
  {
    id: 'Familiemad',
    name: 'Kalorietælling',
    slug: 'familie',
    description: 'Normal familiemad med planlagte kalorier og fuld næring',
    color: 'bg-blue-500',
    icon: '👨‍👩‍👧‍👦',
    imageUrl: '/images/categories/familie.webp',
    imageAlt: 'Familievenlige retter til hverdagen'
  },
  {
    id: 'Sense',
    name: 'Sense',
    slug: 'sense',
    description: 'Sunde opskrifter baseret på danske kostråd',
    color: 'bg-green-500',
    icon: '✋',
    imageUrl: '/images/categories/sense.webp',
    imageAlt: 'Sunde danske retter med rugbrød og grønne grøntsager'
  },
  {
    id: 'GLP-1 kost',
    name: 'GLP-1 kost',
    slug: 'glp-1',
    description: 'Naturligt vægttab med maksimal mæthed',
    color: 'bg-blue-500',
    icon: '🧠',
    imageUrl: '/images/categories/glp-1.webp',
    imageAlt: 'GLP-1 kost med protein, fibre og sunde fedtstoffer'
  },
  {
    id: 'Proteinrig kost',
    name: 'Proteinrig kost',
    slug: 'proteinrig-kost',
    description: 'Proteinrige opskrifter til optimal næring',
    color: 'bg-blue-500',
    icon: '💪',
    imageUrl: '/images/categories/proteinrig-kost.webp',
    imageAlt: 'Proteinrige opskrifter til optimal næring'
  },
  {
    id: 'Antiinflammatorisk',
    name: 'Antiinflammatorisk',
    slug: 'anti-inflammatory',
    description: 'Anti-inflammatoriske opskrifter til sundhed',
    color: 'bg-emerald-500',
    icon: '🌿',
    imageUrl: '/images/categories/anti-inflammatory.webp',
    imageAlt: 'Anti-inflammatoriske retter med grønne grøntsager og omega-3'
  },
  {
    id: 'Fleksitarisk',
    name: 'Fleksitarisk',
    slug: 'flexitarian',
    description: 'Fleksitariske opskrifter med fokus på planter',
    color: 'bg-teal-500',
    icon: '🥬',
    imageUrl: '/images/categories/flexitarian.webp',
    imageAlt: 'Fleksitariske retter med planter og lidt kød'
  },
  {
    id: '5:2',
    name: '5:2 Diæt',
    slug: '5-2-diet',
    description: 'Opskrifter til 5:2 intermittent fasting',
    color: 'bg-amber-500',
    icon: '⏰',
    imageUrl: '/images/categories/5-2-diet.webp',
    imageAlt: 'Sunde måltider til 5:2 diæt og intermittent fasting'
  }
]

export default function RecipeOverviewPage() {
  // State for recipes and filters
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  
  // State for filters and pagination
  const [selectedDietary, setSelectedDietary] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [prepTimeFilter, setPrepTimeFilter] = useState<'all' | 'quick' | 'medium' | 'long'>('all')
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load recipes on component mount
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        console.log('🔄 Loading recipes from API...')
        const response = await fetch('/api/recipes')
        console.log('📡 Response status:', response.status)
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (response.ok) {
          const responseData = await response.json()
          const recipes = responseData.recipes || responseData // Handle both old and new API formats
          console.log(`✅ Loaded ${recipes.length} recipes from API`)
          console.log('📋 First recipe:', recipes[0])
          setAllRecipes(recipes)
        } else {
          console.error('❌ Failed to load recipes:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('❌ Error response:', errorText)
        }
      } catch (error) {
        console.error('❌ Error loading recipes:', error)
        console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipes()
  }, [])

  const categoryRecipeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of extendedDietaryCategories) {
      counts[cat.id] = allRecipes.filter((r) => recipeMatchesOverviewCategory(r, cat.id)).length
    }
    return counts
  }, [allRecipes])

  // Tæl opskrifter pr. måltidstype (mainCategory) til de synlige filter-chips
  const mealTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const recipe of allRecipes) {
      const type = recipe.mainCategory
      if (!type) continue
      counts[type] = (counts[type] || 0) + 1
    }
    return counts
  }, [allRecipes])

  // Apply filters when dependencies change
  useEffect(() => {
    let filtered = allRecipes || []

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(recipe => {
        if (recipe.title.toLowerCase().includes(query)) {
          return true
        }
        if (recipe.description?.toLowerCase().includes(query)) {
          return true
        }
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          if (recipe.ingredients.some(ingredient =>
            ingredient.name.toLowerCase().includes(query)
          )) {
            return true
          }
        }
        return false
      })
    }

    // Apply dietary filter (same rules as category counts — Familiemad, aliases, slugs)
    if (selectedDietary !== 'all') {
      filtered = filtered.filter((recipe) => recipeMatchesOverviewCategory(recipe, selectedDietary))
    }

    // Prep time filter
    if (prepTimeFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        const total = recipe.totalTime || (recipe.preparationTime || 0) + (recipe.cookingTime || 0)
        if (prepTimeFilter === 'quick') return total <= 30
        if (prepTimeFilter === 'medium') return total > 30 && total <= 60
        if (prepTimeFilter === 'long') return total > 60
        return true
      })
    }

    // Meal type filter
    if (mealTypeFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        const mainCat = (recipe.mainCategory || '').toLowerCase()
        const filterLower = mealTypeFilter.toLowerCase()
        return mainCat.includes(filterLower) || filterLower.includes(mainCat)
      })
    }

    setFilteredRecipes(filtered)
  }, [allRecipes, searchQuery, selectedDietary, prepTimeFilter, mealTypeFilter])

  // Get unique meal types from recipes
  const mealTypes = Array.from(
    new Set(allRecipes.map(r => r.mainCategory).filter(Boolean))
  ).sort()

  const clearFilters = () => {
    setPrepTimeFilter('all')
    setMealTypeFilter('all')
    setSearchQuery('')
    setSelectedDietary('all')
  }

  const hasActiveFilters = prepTimeFilter !== 'all' || mealTypeFilter !== 'all' || searchQuery !== '' || selectedDietary !== 'all'

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600">Indlæser opskrifter...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero — kompakt så opskrifter kommer hurtigere i syne */}
      <section className="relative bg-gradient-to-br from-white via-green-50/30 to-blue-50/20 py-8 md:py-10">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
        </div>

        <div className="container relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Danmarks mest intelligente opskrifter
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900 leading-tight">
              Alle opskrifter til{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                din sundere livsstil
              </span>
            </h1>

            <p className="text-base md:text-lg text-gray-600 leading-snug mb-2">
              Udforsk{' '}
              <strong>{allRecipes.length.toLocaleString('da-DK')} gratis opskrifter</strong> beregnet på vitaminer og næring.
            </p>
            <p className="text-sm text-gray-500">
              100% gratis · Listen nedenfor er blandet fra alle mad-ideologier — vælg din retning først, hvis du kun vil have fx. keto eller Sense.
            </p>
          </div>
        </div>
      </section>

      {/* Vælg mad-ideologi — små bokse på mobil, større på desktop */}
      <section className="py-5 md:py-10 bg-white border-b border-gray-100">
        <div className="container">
          <div className="text-center mb-4 md:mb-7 max-w-2xl mx-auto">
            <h2 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 text-gray-900">
              Vælg din vej
            </h2>
            <p className="text-xs md:text-base text-gray-600 px-1">
              Gå ind på din mad-ideologi for kun de opskrifter — eller scroll ned og filtrér i den blandede oversigt.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:grid-cols-4 md:gap-4">
            {extendedDietaryCategories.map((category) => {
              const count = categoryRecipeCounts[category.id] ?? 0
              return (
                <Link
                  key={category.id}
                  href={`/${category.slug}/opskrifter`}
                  aria-label={`${category.name}, ${count.toLocaleString('da-DK')} opskrifter — kun denne mad-ideologi`}
                  className="group flex flex-col items-center justify-center bg-white border border-gray-100 md:border-2 rounded-lg md:rounded-xl p-2 md:p-5 text-center min-h-0 hover:border-green-200 hover:shadow-md md:hover:shadow-lg md:hover:shadow-green-500/10 transition-all duration-200"
                >
                  <span
                    className="text-xl md:text-3xl leading-none mb-1 md:mb-2 group-hover:scale-105 transition-transform duration-200"
                    aria-hidden
                  >
                    {category.icon}
                  </span>
                  <h3 className="text-[10px] sm:text-[11px] md:text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors leading-tight line-clamp-2 w-full">
                    {category.name}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 tabular-nums">
                    {count.toLocaleString('da-DK')}
                    <span className="md:hidden"> opskr.</span>
                    <span className="hidden md:inline"> opskrifter</span>
                  </p>
                  <span className="hidden md:inline text-xs text-gray-400 group-hover:text-green-600 transition-colors mt-1">
                    Kun {category.name.toLowerCase()} →
                  </span>
                  <span className="md:hidden text-[9px] text-gray-400 group-hover:text-green-600 mt-0.5" aria-hidden>
                    →
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section id="filters-section" className="py-4 md:py-5 bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="container">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                  placeholder="Søg i alle opskrifter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
              />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  showFilters || hasActiveFilters
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter size={20} />
                <span className="md:hidden">Filtre</span>
                <span className="hidden md:inline">Flere filtre</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {[prepTimeFilter !== 'all', mealTypeFilter !== 'all', searchQuery !== '', selectedDietary !== 'all'].filter(Boolean).length}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Ryd filtre
                </button>
              )}
            </div>

            {/* Måltidstype — synligt på mobil og desktop */}
            {mealTypes.length > 0 && (
              <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm ring-1 ring-slate-100">
                <p className="mb-2 text-xs font-semibold text-slate-600">Måltidstype</p>
                <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                  <button
                    type="button"
                    onClick={() => setMealTypeFilter('all')}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                      mealTypeFilter === 'all'
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    Alle
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                      mealTypeFilter === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {allRecipes.length}
                    </span>
                  </button>
                  {mealTypes.map((type) => {
                    const active = mealTypeFilter === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMealTypeFilter(type)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                          active
                            ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <span className="max-w-[10rem] truncate sm:max-w-none">{type}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                            active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {mealTypeCounts[type] ?? 0}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Desktop/tablet: nicher som primære filtre (ikke skjult i dropdown) */}
            <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm ring-1 ring-slate-100">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Filtrér i den blandede liste</p>
                <span className="text-xs text-slate-500">Eller vælg en kategori ovenfor for kun den mad-ideologi</span>
              </div>

              {/* Mad-ideologi */}
              <p className="mb-2 text-xs font-semibold text-slate-600">Mad-ideologi</p>
              <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
                <button
                  type="button"
                  onClick={() => setSelectedDietary('all')}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                    selectedDietary === 'all'
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                >
                  Alle
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                    selectedDietary === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {allRecipes.length}
                  </span>
                </button>
                {extendedDietaryCategories.map((cat) => {
                  const n = categoryRecipeCounts[cat.id] ?? 0
                  const active = selectedDietary === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedDietary(cat.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span aria-hidden>{cat.icon}</span>
                      <span className="max-w-[10rem] truncate sm:max-w-none">{cat.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
                          active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {n}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <p className="mb-4 text-sm font-semibold text-slate-700">
                  Flere filtre: forberedelsestid og måltidstype
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dietary: kun på mobil (desktop bruger chips ovenfor) */}
                  <div className="md:hidden">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Mad ideologi</label>
                    <select
                      value={selectedDietary}
                      onChange={(e) => setSelectedDietary(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    >
                      <option value="all">Alle mad ideologier</option>
                      {extendedDietaryCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Prep Time Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Forberedelsestid
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'Alle' },
                        { value: 'quick', label: 'Under 30 min' },
                        { value: 'medium', label: '30-60 min' },
                        { value: 'long', label: 'Over 60 min' },
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setPrepTimeFilter(option.value as any)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            prepTimeFilter === option.value
                              ? 'bg-green-600 text-white shadow-md'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                </div>
                
                  {/* Meal Type Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Måltidstype
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setMealTypeFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          mealTypeFilter === 'all'
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        Alle
                      </button>
                      {mealTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => setMealTypeFilter(type)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            mealTypeFilter === type
                              ? 'bg-green-600 text-white shadow-md'
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="text-center text-sm text-gray-600">
              Viser {filteredRecipes.length} af {allRecipes.length} opskrifter
            </div>
          </div>
        </div>
      </section>

      {/* Recipes Grid */}
      <section id="recipes-section" className="py-6 md:py-8 pb-24 md:pb-16 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          {selectedDietary === 'all' && (
            <div className="mb-5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-center text-sm text-amber-950">
              <strong>Blandet oversigt:</strong> Opskrifterne herunder kommer fra alle mad-ideologier.
              Vil du kun have keto, Sense, GLP-1 eller andet?{' '}
              <span className="text-amber-900">Vælg en kategori ovenfor</span> eller brug filtrene.
            </div>
          )}
          {selectedDietary !== 'all' && (
            <div className="mb-5 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-center text-sm text-emerald-950">
              Viser opskrifter til{' '}
              <strong>
                {extendedDietaryCategories.find((c) => c.id === selectedDietary)?.name ?? selectedDietary}
              </strong>
              .{' '}
              <button
                type="button"
                onClick={() => setSelectedDietary('all')}
                className="font-medium text-emerald-700 underline-offset-2 hover:underline"
              >
                Vis alle mad-ideologier
              </button>
            </div>
          )}
          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {buildRecipeSlotsWithMidCta(filteredRecipes, 30).map((slot) =>
                slot.type === 'cta' ? (
                  <RecipeSignupMidGridCta key="recipe-grid-signup-cta" />
                ) : (
                  <div
                    key={slot.recipe.id}
                    className="transition-all duration-500 h-full"
                    style={{ transitionDelay: `${Math.min(slot.listIndex, 20) * 50}ms` }}
                  >
                    <RecipeCard recipe={slot.recipe} priority={slot.listIndex < 8} />
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {hasActiveFilters ? 'Ingen opskrifter fundet' : 'Ingen opskrifter endnu'}
              </h3>
              <p className="text-gray-600 mb-8">
                {hasActiveFilters
                  ? 'Prøv at justere dine filtre for at se flere opskrifter.'
                  : 'Vi arbejder på at tilføje flere opskrifter. Kom snart tilbage!'
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium transition-colors"
                >
                  Ryd alle filtre
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-14 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">
              Klar til at komme i gang?
            </h2>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              Udforsk vores opskrifter, lær om vægttab, eller få din personlige AI-madplan
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Card 1 */}
            <Link 
              href="/opskriftsoversigt"
              className="group bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="text-5xl mb-4 text-center">🍽️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center group-hover:text-green-600 transition-colors">
                Alle opskrifter
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Udforsk {allRecipes.length.toLocaleString('da-DK')} gratis opskrifter beregnet på vitaminer og næring
              </p>
              <div className="text-center text-green-600 font-medium group-hover:underline">
                Se alle →
              </div>
              </Link>

            {/* Card 2 */}
            <Link 
              href="/vaegttab"
              className="group bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="text-5xl mb-4 text-center">📚</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center group-hover:text-green-600 transition-colors">
                Lær om vægttab
              </h3>
              <p className="text-gray-600 text-center mb-4">
                Videnskabelig vejledning til varigt vægttab gennem kost
              </p>
              <div className="text-center text-green-600 font-medium group-hover:underline">
                Læs mere →
            </div>
            </Link>

            {/* Card 3 */}
            <Link 
              href="/premium"
              className="group bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl p-8 border-2 border-green-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="text-5xl mb-4 text-center">✨</div>
              <h3 className="text-xl font-bold text-white mb-3 text-center">
                AI-madplaner
              </h3>
              <p className="text-green-50 text-center mb-4">
                Få personlige madplaner skræddersyet til dig og din familie
              </p>
              <div className="text-center text-white font-medium group-hover:underline">
                Prøv gratis →
              </div>
              </Link>
          </div>
        </div>
      </section>

      {/* Mobile Filter Bar */}
      <MobileRecipeFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        prepTimeFilter={prepTimeFilter}
        onPrepTimeChange={setPrepTimeFilter}
        mealTypeFilter={mealTypeFilter}
        onMealTypeChange={setMealTypeFilter}
        mealTypes={mealTypes}
        selectedDietary={selectedDietary}
        onDietaryChange={setSelectedDietary}
        dietaryCategories={extendedDietaryCategories.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: cat.icon
        }))}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </main>
  )
} 