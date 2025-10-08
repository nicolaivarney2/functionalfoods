'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronLeft } from 'lucide-react'

export default function KetoWeightLossPage() {
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
            <Link 
              href="/keto"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Tilbage til keto
            </Link>
            
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <TrendingDown className="w-4 h-4" />
              Keto vægttab teori
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Keto vægttab –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">
                sådan fungerer det
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Lær hvordan ketogen diæt hjælper med vægttab, hvordan du kommer i ketose,<br />
              og hvad du skal spise for at opretholde ketosen.
            </p>
          </div>
        </div>
      </section>

      {/* How Keto Works Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Hvordan keto 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">
                  hjælper med vægttab
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Ketogen diæt hjælper med vægttab på flere måder – både gennem kalorieunderskud og ved at ændre kroppens energimetabolisme.
              </p>
              
              <div className="space-y-6">
                <div className="bg-purple-100 border border-purple-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-purple-800 mb-2">Ketose</h4>
                  <p className="text-purple-700">Når kroppen ikke har nok kulhydrater, begynder den at forbrænde fedt og producerer ketoner som energikilde.</p>
                </div>
                
                <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-green-800 mb-2">Reduceret appetit</h4>
                  <p className="text-green-700">Keto kan hjælpe med at reducere sultfølelser og appetit, hvilket gør det lettere at opretholde kalorieunderskud.</p>
                </div>
                
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Øget fedtforbrænding</h4>
                  <p className="text-blue-700">I ketose forbrænder kroppen fedt som primær energikilde i stedet for kulhydrater.</p>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-purple-500/10 border border-purple-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-green-500 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Ketose processen</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Reducer kulhydrater</h4>
                      <p className="text-sm text-gray-600">Under 20g kulhydrater dagligt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Glykogen tømmes</h4>
                      <p className="text-sm text-gray-600">Kroppen bruger op sine kulhydratlager</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Ketose starter</h4>
                      <p className="text-sm text-gray-600">Kroppen begynder at producere ketoner</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-bold">4</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Fedtforbrænding</h4>
                      <p className="text-sm text-gray-600">Kroppen forbrænder fedt som energikilde</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Kom i gang med keto
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Følg disse trin for at starte din ketogene rejse og komme i ketose.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Target className="w-8 h-8" />,
                title: "Planlæg din start",
                description: "Beregn dine makronæringsstoffer, planlæg dine måltider og fjern kulhydratrige fødevarer fra dit køleskab.",
                color: "bg-purple-500"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Start keto",
                description: "Begynd med at spise under 20g kulhydrater dagligt. Fokuser på fedt og protein i dine måltider.",
                color: "bg-green-500"
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Oprethold ketose",
                description: "Hold dig til keto-makronæringsstofferne og overvåg dine ketoner for at sikre du forbliver i ketose.",
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

      {/* Common Mistakes Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Almindelige fejl på keto
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Undgå disse almindelige fejl for at få mest muligt ud af din ketogene diæt.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {[
              {
                mistake: "For mange kulhydrater",
                solution: "Hold dig under 20g kulhydrater dagligt. Læs altid næringsindholdet på fødevarer.",
                color: "border-red-200 bg-red-50"
              },
              {
                mistake: "For lidt fedt",
                solution: "Fedt skal udgøre 70-80% af dine kalorier. Vær ikke bange for at spise fedt på keto.",
                color: "border-orange-200 bg-orange-50"
              },
              {
                mistake: "Ikke nok elektrolytter",
                solution: "Keto kan udtømme elektrolytter. Sørg for at få nok natrium, kalium og magnesium.",
                color: "border-yellow-200 bg-yellow-50"
              },
              {
                mistake: "For lidt vand",
                solution: "Keto kan dehydrere dig. Drik mindst 2-3 liter vand dagligt.",
                color: "border-blue-200 bg-blue-50"
              }
            ].map((item, index) => (
              <div
                key={item.mistake}
                className={`border-2 ${item.color} rounded-2xl p-6 transition-all duration-500`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    !
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{item.mistake}</h4>
                    <p className="text-gray-600">{item.solution}</p>
                  </div>
                </div>
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
          <div className={`text-center transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Klar til at starte din keto-rejse?<br />
              <span className="text-purple-200">Find opskrifter her</span>
            </h2>
            
            <p className="text-xl text-purple-100 mb-12 max-w-3xl mx-auto">
              Udforsk vores 712 ketogene opskrifter – alle beregnet på næring og perfekte til at holde dig i ketose.
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
