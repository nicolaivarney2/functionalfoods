'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Scale,
  Heart,
  Sprout,
  Users,
  Check,
  BookOpen,
  Target,
} from 'lucide-react'
import { Cite } from '@/components/Cite'

export default function FlexitarianWeightLossTheoryPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className="relative bg-gradient-to-br from-white via-teal-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-green-500/5" />
        </div>
        <div className="container relative text-center">
          <Link
            href="/flexitarian"
            className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tilbage til Fleksitarisk
          </Link>
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Fleksitarisk & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Fleksitarisk kost for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Flere planter på tallerkenen giver ofte mere mæthed per bid, mere fiber og færre &quot;tomme&quot; kalorier – uden
            at du behøver melde dig ud af fællesspisning eller livets bøffer.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">Hvorfor plante-tung kost og vægttab passer sammen</h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                Fleksitarisk betyder <strong>fleksibel vegetar</strong>: du lægger plantekøkkenet i førersædet og bruger kød,
                fisk eller fjerkræ som tilvalg – ikke som hovedingrediens i hvert eneste måltid. Store oversigtsstudier viser,
                at folk der skærer ned på kød og øger grøntsager, bælgfrugter og fuldkorn typisk får lettere ved at holde et
                kalorieunderskud, fordi fiber og protein fra planter øger mætheden.<Cite color="teal" n={1} /><Cite color="teal" n={2} />
              </p>
              <p>
                Samtidig får du ofte <strong>højere næringstæthed</strong>: flere vitaminer, mineraler og fytoaktive stoffer
                pr. kalorie end hvis halvdagen går med pølsehorn og sodavand. Det giver mere mental overskud – færre
                blodsukkerdyk og mere stabil energi til både arbejde og træning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-teal-50/50 to-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Protein og jern – uden stress</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                Et klassisk spørgsmål er: &quot;Får jeg nok protein?&quot; Kombinationen af bælgfrugter, kornprodukter,
                æg, mejeriprodukter og de dage hvor du vælger fisk eller kød, kan sagtens dække behovet til vægttab og
                styrketræning – især hvis du spreder proteinet over dagen.<Cite color="teal" n={3} />
              </p>
              <p>
                <strong>Jern og B12</strong> kræver lidt opmærksomhed hvis kødet er sjældent: kombinér plante-jern (linser,
                spinat) med C-vitamin (citrus, peberfrugt) og overvej B12 fra mælk/æg eller tilskud efter aftale med
                sundhedsfaglig.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Praktisk uge – uden dogmer</h2>
            </div>
            <div className="bg-white rounded-2xl border border-teal-200 p-8 shadow-sm mb-10">
              <ul className="space-y-4 text-gray-700">
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>3–4 dage</strong> helt plante- eller meget plante-tunge (fx linseret, bønnedeller, tofu wok).
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>2–3 dage</strong> med magert animalsk protein – det der passer familien og budgettet.
                  </span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Én fleksibel dag</strong> hvor du spiser ude eller gentager favoritten – uden at alt falder fra
                    hinanden.
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-2">Illustration (placeholder)</p>
              <p>
                Ugekalender med farvekoder: grøn = plante, blå = fisk, orange = kød – plus et lille ikon for &quot;restdag&quot;.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-teal-50/30">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">FunctionalFoods og din plan</h2>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Brug <Link href="/madbudget" className="text-teal-700 font-semibold hover:underline">Madbudget</Link> til at
              sammensætte uger, hvor plantemåltiderne er planlagt på forhånd – så slipper du for at stå og mangle idéer tirsdag
              aften. Vores opskrifter viser kalorier og makroer, så du kan holde underskud uden gætteri.
            </p>
            <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-6 flex items-start gap-4">
              <Heart className="w-6 h-6 text-teal-700 shrink-0 mt-1" />
              <p className="text-teal-900 text-sm leading-relaxed">
                <strong>Miljøgevinst:</strong> Mindre kød betyder typisk lavere klimaaftryk pr. tallerken – en ekstra grund til
                at føle sig godt tilpas ved valget, uanset om vægttabet er mål nummer ét eller to.<Cite color="teal" n={4} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="kilder" className="py-16 bg-gray-50 border-t border-gray-200 scroll-mt-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-teal-800" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kilder og referencer</h2>
            </div>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Udvalgte referencer til plante-tunge kostmønstre, vægt og folkesundhed. Erstatter ikke personlig rådgivning.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
              <ol className="list-none space-y-5 text-sm text-gray-700 leading-relaxed">
                <li id="kilde-1" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-teal-800 shrink-0 w-6">1.</span>
                  <span>
                    Turner-McGrievy G, Mandes T, Crimarco A. A plant-based diet for overweight and obesity prevention and
                    treatment. <em>J Geriatr Cardiol</em>. 2017;14(5):369-374.{' '}
                    <a href="https://pubmed.ncbi.nlm.nih.gov/28557099/" className="text-teal-700 hover:underline" target="_blank" rel="noopener noreferrer">
                      PubMed
                    </a>
                  </span>
                </li>
                <li id="kilde-2" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-teal-800 shrink-0 w-6">2.</span>
                  <span>
                    Qian F, et al. Association Between Plant-Based Dietary Patterns and Risk of Type 2 Diabetes.{' '}
                    <em>JAMA Intern Med</em>. 2019;179(10):1335-1344.{' '}
                    <a href="https://doi.org/10.1001/jamainternmed.2019.2195" className="text-teal-700 hover:underline" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1001/jamainternmed.2019.2195
                    </a>
                  </span>
                </li>
                <li id="kilde-3" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-teal-800 shrink-0 w-6">3.</span>
                  <span>
                    Nordic Nutrition Recommendations 2023 – protein og plantekost.{' '}
                    <a href="https://www.norden.org/en/publication/nordic-nutrition-recommendations-2023" className="text-teal-700 hover:underline" target="_blank" rel="noopener noreferrer">
                      NNR 2023
                    </a>
                  </span>
                </li>
                <li id="kilde-4" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-teal-800 shrink-0 w-6">4.</span>
                  <span>
                    Poore J, Nemecek T. Reducing food’s environmental impacts through producers and consumers.{' '}
                    <em>Science</em>. 2018;360(6392):987-992. (Klima og kostvalg.){' '}
                    <a href="https://doi.org/10.1126/science.aaq0216" className="text-teal-700 hover:underline" target="_blank" rel="noopener noreferrer">
                      doi.org/10.1126/science.aaq0216
                    </a>
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-teal-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5" />
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-teal-200">fleksitariske opskrifter</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              href="/flexitarian/opskrifter"
              className="group bg-white text-teal-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl transition flex items-center gap-2 justify-center"
            >
              Se fleksitariske opskrifter
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </Link>
            <Link href="/madbudget" className="bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/30">
              Madbudget
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
