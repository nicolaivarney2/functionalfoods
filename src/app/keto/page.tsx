'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronRight } from 'lucide-react'

export default function KetoPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-purple-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-green-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              Ketogen diæt til vægttab
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Keto –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">
                lav-kulhydrat, høj-fedt
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Ketogen diæt hjælper kroppen med at forbrænde fedt i stedet for kulhydrater.<br />
              <strong>Perfekt til hurtigt og effektivt vægttab.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                Baseret på videnskab • 712 opskrifter • Gratis
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
              Udforsk keto
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lær om keto vægttab og find opskrifter der passer til din ketogene livsstil.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/keto/vægttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-green-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                    Keto vægttab
                  </h3>
                  <p className="text-gray-500">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lær hvordan ketogen diæt hjælper med vægttab, hvordan du kommer i ketose, og hvad du skal spise for at opretholde ketosen.
              </p>
              <div className="flex items-center text-purple-600 group-hover:text-purple-700 font-medium">
                Læs mere om keto vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/keto/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    Keto opskrifter
                  </h3>
                  <p className="text-gray-500">712 opskrifter</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Udforsk vores samling af ketogene opskrifter – alle beregnet på næring og perfekte til at holde dig i ketose.
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                Se alle keto opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Keto Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Hvad er 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">
                  ketogen diæt?
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Ketogen diæt er en lav-kulhydrat, høj-fedt diæt der hjælper kroppen med at forbrænde fedt i stedet for kulhydrater.
              </p>
              
              <div className="space-y-6">
                <div className="bg-purple-100 border border-purple-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-purple-800 mb-2">Ketose</h4>
                  <p className="text-purple-700">Når kroppen ikke har nok kulhydrater, begynder den at forbrænde fedt og producerer ketoner som energikilde.</p>
                </div>
                
                <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-green-800 mb-2">Vægttab</h4>
                  <p className="text-green-700">Keto kan hjælpe med hurtigt vægttab, især i starten, da kroppen tømmer glykogenlagerne.</p>
                </div>
                
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Stabil energi</h4>
                  <p className="text-blue-700">Mange oplever mere stabil energi og færre sultfølelser på keto.</p>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-purple-500/10 border border-purple-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-green-500 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Keto makronæringsstoffer</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Fedt</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-20 h-2 bg-purple-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">70-80%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Protein</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-16 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">15-25%</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Kulhydrater</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-4 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">5-10%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Fordele ved keto
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ketogen diæt kan have mange positive effekter ud over vægttab.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <TrendingDown className="w-8 h-8" />,
                title: "Hurtigt vægttab",
                description: "Keto kan hjælpe med hurtigt vægttab, især i de første uger, da kroppen tømmer glykogenlagerne.",
                color: "bg-purple-500"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Mental klarhed",
                description: "Mange oplever forbedret mental klarhed og fokus på keto, da hjernen får en stabil energikilde.",
                color: "bg-green-500"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Stabil energi",
                description: "Keto kan hjælpe med at stabilisere blodsukkeret og reducere energidips gennem dagen.",
                color: "bg-blue-500"
              }
            ].map((item, index) => (
              <div
                key={item.title}
                className="bg-white border-2 border-gray-100 rounded-2xl p-8 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 transform hover:-translate-y-2"
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center text-white mb-6`}>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Start din keto-rejse i dag –<br />
              <span className="text-purple-200">helt gratis</span>
            </h2>
            
            <p className="text-xl text-purple-100 mb-12 max-w-3xl mx-auto">
              Udforsk vores 712 ketogene opskrifter og lær alt om keto vægttab.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/keto/opskrifter" 
                className="group bg-white text-purple-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se keto opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/keto/vægttab" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Lær om keto vægttab
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
