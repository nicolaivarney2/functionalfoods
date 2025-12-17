'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronRight, Hand, UtensilsCrossed, Ban, CheckCircle2, XCircle } from 'lucide-react'

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
              Vi hjælper dig med at forstå Sense-metoden og giver dig de værktøjer,<br />
              <strong>du har brug for til at implementere den i din hverdag.</strong>
            </p>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto mb-8">
              Alle vores Sense opskrifter er optimeret til Sense-principperne, så du kan lave en komplet Sense madplan med os.
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
              Udforsk vores ressourcer om Sense vægttab og find opskrifter der kan hjælpe dig på din rejse.
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
                Få en dybere forståelse af hvordan Sense-principperne fungerer i praksis og hvordan de kan støtte dit vægttab.
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
                Find praktisk inspiration med vores samling af Sense opskrifter, der alle er optimeret til Sense-principperne og følger danske kostråd. Byg din Sense madplan med opskrifter, der automatisk passer til spisekasse-modellen.
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700 font-medium">
                Se alle Sense opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Sense Section - Intro */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
              Hvad er 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                {' '}Sense?
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed mb-4">
              Sense er en meget simpel måde at spise på, hvor du bruger <strong>hænderne som mål</strong> - ikke kalorietælling, ikke stramme regler.
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Du spiser almindelig mad, og strukturen hjælper dig automatisk med at spise i passende mængder.
            </p>
          </div>

          {/* Three Core Ideas */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className={`bg-white rounded-3xl p-8 shadow-lg border-2 border-green-100 hover:border-green-300 transition-all duration-500 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '400ms' }}>
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                <UtensilsCrossed className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3 måltider om dagen</h3>
              <p className="text-gray-600 leading-relaxed">
                Du spiser tre hovedmåltider, og det er dét. Ingen snacks, ingen konstant småspisning i den periode du har dedikeret dig til Sense. Og får du smag for mindre snacking, er det nemmere at holde dit vægttab efter du er nået i mål. Kroppen vænner sig til det vi giver den.
              </p>
            </div>

            <div className={`bg-white rounded-3xl p-8 shadow-lg border-2 border-blue-100 hover:border-blue-300 transition-all duration-500 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '500ms' }}>
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6">
                <Hand className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Hænderne bestemmer portionerne</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Hvert måltid består af <strong>3–4 håndfulde</strong> mad:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <span>1–2 håndfulde grønt</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>1 håndfuld protein</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">•</span>
                  <span>1 håndfuld stivelse/frugt</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <span>Evt. 1–3 spsk fedt (olie, dressing, ost, nødder)</span>
                </li>
              </ul>
            </div>

            <div className={`bg-white rounded-3xl p-8 shadow-lg border-2 border-emerald-100 hover:border-emerald-300 transition-all duration-500 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '600ms' }}>
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                <Ban className="w-8 h-8 text-white rotate-45" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Intet forbudt</h3>
              <p className="text-gray-600 leading-relaxed">
                Du må spise <strong>ALT</strong> - metoden handler kun om mængder. Det gør systemet ret nemt at følge i den virkelige verden (familiespisning, restaurantbesøg, sociale ting osv.).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sense Works Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className={`text-center mb-12 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
                Virker Sense til <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">vægttab?</span>
              </h2>
              <p className="text-2xl text-gray-700 font-semibold mb-4">
                For rigtig mange <span className="text-green-600">JA</span>.
              </p>
            </div>

            <div className={`bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 mb-12 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Det virker primært fordi:</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Portionskontrol uden at tælle noget</h4>
                    <p className="text-gray-600 text-sm">Hænderne er dit mål – ingen apps eller vægte nødvendige.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Stabilt blodsukker → færre cravings</h4>
                    <p className="text-gray-600 text-sm">Tre strukturede måltider holder blodsukkeret stabilt.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Mere grønt og protein → bedre mæthed</h4>
                    <p className="text-gray-600 text-sm">Strukturen sikrer automatisk næringsrige valg.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Let at gentage hver dag → vaner bliver stabile</h4>
                    <p className="text-gray-600 text-sm">Simpelt system der er nemt at følge i hverdagen.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Who is Sense for */}
            <div className={`grid md:grid-cols-2 gap-8 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-green-50 rounded-3xl p-8 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Sense er bedst til dig, hvis du:</h3>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">gerne vil spise almindelig mad</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">bliver træt af apps, vægte og kalorietælling</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">vil have et system der er nemt nok til også at fungere på travle dage</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">har brug for klare rammer, men ikke forbud</span>
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 rounded-3xl p-8 border-2 border-red-200">
                <div className="flex items-center gap-3 mb-6">
                  <XCircle className="w-8 h-8 text-red-600" />
                  <h3 className="text-2xl font-bold text-gray-900">Hvornår er Sense måske ikke for dig?</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4 italic">Bare så du får det ærligt:</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">du hader faste måltidsstrukturer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">du har et meget uregelmæssigt arbejdsliv (fx nattevagter)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">du trives bedre med at tracke præcist (fx kalorietælling eller makroer)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">du vil have et meget hurtigt vægttab</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recipes Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <div className={`bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 border border-gray-100 transition-all duration-1000 delay-850 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Sense-optimeret opskrifter</h3>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto">
                Alle vores Sense opskrifter er bygget op efter Sense-principperne, så du kan lave en komplet Sense madplan med os. Hver opskrift passer automatisk til spisekasse-modellen – ingen gætteri, bare sunde og lækre måltider.
              </p>
            </div>
            <Link
              href="/sense/opskrifter"
              className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold justify-center w-full md:w-auto"
            >
              Se alle Sense opskrifter
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Next Steps Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className={`text-center mb-12 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 leading-tight">
              Interesseret i <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Sense?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Vi hjælper dig med at forstå Sense og støtter dig på din rejse mod en sundere livsstil.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/sense/vægttab"
              className="group bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100 hover:border-green-300 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    Læs mere dybdegående om Sense vægttab
                  </h3>
                  <p className="text-gray-500 text-sm">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Få en dybere forståelse af hvordan Sense-principperne fungerer, og hvordan de kan hjælpe dig med at opnå dine mål på en bæredygtig måde.
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                Læs mere om Sense vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/sense/opskrifter"
              className="group bg-white rounded-3xl p-8 shadow-lg border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Udforsk Sense opskrifter
                  </h3>
                  <p className="text-gray-500 text-sm">Praktisk inspiration</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Se vores samling af Sense opskrifter, der alle følger danske kostråd og gør det nemt at lave sunde måltider der passer til Sense-metoden.
              </p>
              <div className="flex items-center text-blue-600 group-hover:text-blue-700 font-medium">
                Se alle Sense opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-3xl mx-auto text-center transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-12 border border-green-100">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                Vi er her for at hjælpe dig
              </h3>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Sense er en rejse, ikke en destination. Vi har samlet viden, opskrifter og vejledning, der kan støtte dig på vejen mod en sundere livsstil – helt gratis og uden skjulte agendaer.
              </p>
              <p className="text-gray-500 text-sm">
                Alle vores ressourcer er baseret på danske kostråd og er designet til at være praktiske og nemme at følge i hverdagen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hvordan kan FunctionalFoods hjælpe dig i gang? */}
      <section className="py-20 bg-gradient-to-br from-green-50/50 to-blue-50/50">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
                Hvordan kan FunctionalFoods hjælpe dig i gang?
              </h2>
            </div>

            <div className="bg-white rounded-2xl p-8 md:p-12 border-2 border-green-200 shadow-lg mb-8">
              <div className="space-y-6 text-gray-700 leading-relaxed">
                <p className="text-lg">
                  I stedet for, at du skal tælle kalorier, går vores system ud på, at tænke fremad.
                </p>
                
                <p>
                  Vi designer madplaner for dig for næste uge, der ved hjælp af AI er lavet ud fra følgende kriterier:
                </p>
                
                <ul className="space-y-3 list-none">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Din mad ideologi</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Dine mad præferencer</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Din familie og dit liv</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Udregnet efter din krop</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Designet ud fra næste uges tilbud i dine favorit dagligvarebutikker!</span>
                  </li>
                </ul>

                <p className="text-lg font-medium text-gray-900 pt-4">
                  Skal vi hjælpe dig i gang? Det er gratis hos os.
                </p>

                <div className="pt-4">
                  <Link 
                    href="/medlem"
                    className="font-semibold text-green-600 hover:text-green-700 transition-colors inline-flex items-center gap-2"
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
                className="group bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                » Se FF systemet
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/sense" 
                className="group bg-white border-2 border-green-200 text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-green-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                Lær om Sense
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
