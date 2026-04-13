'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowRight, Sparkles, Target, Zap, Brain, TrendingDown, Leaf, FileText, Calculator, Calendar, Building2, ChevronDown, Search, ChevronRight } from 'lucide-react'
import { Recipe } from '@/types/recipe'
import HeroVideo from '@/components/home/HeroVideo'

// Updated hero section with recipe focus and new design

export default function Home() {
  /** Altid synligt: opacity-0 ved første render gjorde siden “tom” hvis JS var langsom eller fejlede */
  const isVisible = true
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [latestRecipes, setLatestRecipes] = useState<Recipe[]>([])
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState<Recipe[]>([])

  // Load all recipes for search
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const response = await fetch('/api/recipes')
        if (response.ok) {
          const data = await response.json()
          const recipes = data.recipes || data
          setAllRecipes(recipes)
          // Get latest 6 recipes
          setLatestRecipes(recipes.slice(0, 6))
        }
      } catch (error) {
        console.error('Error loading recipes:', error)
      } finally {
        setIsLoadingRecipes(false)
      }
    }
    loadRecipes()
  }, [])

  // Handle search input change
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = allRecipes.filter(recipe => 
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 6)
      setSearchResults(filtered)
      setShowSearchDropdown(true)
    } else {
      setSearchResults([])
      setShowSearchDropdown(false)
    }
  }, [searchQuery, allRecipes])

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/opskriftsoversigt?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  // Get recipe category name
  const getRecipeCategory = (recipe: Recipe): string => {
    const first =
      recipe.dietaryCategories?.find((c): c is string => typeof c === 'string' && c.trim() !== '') ??
      null
    if (first) {
      const category = first
      const categoryMap: { [key: string]: string } = {
        'keto': 'Keto',
        'sense': 'Sense',
        'glp-1': 'GLP-1 kost',
        'glp1': 'GLP-1 kost',
        'anti-inflammatory': 'Anti-inflammatorisk',
        'flexitarian': 'Fleksitarisk',
        '5-2-diet': '5:2 Diæt',
        'family': 'Familiemad',
        'proteinrig-kost': 'Proteinrig kost',
        'meal-prep': 'Proteinrig kost' // Legacy mapping
      }
      return categoryMap[category.toLowerCase()] || category
    }
    return 'Opskrifter'
  }

  const getCategoryHref = (recipe: Recipe): string => {
    const raw = recipe.dietaryCategories?.find((c): c is string => typeof c === 'string' && c.trim() !== '')
    if (raw) {
      const category = raw.toLowerCase()
      const hrefMap: { [key: string]: string } = {
        'keto': '/keto/opskrifter',
        'sense': '/sense/opskrifter',
        'glp-1': '/GLP-1/opskrifter',
        'glp1': '/GLP-1/opskrifter',
        'anti-inflammatory': '/anti-inflammatory/opskrifter',
        'flexitarian': '/flexitarian/opskrifter',
        '5-2-diet': '/5-2-diet/opskrifter',
        'family': '/familie/opskrifter',
        'proteinrig-kost': '/proteinrig-kost/opskrifter',
        'meal-prep': '/proteinrig-kost/opskrifter' // Legacy mapping
      }
      return hrefMap[category] || '/opskriftsoversigt'
    }
    return '/opskriftsoversigt'
  }

  const faqs = [
    {
      question: 'Skal jeg tælle kalorier?',
      answer: 'Nej, men det hjælper at forstå dem. FunctionalFoods viser dig ikke kun kalorier, men også alle næringsstoffer, så du kan se det fulde billede af det, du spiser.'
    },
    {
      question: 'Kan jeg tabe mig uden Keto?',
      answer: 'Ja! Alle kostretninger kan fungere til vægttab. Det handler om at finde den tilgang, der passer til dit liv og som du kan holde ved lige. Vi har opskrifter fra Keto til Sense til Familiemad.'
    },
    {
      question: 'Hvad betyder ernæringsprofilen?',
      answer: 'Vores ernæringsprofil viser ikke kun kalorier, protein, kulhydrater og fedt, men også vitaminer, mineraler og fedtsyrer. Alt beregnet ud fra Fødevareinstituttets FRIDA-database med danske data.'
    },
    {
      question: 'Er FunctionalFoods gratis?',
      answer: 'Ja, alle opskrifter og al viden på FunctionalFoods er 100% gratis. Ingen tilmelding, ingen skjulte gebyrer. Vi tror på gennemsigtighed og adgang til sundhedsviden for alle.'
    }
  ]

  const niches = [
    { name: 'Keto', icon: '🥑', href: '/keto/opskrifter', short: 'Fedtforbrænding' },
    { name: 'Sense', icon: '✋', href: '/sense/opskrifter', short: 'Danske kostråd' },
    { name: 'GLP-1 kost', icon: '🧠', href: '/GLP-1/opskrifter', short: 'Naturligt vægttab' },
    { name: 'Anti-inflammatorisk', icon: '🌿', href: '/anti-inflammatory/opskrifter', short: 'Sundhedsfokus' },
    { name: 'Fleksitarisk', icon: '🥬', href: '/flexitarian/opskrifter', short: 'Fleksibel kost' },
    { name: '5:2 Diæt', icon: '⏰', href: '/5-2-diet/opskrifter', short: 'Fasteperioder' },
    { name: 'Familiemad', icon: '👨‍👩‍👧‍👦', href: '/familie/opskrifter', short: 'Hele familien' },
    { name: 'Proteinrig kost', icon: '💪', href: '/proteinrig-kost/opskrifter', short: 'Optimal næring' }
  ]

  /** Diskret sektion før FAQ: otte vægttabsområder + link til funktioner */
  const vaegttabOmrader = [
    { label: 'Keto', href: '/keto/vaegttab', icon: '🥑' },
    { label: 'Sense', href: '/sense/vaegttab', icon: '✋' },
    { label: 'GLP-1 kost', href: '/GLP-1/vaegttab', icon: '🧠' },
    { label: 'Proteinrig kost', href: '/proteinrig-kost/vaegttab', icon: '💪' },
    { label: 'Anti-inflammatorisk', href: '/anti-inflammatory/vaegttab', icon: '🌿' },
    { label: 'Fleksitarisk', href: '/flexitarian/vaegttab', icon: '🥬' },
    { label: '5:2 diæt', href: '/5-2-diet/vaegttab', icon: '⏰' },
    { label: 'Familiemad', href: '/familie/vaegttab', icon: '👨‍👩‍👧‍👦' },
  ]

  return (
    <main className="min-h-screen bg-white">
      {/* Hero: video venstre, tekst højre, søgning i bunden */}
      <section className="relative z-30 overflow-x-clip bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className={`container relative px-4 py-12 lg:py-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="min-w-0">
              <HeroVideo />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
                Vægttab tilpasset dit liv – ikke omvendt.
              </h1>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <span className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold ring-1 ring-white/20 sm:justify-start">
                  {isLoadingRecipes ? '…' : `${allRecipes.length.toLocaleString('da-DK')} gratis opskrifter`}
                </span>
                <Link
                  href="/kom-i-gang"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-400/20 px-4 py-2.5 text-sm font-semibold ring-1 ring-emerald-300/50 transition hover:bg-emerald-400/30 sm:justify-start"
                >
                  Gratis vægttabssparring
                </Link>
              </div>
              <h2 className="mt-8 text-base font-bold uppercase tracking-wide text-emerald-200/95 sm:text-sm">
                Vægttabsmadplaner ud fra:
              </h2>
              <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-emerald-50/95 sm:text-base">
                {[
                  'Lavet ud fra tilbud',
                  'Tilpasset din krop og dit liv',
                  'Personlig ud fra madønsker og madstil',
                  'Vægttabsoptimeret',
                  'Kun ingredienser du kan lide',
                  'Fuld ernæringsberegnet',
                  'Fuld madplan og indkøbsliste',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/funktioner"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-emerald-200"
              >
                Se alle funktioner
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative z-40 mx-auto mt-12 max-w-2xl border-t border-white/10 pt-10 pb-2">
            <p className="mb-3 text-center text-sm text-emerald-100/90">Søg efter opskrift</p>
            <form onSubmit={handleSearch} className="relative isolate z-40">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length > 0 && setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  placeholder="Søg efter opskrift eller vælg madfokus herunder"
                  className="w-full rounded-xl px-6 py-4 pl-14 pr-14 text-gray-900 shadow-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
                  {searchResults.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/opskrift/${recipe.slug}`}
                      className="block border-b border-gray-100 px-6 py-4 transition-colors last:border-b-0 hover:bg-gray-50"
                      onClick={() => {
                        setShowSearchDropdown(false)
                        setSearchQuery('')
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {recipe.imageUrl && (
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                            <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-gray-900">{recipe.title}</h3>
                          {recipe.totalTime && <p className="text-sm text-gray-500">{recipe.totalTime} min</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {searchQuery.trim().length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
                      <Link
                        href={`/opskriftsoversigt?search=${encodeURIComponent(searchQuery.trim())}`}
                        className="flex items-center gap-2 font-semibold text-green-600 hover:text-green-700"
                        onClick={() => {
                          setShowSearchDropdown(false)
                        }}
                      >
                        Se alle resultater for &quot;{searchQuery}&quot;
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Niche Selection Section */}
      <section className="relative z-10 py-12 bg-white">
        <div className="container">
          <div className={`max-w-6xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Desktop: Grid Layout */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
              {niches.map((niche) => (
                <Link 
                  key={niche.name}
                  href={niche.href}
                  className="bg-white rounded-xl p-6 border-2 border-gray-100 text-center hover:border-green-200 hover:shadow-lg transition-all group"
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{niche.icon}</div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors text-sm">{niche.name}</h3>
                </Link>
              ))}
                  </div>
                  
            {/* Mobile: Accordion Layout */}
            <div className="md:hidden space-y-2">
              {niches.map((niche) => (
                <div key={niche.name} className="border-b border-gray-200">
                  <Link
                    href={niche.href}
                    className="flex items-center justify-between py-2 px-3 text-sm text-gray-700 hover:text-green-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{niche.icon}</span>
                      <span>{niche.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sådan virker FunctionalFoods */}
      <section className="relative overflow-hidden border-y border-emerald-100/80 bg-gradient-to-b from-emerald-50/40 via-white to-white py-16 lg:py-20">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
          aria-hidden
        />
        <div className="container">
          <div
            className={`mx-auto mb-12 max-w-2xl text-center transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/90">
              Sådan hjælper vi dig
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Sådan virker FunctionalFoods
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              Opskrifter, plan og opfølgning i ét samlet flow – bygget til dansk hverdag og rigtige butikstilbud.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3 md:gap-8">
            {[
              {
                icon: FileText,
                title: 'Gratis opskrifter til vægttab',
                tagline: 'Alle madkategorier – fra keto til familiemad',
                description:
                  'Keto, Sense, GLP-1 kost, anti-inflammatorisk og mange flere. Alle opskrifter er gratis og gennemtestet. Ernæringsudregnet fra den danske fødevaredatabase ned til mindste detalje.',
                iconGradient: 'from-emerald-500 to-teal-600',
                iconShadow: 'shadow-emerald-500/30',
                cardBorder: 'hover:border-emerald-200',
              },
              {
                icon: Calculator,
                title: 'Vægttabsplan der følger dit liv',
                tagline: 'Tilbud, mål og præferencer i ét system',
                description:
                  'Du får en plan lagt ud fra dagligvarebutikkernes tilbud, dit vægttabsønske, madpræferencer, aktivitetsniveau, familieliv og meget mere.',
                iconGradient: 'from-sky-500 to-blue-600',
                iconShadow: 'shadow-blue-500/25',
                cardBorder: 'hover:border-blue-200',
              },
              {
                icon: Calendar,
                title: 'Vi støtter dig hele vejen',
                tagline: 'Ugeplaner og personlig opfølgning på messenger',
                description:
                  'Vores system giver dig personlige madplaner hver uge – tilpasset dit liv – og vi er her for at støtte dig dagligt, hvis det er dét du har brug for.',
                iconGradient: 'from-violet-500 to-indigo-600',
                iconShadow: 'shadow-violet-500/25',
                cardBorder: 'hover:border-violet-200',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className={`group relative flex flex-col rounded-2xl border-2 border-gray-100 bg-white p-7 shadow-sm ring-1 ring-black/5 transition-all duration-300 md:p-8 ${feature.cardBorder} hover:-translate-y-0.5 hover:shadow-lg ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                style={{ transitionDelay: `${(index + 1) * 100}ms` }}
              >
                <div
                  className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.iconGradient} text-white shadow-lg ${feature.iconShadow} ring-2 ring-white/30 transition-transform duration-300 group-hover:scale-[1.03]`}
                >
                  <feature.icon className="h-7 w-7" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="text-lg font-bold leading-snug tracking-tight text-gray-900 md:text-xl">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm font-medium leading-snug text-gray-500">{feature.tagline}</p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-gray-600 md:text-[15px]">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="max-w-4xl mx-auto rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-blue-50 p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                    Klar til at komme i gang?
                  </p>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                    Har du vægttabsplaner?
                  </h3>
                  <p className="mt-2 text-gray-700 text-base leading-relaxed max-w-2xl">
                    Vi laver en personlig plan ud fra ugens tilbud og halvtreds andre parametre. Prøv det nu.
                  </p>
                </div>
                <div className="shrink-0">
                  <Link
                    href="/kom-i-gang"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Prøv det nu
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Se hvad andre spiser */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="container">
          <div className={`mb-8 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Se hvad andre spiser
            </h2>
              <Link
                href="/opskriftsoversigt"
                className="text-green-600 font-semibold hover:text-green-700 transition-colors flex items-center gap-2"
              >
                Se alle
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              Bemærk, opskrifter er blandet madkategori. <Link href="#find-din-madstil" className="text-green-600 hover:text-green-700 underline">Vælg madkategori for at bedre sortering</Link>
            </p>
          </div>

          {isLoadingRecipes ? (
            <>
              {/* Desktop: Grid */}
              <div className="hidden md:grid md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
                    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
              {/* Mobile: Swipe */}
              <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 animate-pulse flex-shrink-0" style={{ width: '280px' }}>
                      <div className="w-full h-48 bg-gray-200 rounded-t-xl"></div>
                      <div className="p-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
                    </div>
                  ))}
                    </div>
                  </div>
            </>
          ) : (
            <>
              {/* Desktop: Grid */}
              <div className="hidden md:grid md:grid-cols-3 gap-6">
                {latestRecipes.map((recipe) => {
                  const category = getRecipeCategory(recipe)
                  const categoryHref = getCategoryHref(recipe)
                  return (
                    <div key={recipe.id} className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all">
                      <Link href={`/opskrift/${recipe.slug}`}>
                        <div className="relative h-48 overflow-hidden">
                          <Image
                            src={recipe.imageUrl || '/images/recipe-placeholder.jpg'}
                            alt={recipe.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                    </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-2 line-clamp-2">
                            {recipe.title}
                          </h3>
                          {recipe.totalTime && (
                            <p className="text-sm text-gray-500 mb-2">
                              {recipe.totalTime} min
                            </p>
                          )}
                    </div>
                      </Link>
                      <div className="px-4 pb-4 space-y-2">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                          Madkategori: {category}
                        </p>
                        <Link
                          href={categoryHref}
                          className="text-sm text-gray-600 hover:text-green-600 transition-colors font-medium"
                        >
                          Find flere opskrifter →
                        </Link>
                  </div>
                    </div>
                  )
                })}
                    </div>
              {/* Mobile: Swipe */}
              <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex gap-4" style={{ width: 'max-content' }}>
                  {latestRecipes.map((recipe) => {
                    const category = getRecipeCategory(recipe)
                    const categoryHref = getCategoryHref(recipe)
                    return (
                      <div
                        key={recipe.id}
                        className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all flex-shrink-0"
                        style={{ width: '280px' }}
                      >
                        <Link href={`/opskrift/${recipe.slug}`}>
                          <div className="relative h-48 overflow-hidden">
                            <Image
                              src={recipe.imageUrl || '/images/recipe-placeholder.jpg'}
                              alt={recipe.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                  </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-2 line-clamp-2">
                              {recipe.title}
                            </h3>
                            {recipe.totalTime && (
                              <p className="text-sm text-gray-500 mb-2">
                                {recipe.totalTime} min
                              </p>
                            )}
                    </div>
                        </Link>
                        <div className="px-4 pb-4 space-y-2">
                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                            Madkategori: {category}
                          </p>
                          <Link
                            href={categoryHref}
                            className="text-sm text-gray-600 hover:text-green-600 transition-colors font-medium"
                          >
                            Find flere opskrifter →
                          </Link>
                    </div>
                  </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* De grundlæggende principper */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                De grundlæggende principper
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Der findes mange veje til vægttab, men de bygger alle på de samme mekanismer
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                {
                  title: "Forbrænd mere end du spiser",
                  description: "Kroppen taber sig, når du indtager mindre energi, end du forbruger. Det er fysik, ikke magi.",
                  icon: Target,
                  color: "green"
                },
                {
                  title: "Madens densitet tæller",
                  description: "500 kcal fra grøntsager og fisk fylder anderledes end 500 kcal fra hvidt brød og olie.",
                  icon: Target,
                  color: "blue"
                },
                {
                  title: "Madkvalitet betyder også noget",
                  description: "Jo mere næringsrig mad, jo nemmere er det at holde kroppen stærk, mæt og stabil.",
                  icon: Leaf,
                  color: "green"
                },
                {
                  title: "Vaner styrer alt",
                  description: "Det er ikke de enkelte måltider, men mønstrene over tid, der bestemmer resultatet.",
                  icon: Zap,
                  color: "orange"
                }
              ].map((principle, idx) => {
                const colorClasses = {
                  green: "bg-green-100 text-green-600 border-green-200",
                  blue: "bg-blue-100 text-blue-600 border-blue-200",
                  orange: "bg-orange-100 text-orange-600 border-orange-200"
                }
                return (
                  <div key={idx} className="bg-white rounded-2xl p-6 border-2 hover:shadow-lg transition-all">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 border-2 ${colorClasses[principle.color as keyof typeof colorClasses]}`}>
                      <principle.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{principle.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{principle.description}</p>
                  </div>
                )
              })}
            </div>

            <div className="text-center mt-8 mb-12">
              <p className="text-lg font-semibold text-gray-900">
                Vælg den madideologi der passer til dig, og så hjælper vi dig til varigt vægttab!
              </p>
            </div>

            {/* Vægttab gennem små valg */}
            <div className={`bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 border-2 border-green-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
                  Vægttab handler ikke om et stort skift én gang
                </h3>
                <p className="text-lg text-gray-700 text-center mb-6 max-w-2xl mx-auto">
                  Det handler om de valg, du tager ved hvert eneste måltid.
                </p>
                <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
                  Når du vælger bedre løsninger igen og igen, så bygger du et kalorieunderskud op, måltid for måltid - og det er sådan vægttab sker i virkeligheden.
                </p>

                {/* Tre kort */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                  {/* Kort 1 */}
                  <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3">
                      10 kg = mange måltider
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Når du taber dig 10 kg, er det resultatet af mange måltider. Du behøver ikke ramme plet hver gang – men jo flere gange om ugen du rammer nogenlunde rigtigt, jo mere rykker vægten sig.
                    </p>
                  </div>

                  {/* Kort 2 */}
                  <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <ArrowRight className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3">
                      Dit næste måltid er vigtigere end din sidste fejl
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Vi laver alle fejl, og et varigt vægttab går sjældent den lige vej nedad. Det er oftest to skridt frem og ét tilbage. Hos os, er vaner og mentale strategier en stor del af et varigt vægttab, og vi hjælper dig med at forstå dine madvaner - så du kan styre dem.
                    </p>
                  </div>

                  {/* Kort 3 */}
                  <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6 text-orange-600" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-3">
                      Vi gør de gode valg til standard
                    </h4>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Du skal ikke bruge viljestyrke til hvert eneste valg. FunctionalFoods giver dig konkrete opskrifter, madplaner og indkøbslister, så de sunde løsninger er det nemmeste at vælge i hverdagen. I stedet for standardiserede madplaner, kobler vi ind på livet af dine madvalg, og hjælper dig fremad.
                    </p>
                  </div>
                </div>

                {/* Illustration */}
                <div className="bg-white rounded-xl p-8 border-2 border-gray-200">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-sm font-semibold text-gray-700 mb-4">
                        Vi giver dig opskrifter og madplaner, der gør det nemt at tage det gode valg - ikke én gang, men hele vejen til dit mål.
                      </p>
                      <p className="text-base font-bold text-green-600">
                        Det er sådan du taber 5, 10 eller 20 kg uden at "starte forfra" hele tiden.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative w-48 h-48 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="grid grid-cols-3 gap-2 p-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                              <div 
                                key={i} 
                                className="w-8 h-8 bg-green-500 rounded-lg opacity-80"
                                style={{ 
                                  animationDelay: `${i * 0.1}s`,
                                  animation: 'pulse 2s ease-in-out infinite'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-4xl font-bold text-green-600">-10kg</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Find den madstil, der passer til dig */}
      <section id="find-din-madstil" className="py-16 lg:py-20 bg-green-50">
        <div className="container">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Find den madstil, der passer til dig
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Alle kostretninger kan virke – men <b>kun, hvis du kan leve med dem.</b><br />
              Vælg din madstil, og udforsk vægttabsguides og opskrifter
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "KETO",
                icon: "🥑",
                description: "Færre kulhydrater, mere fedt",
                suitsYou: "Har det godt med struktur og hurtige resultater",
                href: "/keto/opskrifter"
              },
              {
                name: "SENSE",
                icon: "✋",
                description: "Bruger håndflader og spiseforståelse",
                suitsYou: "Vil spise almindelig mad uden forbud",
                href: "/sense/opskrifter"
              },
              {
                name: "GLP-1 KOST",
                icon: "🧠",
                description: "Naturligt vægttab med maksimal mæthed",
                suitsYou: "Vil booste kroppens eget mæthedshormon naturligt",
                href: "/GLP-1/opskrifter"
              },
              {
                name: "PROTEINRIG KOST",
                icon: "💪",
                description: "Optimal næring og proteinbalance",
                suitsYou: "Vil optimere proteinindtag for sundhed og vægttab",
                href: "/proteinrig-kost/opskrifter"
              },
              {
                name: "ANTI-INFLAMMATORISK",
                icon: "🌿",
                description: "Naturlig, ren mad - ingen forarbejdede produkter",
                suitsYou: "Vil spise 'som kroppen er skabt til'",
                href: "/anti-inflammatory/opskrifter"
              },
              {
                name: "FLEKSITARISK",
                icon: "🥬",
                description: "Plantebaseret med plads til kød",
                suitsYou: "Vil spise sundt og fleksibelt",
                href: "/flexitarian/opskrifter"
              },
              {
                name: "5:2 DIÆT",
                icon: "⏰",
                description: "Intermittent fasting",
                suitsYou: "Vil spise normalt 5 dage, reducere 2 dage",
                href: "/5-2-diet/opskrifter"
              },
              {
                name: "FAMILIEMAD",
                icon: "👨‍👩‍👧‍👦",
                description: "Sunde opskrifter til hele familien",
                suitsYou: "Vil spise sundt sammen med familien",
                href: "/familie/opskrifter"
              }
            ].map((niche, index) => (
              <Link
                key={niche.name}
                href={niche.href}
                className={`group bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div className="text-4xl mb-4 text-center group-hover:scale-110 transition-transform duration-300">
                  {niche.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-center mb-2 group-hover:text-green-600 transition-colors">
                  {niche.name}
                </h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                  {niche.description}
                </p>
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-purple-600 mb-2">
                    Passer til dig, hvis du...
                  </p>
                  <p className="text-sm text-gray-700">
                    {niche.suitsYou}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Hvorfor kan FunctionalFoods hjælpe dig så godt? */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-white to-green-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Hvorfor kan FunctionalFoods hjælpe dig så godt?
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Udfyld profil om madønsker, vægttab og familievaner, og så bruger vi AI algoritmer til at kombinere de bedste tilbud i butikkerne med dine mål og ønsker.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border-2 border-green-100 mb-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    AI teknikken designer, vi vejleder dig.
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    Vores AI madplans-system lærer dig at kende, og er skræddersyet til dig og din familie, dine madpræferencer, vægttabsmål og livsstil - og det bedste: ugens tilbud i butikkerne!
                  </p>
                  <Link
                    href="/premium"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:-translate-y-1"
                  >
                    Opret dig gratis i dag
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
                  <div className="text-6xl text-center mb-4">📋</div>
                  <p className="text-center text-gray-600 font-medium">
                    AI-genererede madplaner<br />
                    hver uge
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Maden tilpasset dit liv, ikke omvendt",
                  description: "Madplaner der passer til din hverdag, arbejdstider og familievaner",
                  icon: Calendar,
                  color: "bg-green-100 text-green-600 border-green-200"
                },
                {
                  title: "Vægttabs-optimeret",
                  description: "Hver madplan er beregnet til at understøtte dit vægttabsmål",
                  icon: TrendingDown,
                  color: "bg-blue-100 text-blue-600 border-blue-200"
                },
                {
                  title: "Personlig ud fra madønsker",
                  description: "Vælg din madstil, allergier og præferencer – vi tilpasser alt",
                  icon: Target,
                  color: "bg-purple-100 text-purple-600 border-purple-200"
                },
                {
                  title: "Lavet ud fra tilbud",
                  description: "Funktion kommer i 2026: Madplaner baseret på næste uges tilbud i valgte dagligvarerbutikker",
                  icon: Building2,
                  color: "bg-gray-100 text-gray-600 border-gray-200"
                },
                {
                  title: "Fuld ernæringsberegnet",
                  description: "Vitaminer, omega-3, protein og alle næringsstoffer er optimeret",
                  icon: Leaf,
                  color: "bg-orange-100 text-orange-600 border-orange-200"
                },
                {
                  title: "Indkøbsliste",
                  description: "Få automatisk genereret indkøbsliste til hele ugen",
                  icon: FileText,
                  color: "bg-pink-100 text-pink-600 border-pink-200"
                }
              ].map((benefit, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 border-2 hover:shadow-lg transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 border-2 ${benefit.color}`}>
                    <benefit.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Få madplan ud fra næste uges tilbud */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Brain className="w-4 h-4" />
              120 dages gratis beta-test
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              Få madplan ud fra næste uges tilbud!
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Nu kan du lave personlige madplaner baseret på næste uges tilbud, dine præferencer, dit vægttabsmål og familiens behov.
            </p>
            
            <p className="text-base text-gray-600 mb-8">
              Alt er beregnet ud fra danske råvarer, reelle priser og din hverdag.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/kom-i-gang"
                className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all"
              >
                Opret dig gratis i dag
              </Link>
              <Link
                href="/vaegttab"
                className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:border-gray-300 transition-all"
              >
                Mere om vægttab
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Blød videre-læsning før FAQ (diskret) */}
      <section className="border-t border-gray-100 bg-gray-50/60 py-10 lg:py-12">
        <div className="container px-4">
          <div
            className={`mx-auto max-w-3xl text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ikke helt klar endnu?</p>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              Læs mere om vægttab i det område, der passer dig — eller udforsk resten af siden.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-2.5">
              {vaegttabOmrader.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200/90 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-black/[0.03] transition hover:border-emerald-200 hover:bg-emerald-50/60 hover:text-emerald-900 hover:shadow-md hover:ring-emerald-100"
                >
                  <span className="text-base leading-none select-none" aria-hidden>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="mt-8 text-sm text-gray-500 leading-relaxed">
              <Link
                href="/funktioner"
                className="font-medium text-gray-700 underline decoration-gray-300/90 underline-offset-[3px] transition hover:text-emerald-700 hover:decoration-emerald-400/70"
              >
                Se også, hvad Functional Foods kan
              </Link>
              {' '}
              — madplaner, tilbud, opskrifter og værktøjer.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className={`max-w-3xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Ofte stillede spørgsmål
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        openFaq === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-16 lg:py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="container">
          <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Kom i gang – gratis
            </h2>
            
            <p className="text-lg text-green-50 mb-8 leading-relaxed">
              Opret en profil, gem opskrifter, og forstå din kost på et nyt niveau.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/kom-i-gang"
                className="inline-flex items-center justify-center gap-2 bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all group"
              >
                Opret konto
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/opskriftsoversigt"
                className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all"
              >
                Find opskrifter
              </Link>
              <Link 
                href="/vaegttab"
                className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all"
              >
                Udforsk vægttab
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
