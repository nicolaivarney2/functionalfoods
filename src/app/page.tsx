'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Sparkles, Target, Zap, Brain, TrendingDown, Users, Leaf } from 'lucide-react'

export default function Home() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-green-50/30 to-blue-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              Danmarks mest intelligente opskrifter
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Spis dig sund –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                og lad vægten følge med
              </span>
            </h1>
            
                <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
                  FunctionalFoods giver dig <strong>gratis, intelligente opskrifter</strong> beregnet på vitaminer og næring.
                </p>
                
                <p className="text-lg md:text-xl mb-4 text-gray-700 font-medium">
                  Når du spiser klogt, taber du dig. Vælg dit fokus.
                </p>
                
                <p className="text-sm text-gray-400 mb-12 max-w-3xl mx-auto">
                  Keto, Sense, LCHF & Paleo, Anti-inflammatorisk, fleksitarisk, 5:2, Familiemad, Prepping
                </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/opskriftsoversigt" 
                className="group bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Udforsk opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                100% gratis • Ingen tilmelding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Vælg din vej
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Udforsk opskrifter, der passer til din livsstil – alle beregnet på vitaminer, mineraler og energi.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: 'Keto', icon: '🥑', href: '/opskrifter/keto' },
              { name: 'Sense', icon: '🧠', href: '/opskrifter/sense' },
              { name: 'LCHF/Paleo', icon: '🥩', href: '/opskrifter/lchch-paleo' },
              { name: 'Anti-inflammatorisk', icon: '🌿', href: '/opskrifter/anti-inflammatory' },
              { name: 'Fleksitarisk', icon: '🥬', href: '/opskrifter/flexitarian' },
              { name: '5:2 Diæt', icon: '⏰', href: '/opskrifter/5-2-diet' },
              { name: 'Familiemad', icon: '👨‍👩‍👧‍👦', href: '/opskrifter/familie' },
              { name: 'Meal Prep', icon: '📦', href: '/opskrifter/meal-prep' }
            ].map((category, index) => (
              <Link
                key={category.name}
                href={category.href}
                className={`group bg-white border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* USP Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
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

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                FunctionalFoods analyserer hver opskrift ned til 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  vitamin- og næringsniveau
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Så du kan spise sundt – ikke bare mindre.
              </p>
              
              <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                <p className="text-green-800 font-medium">
                  "Danmarks eneste opskriftsunivers med fuld ernæringsberegning."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future Vision Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Brain className="w-4 h-4" />
              Fremtiden starter i 2026
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
              I 2026 bliver FunctionalFoods din personlige 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                AI-madplanlægger
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Den vil koble dine sundhedsmål sammen med ugens tilbud i danske supermarkeder.
            </p>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-blue-200">
              <p className="text-lg text-gray-700">
                <strong>Indtil da</strong> kan du udforske Danmarks mest intelligente opskrifter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Start din sundere madrejse i dag –<br />
              <span className="text-green-200">helt gratis</span>
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/opskriftsoversigt" 
                className="group bg-white text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Udforsk opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <div className="text-green-100 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                <span>Vægttab starter med næring – ikke afsavn</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
} 