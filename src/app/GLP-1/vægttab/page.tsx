'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, ArrowLeft, Brain, CheckCircle2, XCircle, Clock, UtensilsCrossed, Target, TrendingDown, HelpCircle } from 'lucide-react'

export default function GLP1WeightLossPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero / Intro */}
      <section className="relative bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/20 py-20 lg:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link 
              href="/GLP-1"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tilbage til GLP-1 kost
            </Link>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
              Tab kiloerne med <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">GLP-1 kost</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
              GLP-1 kost hjælper dig med at tabe dig gennem naturlig mæthed – uden at du skal gå sulten i seng eller tælle kalorier.
            </p>

            <p className="text-base text-gray-700 max-w-3xl mx-auto leading-relaxed mb-8">
              Ved at booste kroppens eget mæthedshormon naturligt, får du færre cravings, mere mæthed og effektivt vægttab – helt uden medicin.
            </p>
          </div>
        </div>
      </section>

      {/* How GLP-1 Works for Weight Loss */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-gray-900">
              Hvordan virker GLP-1 kost til vægttab?
            </h2>
            
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl p-8 md:p-12 mb-8">
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                GLP-1 (Glucagon-Like Peptide-1) er kroppens eget mæthedshormon. Når du spiser mad der stimulerer GLP-1 naturligt, får du:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    <h3 className="font-bold text-gray-900">Øget mæthed</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Protein, fibre og sunde fedtstoffer stimulerer GLP-1 naturligt.</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <h3 className="font-bold text-gray-900">Lavere appetit</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Langsomt optagelige måltider stabiliserer blodsukkeret.</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-emerald-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <h3 className="font-bold text-gray-900">Færre cravings</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Stabiliseret blodsukker reducerer lysten til sødt og snacks.</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border border-teal-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-teal-600" />
                    <h3 className="font-bold text-gray-900">Effektivt vægttab</h3>
                  </div>
                  <p className="text-gray-600 text-sm">Færre kalorier – uden at du skal gå sulten i seng.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GLP-1 Principles */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-gray-900">
              Sådan spiser du efter GLP-1 principperne
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🥚</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Protein i hvert måltid</h3>
                    <p className="text-gray-600">Æg, kylling, fisk, græsk yoghurt – protein stimulerer GLP-1 kraftigt.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border-2 border-green-200">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🥬</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Fiberrige grøntsager og bælgfrugter</h3>
                    <p className="text-gray-600">Fx broccoli, linser, havre – fibre forstærker GLP-1 responsen.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border-2 border-emerald-200">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">🥑</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Sunde fedtstoffer</h3>
                    <p className="text-gray-600">Avocado, olivenolie, nødder – fedt forlænger mæthedsfølelsen.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border-2 border-red-200">
                <div className="flex items-start gap-4">
                  <XCircle className="w-8 h-8 text-red-500 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ingen flydende kalorier og snacks</h3>
                    <p className="text-gray-600">GLP-1 belønner solide måltider – flydende kalorier og snacks underminerer effekten.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <Clock className="w-8 h-8 text-blue-500 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">2-3 mættende måltider om dagen</h3>
                    <p className="text-gray-600">Stabil energi, færre cravings – strukturen styrker GLP-1 responsen.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Support for Semaglutid */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl p-8 md:p-12 border border-blue-200">
              <h2 className="text-3xl font-bold mb-6 text-gray-900">
                Perfekt som støtte til semaglutid
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                GLP-1 kost er ideel hvis du bruger Ozempic, Wegovy eller lignende medicin. Den understøtter behandlingen og hjælper dig til at holde vægten bagefter, når du stopper med medicinen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hvordan kan FunctionalFoods hjælpe dig i gang? */}
      <section className="py-20 bg-gradient-to-br from-blue-50/50 to-green-50/50">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
                Hvordan kan FunctionalFoods hjælpe dig i gang?
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-8 md:p-12 border-2 border-blue-200 shadow-lg mb-8">
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p className="text-lg">
                  I stedet for, at du skal tælle kalorier, går vores system ud på, at tænke fremad.
                </p>
                
                <p>
                  Vi designer madplaner for dig for næste uge, der ved hjælp af AI er lavet ud fra følgende kriterier:
                </p>
                
                <ul className="space-y-3 list-none">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Din mad ideologi</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Dine mad præferencer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Din familie og dit liv</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Udregnet efter din krop</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Designet ud fra næste uges tilbud i dine favorit dagligvarebutikker!</span>
                  </li>
                </ul>

                <p className="text-lg font-medium text-gray-900 pt-4">
                  Skal vi hjælpe dig i gang? Det er gratis hos os.
                </p>

                <div className="pt-4">
                  <Link 
                    href="/medlem"
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    » Læs mere
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
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
                href="/GLP-1" 
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
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-blue-200">GLP-1 opskrifter</span>
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme GLP-1-optimeret opskrifter, der alle er designet til at booste din naturlige GLP-1 respons.
          </p>
          <Link
            href="/GLP-1/opskrifter"
            className="group bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se GLP-1 opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}

