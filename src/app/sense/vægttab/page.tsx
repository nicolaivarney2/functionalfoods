'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Scale, Hand, UtensilsCrossed, Target, AlertCircle, CheckCircle2, XCircle, Clock, Leaf } from 'lucide-react'

export default function SenseWeightLossTheoryPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-green-50/30 to-teal-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-teal-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/sense" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Sense
          </Link>
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Sense & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Sense for <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan Sense-principperne hjælper dig med at tabe dig gennem enkel portionskontrol og sunde vaner.
          </p>
        </div>
      </section>

      {/* What is Sense - Short Intro */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <div className={`text-center mb-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Hvad er Sense – helt kort?
            </h2>
          </div>

          <div className={`bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 mb-12 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Sense er en måde at spise på, hvor du bruger <strong>hænderne i stedet for en køkkenvægt</strong>:
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 border border-green-100">
                <UtensilsCrossed className="w-8 h-8 text-green-600 mb-4" />
                <p className="text-gray-700 font-medium">Du spiser typisk <strong>3 måltider</strong> om dagen</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-blue-100">
                <Hand className="w-8 h-8 text-blue-600 mb-4" />
                <p className="text-gray-700 font-medium">Hvert måltid består af <strong>3–4 håndfulde</strong> mad + 1–3 spsk fedtstof</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-emerald-100">
                <Target className="w-8 h-8 text-emerald-600 mb-4" />
                <p className="text-gray-700 font-medium">Ingen kalorietælling, ingen "forbudte" fødevarer – fokus er på <strong>mæthed, struktur og vaner</strong></p>
              </div>
            </div>

            <p className="text-gray-600 mb-8">
              Sense er udviklet til både vægttab og vægtvedligeholdelse – og er bygget på helt almindelig mad, du kan købe i supermarkedet.
            </p>

          </div>

          {/* Video: Hvad er sense, forklaret på 5 minutter */}
          <div className={`mb-12 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Hvad er Sense, forklaret på 5 minutter</h3>
              <p className="text-gray-600 mb-6">Se Suzy Wengel fra SenseMyDiet forklare Sense-metoden:</p>
              <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/Owcp4DOvnY0"
                  title="Hvad er Sense, forklaret på 5 minutter"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-gray-500 mt-4 italic">Video af Suzy Wengel fra SenseMyDiet</p>
            </div>
          </div>
        </div>
      </section>

      {/* How does Sense work for weight loss */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container max-w-4xl mx-auto">
          <div className={`mb-12 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
              Hvad er grundlogikken i at tabe sig med Sense?
            </h2>
            
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100">
              <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                For at tabe dig skal du være i <strong>kalorieunderskud</strong> – dvs. spise mindre energi end du forbrænder. Sense hjælper dig derhen ved at:
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Hand className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Begrænse mængden gennem håndfulde</h4>
                    <p className="text-gray-600">Hænderne er dit naturlige mål – ingen apps eller vægte nødvendige.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Prioritere mad, der mætter</h4>
                    <p className="text-gray-600">Protein, grønt og fedt i fornuftige mængder holder dig mæt længere.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Fjerne småsnacking og flydende kalorier</h4>
                    <p className="text-gray-600">Sodavand, juice og "uhm jeg nappede lige lidt" – disse kalorier tæller også.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-green-50 border border-green-200 rounded-2xl p-6">
                <h4 className="font-semibold text-green-900 mb-3">Så du taber dig med Sense, når du:</h4>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>Spiser 2–3 Sense-måltider om dagen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>Holder dig nogenlunde inden for spisekasse-modellen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span>Lader snacks/slik/kage være ekstra, du aktivt vælger til/fra (og ikke noget der "bare sker")</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sense Spisekasse */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <div className={`mb-12 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
              Sense-spisekassen: <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Sådan skal dine måltider bygges</span>
            </h2>
            
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 mb-8">
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Et klassisk Sense-måltid (en spisekasse) ser sådan ud:
              </p>
              
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border-2 border-green-200">
                  <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
                    <Leaf className="w-6 h-6" />
                    Grøntsager (1–2 håndfulde)
                  </h3>
                  <p className="text-gray-700 mb-2">Alt ikke-stivelsesholdigt grønt: salat, tomat, agurk, broccoli, blomkål, peberfrugt, kål osv.</p>
                  <p className="text-sm text-gray-600 italic">Formål: Fylde maven, få fibre, vitaminer og øge mæthed.</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6" />
                    Protein (1 håndfuld)
                  </h3>
                  <p className="text-gray-700 mb-2">Kød, fisk, æg, mejeriprodukter med protein, bælgfrugter etc.</p>
                  <p className="text-sm text-gray-600 italic">Formål: Mæthed, mindre lyst til at snacke, bevarer muskelmasse under vægttab.</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border-2 border-amber-200">
                  <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
                    <UtensilsCrossed className="w-6 h-6" />
                    Stivelse/frugt (0–1 håndfuld)
                  </h3>
                  <p className="text-gray-700 mb-2">Kartofler, ris, pasta, brød, frugt.</p>
                  <p className="text-sm text-gray-600 italic">Her ligger meget af energien – derfor kan man justere ned for at øge vægttabet.</p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border-2 border-emerald-200">
                  <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">🥑</span>
                    + 1–3 spsk fedtstof
                  </h3>
                  <p className="text-gray-700 mb-2">Olie, smør, nødder, mayonnaise, fede mejeriprodukter osv.</p>
                  <p className="text-sm text-gray-600 italic">Fedt mætter og gør maden lækker – men er energitæt, så mængden betyder noget.</p>
                </div>
              </div>

              <div className="mt-8 bg-white rounded-2xl p-6 border-2 border-gray-200">
                <h4 className="font-bold text-gray-900 mb-2">Pointen:</h4>
                <p className="text-gray-700">
                  Når du konsekvent bygger 2–3 måltider om dagen efter de her principper, vil langt de fleste automatisk komme i et moderat kalorieunderskud og tabe sig.
                </p>
              </div>
            </div>
          </div>

          {/* Videos about spisekasser */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Om spisekasser og håndfulde på Sense</h3>
                <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/KX0HcZRQIeY"
                    title="Om spisekasser og håndfulde på Sense"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="text-sm text-gray-500 italic">Video af Suzy Wengel fra SenseMyDiet</p>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Spisekasser og mad-håndfulde</h3>
                <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/vNBS4EpcEsg"
                    title="Spisekasser og mad-håndfulde"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="text-sm text-gray-500 italic">Video af Suzy Wengel fra SenseMyDiet</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-3 meals per day */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container max-w-4xl mx-auto">
          <div className={`bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              2–3 måltider om dagen – hvorfor er det vigtigt?
            </h2>
            
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Sense anbefaler typisk <strong>3 måltider om dagen</strong> – nogle bruger 2 større (fx brunch + aftensmad).
            </p>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Det hjælper dig med:</h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <XCircle className="w-8 h-8 text-green-600 mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Mindre småspisning mellem måltider</h4>
                <p className="text-gray-600 text-sm">Tydelig struktur reducerer impulsspisning.</p>
              </div>
              
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <Target className="w-8 h-8 text-blue-600 mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Mere mæthed pr. måltid</h4>
                <p className="text-gray-600 text-sm">Større måltider mætter bedre end små snacks.</p>
              </div>
              
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-3" />
                <h4 className="font-semibold text-gray-900 mb-2">Tydeligt skel mellem "Jeg spiser" vs. "Jeg spiser ikke nu"</h4>
                <p className="text-gray-600 text-sm">Klar ramme gør det nemmere at holde strukturen.</p>
              </div>
            </div>

            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <AlertCircle className="w-6 h-6 text-amber-600 mb-3" />
              <p className="text-gray-700">
                <strong>Vigtigt:</strong> Hvis du hele tiden går og "lige tager lidt", kan du hurtigt spise et helt måltid ekstra uden at opdage det – og så forsvinder kalorieunderskuddet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Friheder og lækkerier */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <div className={`bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              Friheder og "lækkerier" – hvordan passer de ind?
            </h2>
            
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Sense er <strong>ikke asketisk</strong> – du må gerne få:
            </p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-gray-700 font-medium">Slik</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-gray-700 font-medium">Kage</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-gray-700 font-medium">Vin</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <p className="text-gray-700 font-medium">Hvidt brød osv.</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Men vægttab afhænger af <strong>mængde og hyppighed</strong>. I praksis:
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="bg-white rounded-xl p-5 border-l-4 border-green-500">
                <p className="text-gray-700"><strong>Vælg dine "lækkerier" med vilje</strong> (fx 1–2 aftaler om ugen)</p>
              </div>
              <div className="bg-white rounded-xl p-5 border-l-4 border-blue-500">
                <p className="text-gray-700"><strong>Tænk:</strong> "Hvad vil jeg virkelig nyde?" frem for automatisk at tage alt der byder sig</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <h4 className="font-semibold text-red-900 mb-3">Hvis vægten står stille → skær lidt fra i:</h4>
              <ul className="space-y-2 text-red-800">
                <li className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Flydende kalorier (sodavand, juice, alkohol)</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Små snacks (vingummi, småkager, ostemadder i smug)</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Store portioner stivelse (pasta, ris, brød)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How fast do you lose weight */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container max-w-4xl mx-auto">
          <div className={`bg-white rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 flex items-center gap-3">
              <Clock className="w-10 h-10 text-green-600" />
              Hvor hurtigt taber man sig på Sense?
            </h2>
            
            <p className="text-xl text-gray-700 mb-8 leading-relaxed">
              Det vil naturligt svinge, men typisk sigter man efter ca.:
            </p>
            
            <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl p-6 mb-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 mb-2">0,5–1 kg om ugen</p>
                <p className="text-gray-600">i opstartsfasen</p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Senere kan det bremse lidt op – og det er helt normalt.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <h4 className="font-semibold text-green-900 mb-3">Det vigtigste er ikke tempoet, men at du:</h4>
              <ul className="space-y-2 text-green-800">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Kan holde ud at leve sådan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Ikke konstant føler dig mega sulten</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Føler, at det her faktisk kan blive din nye normal</span>
                </li>
              </ul>
            </div>

            <p className="text-gray-700 mt-6 italic">
              Hvis du kan tabe dig lidt langsomt, men stabilt, og stadig have et liv – så er det der, Sense virkelig skinner.
            </p>
          </div>
        </div>
      </section>

      {/* Concrete steps */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <div className={`mb-12 transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
              Konkrete trin: <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Sådan starter du vægttab med Sense</span>
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Lær spisekassen udenad</h3>
                    <p className="text-gray-700 mb-4">Tegn den evt. på papir eller download deres skemaer (kostdagbog, sultbarometer osv.)</p>
                    <p className="text-gray-700 mb-4">Øv dig i at se på din tallerken og tænke:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span>"Har jeg 1–2 håndfulde grønt?"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>"Har jeg 1 håndfuld protein?"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 mt-1">•</span>
                        <span>"Har jeg max 1 håndfuld stivelse/frugt?"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-emerald-600 mt-1">•</span>
                        <span>"Har jeg 1–3 spsk fedt nogenlunde?"</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Planlæg dine 2–3 hovedmåltider</h3>
                    <p className="text-gray-700 mb-4">Eksempel på dag:</p>
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="font-semibold text-gray-900 mb-1">Morgenmad:</p>
                        <p className="text-gray-600 text-sm">Skyr med bær, lidt müsli og nødder (grønt/frugt + protein + lidt stivelse + fedt)</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="font-semibold text-gray-900 mb-1">Frokost:</p>
                        <p className="text-gray-600 text-sm">Rugbrød med pålæg og grøntsager eller salat med kylling, pasta og dressing</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="font-semibold text-gray-900 mb-1">Aftensmad:</p>
                        <p className="text-gray-600 text-sm">Kød/fisk + masser af grønt + lidt kartofler/ris/pasta + fedt i form af olie/dressing</p>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-4 italic">Hold fx snacks på et minimum i starten, så du lige får styr på strukturen.</p>
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-sm text-gray-700">
                        <strong>Tip:</strong> Brug vores Sense-optimeret opskrifter til at bygge din madplan. Alle opskrifterne er allerede bygget op efter Sense-principperne, så du kan lave en komplet Sense madplan med os.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Fjern de værste "kaloriefælder"</h3>
                    <p className="text-gray-700 mb-4">Start med at justere her, hvis du vil tabe dig hurtigere:</p>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>Sukkerholdige drikke – skift til vand, light-sodavand, kaffe/te uden sukker</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>Sluk-skærm-snacking om aftenen</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>"Lige lidt ekstra" portion nr. 2 af stivelse (pasta, ris, brød)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">Følg vægten – uden at blive slave af den</h3>
                    <ul className="space-y-3 text-gray-700 mb-4">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Vej dig fx 1 gang om ugen på samme tidspunkt</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Kigger du mere, så kig på trend over 2–4 uger, ikke enkeltdage</span>
                      </li>
                    </ul>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-gray-700 mb-2"><strong>Hvis vægten står stille i 3–4 uger, så:</strong></p>
                      <ul className="space-y-1 text-gray-700 text-sm">
                        <li>• Skær lidt ned på stivelse eller fedt i 1–2 måltider om dagen</li>
                        <li>• Gennemgå en uge og vær brutalt ærlig omkring snacks, alkohol og "småting"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Common mistakes */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-red-50/30">
        <div className="container max-w-4xl mx-auto">
          <div className={`mb-12 transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
              Typiske fejl, der <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">stopper vægttab</span> med Sense
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border-2 border-red-200 shadow-lg">
                <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  "Sense + alt det ekstra"
                </h3>
                <p className="text-gray-700 mb-2">Du følger spisekasserne – men oveni kommer:</p>
                <ul className="space-y-1 text-gray-600 mb-3">
                  <li>• Kage på jobbet</li>
                  <li>• Vingummi i bilen</li>
                  <li>• Chokolade om aftenen</li>
                </ul>
                <p className="text-red-700 font-semibold">→ Resultat: Du er reelt i kalorieoverskud.</p>
              </div>

              <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-lg">
                <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  For meget flydende energi
                </h3>
                <p className="text-gray-700 mb-2">Juice, cafékaffe, vin, kakao, iskaffe med sirup</p>
                <p className="text-orange-700 font-semibold">→ De mætter dårligt men fylder meget i regnskabet.</p>
              </div>

              <div className="bg-white rounded-3xl p-8 border-2 border-amber-200 shadow-lg">
                <h3 className="text-xl font-bold text-amber-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Ingen protein = ingen mæthed
                </h3>
                <p className="text-gray-700 mb-2">Hvis din tallerken mest er brød, kartoffel og grønt, men næsten ingen protein, vil du:</p>
                <ul className="space-y-1 text-gray-600 mb-3">
                  <li>• Blive hurtigere sulten</li>
                  <li>• Have mere lyst til sødt</li>
                </ul>
                <p className="text-amber-700 font-semibold">→ Så får du sværere ved at holde underskud.</p>
              </div>

              <div className="bg-white rounded-3xl p-8 border-2 border-red-200 shadow-lg">
                <h3 className="text-xl font-bold text-red-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Du spiser "pænt" mandag–torsdag, men…
                </h3>
                <p className="text-gray-700 mb-2">Fredag, lørdag (og nogle gange søndag) vælter kalorierne ind.</p>
                <p className="text-red-700 font-semibold">→ Ét stort weekend-"overskud" kan neutralisere et helt uges flot underskud.</p>
              </div>

              <div className="bg-white rounded-3xl p-8 border-2 border-orange-200 shadow-lg">
                <h3 className="text-xl font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Du ændrer for meget på én gang
                </h3>
                <p className="text-gray-700 mb-2">Du går all in → taber dig → bliver træt → falder tilbage i gamle vaner.</p>
                <p className="text-orange-700 font-semibold">→ Hellere 2–3 realistiske justeringer, du kan holde, end perfekt i 2 uger og så stop.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video: Forklaring af hvad Sense kan og ikke kan */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <div className={`mb-8 transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Forklaring af hvad Sense kan (og ikke kan)</h3>
              <p className="text-gray-600 mb-6">Se Suzy Wengel fra SenseMyDiet forklare hvad Sense kan og ikke kan:</p>
              <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/CMGJFc5Va74"
                  title="Forklaring af hvad Sense kan og ikke kan"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-gray-500 mt-4 italic">Video af Suzy Wengel fra SenseMyDiet</p>
            </div>
          </div>

          {/* Video: Efter de første 14 dage */}
          <div className={`transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Efter de første 14 dage på Sense</h3>
              <p className="text-gray-600 mb-6">Se Suzy Wengel fra SenseMyDiet forklare hvad der sker efter de første 14 dage:</p>
              <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/AD63xH5dU9I"
                  title="Efter de første 14 dage på Sense"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="text-sm text-gray-500 mt-4 italic">Video af Suzy Wengel fra SenseMyDiet</p>
            </div>
          </div>
        </div>
      </section>

      {/* Is Sense for you */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container max-w-4xl mx-auto">
          <div className={`grid md:grid-cols-2 gap-8 transition-all duration-1000 delay-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-green-50 rounded-3xl p-8 border-2 border-green-200">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <h3 className="text-2xl font-bold text-gray-900">Sense kan være rigtig godt til dig, hvis:</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Du er træt af kalorietælling og apps</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Du gerne vil have struktur, men stadig fleksibilitet</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Du synes, "almindelig mad" er det, du vil leve af – ikke specialprodukter</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Du kan lide tanken om, at næsten alt er tilladt, men i kontrollerede mængder</span>
                </li>
              </ul>
            </div>

            <div className="bg-red-50 rounded-3xl p-8 border-2 border-red-200">
              <div className="flex items-center gap-3 mb-6">
                <XCircle className="w-8 h-8 text-red-600" />
                <h3 className="text-2xl font-bold text-gray-900">Sense er måske mindre oplagt, hvis:</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Du elsker meget fri spisning uden rammer – og hader alt der minder om "regler"</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Du trives bedst med hardcore tracking (makroer/kalorier) og tal-nørderi</span>
                </li>
                <li className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Du har en spiseforstyrrelse eller meget kompliceret forhold til mad (så bør du altid tale med læge/beh. først)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Hvordan kan FunctionalFoods hjælpe dig i gang? */}
      <section className="py-20 bg-gradient-to-br from-green-50/50 to-blue-50/50">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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

      {/* CTA to Sense Recipes */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-green-200">Sense opskrifter</span>
          </h2>
          <p className="text-xl text-green-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme Sense-opskrifter, der alle er optimeret til Sense-principperne. Byg din Sense madplan med opskrifter, der automatisk passer til spisekasse-modellen.
          </p>
          <Link
            href="/sense/opskrifter"
            className="group bg-white text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se Sense opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
