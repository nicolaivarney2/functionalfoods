'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Brain, ChevronRight, CheckCircle2, XCircle, UtensilsCrossed, Clock } from 'lucide-react'

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
          <div className="max-w-5xl mx-auto">
            <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight text-center">
                Hvad er 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                  {' '}GLP-1 kost?
                </span>
              </h2>
              
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 mb-8">
                <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                  <strong>GLP-1 kosten er en moderne, biologisk funderet kosttilgang, der tager udgangspunkt i kroppens egne mætheds- og appetithormoner</strong> – især hormonet GLP-1 (Glucagon-Like Peptide-1).
                </p>
                
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  GLP-1 er et naturligt hormon, som frigives fra tarmen, når vi spiser. Hormonet spiller en central rolle i:
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-gray-700">Appetitregulering</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Mæthed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700">Blodsukkerkontrol</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    <span className="text-gray-700">Vægtregulering</span>
                  </div>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-6 mb-6">
                  <p className="text-gray-700 leading-relaxed">
                    Det er netop denne mekanisme, som ligger bag vægttabsmedicin som Ozempic og Wegovy. <strong>GLP-1 kosten er inspireret af samme fysiologi – men anvendt gennem mad, måltidsstruktur og fødevarevalg i stedet for (eller som supplement til) medicin.</strong>
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 shadow-xl border border-green-200 mb-8">
                <h3 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
                  Grundidéen
                </h3>
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  GLP-1 kosten handler <strong>ikke om kalorietælling, forbud eller viljestyrke</strong>. Den handler om at spise på en måde, der biologisk reducerer sult, øger mæthed og skaber ro omkring mad.
                </p>
                
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  Når GLP-1 aktiveres optimalt:
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">føler man sig hurtigere mæt</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">spiser man automatisk mindre</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">falder cravings</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">stabiliseres blodsukkeret</span>
                  </div>
                  <div className="flex items-start gap-3 md:col-span-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">bliver vægttab lettere at fastholde</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How GLP-1 Works Physiologically */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
                Hvordan GLP-1 virker fysiologisk
              </h2>
              
              <p className="text-xl text-gray-600 mb-12 text-center max-w-3xl mx-auto leading-relaxed">
                GLP-1 påvirker kroppen på flere niveauer samtidigt:
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border-2 border-blue-200">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Hjernen</h3>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Appetit og mæthed:</strong> GLP-1 sender signaler til mæthedscentre i hjernen, som reducerer sult og lyst til mad. Det er her, følelsen af "ro omkring mad" opstår.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8 border-2 border-green-200">
                  <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6">
                    <UtensilsCrossed className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Maven</h3>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Mavetømning:</strong> GLP-1 sænker hastigheden, hvormed maden forlader maven. Det giver længere mæthed og mere stabile blodsukkerkurver.
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 border-2 border-emerald-200">
                  <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Bugspytkirtlen</h3>
                  <p className="text-gray-700 leading-relaxed">
                    <strong>Blodsukkerkontrol:</strong> GLP-1 øger insulinudskillelsen, men kun når der er sukker i blodet, og dæmper samtidig glukagon. Resultatet er mindre blodsukkerudsving og færre cravings.
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl p-8 border border-blue-200 text-center">
                <p className="text-lg text-gray-700 leading-relaxed">
                  <strong>GLP-1 kosten er designet til at understøtte og forstærke disse mekanismer naturligt.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Characterizes GLP-1 Diet */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className={`transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
                Hvad kendetegner GLP-1 kosten i praksis
              </h2>
              
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 mb-8">
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  GLP-1 kosten fokuserer på fødevarer og måltidsprincipper, som er kendt for at stimulere mæthedshormoner og give langvarig mæthed:
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🥚</div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Protein i hvert måltid</h4>
                      <p className="text-gray-600 text-sm">Fx æg, fisk, kylling, græsk yoghurt, bælgfrugter</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🥬</div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Fiberrige fødevarer</h4>
                      <p className="text-gray-600 text-sm">Grøntsager, fuldkorn, havre, linser</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">🥑</div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Sunde fedtstoffer</h4>
                      <p className="text-gray-600 text-sm">Olivenolie, avocado, nødder</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <XCircle className="w-8 h-8 text-red-500 mt-1" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">Lav andel af ultraforarbejdet mad</h4>
                      <p className="text-gray-600 text-sm">Meget få eller ingen flydende kalorier</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 md:col-span-2">
                    <Clock className="w-8 h-8 text-blue-500 mt-1" />
                    <div>
                      <h4 className="font-bold text-gray-900 mb-2">2–3 mættende måltider frem for konstant snacking</h4>
                      <p className="text-gray-600 text-sm">Fokus er på fødevarer med høj mæthed pr. kalorie og lav påvirkning af blodsukkeret</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What GLP-1 Diet is NOT */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className={`transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
                Hvad GLP-1 kosten <span className="text-red-600">ikke</span> er
              </h2>
              
              <div className="bg-red-50 rounded-3xl p-8 md:p-12 border-2 border-red-200 mb-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700 font-medium">Det er ikke en low-carb, keto eller paleo-kur</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700 font-medium">Det er ikke en sultekur</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700 font-medium">Det er ikke en kalorie-fikseret diæt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-gray-700 font-medium">Det er ikke afhængig af faste, men kan kombineres med faste</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-8 border-t border-red-200">
                  <p className="text-gray-700 leading-relaxed">
                    <strong>GLP-1 kosten kan overlappe med andre kostformer, men er defineret af effekt på appetit og mæthed – ikke af ideologi.</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className={`transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
                For hvem er GLP-1 kosten relevant?
              </h2>
              
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 mb-8">
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  GLP-1 kosten er relevant for flere grupper:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-200">
                    <CheckCircle2 className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-700"><strong>Personer der ønsker vægttab uden konstant sult</strong></p>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-green-50 rounded-2xl border border-green-200">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-700"><strong>Personer med cravings, overspisning eller ustabil appetit</strong></p>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-700"><strong>Personer på GLP-1 medicin, som ønsker kost, der understøtter behandlingen</strong></p>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-teal-50 rounded-2xl border border-teal-200">
                    <CheckCircle2 className="w-6 h-6 text-teal-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-700"><strong>Personer der vil fastholde vægttab efter medicinsk behandling</strong></p>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-200">
                    <CheckCircle2 className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                    <p className="text-gray-700"><strong>Personer med insulinresistens, prædiabetes eller blodsukkerproblemer</strong></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Future-proof perspective */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className={`transition-all duration-1000 delay-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-gradient-to-br from-blue-600 to-green-600 rounded-3xl p-8 md:p-12 shadow-2xl text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Fremtidssikret perspektiv
                </h2>
                
                <p className="text-lg text-blue-50 mb-6 leading-relaxed">
                  Selvom navnet "GLP-1 kost" bruges som indgang, er konceptet bredere end ét hormon. Nyere fedmebehandlinger (fx kombinationer med amylin og GIP) bekræfter, at appetit er hormonstyret – og at mad kan bruges strategisk til at påvirke disse signaler.
                </p>
                
                <div className="bg-white/20 rounded-2xl p-6 backdrop-blur-sm">
                  <p className="text-xl font-semibold text-white leading-relaxed">
                    GLP-1 kosten repræsenterer derfor en ny kategori: <strong>Hormonbaseret appetitkontrol med mad</strong>
                  </p>
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

