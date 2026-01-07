'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Utensils, Search, Filter, ChevronLeft } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'
import MobileRecipeFilterBar from '@/components/MobileRecipeFilterBar'
import { Recipe } from '@/types/recipe'

export default function FamilieRecipesPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [prepTimeFilter, setPrepTimeFilter] = useState<'all' | 'quick' | 'medium' | 'long'>('all')
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  // Load recipes on component mount
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        console.log('🔄 Loading familie recipes from API...')
        const response = await fetch('/api/recipes')
        
        if (response.ok) {
          const responseData = await response.json()
          const recipes = responseData.recipes || responseData
          console.log(`✅ Loaded ${recipes.length} recipes from API`)
          
          // Filter for familie/familiemad recipes
          // Tag name is "Familiemad" (capital F) according to recipe-tag-mapper.ts
          const familieRecipes = recipes.filter((recipe: Recipe) => {
            if (!recipe.dietaryCategories || !Array.isArray(recipe.dietaryCategories)) {
              return false
            }
            const hasFamilie = recipe.dietaryCategories.some(cat => {
              if (!cat) return false
              const catLower = cat.toLowerCase().trim()
              return catLower === 'familiemad' || 
                     catLower.includes('familiemad') ||
                     catLower === 'familie' ||
                     catLower.includes('familie') ||
                     catLower === 'family' ||
                     catLower.includes('family')
            })
            return hasFamilie
          })
          
          console.log(`👨‍👩‍👧‍👦 Found ${familieRecipes.length} familie recipes out of ${recipes.length} total`)
          if (familieRecipes.length === 0 && recipes.length > 0) {
            console.log('⚠️ No familie recipes found. Sample dietaryCategories from first 5 recipes:')
            recipes.slice(0, 5).forEach((r, i) => {
              console.log(`  Recipe ${i + 1} (${r.title}):`, r.dietaryCategories)
            })
          }
          setAllRecipes(familieRecipes)
          setFilteredRecipes(familieRecipes)
        } else {
          console.error('❌ Failed to load recipes:', response.status, response.statusText)
        }
      } catch (error) {
        console.error('❌ Error loading recipes:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipes()
  }, [])

  // Apply all filters
  useEffect(() => {
    let filtered = allRecipes || []

    // Search filter
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
  }, [searchQuery, prepTimeFilter, mealTypeFilter, allRecipes])

  // Get unique meal types from recipes
  const mealTypes = Array.from(
    new Set(allRecipes.map(r => r.mainCategory).filter(Boolean))
  ).sort()

  const clearFilters = () => {
    setPrepTimeFilter('all')
    setMealTypeFilter('all')
    setSearchQuery('')
  }

  const hasActiveFilters = prepTimeFilter !== 'all' || mealTypeFilter !== 'all' || searchQuery !== ''

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Indlæser familiemad opskrifter...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link 
              href="/familie"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Tilbage til Familiemad
            </Link>
            
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Utensils className="w-4 h-4" />
              Familiemad opskrifter
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Familiemad opskrifter –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                {filteredRecipes.length} opskrifter
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Find inspiration til dine familiemad måltider med vores store udvalg af gratis opskrifter,<br />
              der er nemme at lave og fulde af smag.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters Section */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="container">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Søg i familiemad opskrifter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter size={20} />
                Filtre
                {hasActiveFilters && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {[prepTimeFilter !== 'all', mealTypeFilter !== 'all', searchQuery !== ''].filter(Boolean).length}
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
                              ? 'bg-blue-600 text-white shadow-md'
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
                            ? 'bg-blue-600 text-white shadow-md'
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
                              ? 'bg-blue-600 text-white shadow-md'
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
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30 pb-24 md:pb-20">
        <div className="container">
          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredRecipes.map((recipe, index) => (
                <div
                  key={recipe.id}
                  className="transition-all duration-500 h-full"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <RecipeCard recipe={recipe} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {hasActiveFilters ? 'Ingen opskrifter fundet' : 'Ingen familiemad opskrifter endnu'}
              </h3>
              <p className="text-gray-600 mb-8">
                {hasActiveFilters
                  ? 'Prøv at justere dine filtre for at se flere opskrifter.'
                  : 'Vi arbejder på at tilføje flere familiemad opskrifter. Kom snart tilbage!'
                }
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                >
                  Ryd alle filtre
                </button>
              )}
            </div>
          )}
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
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </main>
  )
}
