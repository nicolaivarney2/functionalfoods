'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronRight, Heart } from 'lucide-react'

export default function ProteinrigKostPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <Sparkles className="w-4 h-4" />
              Proteinrig kost - Muskelbevarende vægttab
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Proteinrig kost –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                muskelbevarende vægttab
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Simpelt vægttab med fokus på protein og kalorier<br />
              <strong>Tab fedt, bevar muskler – med højt proteinindhold.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                Planlagt mad • 234 opskrifter • Gratis
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
              Hvad går Proteinrig kost ud på?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lær om muskelbevarende vægttab med proteinrig kost og find opskrifter med højt proteinindhold.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/proteinrig-kost/vægttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Proteinrig kost & vægttab
                  </h3>
                  <p className="text-gray-500">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lær hvordan proteinrig kost hjælper med muskelbevarende vægttab gennem højt proteinindhold og kaloriekontrol.
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700 font-medium">
                Læs mere om proteinrig kost & vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/proteinrig-kost/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    Proteinrig kost opskrifter
                  </h3>
                  <p className="text-gray-500">234 opskrifter</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Udforsk vores samling af proteinrige opskrifter – perfekte til vægttab med fokus på protein og kalorier.
              </p>
              <div className="flex items-center text-indigo-600 group-hover:text-indigo-700 font-medium">
                Se alle proteinrige opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Proteinrig kost Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Hvad er{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  proteinrig kost?
                </span>
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
                <p>
                  En kost med fokus på højt indhold af protein er en stærk vægttabsstrategi som også er simpel. Du har en vis mængde kalorier du kan spise, og når du booster fordelingen af protein, bliver mængden af kulhydrater og fedt naturligt lavere. Maden mætter mere, protein er sværere at overspise, og samtidigt muskelbevarende. En super smart vægttabsstrategi!
                </p>

                <p>
                  Protein er ikke blot "kalorier". Det er et funktionelt næringsstof, som kroppen aktivt bruger til muskelvedligeholdelse, regulering af appetit og forbrænding. Når protein udgør en større del af kosten, ændrer det hvordan kroppen håndterer energi under vægttab – du taber fedt i stedet for muskelmasse.
                </p>

                <p>
                  I praksis betyder det, at du øger dit indtag af magre proteinkilder (fx fisk, fjerkræ, æg, mejeriprodukter, bælgfrugter) på bekostning af noget af kulhydratet og fedtet. En proteinrig kost ligger typisk på 25-35% af kalorierne fra protein (modsat almindelige 10-15%), hvilket svarer til 1,6-2,2 g protein/kg kropsvægt.
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-600 mb-6">
                <p className="text-gray-800 leading-relaxed">
                  <strong>Simpelt vægttab med fokus på protein og kalorier:</strong> Prioriter protein i alle hovedmåltider. Indgår kulhydrater naturligt via grøntsager, frugt og fuldkorn. Undgås stramme forbud og ekstreme regler. Opnås ofte en automatisk bedre portionskontrol og fedttab frem for muskeltab.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Planlagt mad</h4>
                  <p className="text-blue-700">Med vores system får du proteinrige opskrifter, der understøtter vægttab med fokus på at bevare musklerne. Perfekt til alle der vil tabe sig på den rigtige måde.</p>
                </div>
                
                <div className="bg-indigo-100 border border-indigo-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-indigo-800 mb-2">Portioneret kontrol</h4>
                  <p className="text-indigo-700">Kontroller portioner og kalorier ved at forberede måltider på forhånd.</p>
                </div>
                
                <div className="bg-purple-100 border border-purple-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-purple-800 mb-2">Tidsbesparende</h4>
                  <p className="text-purple-700">Brug mindre tid på madlavning i hverdagen ved at forberede på forhånd.</p>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-blue-500/10 border border-blue-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Proteinrig madplan</h3>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 font-semibold">Protein</span>
                      <span className="text-sm font-medium text-gray-900">1,6-2,2g/kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">25-35%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 font-semibold">Kulhydrater</span>
                      <span className="text-sm font-medium text-gray-900">30-45%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-indigo-500 rounded-full" style={{ width: '37.5%' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">30-45%</span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700 font-semibold">Fedt</span>
                      <span className="text-sm font-medium text-gray-900">25-35%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <span className="text-xs text-gray-500 w-16 text-right">25-35%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hvorfor proteinrig kost virker */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900 text-center">
              Hvorfor virker proteinrig kost?
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
              <p>
                Proteinrig kost gør vægttab lettere gennem flere videnskabeligt dokumenterede mekanismer. Det handler om at tabe sig på den rigtige måde: ved at tabe fedt og bevare muskler, så du ender med en stærkere og sundere krop efter vægttabet.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Øget mæthed</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Protein mætter markant mere end kulhydrat og fedt. Det stimulerer mæthedshormoner (GLP-1, PYY) og dæmper sulthormonet ghrelin, så du automatisk spiser mindre.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Muskelbevarelse</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Under vægttab beskytter højt proteinindtag musklerne, så du taber fedt frem for muskelmasse. Dette bevarer stofskiftet og giver en stærkere krop efter vægttabet.
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Højere forbrænding</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Protein kræver 20-30% af sine kalorier til fordøjelse (vs. 5-10% for kulhydrater). Dette giver en lille men målbar ekstra forbrænding hver dag.
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Stabilt blodsukker</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Protein stabiliserer blodsukkeret og reducerer cravings. Du undgår de store energitoppe og -daler, der ofte fører til overspisning.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 border-l-4 border-blue-600">
              <p className="text-gray-800 leading-relaxed">
                <strong>Proteinrig kost er særligt velegnet til vægttab, fordi den:</strong> Gør dig mere mæt, så du automatisk spiser færre kalorier. Bevarer musklerne, så du taber fedt frem for muskelmasse. Øger forbrændingen lidt hver dag. Giver stabilt blodsukker og færre cravings. Er bæredygtig og kan holde i længden.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* New Section: Tror du Proteinrig kost er noget for dig? */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-gray-900 text-center">
              Tror du Proteinrig kost som vægttabsredskab er noget for dig?
            </h2>
            
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 mb-8">
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p>
                  Så anbefaler vi, at du undersøger vores opskrifter og læser om fordele/ulemper, og derefter sætter dig ind i vores system og hvordan det kan hjælpe dig.
                </p>
                <p>
                  Vores system giver dig en struktureret madplan ud fra dine smagsløg, dine mål (og din families), næste uges tilbud og meget mere. Fuld indkøbsliste og madlavningsplan til søndag, så du er klar.
                </p>
                <p>
                  Opret dig gratis i vores system.
                </p>
                <Link 
                  href="/medlem"
                  className="font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-flex items-center gap-2"
                >
                  » Læs mere (og opret dig gratis)
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <Link 
                href="/medlem" 
                className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                » Se FF systemet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/proteinrig-kost/vægttab" 
                className="group bg-white border-2 border-blue-200 text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-blue-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Hvad går Proteinrig kost ud på?
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="text-center">
              <Link 
                href="/proteinrig-kost/opskrifter" 
                className="text-gray-600 hover:text-blue-600 transition-colors inline-flex items-center gap-2"
              >
                Eller udforsk vores Proteinrig kost opskrifter
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
