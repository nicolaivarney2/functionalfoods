'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Brain, Zap, Sparkles, ChevronRight, CheckCircle2, XCircle, UtensilsCrossed, Clock } from 'lucide-react'

export default function GLP1Page() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Brain className="w-4 h-4" />
              GLP-1 Kost - Naturligt vægttab
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-8 text-gray-900 leading-tight">
              GLP-1 Kost –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                Naturligt vægttab med maksimal mæthed
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              En ny måde at spise på – inspireret af kroppens egen biologi.<br />
              <strong>Boost din GLP-1 naturligt med mad – helt uden medicin.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Baseret på videnskab • Naturlig mæthed • Gratis
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
              Udforsk GLP-1 kost
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lær om GLP-1 vægttab og find opskrifter der passer til din GLP-1 livsstil.<br /> Du kan enten gå til vores GLP-1-vægttabs sektion, se alle vores GLP-1 opskrifter, eller læse videre om GLP-1 her på siden.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/GLP-1/vægttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    GLP-1 vægttab
                  </h3>
                  <p className="text-gray-500">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lær hvordan GLP-1 kost hjælper med vægttab gennem naturlig mæthed, hvordan du booster din GLP-1 respons, og hvad du skal spise for at opretholde maksimal mæthed.
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700 font-medium">
                Læs mere om GLP-1 vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/GLP-1/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    GLP-1 opskrifter
                  </h3>
                  <p className="text-gray-500">Funktionelle måltider</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Udforsk vores samling af GLP-1-optimeret opskrifter – alle designet til at booste din naturlige GLP-1 respons og maksimere mæthed.
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                Se alle GLP-1 opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is GLP-1 Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Hvad er 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                  {' '}GLP-1 kost?
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                GLP-1 (Glucagon-Like Peptide-1) er kroppens eget mæthedshormon, som spiller en nøglerolle i appetitregulering og vægtkontrol. Det er præcis dét hormonet Ozempic og Wegovy stimulerer – men vidste du, at du også kan booste din GLP-1 naturligt med mad?
              </p>
              
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Den nye GLP-1 kost er designet til at efterligne og forstærke kroppens GLP-1 respons – helt uden medicin.
              </p>
              
              <div className="space-y-6">
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Naturlig mæthed</h4>
                  <p className="text-blue-700">Kost med protein, fibre og sunde fedtstoffer stimulerer GLP-1 naturligt.</p>
                </div>
                
                <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-green-800 mb-2">Lavere appetit</h4>
                  <p className="text-green-700">Langsomt optagelige måltider stabiliserer blodsukkeret og reducerer cravings.</p>
                </div>
                
                <div className="bg-emerald-100 border border-emerald-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-emerald-800 mb-2">Effektivt vægttab</h4>
                  <p className="text-emerald-700">Færre kalorier – uden at du skal gå sulten i seng.</p>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-blue-500/10 border border-blue-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">GLP-1 principper</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🥚</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Protein i hvert måltid</h4>
                      <p className="text-sm text-gray-600">Æg, kylling, fisk, græsk yoghurt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🥬</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Fiberrige grøntsager</h4>
                      <p className="text-sm text-gray-600">Broccoli, linser, havre</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🥑</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Sunde fedtstoffer</h4>
                      <p className="text-sm text-gray-600">Avocado, olivenolie, nødder</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-red-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Ingen flydende kalorier</h4>
                      <p className="text-sm text-gray-600">GLP-1 belønner solide måltider</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="w-6 h-6 text-blue-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">2-3 mættende måltider</h4>
                      <p className="text-sm text-gray-600">Stabil energi, færre cravings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why GLP-1 Works Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Derfor virker GLP-1 kosten
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              GLP-1 kost er designet til at maksimere kroppens naturlige mæthedssignaler.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Øget mæthed",
                description: "Kost med protein, fibre og sunde fedtstoffer stimulerer GLP-1 naturligt",
                color: "bg-blue-500"
              },
              {
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Lavere appetit",
                description: "Langsomt optagelige måltider stabiliserer blodsukkeret",
                color: "bg-green-500"
              },
              {
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Effektivt vægttab",
                description: "Færre kalorier – uden at du skal gå sulten i seng",
                color: "bg-emerald-500"
              },
              {
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Perfekt støtte",
                description: "Understøtter semaglutid behandling og hjælper dig til at holde vægten bagefter",
                color: "bg-teal-500"
              }
            ].map((item, index) => (
              <div
                key={item.title}
                className="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 transform hover:-translate-y-2"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white mb-4`}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to eat GLP-1 Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
              Sådan spiser du efter GLP-1 principperne
            </h2>
            
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🥚</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Protein i hvert måltid</h3>
                    <p className="text-gray-600 text-sm">Æg, kylling, fisk, græsk yoghurt</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🥬</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Fiberrige grøntsager og bælgfrugter</h3>
                    <p className="text-gray-600 text-sm">Fx broccoli, linser, havre</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🥑</div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Sunde fedtstoffer</h3>
                    <p className="text-gray-600 text-sm">Avocado, olivenolie, nødder</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <XCircle className="w-8 h-8 text-red-500 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">Ingen flydende kalorier og snacks</h3>
                    <p className="text-gray-600 text-sm">GLP-1 belønner solide måltider</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 md:col-span-2">
                  <Clock className="w-8 h-8 text-blue-500 mt-1" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-2">2-3 mættende måltider om dagen</h3>
                    <p className="text-gray-600 text-sm">Stabil energi, færre cravings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Try GLP-1 with Functional Foods */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 text-center">
              Prøv GLP-1 kost med Functional Foods
            </h2>
            
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl p-8 md:p-12 shadow-xl border border-blue-100 mb-8">
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                Vi har udviklet AI-genererede madplaner og funktionelle måltider baseret på GLP-1 principperne. Få hjælp til at:
              </p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Planlægge dine måltider</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Komme i gang med vægttab – uden ekstreme kure</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Fastholde resultater med eller uden medicin</span>
                </li>
              </ul>

              <div className="pt-4">
                <Link 
                  href="/medlem"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  » Læs mere (og opret dig gratis)
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/medlem" 
                className="group bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                » Se FF systemet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/GLP-1/vægttab" 
                className="group bg-white border-2 border-blue-200 text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-blue-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Lær om GLP-1
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Start din GLP-1-rejse i dag –<br />
              <span className="text-blue-200">helt gratis</span>
            </h2>
            
            <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
              Udforsk vores GLP-1-optimeret opskrifter og lær alt om naturligt vægttab med maksimal mæthed.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/GLP-1/opskrifter" 
                className="group bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se GLP-1 opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/GLP-1/vægttab" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Lær om GLP-1 vægttab
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

