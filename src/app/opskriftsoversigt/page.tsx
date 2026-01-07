'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search, Filter, ChevronDown, ChevronUp, Sparkles, Target, ArrowRight } from 'lucide-react'
import { recipeCategories, dietaryCategories } from '@/lib/sample-data'
import RecipeCard from '@/components/RecipeCard'
import MobileRecipeFilterBar from '@/components/MobileRecipeFilterBar'
import { useState, useEffect } from 'react'

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

// Extended dietary categories with images and 8th option - REORGANIZED
const extendedDietaryCategories = [
  {
    id: 'Familiemad',
    name: 'Familiemad',
    slug: 'familie',
    description: 'Almindelige familiemad opskrifter',
    color: 'bg-blue-500',
    icon: '👨‍👩‍👧‍👦',
    recipeCount: 450,
    imageUrl: '/images/categories/familie.webp',
    imageAlt: 'Familievenlige retter til hverdagen'
  },
  {
    id: 'Keto',
    name: 'Keto',
    slug: 'keto',
    description: 'Ketogene opskrifter til vægttab og sundhed',
    color: 'bg-purple-500',
    icon: '🥑',
    recipeCount: 712,
    imageUrl: '/images/categories/keto.webp',
    imageAlt: 'Keto mad med bacon, æg og grønne grøntsager'
  },
  {
    id: 'Sense',
    name: 'Sense',
    slug: 'sense',
    description: 'Sunde opskrifter baseret på danske kostråd',
    color: 'bg-green-500',
    icon: '✋',
    recipeCount: 445,
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
    recipeCount: 0,
    imageUrl: '/images/categories/glp-1.webp',
    imageAlt: 'GLP-1 kost med protein, fibre og sunde fedtstoffer'
  },
  {
    id: 'Meal prep',
    name: 'Meal prep',
    slug: 'meal-prep',
    description: 'Opskrifter til madplanlægning og forberedelse',
    color: 'bg-blue-500',
    icon: '📦',
    recipeCount: 234,
    imageUrl: '/images/categories/meal-prep.webp',
    imageAlt: 'Forberedte måltider og madplanlægning'
  },
  {
    id: 'Antiinflammatorisk',
    name: 'Antiinflammatorisk',
    slug: 'anti-inflammatory',
    description: 'Anti-inflammatoriske opskrifter til sundhed',
    color: 'bg-emerald-500',
    icon: '🌿',
    recipeCount: 156,
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
    recipeCount: 98,
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
    recipeCount: 123,
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
  const [showFloatingFilter, setShowFloatingFilter] = useState(false)

  // Track scroll position for floating filter button
  useEffect(() => {
    const handleScroll = () => {
      // Find the recipes section
      const recipesSection = document.getElementById('recipes-section')
      if (!recipesSection) return

      const rect = recipesSection.getBoundingClientRect()
      // Show floating button when recipes section is visible and user has scrolled past filters
      const filtersSection = document.getElementById('filters-section')
      if (filtersSection) {
        const filtersRect = filtersSection.getBoundingClientRect()
        // Show if recipes section is visible and filters section is above viewport
        setShowFloatingFilter(rect.top < window.innerHeight && filtersRect.bottom < 0)
      } else {
        setShowFloatingFilter(rect.top < window.innerHeight)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check on mount

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

    // Apply dietary filter
    if (selectedDietary !== 'all') {
      filtered = filtered.filter(recipe => {
        if (!recipe.dietaryCategories || !Array.isArray(recipe.dietaryCategories)) {
          return false
        }
        return recipe.dietaryCategories.some(cat => {
          if (!cat) return false
          const normalizedCat = cat.replace(/[\[\]]/g, '').trim()
          const normalizedSelected = selectedDietary.replace(/[\[\]]/g, '').trim()
          return normalizedCat.toLowerCase() === normalizedSelected.toLowerCase()
        })
      })
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
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-green-50/30 to-blue-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              Danmarks mest intelligente opskrifter
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Alle opskrifter til<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                din sundere livsstil
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Udforsk <strong>+2.509 gratis opskrifter</strong> beregnet på vitaminer og næring.<br />
              Vælg din mad-ideologi eller udforsk alle opskrifter.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                100% gratis • Alle beregnet på næring
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dietary Categories Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Vælg din vej
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Udforsk opskrifter, der passer til din livsstil – alle beregnet på vitaminer, mineraler og energi.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {extendedDietaryCategories && Array.isArray(extendedDietaryCategories) ? extendedDietaryCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/${category.slug}/opskrifter`}
                className="group bg-white border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.name === 'KETO' && '🥑'}
                  {category.name === 'SENSE' && '✋'}
                  {category.name === 'GLP-1 KOST' && '🧠'}
                  {category.name === 'ANTI-INFLAMMATORISK' && '🌿'}
                  {category.name === 'FLEKSITARISK' && '🥬'}
                  {category.name === '5:2 DIÆT' && '⏰'}
                  {category.name === 'FAMILIEMAD' && '👨‍👩‍👧‍👦'}
                  {category.name === 'MEAL PREP' && '📦'}
                  {category.name === 'MIDDELHAVSDIÆTEN' && '🐟'}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-2">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{category.recipeCount} opskrifter</p>
                <div className="text-xs text-gray-400 group-hover:text-green-500 transition-colors">
                  Klik for at udforske →
                </div>
              </Link>
            )) : null}
          </div>
          
        </div>
      </section>

      {/* Search and Filters Section */}
      <section id="filters-section" className="py-8 bg-white border-b border-gray-100">
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
                Filtre
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

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dietary Filter */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Mad ideologi
                    </label>
            <select
              value={selectedDietary}
              onChange={(e) => setSelectedDietary(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
            >
              <option value="all">Alle mad ideologier</option>
              {extendedDietaryCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

                  {/* Prep Time Filter */}
                <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Forbredelsestid
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
      <section id="recipes-section" className="py-20 pb-24 md:pb-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredRecipes.map((recipe, index) => (
                <div
                    key={recipe.id} 
                  className="transition-all duration-500 h-full"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <RecipeCard recipe={recipe} priority={index < 8} />
                </div>
              ))}
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
      <section className="py-20 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Klar til at komme i gang?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
                Udforsk +2.509 gratis opskrifter beregnet på vitaminer og næring
              </p>
              <div className="text-center text-green-600 font-medium group-hover:underline">
                Se alle →
              </div>
              </Link>

            {/* Card 2 */}
            <Link 
              href="/vægttab"
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