'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Target,
  TrendingDown,
  Brain,
  Sparkles,
  ChevronRight,
  Leaf,
  Microscope,
  BookOpen,
} from 'lucide-react'

type InfoTab = 'grundlag' | 'naering'

export default function AntiInflammatoryPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [infoTab, setInfoTab] = useState<InfoTab>('grundlag')

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              Anti-inflammatorisk - Mod inflammation
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Anti-inflammatorisk –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
                mod inflammation og vægttab
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-6 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Anti-inflammatorisk kost handler om flere hel råvarer, sunde fedtstoffer og fiber – og færre
              ultraprocessede hurtige kulhydrater. Det understøtter både et mere stabilt energiniveau (og ofte mere mental
              overskud) og et bedre udgangspunkt for vægttab, fordi du mættes på færre &quot;tomme&quot; kalorier.
            </p>
            <p className="text-lg text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
              Vores opskrifter og ugeplan viser makro- og mikronæring tydeligt, så du kan kombinere{' '}
              <strong>sundhed</strong> og <strong>kaloriebalance</strong> uden gætteri. Gå dybere på teori og kilder på{' '}
              <Link href="/anti-inflammatory/vaegttab" className="text-emerald-700 font-semibold hover:underline">
                siden om anti-inflammatorisk vægttab
              </Link>
              .
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                Mod inflammation • 156 opskrifter • Gratis
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
              Udforsk Anti-inflammatorisk
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lær om anti-inflammatorisk vægttab, find opskrifter – eller læs artikler på bloggen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Link
              href="/anti-inflammatory/vaegttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    Anti-inflammatorisk vægttab
                  </h3>
                  <p className="text-gray-500">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lær hvordan anti-inflammatorisk kost hjælper med vægttab og reducerer inflammation i kroppen.
              </p>
              <div className="flex items-center text-emerald-600 group-hover:text-emerald-700 font-medium">
                Læs mere om anti-inflammatorisk vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/anti-inflammatory/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    Anti-inflammatoriske opskrifter
                  </h3>
                  <p className="text-gray-500">156 opskrifter</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Udforsk vores samling af anti-inflammatoriske opskrifter – alle designet til at reducere inflammation.
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                Se alle anti-inflammatoriske opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/blog/anti-inflammatory"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                    Anti-inflammatorisk på bloggen
                  </h3>
                  <p className="text-gray-500">Artikler og guides</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Artikler om inflammation, kost og sundhed – med fokus på den anti-inflammatoriske tilgang.
              </p>
              <div className="flex items-center text-teal-600 group-hover:text-teal-700 font-medium">
                Gå til blog-sektionen
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Anti-inflammatory Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-emerald-50/30">
        <div className="container">
          <div className={`max-w-4xl mx-auto mb-10 text-center lg:text-left transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
              Hvad er{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">
                anti-inflammatorisk kost?
              </span>
            </h2>

            <div
              className="flex flex-wrap justify-center lg:justify-start gap-2 mb-10"
              role="tablist"
              aria-label="Vælg indhold om anti-inflammatorisk kost"
            >
              <button
                type="button"
                role="tab"
                aria-selected={infoTab === 'grundlag'}
                onClick={() => setInfoTab('grundlag')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  infoTab === 'grundlag'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
                }`}
              >
                <Leaf className="w-4 h-4" />
                Grundlag
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={infoTab === 'naering'}
                onClick={() => setInfoTab('naering')}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                  infoTab === 'naering'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-300'
                }`}
              >
                <Microscope className="w-4 h-4" />
                Makro og mikro i madplanen
              </button>
            </div>
          </div>

          {infoTab === 'grundlag' && (
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Anti-inflammatorisk kost fokuserer på fødevarer der reducerer inflammation i kroppen og fremmer sundhed.
                </p>

                <div className="space-y-6">
                  <div className="bg-emerald-100 border border-emerald-200 rounded-2xl p-6">
                    <h4 className="font-semibold text-emerald-800 mb-2">Omega-3 fedtsyrer</h4>
                    <p className="text-emerald-700">Fisk, nødder og frø der reducerer inflammation og fremmer hjerte-sundhed.</p>
                  </div>

                  <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                    <h4 className="font-semibold text-green-800 mb-2">Antioxidanter</h4>
                    <p className="text-green-700">Bær, grønne grøntsager og krydderier der bekæmper frie radikaler.</p>
                  </div>

                  <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                    <h4 className="font-semibold text-blue-800 mb-2">Fiberrige fødevarer</h4>
                    <p className="text-blue-700">Fuldkorn, bælgfrugter og grøntsager der støtter tarm-sundhed.</p>
                  </div>
                </div>
              </div>

              <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-emerald-500/10 border border-emerald-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Anti-inflammatoriske fødevarer</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Omega-3 rige fødevarer</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-20 h-2 bg-emerald-500 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">Høj</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Antioxidanter</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-18 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">Høj</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Fiber</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div className="w-16 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">Mellem</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {infoTab === 'naering' && (
            <div
              className={`max-w-3xl mx-auto transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              role="tabpanel"
            >
              <div className="bg-white rounded-3xl border border-emerald-100 shadow-lg shadow-emerald-500/5 p-8 md:p-10">
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  Vores opskrifter og ugeplan udregner nøjagtige <strong>makro</strong>næringsstoffer (kcal, protein,
                  kulhydrater, fedt) og <strong>mikro</strong>næringsstoffer (alle vitaminer og mineraler), så vi sikrer, at
                  din madplan er antiinflammatorisk og høj-nærende.
                </p>
                <ul className="space-y-3 text-gray-600 mb-2">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span>
                      <strong className="text-gray-800">Makro:</strong> energi og fordeling af protein, kulhydrat og fedt
                      tilpasset dine mål.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                    <span>
                      <strong className="text-gray-800">Mikro:</strong> vitaminer og mineraler sporet gennem ingredienser og
                      måltider — så du kan stole på den samlede kvalitet af kosten.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <div
            className={`mt-14 max-w-3xl mx-auto transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white p-8 md:p-10">
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Vil du videre?</h3>
              <p className="text-gray-600 text-center mb-8 max-w-xl mx-auto">
                Læs mere om principperne, eller gå direkte til opskrifter med anti-inflammatorisk fokus.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/anti-inflammatory/vaegttab"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  Lær mere om anti-inflammatorisk kost
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/anti-inflammatory/opskrifter"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white px-6 py-3.5 font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Se anti-inflammatoriske opskrifter
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Start din anti-inflammatoriske rejse i dag –<br />
              <span className="text-emerald-200">helt gratis</span>
            </h2>
            
            <p className="text-xl text-emerald-100 mb-12 max-w-3xl mx-auto">
              Udforsk vores 156 anti-inflammatoriske opskrifter der reducerer inflammation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/anti-inflammatory/opskrifter" 
                className="group bg-white text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se anti-inflammatoriske opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/anti-inflammatory/vaegttab" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Lær om anti-inflammatorisk vægttab
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
