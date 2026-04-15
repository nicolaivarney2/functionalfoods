'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, ChevronLeft, Search, Filter, Target, Utensils } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'
import RecipeSignupMidGridCta, { buildRecipeSlotsWithMidCta } from '@/components/RecipeSignupMidGridCta'

export interface NicheRecipe {
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

function proteinrigRecipeTextBlob(recipe: NicheRecipe): string {
  const ing = (recipe.ingredients || []).map((i) => i.name).join(' ')
  const steps = (recipe.instructions || []).map((i) => i.instruction).join(' ')
  return [
    recipe.title,
    recipe.description,
    recipe.shortDescription,
    ...(recipe.keywords || []),
    ...(recipe.subCategories || []),
    ...(recipe.dietaryCategories || []),
    ing,
    steps,
  ]
    .join(' ')
    .toLowerCase()
}

/** Opskrifter hvor kalkun er den dominerende proteinkilde (dansk hverdag: skal kunne filtreres fra kylling). */
function proteinrigRecipeHasKalkun(recipe: NicheRecipe): boolean {
  const t = proteinrigRecipeTextBlob(recipe)
  return /\bkalkun\b/.test(t) || t.includes('turkey')
}

type ThemeKey =
  | 'purpleGreen'
  | 'tealGreen'
  | 'greenTeal'
  | 'emeraldGreen'
  | 'amberOrange'
  | 'orangeGreen'

const THEME: Record<
  ThemeKey,
  {
    link: string
    badgeBg: string
    titleGradient: string
    dot: string
    focusRing: string
    filterActive: string
    filterActiveHover: string
    sectionBg: string
    hero: string
    heroTint: string
    ctaGradient: string
    ctaSpan: string
    ctaP: string
    loadingBorder: string
    emptyBtn: string
    ctaPrimaryButtonText: string
  }
> = {
  purpleGreen: {
    link: 'text-purple-600 hover:text-purple-700',
    badgeBg: 'bg-purple-100 text-purple-800',
    titleGradient: 'from-purple-600 to-green-600',
    dot: 'bg-purple-500',
    focusRing: 'focus:ring-purple-500 focus:border-purple-500',
    filterActive: 'bg-purple-600',
    filterActiveHover: 'hover:bg-purple-700',
    sectionBg: 'to-purple-50/30',
    hero: 'from-white via-purple-50/30 to-green-50/20',
    heroTint: 'from-purple-500/5 to-green-500/5',
    ctaGradient: 'from-purple-600 to-green-600',
    ctaSpan: 'text-purple-200',
    ctaP: 'text-purple-100',
    loadingBorder: 'border-purple-600',
    emptyBtn: 'bg-purple-600 hover:bg-purple-700',
    ctaPrimaryButtonText: 'text-purple-600',
  },
  tealGreen: {
    link: 'text-teal-600 hover:text-teal-700',
    badgeBg: 'bg-teal-100 text-teal-800',
    titleGradient: 'from-teal-600 to-green-600',
    dot: 'bg-teal-500',
    focusRing: 'focus:ring-teal-500 focus:border-teal-500',
    filterActive: 'bg-teal-600',
    filterActiveHover: 'hover:bg-teal-700',
    sectionBg: 'to-teal-50/30',
    hero: 'from-white via-teal-50/30 to-green-50/20',
    heroTint: 'from-teal-500/5 to-green-500/5',
    ctaGradient: 'from-teal-600 to-green-600',
    ctaSpan: 'text-teal-200',
    ctaP: 'text-teal-100',
    loadingBorder: 'border-teal-600',
    emptyBtn: 'bg-teal-600 hover:bg-teal-700',
    ctaPrimaryButtonText: 'text-teal-600',
  },
  greenTeal: {
    link: 'text-green-600 hover:text-green-700',
    badgeBg: 'bg-green-100 text-green-800',
    titleGradient: 'from-green-600 to-teal-600',
    dot: 'bg-green-500',
    focusRing: 'focus:ring-green-500 focus:border-green-500',
    filterActive: 'bg-green-600',
    filterActiveHover: 'hover:bg-green-700',
    sectionBg: 'to-green-50/30',
    hero: 'from-white via-green-50/30 to-teal-50/20',
    heroTint: 'from-green-500/5 to-teal-500/5',
    ctaGradient: 'from-green-600 to-teal-600',
    ctaSpan: 'text-green-200',
    ctaP: 'text-green-100',
    loadingBorder: 'border-green-600',
    emptyBtn: 'bg-green-600 hover:bg-green-700',
    ctaPrimaryButtonText: 'text-green-600',
  },
  emeraldGreen: {
    link: 'text-emerald-600 hover:text-emerald-700',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    titleGradient: 'from-emerald-600 to-green-600',
    dot: 'bg-emerald-500',
    focusRing: 'focus:ring-emerald-500 focus:border-emerald-500',
    filterActive: 'bg-emerald-600',
    filterActiveHover: 'hover:bg-emerald-700',
    sectionBg: 'to-emerald-50/30',
    hero: 'from-white via-emerald-50/30 to-green-50/20',
    heroTint: 'from-emerald-500/5 to-green-500/5',
    ctaGradient: 'from-emerald-600 to-green-600',
    ctaSpan: 'text-emerald-200',
    ctaP: 'text-emerald-100',
    loadingBorder: 'border-emerald-600',
    emptyBtn: 'bg-emerald-600 hover:bg-emerald-700',
    ctaPrimaryButtonText: 'text-emerald-600',
  },
  amberOrange: {
    link: 'text-amber-600 hover:text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800',
    titleGradient: 'from-amber-600 to-orange-600',
    dot: 'bg-amber-500',
    focusRing: 'focus:ring-amber-500 focus:border-amber-500',
    filterActive: 'bg-amber-600',
    filterActiveHover: 'hover:bg-amber-700',
    sectionBg: 'to-amber-50/30',
    hero: 'from-white via-amber-50/30 to-orange-50/20',
    heroTint: 'from-amber-500/5 to-orange-500/5',
    ctaGradient: 'from-amber-600 to-orange-600',
    ctaSpan: 'text-amber-200',
    ctaP: 'text-amber-100',
    loadingBorder: 'border-amber-600',
    emptyBtn: 'bg-amber-600 hover:bg-amber-700',
    ctaPrimaryButtonText: 'text-amber-600',
  },
  orangeGreen: {
    link: 'text-orange-600 hover:text-orange-700',
    badgeBg: 'bg-orange-100 text-orange-800',
    titleGradient: 'from-orange-600 to-green-600',
    dot: 'bg-orange-500',
    focusRing: 'focus:ring-orange-500 focus:border-orange-500',
    filterActive: 'bg-orange-600',
    filterActiveHover: 'hover:bg-orange-700',
    sectionBg: 'to-orange-50/30',
    hero: 'from-white via-orange-50/30 to-green-50/20',
    heroTint: 'from-orange-500/5 to-green-500/5',
    ctaGradient: 'from-orange-600 to-green-600',
    ctaSpan: 'text-orange-200',
    ctaP: 'text-orange-100',
    loadingBorder: 'border-orange-600',
    emptyBtn: 'bg-orange-600 hover:bg-orange-700',
    ctaPrimaryButtonText: 'text-orange-600',
  },
}

export interface NicheDietRecipesClientProps {
  dietQueryParam: string
  backHref: string
  backLabel: string
  badgeLabel: string
  heroTitle: string
  heroDescription: string
  heroFootnote?: string
  searchPlaceholder: string
  loadingMessage: string
  emptyEmoji: string
  emptyTitleNoFilters: string
  emptyBodyNoFilters: string
  theme: ThemeKey
  badgeIcon?: 'target' | 'utensils'
  ctaTitleLine1: string
  ctaTitleLine2: string
  ctaBody: string
  ctaPrimaryHref: string
  ctaPrimaryLabel: string
}

export default function NicheDietRecipesClient({
  dietQueryParam,
  backHref,
  backLabel,
  badgeLabel,
  heroTitle,
  heroDescription,
  heroFootnote,
  searchPlaceholder,
  loadingMessage,
  emptyEmoji,
  emptyTitleNoFilters,
  emptyBodyNoFilters,
  theme,
  badgeIcon = 'utensils',
  ctaTitleLine1,
  ctaTitleLine2,
  ctaBody,
  ctaPrimaryHref,
  ctaPrimaryLabel,
}: NicheDietRecipesClientProps) {
  const t = THEME[theme]
  const [isVisible, setIsVisible] = useState(false)
  const [allRecipes, setAllRecipes] = useState<NicheRecipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<NicheRecipe[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [prepTimeFilter, setPrepTimeFilter] = useState<'all' | 'quick' | 'medium' | 'long'>('all')
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all')
  const [poultryFilter, setPoultryFilter] = useState<'all' | 'kylling' | 'kalkun'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const showPoultrySplit = dietQueryParam === 'proteinrig'

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const qs = encodeURIComponent(dietQueryParam)
        const response = await fetch(`/api/recipes?diet=${qs}`)
        if (response.ok) {
          const responseData = await response.json()
          const recipes = responseData.recipes || responseData
          setAllRecipes(recipes)
          setFilteredRecipes(recipes)
        }
      } catch (error) {
        console.error('Error loading niche recipes:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadRecipes()
  }, [dietQueryParam])

  useEffect(() => {
    let filtered = allRecipes || []
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((recipe) => {
        if (recipe.title.toLowerCase().includes(query)) return true
        if (recipe.description?.toLowerCase().includes(query)) return true
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          if (recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(query))) {
            return true
          }
        }
        return false
      })
    }
    if (prepTimeFilter !== 'all') {
      filtered = filtered.filter((recipe) => {
        const total = recipe.totalTime || (recipe.preparationTime || 0) + (recipe.cookingTime || 0)
        if (prepTimeFilter === 'quick') return total <= 30
        if (prepTimeFilter === 'medium') return total > 30 && total <= 60
        if (prepTimeFilter === 'long') return total > 60
        return true
      })
    }
    if (mealTypeFilter !== 'all') {
      filtered = filtered.filter((recipe) => {
        const mainCat = (recipe.mainCategory || '').toLowerCase()
        const filterLower = mealTypeFilter.toLowerCase()
        return mainCat.includes(filterLower) || filterLower.includes(mainCat)
      })
    }
    if (showPoultrySplit && poultryFilter !== 'all') {
      filtered = filtered.filter((recipe) => {
        const hasKalkun = proteinrigRecipeHasKalkun(recipe)
        if (poultryFilter === 'kalkun') return hasKalkun
        return !hasKalkun
      })
    }
    setFilteredRecipes(filtered)
  }, [searchQuery, prepTimeFilter, mealTypeFilter, poultryFilter, showPoultrySplit, allRecipes])

  const mealTypes = Array.from(new Set(allRecipes.map((r) => r.mainCategory).filter(Boolean))).sort()

  const clearFilters = () => {
    setPrepTimeFilter('all')
    setMealTypeFilter('all')
    setPoultryFilter('all')
    setSearchQuery('')
  }

  const hasActiveFilters =
    prepTimeFilter !== 'all' ||
    mealTypeFilter !== 'all' ||
    searchQuery !== '' ||
    (showPoultrySplit && poultryFilter !== 'all')

  const BadgeIcon = badgeIcon === 'target' ? Target : Utensils

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container py-24">
          <div className="text-center">
            <div
              className={`animate-spin rounded-full h-12 w-12 border-b-2 ${t.loadingBorder} mx-auto mb-4`}
            />
            <p className="text-gray-600">{loadingMessage}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className={`relative bg-gradient-to-br ${t.hero} py-24 lg:py-32`}>
        <div className="absolute inset-0 opacity-40">
          <div className={`absolute inset-0 bg-gradient-to-r ${t.heroTint}`} />
        </div>
        <div className="container relative">
          <div
            className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <Link href={backHref} className={`inline-flex items-center gap-2 ${t.link} font-medium mb-6 transition-colors`}>
              <ChevronLeft className="w-4 h-4" />
              {backLabel}
            </Link>
            <div className={`inline-flex items-center gap-2 ${t.badgeBg} px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse`}>
              <BadgeIcon className="w-4 h-4" />
              {badgeLabel}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              {heroTitle}
              <br />
              <span className={`text-transparent bg-clip-text bg-gradient-to-r ${t.titleGradient}`}>
                {filteredRecipes.length} opskrifter
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">{heroDescription}</p>
            {heroFootnote ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <div className={`w-2 h-2 ${t.dot} rounded-full animate-pulse`} />
                  {heroFootnote}
                </div>
              </div>
            ) : (
              <div className="mb-12" />
            )}
          </div>
        </div>
      </section>

      <section className="py-8 bg-white border-b border-gray-100">
        <div className="container">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 ${t.focusRing} transition-all duration-200`}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  showFilters || hasActiveFilters
                    ? `${t.filterActive} text-white ${t.filterActiveHover}`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter size={20} />
                <span className="md:hidden">Filtre</span>
                <span className="hidden md:inline">Flere filtre</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {
                      [
                        prepTimeFilter !== 'all',
                        mealTypeFilter !== 'all',
                        searchQuery !== '',
                        showPoultrySplit && poultryFilter !== 'all',
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Ryd filtre
                </button>
              )}
            </div>

            {showFilters && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Forberedelsestid</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'Alle' },
                        { value: 'quick', label: 'Under 30 min' },
                        { value: 'medium', label: '30-60 min' },
                        { value: 'long', label: 'Over 60 min' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPrepTimeFilter(option.value as 'all' | 'quick' | 'medium' | 'long')}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            prepTimeFilter === option.value
                              ? `${t.filterActive} text-white shadow-md`
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Måltidstype</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setMealTypeFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          mealTypeFilter === 'all'
                            ? `${t.filterActive} text-white shadow-md`
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        Alle
                      </button>
                      {mealTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setMealTypeFilter(type)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            mealTypeFilter === type
                              ? `${t.filterActive} text-white shadow-md`
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {showPoultrySplit ? (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Fjerkræ (filtrér kylling og kalkun hver for sig)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      Mange proteinrige opskrifter bruger kylling i hverdagen. Her kan du skjule kalkunopskrifter, hvis du
                      helst vil se kylling og alt andet.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { value: 'all' as const, label: 'Alle' },
                          { value: 'kylling' as const, label: 'Uden kalkun' },
                          { value: 'kalkun' as const, label: 'Kun kalkun' },
                        ] as const
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPoultryFilter(option.value)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            poultryFilter === option.value
                              ? `${t.filterActive} text-white shadow-md`
                              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="text-center text-sm text-gray-600">
              Viser {filteredRecipes.length} af {allRecipes.length} opskrifter
            </div>
          </div>
        </div>
      </section>

      <section className={`py-20 bg-gradient-to-br from-gray-50 ${t.sectionBg}`}>
        <div className="container">
          {filteredRecipes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {buildRecipeSlotsWithMidCta(filteredRecipes, 30).map((slot) =>
                slot.type === 'cta' ? (
                  <RecipeSignupMidGridCta key="niche-recipe-grid-signup-cta" />
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
              <div className="text-6xl mb-4">{emptyEmoji}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {hasActiveFilters ? 'Ingen opskrifter fundet' : emptyTitleNoFilters}
              </h3>
              <p className="text-gray-600 mb-8">
                {hasActiveFilters ? 'Prøv at justere dine filtre for at se flere opskrifter.' : emptyBodyNoFilters}
              </p>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className={`px-6 py-3 ${t.emptyBtn} text-white rounded-xl font-medium transition-colors`}>
                  Ryd alle filtre
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section className={`py-20 bg-gradient-to-r ${t.ctaGradient} relative overflow-hidden`}>
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5" />
        </div>
        <div className="container relative">
          <div
            className={`text-center transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              {ctaTitleLine1}
              <br />
              <span className={t.ctaSpan}>{ctaTitleLine2}</span>
            </h2>
            <p className={`text-xl ${t.ctaP} mb-12 max-w-3xl mx-auto`}>{ctaBody}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href={ctaPrimaryHref}
                className={`group bg-white ${t.ctaPrimaryButtonText} px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2`}
              >
                {ctaPrimaryLabel}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/opskriftsoversigt"
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Alle opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
