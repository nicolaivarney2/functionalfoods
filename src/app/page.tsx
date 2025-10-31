'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Sparkles, Target, Zap, Brain, TrendingDown, Users, Leaf, FileText, Calculator, Calendar, Building2, HelpCircle, ChevronDown } from 'lucide-react'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

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
      {/* Hero Section - Kompakt og god, PerfectKeto inspireret */}
      <section className="relative bg-gradient-to-br from-white via-green-50/20 to-blue-50/10 py-16 lg:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div className={`space-y-6 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Spis sundt –<br />
                <span className="text-green-600">ikke bare mindre.</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                FunctionalFoods giver dig <strong>gratis opskrifter og viden</strong> om vægttab på tværs af alle madnicher.
              </p>
              
              <p className="text-base text-gray-600">
                Hver opskrift er ernæringsberegnet ned til vitamin- og næringsniveau – baseret på danske data.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/opskriftsoversigt"
                  className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-all group"
                >
                  Find opskrifter
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/vægttab"
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:border-gray-300 transition-all"
                >
                  Udforsk vægttab
                </Link>
              </div>
            </div>

            {/* Right - Nutrition Profile Visual */}
            <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Næringsprofil</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">Protein</span>
                      <span className="text-sm font-semibold text-gray-900">24g</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">Vitamin C</span>
                      <span className="text-sm font-semibold text-gray-900">85%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">Omega-3</span>
                      <span className="text-sm font-semibold text-gray-900">2.1g</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{ width: '52%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
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
                title: 'Gratis opskrifter i alle nicher',
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

      {/* Udforsk din madniche */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-green-50/20">
        <div className="container">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Find den madstil, der passer til dig
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Alle kostretninger kan fungere – det handler om at forstå dem.
            </p>
            <p className="text-base text-gray-600 mt-2">
              Vælg en niche og få gratis opskrifter og ernæringsindsigt.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {niches.map((niche, index) => (
              <Link
                key={niche.name}
                href={niche.href}
                className={`group bg-white border border-gray-200 rounded-xl p-6 text-center hover:border-green-300 hover:shadow-lg transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {niche.icon}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-1">
                  {niche.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {niche.short}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Forstå din mad – helt ned i detaljen */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Næringsprofil</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">Protein</span>
                      <span className="text-sm font-semibold text-gray-900">24g</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full animate-pulse" style={{ width: '80%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">B12</span>
                      <span className="text-sm font-semibold text-gray-900">120%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">C-vitamin</span>
                      <span className="text-sm font-semibold text-gray-900">85%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 font-medium">Omega-3</span>
                      <span className="text-sm font-semibold text-gray-900">2.1g</span>
                    </div>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" style={{ width: '52%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 leading-tight">
                Forstå din mad –<br />
                <span className="text-green-600">helt ned i detaljen</span>
              </h2>
              
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Vi viser ikke kun kalorier, men også næringsstoffer, vitaminer og fedtsyrer.
              </p>
              
              <p className="text-base text-gray-600 mb-8">
                Så du lærer, hvad du egentlig spiser – og hvorfor det betyder noget.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <p className="text-green-900 font-medium">
                  "Danmarks eneste opskriftsunivers med fuld ernæringsberegning."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Videnskaben bag vægttab */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-blue-50/20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                Videnskaben bag vægttab
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                {
                  title: 'Kalorier betyder stadig noget',
                  description: 'Kroppen taber sig, når du indtager mindre energi end du forbruger. Det er grundprincippet.',
                  icon: TrendingDown,
                  color: 'text-red-600'
                },
                {
                  title: 'Madens kvalitet er afgørende',
                  description: '500 kcal fra grøntsager fylder anderledes end 500 kcal fra hvidt brød. Mæthed og næring tæller.',
                  icon: Leaf,
                  color: 'text-green-600'
                },
                {
                  title: 'Find den, du kan holde',
                  description: 'Den bedste kost er den, du faktisk kan leve med resten af livet – ikke bare en hurtig kur.',
                  icon: Target,
                  color: 'text-blue-600'
                }
              ].map((principle, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-xl p-6 border border-gray-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <principle.icon className={`w-8 h-8 ${principle.color} mb-4`} />
                  <h3 className="font-bold text-gray-900 mb-3">
                    {principle.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {principle.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Simple infographic */}
            <div className={`bg-white rounded-2xl p-8 border border-gray-100 shadow-sm ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Energiindtag vs. Energiforbrug</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-medium">Kalorier ind</span>
                    <span className="text-sm font-semibold text-gray-900">1.800 kcal</span>
                  </div>
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-medium">Kalorier ud</span>
                    <span className="text-sm font-semibold text-gray-900">2.200 kcal</span>
                  </div>
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Underskud</span>
                    <span className="text-lg font-bold text-blue-600">400 kcal</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    500 kcal underskud dagligt = 0,5 kg vægttab om ugen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Byg din egen madplan */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container">
          <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Brain className="w-4 h-4" />
              Kommer i 2026
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              Byg din egen madplan
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

      {/* Dem, der former vores madvaner */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-orange-50/10">
        <div className="container">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
              Dem, der former vores madvaner
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              I dag styres mange af vores madvalg af få globale koncerner.
            </p>
            
            <p className="text-base text-gray-600 mb-12">
              FunctionalFoods arbejder for gennemsigtighed, hvor du selv forstår, hvad der havner på tallerkenen.
            </p>

            {/* Company logos grid */}
            <div className="grid grid-cols-4 md:grid-cols-4 gap-6 mb-8">
              {companies.map((company, index) => (
                <div
                  key={company}
                  className={`bg-white rounded-lg p-4 border border-gray-200 text-gray-700 font-medium text-sm hover:shadow-md transition-all ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <Building2 className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                  {company}
                </div>
              ))}
            </div>
            
            <p className="text-lg font-medium text-gray-800">
              "Jo mere du ved – jo bedre valg kan du træffe."
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
