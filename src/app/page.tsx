'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowRight, Sparkles, Target, Zap, Brain, TrendingDown, Users, Leaf, FileText, Calculator, Calendar, Building2, HelpCircle, ChevronDown, Search, ChevronRight } from 'lucide-react'
import { Recipe } from '@/types/recipe'

// Updated hero section with recipe focus and new design

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [latestRecipes, setLatestRecipes] = useState<Recipe[]>([])
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState<Recipe[]>([])

  useEffect(() => {
    setIsVisible(true)
  }, [])

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
    if (recipe.dietaryCategories && recipe.dietaryCategories.length > 0) {
      const category = recipe.dietaryCategories[0]
      const categoryMap: { [key: string]: string } = {
        'keto': 'Keto',
        'sense': 'Sense',
        'lchf': 'LCHF/Paleo',
        'paleo': 'LCHF/Paleo',
        'anti-inflammatory': 'Anti-inflammatorisk',
        'flexitarian': 'Fleksitarisk',
        '5-2-diet': '5:2 Diæt',
        'family': 'Familiemad',
        'meal-prep': 'Meal Prep'
      }
      return categoryMap[category.toLowerCase()] || category
    }
    return 'Opskrifter'
  }

  const getCategoryHref = (recipe: Recipe): string => {
    if (recipe.dietaryCategories && recipe.dietaryCategories.length > 0) {
      const category = recipe.dietaryCategories[0].toLowerCase()
      const hrefMap: { [key: string]: string } = {
        'keto': '/keto/opskrifter',
        'sense': '/sense/opskrifter',
        'lchf': '/lchf-paleo/opskrifter',
        'paleo': '/lchf-paleo/opskrifter',
        'anti-inflammatory': '/anti-inflammatory/opskrifter',
        'flexitarian': '/flexitarian/opskrifter',
        '5-2-diet': '/5-2-diet/opskrifter',
        'family': '/familie/opskrifter',
        'meal-prep': '/meal-prep/opskrifter'
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
    { name: 'Sense', icon: '🧠', href: '/sense/opskrifter', short: 'Danske kostråd' },
    { name: 'LCHF/Paleo', icon: '🥩', href: '/lchf-paleo/opskrifter', short: 'Naturlig mad' },
    { name: 'Anti-inflammatorisk', icon: '🌿', href: '/anti-inflammatory/opskrifter', short: 'Sundhedsfokus' },
    { name: 'Fleksitarisk', icon: '🥬', href: '/flexitarian/opskrifter', short: 'Fleksibel kost' },
    { name: '5:2 Diæt', icon: '⏰', href: '/5-2-diet/opskrifter', short: 'Fasteperioder' },
    { name: 'Familiemad', icon: '👨‍👩‍👧‍👦', href: '/familie/opskrifter', short: 'Hele familien' },
    { name: 'Meal Prep', icon: '📦', href: '/meal-prep/opskrifter', short: 'Planlagt mad' }
  ]

  const companies = [
    'Nestlé', 'Unilever', 'Orkla', 'Arla', 'Salling Group', 'Coop', 'DLG', 'Danish Crown'
  ]

  return (
    <main className="min-h-screen bg-white">
      {/* New Hero Section with Image */}
      <section className="relative bg-white">
        <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/jordbaer-header.webp"
              alt="Sunde opskrifter til sundhed og vægttab"
              fill
              className="object-cover object-top"
              priority
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
          
          {/* Content Overlay */}
          <div className="container relative h-full flex items-center">
            <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 text-white leading-tight drop-shadow-lg">
                Sunde opskrifter til vægttab og velvære.
              </h1>
              
              <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-8 max-w-2xl mx-auto drop-shadow-md">
                Tilpas maden til DIT liv. Ikke omvendt.
              </p>
              
              {/* Search Bar with Dropdown */}
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSearch} className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => searchQuery.trim().length > 0 && setShowSearchDropdown(true)}
                      onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                      placeholder="Søg efter opskrift eller vælg madfokus herunder"
                      className="w-full px-6 py-4 pl-14 pr-14 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-xl"
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                  
                  {/* Search Dropdown */}
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
                      {searchResults.map((recipe) => (
                <Link 
                          key={recipe.id}
                          href={`/opskrift/${recipe.slug}`}
                          className="block px-6 py-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          onClick={() => {
                            setShowSearchDropdown(false)
                            setSearchQuery('')
                          }}
                        >
                          <div className="flex items-center gap-4">
                            {recipe.imageUrl && (
                              <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                                <Image
                                  src={recipe.imageUrl}
                                  alt={recipe.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{recipe.title}</h3>
                              {recipe.totalTime && (
                                <p className="text-sm text-gray-500">{recipe.totalTime} min</p>
                              )}
                            </div>
                          </div>
                </Link>
                      ))}
                      {searchQuery.trim().length > 0 && (
                        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                <Link 
                            href={`/opskriftsoversigt?search=${encodeURIComponent(searchQuery.trim())}`}
                            className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-2"
                            onClick={() => {
                              setShowSearchDropdown(false)
                            }}
                          >
                            Se alle resultater for "{searchQuery}"
                            <ArrowRight className="w-4 h-4" />
                </Link>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
            </div>
                    </div>
                  </div>
      </section>

      {/* Niche Selection Section */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className={`max-w-6xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Desktop: Grid Layout */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
              {niches.map((niche, idx) => (
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
              {niches.map((niche, idx) => (
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
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Sådan virker FunctionalFoods
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: 'Gratis opskrifter inden for alle mad kategorier',
                description: 'Keto, Sense, LCHF, Paleo, Anti-inflammatorisk og mange flere. Alle opskrifter er gratis og klar til brug.',
                color: 'from-green-500 to-green-600'
              },
              {
                icon: Calculator,
                title: 'Videnskabelig ernæringsanalyse',
                description: 'Alle tal beregnes ud fra Fødevareinstituttets FRIDA-database. Vi viser vitaminer, mineraler og næringsstoffer ned til det mindste detalje.',
                color: 'from-blue-500 to-blue-600'
              },
              {
                icon: Calendar,
                title: 'AI-madplaner tilpasset familien',
                description: 'Snart: Planlæg ud fra budget, butik og smag. Alt beregnet ud fra danske råvarer og reelle priser.',
                color: 'from-purple-500 to-purple-600'
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl hover:border-gray-200 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${(index + 1) * 100}ms` }}
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
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
                Der findes tusind veje, men de bygger alle på de samme mekanismer
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                {
                  title: "Kalorier betyder noget",
                  description: "Kroppen taber sig, når du indtager mindre energi, end du forbruger. Det er fysik, ikke magi.",
                  icon: Target,
                  color: "green"
                },
                {
                  title: "Madkvalitet betyder også noget",
                  description: "Jo mere næringsrig mad, jo nemmere er det at holde kroppen stærk, mæt og stabil.",
                  icon: Leaf,
                  color: "green"
                },
                {
                  title: "Madens densitet tæller",
                  description: "500 kcal fra grøntsager og fisk fylder anderledes end 500 kcal fra hvidt brød og olie.",
                  icon: Target,
                  color: "blue"
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
                  Når du vælger bedre løsninger igen og igen, så bygger du et kalorieunderskud op, måltid for måltid — og det er sådan vægttab sker i virkeligheden.
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
                        Vi giver dig opskrifter og madplaner, der gør det nemt at tage det gode valg — ikke én gang, men hundrede gange.
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
              Alle kostretninger kan virke – men kun, hvis du kan leve med dem.<br />
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
                icon: "🧠",
                description: "Bruger håndflader og spiseforståelse",
                suitsYou: "Vil spise almindelig mad uden forbud",
                href: "/sense/opskrifter"
              },
              {
                name: "LCHF/PALEO",
                icon: "🥩",
                description: "Som Keto, men mere fleksibel",
                suitsYou: "Ønsker fedtforbrænding uden at være ekstrem",
                href: "/lchf-paleo/opskrifter"
              },
              {
                name: "MEAL PREP",
                icon: "📦",
                description: "Planlægning, struktur og økonomi",
                suitsYou: "Vil gøre vægttab praktisk og realistisk",
                href: "/meal-prep/opskrifter"
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

      {/* Hvad kan du NU på FunctionalFoods? */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-white to-green-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Hvad kan du NU på FunctionalFoods?
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Udfyld profil om madønsker, vægttab og familievaner, og lav AI madplaner hver uge
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border-2 border-green-100 mb-8">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Personlige AI madplaner
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    Vores AI skaber madplaner der er skræddersyet til dig og din familie. Baseret på dine præferencer, vægttabsmål og livsstil.
                  </p>
                  <Link
                    href="/premium"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:-translate-y-1"
                  >
                    Prøv gratis i 7 dage
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
                },
                {
                  title: "Lavet ud fra tilbud",
                  description: "Funktion kommer i 2026: Madplaner baseret på næste uges tilbud i valgte dagligvarerbutikker",
                  icon: Building2,
                  color: "bg-gray-100 text-gray-600 border-gray-200"
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
              Kommer i 2026
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              Få madplan ud fra næste uges tilbud!
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Snart kan du lave personlige madplaner baseret på næste uges tilbud, dine præferencer og familiens behov.
            </p>
            
            <p className="text-base text-gray-600 mb-8">
              Alt beregnet ud fra danske råvarer og reelle priser.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all">
                Følg udviklingen
              </button>
              <button className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:border-gray-300 transition-all">
                Bliv testbruger 2026
              </button>
            </div>
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
                href="/opskriftsoversigt"
                className="inline-flex items-center justify-center gap-2 bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:shadow-xl transition-all group"
              >
                Find opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/vægttab"
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
