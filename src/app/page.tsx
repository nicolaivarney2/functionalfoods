'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, ChevronDown, Sparkles, Target, Zap, Brain, TrendingDown, Users, Leaf, FileText, DollarSign, BookOpen, CheckCircle2 } from 'lucide-react'
import { Recipe } from '@/types/recipe'

// Dietary categories mapping
const dietaryCategories = [
  { name: 'Keto', slug: 'keto', icon: '🥑' },
  { name: 'Sense', slug: 'sense', icon: '🧠' },
  { name: 'LCHF/Paleo', slug: 'lchf-paleo', icon: '🥩' },
  { name: 'Anti-inflammatorisk', slug: 'anti-inflammatory', icon: '🌿' },
  { name: 'Fleksitarisk', slug: 'flexitarian', icon: '🥬' },
  { name: '5:2 Diæt', slug: '5-2-diet', icon: '⏰' },
  { name: 'Familiemad', slug: 'familie', icon: '👨‍👩‍👧‍👦' },
  { name: 'Meal Prep', slug: 'meal-prep', icon: '📦' }
]

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [recipeCounts, setRecipeCounts] = useState<{[key: string]: number}>({})
  const [totalRecipes, setTotalRecipes] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsVisible(true)
    fetchRecipeCounts()
  }, [])

  const fetchRecipeCounts = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      
      if (data.success && data.recipes) {
        const recipes: Recipe[] = data.recipes
        setTotalRecipes(recipes.length)
        
        // Count recipes per dietary category
        const counts: {[key: string]: number} = {}
        dietaryCategories.forEach(cat => {
          counts[cat.slug] = recipes.filter(recipe => 
            recipe.dietaryCategories?.some(dc => 
              dc.toLowerCase().includes(cat.slug.toLowerCase()) ||
              cat.name.toLowerCase().includes(dc.toLowerCase())
            )
          ).length
        })
        
        // Special handling for some categories
        counts['keto'] = recipes.filter(r => 
          r.dietaryCategories?.some(dc => dc.toLowerCase().includes('keto'))
        ).length
        counts['sense'] = recipes.filter(r => 
          r.dietaryCategories?.some(dc => dc.toLowerCase().includes('sense'))
        ).length
        counts['lchf-paleo'] = recipes.filter(r => 
          r.dietaryCategories?.some(dc => 
            dc.toLowerCase().includes('lchf') || dc.toLowerCase().includes('paleo')
          )
        ).length
        counts['anti-inflammatory'] = recipes.filter(r => 
          r.dietaryCategories?.some(dc => dc.toLowerCase().includes('anti') || dc.toLowerCase().includes('inflammatorisk'))
        ).length
        counts['flexitarian'] = recipes.filter(r => 
          r.dietaryCategories?.some(dc => dc.toLowerCase().includes('fleksitarisk'))
        ).length
        counts['5-2-diet'] = recipes.filter(r => 
          r.dietaryCategories?.some(dc => dc.toLowerCase().includes('5:2') || dc.toLowerCase().includes('fasting'))
        ).length
        counts['familie'] = recipes.filter(r => 
          r.subCategories?.some(sc => sc.toLowerCase().includes('familie')) ||
          r.mainCategory?.toLowerCase().includes('familie')
        ).length
        counts['meal-prep'] = recipes.filter(r => 
          r.dietaryCategories?.some(dc => dc.toLowerCase().includes('meal prep') || dc.toLowerCase().includes('prep'))
        ).length
        
        setRecipeCounts(counts)
      }
    } catch (error) {
      console.error('Error fetching recipe counts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const scrollToNext = () => {
    const nextSection = document.getElementById('gratis-funktioner')
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-br from-white via-green-50/30 to-blue-50/20 py-24 lg:py-32 min-h-[85vh] flex items-center">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 leading-tight">
              Få styr på dit vægttab –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                én tallerken ad gangen
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-700 max-w-4xl mx-auto leading-relaxed font-light">
              FunctionalFoods hjælper dig med at forstå, hvad der faktisk virker:
              <br />
              <span className="text-gray-600">realistiske opskrifter, næringsrig mad og indsigt i, hvordan du taber dig uden forbud og forvirring.</span>
            </p>
            
            <p className="text-lg md:text-xl mb-12 text-gray-800 font-medium max-w-3xl mx-auto">
              Her handler vægttab ikke om at spise mindre – men om at spise rigtigt.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link 
                href="/opskriftsoversigt" 
                className="group bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se gratis opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="#vaegttab" 
                className="group bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-2xl font-semibold text-lg hover:border-green-500 hover:text-green-600 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Udforsk vægttab
              </Link>
            </div>

            {/* Nutrition Profile Box Overlay */}
            <div className="max-w-md mx-auto mt-12">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-2xl shadow-green-500/10 border border-green-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Næringsprofil</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Protein</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div className="w-16 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-xs font-medium text-gray-900">24g</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Vitamin C</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div className="w-12 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-xs font-medium text-gray-900">85%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Omega-3</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div className="w-10 h-2 bg-purple-500 rounded-full"></div>
                      </div>
                      <span className="text-xs font-medium text-gray-900">2.1g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <button 
            onClick={scrollToNext}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Scroll ned"
          >
            <ChevronDown className="w-8 h-8" />
          </button>
        </div>
      </section>

      {/* 2. GRATIS FUNKTIONER */}
      <section id="gratis-funktioner" className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Kom godt i gang – helt gratis
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Card 1: Gratis opskrifter */}
            <div className={`bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="text-5xl mb-4">🥗</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Gratis opskrifter i alle madnicher</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {isLoading ? (
                  <span className="text-gray-400">Indlæser...</span>
                ) : (
                  <>
                    Over {totalRecipes > 0 ? totalRecipes.toLocaleString('da-DK') : '1.200'} opskrifter fordelt på Keto, Sense, Paleo, LCHF, Anti-inflammatorisk m.fl.
                  </>
                )}
              </p>
            </div>

            {/* Card 2: Ernæringsberegnet */}
            <div className={`bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Ernæringsberegnet med danske data</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Alle opskrifter beregnes ud fra Fødevareinstituttets FRIDA-database – med nøjagtige vitaminer, mineraler og makronæringsstoffer.
              </p>
            </div>

            {/* Card 3: Guides */}
            <div className={`bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="text-5xl mb-4">🧭</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">Guides til sundt vægttab</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Realistiske strategier, fokus på vaner og forståelse frem for regler.
              </p>
            </div>
          </div>

          {/* Teaser */}
          <div className={`text-center bg-gradient-to-r from-green-50 to-blue-50 rounded-3xl p-8 border border-green-200 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-lg text-gray-700 mb-2">
              🔜 <strong>Stay tuned</strong> – januar 2026 udvider vi med AI-madplaner og fuld pris-gennemsigtighed.
            </p>
            <Link 
              href="#2026-funktion"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mt-4 group"
            >
              Læs mere om 2026-funktionerne
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. 2026-FUNKTION */}
      <section id="2026-funktion" className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Brain className="w-4 h-4" />
              Kommer i 2026
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
              AI-madplanen, der får det hele til at gå op
            </h2>
            
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              I 2026 lancerer vi en intelligent madplan, der kombinerer vægttab, økonomi og hverdag.
            </p>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Den samler tilbud fra dine dagligvarebutikker, tager højde for familiens behov, præferencer og mål – og laver en sund, billig madplan til jer.
            </p>
            
            <p className="text-lg text-gray-700 font-medium mb-8">
              Du sparer penge, undgår madspild og får et mere stabilt vægttab.
            </p>

            {/* Flow diagram */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-blue-200 mb-8">
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center text-white font-bold mb-2 mx-auto">
                    Mål
                  </div>
                  <p className="text-sm text-gray-600">Vægttab</p>
                </div>
                <ArrowRight className="text-gray-400 w-6 h-6 hidden md:block" />
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold mb-2 mx-auto">
                    Familie
                  </div>
                  <p className="text-sm text-gray-600">Behov</p>
                </div>
                <ArrowRight className="text-gray-400 w-6 h-6 hidden md:block" />
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold mb-2 mx-auto">
                    Tilbud
                  </div>
                  <p className="text-sm text-gray-600">Priser</p>
                </div>
                <ArrowRight className="text-gray-400 w-6 h-6 hidden md:block" />
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl flex items-center justify-center text-white font-bold mb-2 mx-auto">
                    Madplan
                  </div>
                  <p className="text-sm text-gray-600">Ugens plan</p>
                </div>
                <ArrowRight className="text-gray-400 w-6 h-6 hidden md:block" />
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center text-white font-bold mb-2 mx-auto">
                    Resultat
                  </div>
                  <p className="text-sm text-gray-600">Succes</p>
                </div>
              </div>
            </div>

            {/* CTA for test user */}
            <div className="text-center">
              <Link 
                href="/wizard"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-1"
              >
                Bliv testbruger på 2026 funktioner
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FAMILIE & HVERDAG */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Det bliver lettere, når madplanen forstår din familie
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Vores system tager højde for:
              </p>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Antal børn og alder</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Ernæringsbehov og vægttabsmål</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-lg text-gray-700">Allergier, præferencer og butikvalg</span>
                </li>
              </ul>
              
              <p className="text-lg text-gray-700 font-medium mt-8">
                Sundhed handler ikke om særmad – men om at gøre det muligt for alle.
              </p>
            </div>

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-12 border border-green-200">
                <Users className="w-24 h-24 text-green-600 mb-6 mx-auto" />
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Familievenlig madplanlægning</h3>
                  <p className="text-gray-600">
                    En madplan der passer til hele familien – uanset alder, præferencer eller mål.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VÆLG DIN MADIDEOLOGI */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Vælg din madideologi
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find den kostretning, der passer til dig. Alle kosttyper kan virke – men ikke alle passer til dit liv.
            </p>
            <p className="text-lg text-gray-500 mt-4">
              Udforsk dine muligheder og se, hvor mange opskrifter vi har i hver niche.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {dietaryCategories.map((category, index) => {
              const count = recipeCounts[category.slug] || 0
              return (
                <Link
                  key={category.slug}
                  href={`/opskrifter/${category.slug}`}
                  className={`group bg-white border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${800 + index * 100}ms` }}
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-2">
                    {category.name}
                  </h3>
                  {!isLoading && (
                    <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                      {count > 0 ? count.toLocaleString('da-DK') : '0'} opskrifter
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* 6. FORSTÅ DIN MAD */}
      <section id="vaegttab" className="py-20 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Mæthed, kvalitet og kalorier –<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  det hele tæller
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                FunctionalFoods analyserer hver opskrift ned til vitamin- og næringsniveau, men det handler ikke kun om tal.
              </p>
              
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Mad af høj kvalitet – fx proteinrige råvarer, fibre og mad med lav energitæthed – mætter mere og hjælper dig med at holde vægten, selv ved samme kalorieindtag.
              </p>
              
              <p className="text-lg text-gray-800 font-medium">
                Derfor betyder både madens kvalitet og dens energiindhold noget for dit vægttab.
              </p>
            </div>

            <div className={`transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-green-500/10 border border-green-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Næringsprofil</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Protein</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-20 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">24g</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Vitamin C</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-16 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">85%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Omega-3</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-12 h-2 bg-purple-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">2.1g</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. GENNEMSIGTIGHED I PRISER */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-blue-100">
                <DollarSign className="w-16 h-16 text-blue-600 mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Priser fra alle danske butikker
                </h3>
                <p className="text-gray-600">
                  Rema 1000, Netto, Føtex, Bilka, Coop 365 m.fl.
                </p>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Gennemsigtighed i priser og tilbud
              </h2>
              
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                Vi importerer data fra alle danske dagligvarebutikker – Rema 1000, Netto, Føtex, Bilka, Coop 365 m.fl.
              </p>
              
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                FunctionalFoods giver dig fuld gennemsigtighed i prisudvikling og hjælper dig med at finde den billigste vej til sund mad.
              </p>
              
              <p className="text-lg text-gray-800 font-medium">
                Når du kan se både pris og næringsværdi, bliver vægttab langt nemmere at holde.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. VIDEN & VEJLEDNING */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <BookOpen className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
              Vægttab starter med forståelse – ikke forbud
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Vi giver dig indsigt i, hvordan mad, vaner og energi hænger sammen – så du kan skabe et sundt vægttab, der holder.
            </p>
            
            <p className="text-lg text-gray-700 font-medium mb-8">
              Artikler, guides og inspiration – gratis og realistisk.
            </p>

            <Link 
              href="/opskriftsoversigt"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:-translate-y-1"
            >
              Udforsk guides og artikler
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 9. CTA-FOOTER */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Start i dag – helt gratis
            </h2>
            
            <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Uanset om du spiser Keto, Sense eller bare vil spise bedre, FunctionalFoods samler alt viden, alle opskrifter og værktøjer ét sted.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/opskriftsoversigt" 
                className="group bg-white text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Find opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="#vaegttab" 
                className="group bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
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