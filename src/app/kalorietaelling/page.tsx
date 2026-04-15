'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Brain, Sparkles, ChevronRight, BookOpen, Calculator } from 'lucide-react'

export default function KalorietaellingHubPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className="relative bg-gradient-to-br from-white via-sky-50/40 to-emerald-50/30 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-emerald-500/5" />
        </div>

        <div className="container relative">
          <div
            className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-900 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Calculator className="w-4 h-4" />
              Kalorietælling · normal mad · planlagt energi
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Kalorietælling
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-600">
                på forhånd - ikke i svingdøren
              </span>
            </h1>

            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Du udfylder <strong>familieindstillinger</strong> og dit mål. Så får du en <strong>nøje beregning</strong> af dit
              daglige kaloriebehov, en <strong>præcis madplan</strong>, en <strong>personlig indkøbsliste</strong> ud fra
              tilbud - og derefter skal du &quot;bare&quot; følge planen og spise sundt. Kalorier, makroer og mikro er lagt ind,
              før ugen starter.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Teori + praksis · dokumenteret næring · gratis værktøjer
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`text-center mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">Hvorfor det virker (kort fortalt)</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Vægttab følger af et <strong>gennemsnitligt energiunderskud</strong> over tid. Pointen med kalorietælling på forhånd
              er, at du slipper for at gætte, når træthed og sult presser dømmekraften. Tallene i planen er bundet til
              ingredienserne - så du kan stole på, at ugen som helhed rammer det spor, du har valgt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <Link
              href="/kalorietaelling/vaegttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-sky-200 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-sky-600 transition-colors">
                    Kalorietælling & vægttab
                  </h3>
                  <p className="text-gray-500">Plan + resultat</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Mere om energibalance, mæthed, præcision - og hvordan en fastlagt madplan gør underskuddet til noget du kan
                holde i hverdagen.
              </p>
              <div className="flex items-center text-sky-600 group-hover:text-sky-700 font-medium">
                Læs om vægttab med kalorietælling
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/kalorietaelling/teori"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-emerald-200 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-sky-500 rounded-2xl flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    Teori om kalorietælling
                  </h3>
                  <p className="text-gray-500">Bevis og psykologi</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Energibalance, beslutningstræthed, portionsforvirring og TEF - kort, læsbart, uden pseudovidenskab.
              </p>
              <div className="flex items-center text-emerald-600 group-hover:text-emerald-700 font-medium">
                Gå til teori-siden
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/familie/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-sky-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    Opskrifter
                  </h3>
                  <p className="text-gray-500">Hverdagsklassikere</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Retter med fuld næringsdeklaration - klar til at blive lagt ind i din plan, så kalorietællingen sker før
                indkøb, ikke bagefter.
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                Se opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-sky-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div
              className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Sådan fungerer{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-600">
                  kalorietælling hos os
                </span>
              </h2>

              <ol className="space-y-5 text-lg text-gray-700 list-decimal list-inside leading-relaxed">
                <li>
                  <strong className="text-gray-900">Familieindstillinger</strong> - voksne, mål, aktivitet, måltider, butikker.
                </li>
                <li>
                  <strong className="text-gray-900">Beregning</strong> - dit daglige energibehov og makromål ud fra profilen.
                </li>
                <li>
                  <strong className="text-gray-900">Madplan</strong> - ugen sammensættes med næringstal pr. ret og pr. dag.
                </li>
                <li>
                  <strong className="text-gray-900">Indkøb</strong> - listen bygger på tilbud, så planen også er realistisk i
                  kassen.
                </li>
                <li>
                  <strong className="text-gray-900">Udførsel</strong> - du følger planen. Mindre regnearbejde, mere handling.
                </li>
              </ol>

              <p className="text-base text-gray-600 mt-8 leading-relaxed">
                Hele idéen er, at <strong>beslutningerne er taget, før ugen begynder</strong>. Det er derfor, vi kalder det
                kalorietælling på forhånd - ikke fordi kroppen er simplere, men fordi din hverdag bliver det.
              </p>
            </div>

            <div
              className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
            >
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-sky-500/10 border border-sky-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Hvorfor vi stoler på tallene</h3>
                </div>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Opskrifterne er koblet til ingrediensdata, så kalorier og makroer (og mikro, hvor data findes) følger af
                  indholdet - ikke af en løs anbefaling. Når ugen er lagt, kan du se daglige totaler og gennemsnit i{' '}
                  <Link href="/madbudget" className="text-sky-700 font-semibold hover:underline">
                    Madbudget
                  </Link>
                  - og når du deler madplanen, kan modtageren se samme ernæringsspor (hvis planen er gemt med næringsfelter).
                </p>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">·</span>
                    Underskud du kan holde - fordi mæthed og struktur er med i købet.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">·</span>
                    Færre skjulte kalorier fra improvisation, når planen allerede er lukket.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-600 font-bold">·</span>
                    Samme motor som før under motorhjelmen - bare med et navn, der siger, hvad du får ud af det.
                  </li>
                </ul>
                <p className="text-sm text-gray-500 mt-6">
                  Blog med hverdag, vaner og inspiration:{' '}
                  <Link href="/blog/familie" className="text-sky-700 font-medium hover:underline">
                    /blog/familie
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-sky-600 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5" />
        <div className="container relative">
          <div
            className={`text-center transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Klar til ugen?
            </h2>
            <p className="text-xl text-sky-100 mb-12 max-w-3xl mx-auto">
              Åbn Madbudget, vælg kalorietælling som kostretning - eller læs teorien først.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
              <Link
                href="/madbudget"
                className="group bg-white text-sky-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 inline-flex items-center gap-2"
              >
                Åbn Madbudget
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/kalorietaelling/teori"
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 inline-flex items-center gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Læs teorien
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
