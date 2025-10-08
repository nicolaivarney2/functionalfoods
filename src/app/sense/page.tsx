'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronRight } from 'lucide-react'

export default function SensePage() {
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
              Sense - Danske kostråd
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Sense –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                sunde danske opskrifter
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Sense opskrifter følger danske kostråd og fokuserer på balance,<br />
              <strong>variation og næringsrig mad til hele familien.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Baseret på danske kostråd • 445 opskrifter • Gratis
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
              Udforsk Sense
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lær om Sense vægttab og find opskrifter der følger danske kostråd.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/sense/vægttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    Sense vægttab
                  </h3>
                  <p className="text-gray-500">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lær hvordan Sense opskrifter hjælper med vægttab gennem balance og næringsrig mad der følger danske kostråd.
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                Læs mere om Sense vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/sense/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Sense opskrifter
                  </h3>
                  <p className="text-gray-500">445 opskrifter</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Udforsk vores samling af Sense opskrifter – alle baseret på danske kostråd og beregnet på næring.
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700 font-medium">
                Se alle Sense opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Sense Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Hvad er 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  Sense?
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Sense opskrifter følger danske kostråd og fokuserer på balance, variation og næringsrig mad til hele familien.
              </p>
              
              <div className="space-y-6">
                <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-green-800 mb-2">Danske kostråd</h4>
                  <p className="text-green-700">Alle opskrifter følger de officielle danske kostråd for sund og varieret kost.</p>
                </div>
                
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Balance</h4>
                  <p className="text-blue-700">Rigtige mængder af kulhydrater, protein og fedt for optimal sundhed.</p>
                </div>
                
                <div className="bg-emerald-100 border border-emerald-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-emerald-800 mb-2">Familievenlig</h4>
                  <p className="text-emerald-700">Opskrifter der passer til hele familien – både børn og voksne.</p>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-green-500/10 border border-green-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Sense makronæringsstoffer</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Kulhydrater</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-16 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">45-60%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Fedt</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-12 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">25-35%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Protein</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-16 h-2 bg-emerald-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">15-20%</span>
                    </div>
                  </div>
                </div>
              </div>
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
          <div className={`text-center transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Start din Sense-rejse i dag –<br />
              <span className="text-green-200">helt gratis</span>
            </h2>
            
            <p className="text-xl text-green-100 mb-12 max-w-3xl mx-auto">
              Udforsk vores 445 Sense opskrifter baseret på danske kostråd.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/sense/opskrifter" 
                className="group bg-white text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se Sense opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/sense/vægttab" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Lær om Sense vægttab
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
