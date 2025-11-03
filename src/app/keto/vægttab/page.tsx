'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronLeft, Check, X, AlertCircle, Scale, Flame, Heart, Moon, Activity, ShoppingCart, BookOpen, HelpCircle } from 'lucide-react'

export default function KetoWeightLossPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero / Intro */}
      <section className="relative bg-gradient-to-br from-gray-50 via-purple-50/30 to-green-50/20 py-20 lg:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link 
              href="/keto"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Tilbage til keto
            </Link>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
              Tab kiloerne med Keto –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">
                state of the art vægttab på en realistisk måde
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Keto kan gøre vægttab enklere, fordi kombinationen af lavere kulhydrater, høj mæthed og mere protein hjælper din krop til naturligt at spise mindre – uden konstant kamp.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="#keto-essens"
                className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Kom godt i gang
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/blog/keto"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors border-2 border-gray-200"
              >
                Se næste uges madplaner
                <BookOpen className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Grundessencen for Keto og vægttab */}
      <section id="keto-essens" className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Grundessencen af Keto for vægttab
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Vægttab bliver nemmere, når maden mætter. Keto hjælper med høj mæthed via protein og fedt, lavere insulin og færre blodsukkersving.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Mere mæthed",
                  desc: "Protein og fedt giver stærke mæthedssignaler, så du naturligt spiser mindre uden at tælle kalorier konstant.",
                  icon: Check
                },
                {
                  title: "Stabil energi",
                  desc: "Få kulhydrater = mindre insulin og færre cravings. Du får jævn energi i stedet for toppe og dale.",
                  icon: Flame
                },
                {
                  title: "Naturlig struktur",
                  desc: "Keto gør det let at vælge mad, der støtter vægttab: grønt, kød/fisk/æg og sunde fedtkilder.",
                  icon: Target
                }
              ].map((card, idx) => (
                <div key={idx} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                    <card.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Principperne bag Keto og vægttab */}
      <section className="py-20 bg-gradient-to-br from-purple-50/50 via-white to-green-50/50">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Principperne bag et vægttab med Keto
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Forestil dig at bygge din krop om fra "kulhydratbil" til en effektiv "fedt- og ketonbil". Der er en kort omstillingsperiode – så kører det.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Kalorier betyder stadig noget",
                  description: "Keto fjerner ikke fysikkens love – men øger mæthed, så underskud bliver lettere.",
                  icon: Scale,
                  color: "purple"
                },
                {
                  title: "Madkvalitet betyder også noget",
                  description: "Jo mere næringsrig mad, jo nemmere er det at holde kroppen stærk, mæt og stabil.",
                  icon: Leaf,
                  color: "green"
                },
                {
                  title: "Madens densitet tæller",
                  description: "Grønt + protein mætter mere pr. kalorie end sukker og hvidt brød.",
                  icon: Target,
                  color: "blue"
                },
                {
                  title: "Vaner styrer alt",
                  description: "Det er ikke de enkelte måltider, men mønstrene over tid, der bestemmer resultatet.",
                  icon: Zap,
                  color: "orange"
                }
              ].map((principle, idx) => {
                const colorClasses = {
                  purple: "bg-purple-100 text-purple-600 border-purple-200",
                  green: "bg-green-100 text-green-600 border-green-200",
                  blue: "bg-blue-100 text-blue-600 border-blue-200",
                  orange: "bg-orange-100 text-orange-600 border-orange-200"
                }
                return (
                  <div key={idx} className="bg-white rounded-2xl p-6 border-2 hover:shadow-lg transition-all">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 border-2 ${colorClasses[principle.color as keyof typeof colorClasses]}`}>
                      <principle.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{principle.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{principle.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Info-boks */}
            <div className="mt-12 bg-white rounded-2xl p-8 border-2 border-purple-200 text-center">
              <p className="text-gray-700 text-sm">
                På keto øges forbrændingen en smule, sult dæmpes af lavere insulin og maden mætter. Det gør det nemmere at holde underskud – uden at det føles som straf.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 faser til vægttab med Keto */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                4 faser til vægttab med Keto
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                En praktisk ramme, der hjælper dig fra start til optimering
              </p>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-6 border border-purple-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">1) Kend til Keto (starten)</h3>
                <p className="text-gray-700 leading-relaxed">
                  I starten mister kroppen væske, når glykogendepoter tømmes – vægten flytter sig ofte hurtigt, hvilket motiverer. Lær maden at kende og byg rutiner.
                </p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl p-6 border border-yellow-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">2) Overgangssymptomerne (midten)</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Over 1–3 uger tilpasser kroppen sig ketose. Energi kan svinge – det går over igen. Prioritér elektrolytter, vand, søvn og ro.
                </p>
                <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                  <li>Salt/elektrolytter: bouillon, salt på maden, magnesium</li>
                  <li>Vand: 2–3 liter dagligt</li>
                  <li>Søvn og let bevægelse hjælper</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-6 border border-green-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">3) Find ro i det du laver (ny begyndelse)</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Når overgangssymptomerne letter, skab stabilitet: Vælg keto-mad, du kan lide, og definér dine mål (fx 300–500 g/uge). Undgå at blive fanget i daglige vægtudsving.
                </p>
                <ul className="list-disc pl-5 text-gray-700 text-sm space-y-1">
                  <li>Grønt + kød/fisk/æg + fedtkilde (olie, nødder/oliven, ost)</li>
                  <li>Brug madplaner eller en enkel indkøbsliste med keto-venlige basisvarer</li>
                  <li>Gentag yndlingsopskrifter for mindre friktion</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-6 border border-emerald-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">4) Optimer hvor du kan (ny energi)</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Når basen er på plads, kan du optimere i denne rækkefølge. Evaluer efter hvert trin – virker det, behøver du ikke mere.
                </p>
                <ol className="list-decimal pl-5 text-gray-700 text-sm space-y-1">
                  <li><span className="font-semibold">Dyrk motion</span> – 2–4 gange om ugen, hvad som helst du får gjort</li>
                  <li><span className="font-semibold">Periodisk faste</span> – fx 19–10 (15–16 timers faste)</li>
                  <li><span className="font-semibold">Spis 2 måltider</span> – brunch/frokost + aftensmad</li>
                  <li><span className="font-semibold">OMAD</span> – ét måltid dagligt, hvis alt andet fejler (midlertidigt værktøj)</li>
                </ol>
                <div className="mt-3 text-gray-600 text-sm">
                  Andre skruer: mere bevægelse, mindre snacking, lidt mindre portioner, længere faste (24–72 t) efter behov.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hvis du ikke oplever ketose-fordele */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-2xl p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Et lille mente</h3>
              <p className="text-gray-700 leading-relaxed text-sm">
                Oplever du ikke mindre sult eller væskeudskillelse, er du formentlig ikke i ketose. Løsningen er næsten altid færre kulhydrater – ikke mere fedt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tag det én dag ad gangen */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Tag det én dag ad gangen</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Fokuser på næste måltid – ikke de næste 3 måneder. Konsistens slår perfektion.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '🍽', title: 'Tænk ét måltid ad gangen', desc: 'Hold fokus tæt på – det gør det nemt at vinde dagen.' },
                { icon: '😋', title: 'Leg med maden', desc: 'Find keto-opskrifter du kan lide og gentag dem.' },
                { icon: '👀', title: 'Gentag favoritter', desc: 'Undgå beslutningstræthed ved at have faste go-to måltider.' },
                { icon: '🗓', title: 'Brug struktur når du vil', desc: 'Madplan eller simpelt indkøbssystem – vælg det, der støtter dig.' }
              ].map((card, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border-2 border-gray-100 text-center">
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FunctionalFoods positioning */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Vil du bruge værktøjer, der gør det nemmere?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Når du forstår principperne, handler det bare om at gøre dem mulige i praksis
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-green-50 rounded-3xl p-8 md:p-12 border-2 border-purple-200 mb-8">
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                {[
                  { icon: Target, label: "Planlægning" },
                  { icon: BookOpen, label: "Overblik" },
                  { icon: ShoppingCart, label: "Opskrifter" },
                  { icon: Zap, label: "Indkøb" }
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                      <item.icon className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <p className="text-lg text-gray-800 mb-6 leading-relaxed">
                  <strong>FunctionalFoods</strong> samler opskrifter, tilbud og madplaner fra mange kostretninger og gør det let at spise sundt uden at bruge mere tid eller penge.
                </p>
                <p className="text-gray-600 text-sm mb-8">
                  Men du kan sagtens bruge alt, du har lært her – helt uden os.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/madbudget"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Se madbudget system
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/blog/keto"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors border-2 border-gray-200"
                  >
                    Se keto guides
                    <BookOpen className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Placeholder for madplan mockup */}
              <div className="mt-8 bg-white rounded-xl p-6 border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-500 text-sm">Neutralt screenshot/mockup af en madplan – ikke reklame, men kontekst</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vægttab handler om mere end mad */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Vægttab handler om mere end mad
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                En holistisk tilgang til sund balance
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Søvn og stress",
                  description: "Påvirker vægten. Dårlig søvn øger kortisol, der øger appetit og fedtlagring. Stress gør det samme.",
                  icon: Moon
                },
                {
                  title: "Bevægelse",
                  description: "Øger forbrænding og humør. Du behøver ikke træne hårdt – bare blive i bevægelse regelmæssigt.",
                  icon: Activity
                },
                {
                  title: "Vaner",
                  description: "Gør resultaterne holdbare. Det er ikke en diæt, det er en livsstil. Små, konsekvente ændringer slår store, uholdbare.",
                  icon: Zap
                },
                {
                  title: "Realistiske mål",
                  description: "Det er en rejse, ikke et quick fix. Vægttab tager tid. Accepter det, så bliver det nemmere.",
                  icon: Target
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-3xl mx-auto transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <HelpCircle className="w-6 h-6 text-purple-600" />
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                  Ofte stillede spørgsmål
                </h2>
              </div>
              <p className="text-lg text-gray-600">
                Svar på de spørgsmål, du måske har
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Skal jeg tælle kalorier på Keto?",
                  a: "Ikke nødvendigvis. Brug kalorier som et fejlfindingsværktøj, ikke som førstevalg. Keto gør det ofte muligt at spise mindre uden at tælle, fordi du er mere mæt."
                },
                {
                  q: "Hvordan kommer jeg hurtigere i ketose?",
                  a: "Skær kulhydraterne mere ned, prioriter protein, tilfør salt/elektrolytter og gå ture. Søvn hjælper også."
                },
                {
                  q: "Hvad hvis vægten står stille?",
                  a: "Optimer i rækkefølge: 1) bevægelse, 2) periodisk faste, 3) 2 daglige måltider, 4) OMAD midlertidigt. Evaluer efter hvert skridt."
                },
                {
                  q: "Er Keto farligt?",
                  a: "For raske personer er keto ikke farligt, men kræver forståelse og plan. Sørg for elektrolytter, vand og næring – og tal med din læge ved sygdom/medicin."
                }
              ].map((faq, idx) => (
                <details key={idx} className="bg-gray-50 rounded-xl p-6 border border-gray-200 group">
                  <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between gap-4">
                    <span>{faq.q}</span>
                    <ArrowRight className="w-5 h-5 text-purple-600 transition-transform group-open:rotate-90 flex-shrink-0" />
                  </summary>
                  <p className="mt-4 text-gray-700 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-1600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Start din rejse mod sundt vægttab i dag
            </h2>
            
            <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Spis keto på en jordnær måde: grønt, protein og simple fedtkilder – og optimér først når du er klar.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link 
                href="/keto/opskrifter" 
                className="group bg-white text-purple-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se keto opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/madbudget" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Byg din madplan
                <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              {[
                { label: "Keto opskrifter", href: "/keto/opskrifter" },
                { label: "Dagligvarer", href: "/dagligvarer" },
                { label: "Madbudget", href: "/madbudget" },
                { label: "Keto guides", href: "/blog/keto" }
              ].map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-white font-medium transition-all text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
