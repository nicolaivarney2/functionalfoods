'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Leaf, Brain, Zap, Sparkles, ChevronRight } from 'lucide-react'

export default function FiveTwoDietPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              5:2 Diæt - Intermittent fasting
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              5:2 Diæt –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                intermittent fasting til vægttab
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              5:2 diæt med intermittent fasting - spis normalt 5 dage, begræns kalorier 2 dage.<br />
              <strong>Enkel og effektiv måde at tabe sig på.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                Intermittent fasting • 123 opskrifter • Gratis
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Udforsk 5:2 Diæt
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lær om 5:2 diæt vægttab og find opskrifter til intermittent fasting.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/5-2-diet/vægttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                    5:2 Diæt vægttab
                  </h3>
                  <p className="text-gray-500">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lær hvordan 5:2 diæt hjælper med vægttab gennem intermittent fasting og kaloriebegrænsning.
              </p>
              <div className="flex items-center text-amber-600 group-hover:text-amber-700 font-medium">
                Læs mere om 5:2 diæt vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/5-2-diet/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                    5:2 Diæt opskrifter
                  </h3>
                  <p className="text-gray-500">123 opskrifter</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Udforsk vores samling af 5:2 diæt opskrifter – perfekte til intermittent fasting.
              </p>
              <div className="flex items-center text-orange-600 group-hover:text-orange-700 font-medium">
                Se alle 5:2 diæt opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is 5:2 Diet Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-amber-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Hvad er 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                  5:2 diæt?
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                5:2 diæt er en form for intermittent fasting hvor du spiser normalt 5 dage og begrænser kalorier 2 dage.
              </p>
              
              <div className="space-y-6">
                <div className="bg-amber-100 border border-amber-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-amber-800 mb-2">5 normale dage</h4>
                  <p className="text-amber-700">Spis normalt 5 dage om ugen uden begrænsninger på kalorier eller madtyper.</p>
                </div>
                
                <div className="bg-orange-100 border border-orange-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-orange-800 mb-2">2 faste dage</h4>
                  <p className="text-orange-700">Begræns kalorier til 500-600 kalorier 2 dage om ugen (ikke sammenhængende).</p>
                </div>
                
                <div className="bg-yellow-100 border border-yellow-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-yellow-800 mb-2">Fleksibilitet</h4>
                  <p className="text-yellow-700">Vælg selv hvilke 2 dage du vil faste - perfekt til travle livsstile.</p>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-amber-500/10 border border-amber-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">5:2 Diæt ugeplan</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Mandag</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-20 h-2 bg-amber-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Normal</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Tirsdag</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-8 h-2 bg-orange-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Fast</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Onsdag</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-20 h-2 bg-amber-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Normal</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Torsdag</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-8 h-2 bg-orange-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">Fast</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-600 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Start din 5:2 diæt-rejse i dag –<br />
              <span className="text-amber-200">helt gratis</span>
            </h2>
            
            <p className="text-xl text-amber-100 mb-12 max-w-3xl mx-auto">
              Udforsk vores 123 5:2 diæt opskrifter til intermittent fasting.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/5-2-diet/opskrifter" 
                className="group bg-white text-amber-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se 5:2 diæt opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/5-2-diet/vægttab" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Lær om 5:2 diæt vægttab
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
