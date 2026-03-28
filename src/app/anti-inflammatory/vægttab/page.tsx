'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Scale,
  Brain,
  Heart,
  Leaf,
  Shield,
  Sparkles,
  Check,
  Utensils,
  BookOpen,
} from 'lucide-react'
import { Cite } from '@/components/Cite'

export default function AntiInflammatoryWeightLossTheoryPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className="relative bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5" />
        </div>
        <div className="container relative text-center">
          <Link
            href="/anti-inflammatory"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tilbage til Anti-inflammatorisk
          </Link>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Anti-inflammatorisk & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Anti-inflammatorisk kost for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            En ernæringsrig kost med fokus på hel planter, sunde fedtstoffer og færre forarbejdede valg kan både understøtte
            vægttab og et mere stabilt energi- og humør – uden at du skal leve af salatblade alene.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
              Når vægttab og sundhed arbejder sammen
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
              <p>
                Mange tænker vægttab som &quot;færre kalorier&quot; og sundhed som &quot;flere vitaminer&quot;. I praksis hænger
                det tæt sammen: En kost der er varieret, mættende og rig på næring giver ofte bedre forudsætninger for et
                holdbart kalorieunderskud – og for at du faktisk orker at holde planen i en travl hverdag.
              </p>
              <p>
                Anti-inflammatorisk kost i den brede forstand (ofte overlappende med fx middelhavskost og plante-tunge
                tallerkener) er forbundet med gunstigere markører for kronisk, lavgradig inflammation hos voksne, når den
                erstatter meget forarbejdet mad og ensidig junkfood.<Cite color="emerald" n={1} /><Cite color="emerald" n={2} />
              </p>
              <p>
                <strong>Mental overskud</strong> er ikke et bonus-spor – det er ofte det, der afgør, om du kan planlægge
                måltider, bevæge dig og sove bedre. Fiber, polyfenoler og stabilt blodsukker spiller sammen med tarm og hjerne;
                når måltiderne mætter uden konstante sukkerdyk, oplever mange færre &quot;crash&quot; og mere jævn energi gennem
                dagen.<Cite color="emerald" n={3} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-emerald-50/50 via-white to-green-50/50">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Inflammation i en nutteskal</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                Kroppen bruger inflammation som forsvar – det er sundt på kort sigt. Det, kosten ofte kan påvirke, er den
                mere stille, lavgradige inflammation, der kan følge med overskydende visceralt fedt, rygning, dårlig søvn og
                ensidig kost med meget tilsat sukker og ultraprocessede produkter.
              </p>
              <p>
                Vægttab i sig selv (især fra maven) kan sænke nogle inflammatoriske markører over tid, fordi fedtvæv er
                metabolisk aktivt.<Cite color="emerald" n={4} /> En anti-inflammatorisk madstil understøtter ofte det samme mål: mere fuldkorn,
                bælgfrugter, fisk, nødder, frø, krydderier og farverige grøntsager – og mindre af det, der typisk pakkes ind i
                klar-til-brug snacks og hurtig fastfood.
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
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Hvad prioriterer man i praksis?</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
                <h3 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                  <Leaf className="w-5 h-5" /> Plantemængde
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Grøntsager, bær, bælgfrugter og fuldkorn giver fiber og polyfenoler. Fiber støtter tarmbakterier, der igen
                  producerer kortkædede fedtsyrer med anti-inflammatorisk potentiale.
                </p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50/60 p-6">
                <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5" /> Fedtstof med mening
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Ekstra jomfru olivenolie, nødder, frø og fed fisk bidrager med omega-3 og enkeltumættet fedt frem for store
                  mængder trans- og hærdet fedt fra forarbejdede kager og friture.
                </p>
              </div>
              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-6 md:col-span-2">
                <h3 className="font-bold text-teal-900 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Krydderier og farver
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Gurkemeje, ingefær, hvidløg og urter tilføjer smag uden store mængder sukker og salt – og gør det lettere at
                  holde fast i hjemmelavet mad frem for færdigretter med lange ingredienslister.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-2">Illustration (placeholder)</p>
              <p>
                En tallerken tegnet som &quot;regnbue&quot;: halvdelen grønt, en kvart fuldkorn/bælgfrugter, en kvart magert
                protein (fx fisk, tofu, kylling eller linser), dryppet med olivenolie og krydderurter – med en lille note om
                at det er mønsteret, ikke en religiøs fordeling ned til gram.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-emerald-50/30">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Hjerne, humør og energi</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed mb-8">
              <p>
                Du taber dig ikke af ren viljestyrke – du taber dig af vaner, søvn, stress og tilgængelighed af god mad.
                Systematiske oversigter peger på, at mere plante- og middelhavslignende kostmønstre kan være forbundet med
                lavere risiko for depression og bedre livskvalitet sammenlignet med vestlige mønstre rig på
                ultraprocessede fødevarer.<Cite color="emerald" n={5} />
              </p>
              <p>
                Når din madplan er <strong>ernæringshøj</strong> – dvs. dækker vitaminer, mineraler, proteiner og fedtsyrer du
                faktisk har brug for – slipper du for at rende rundt med skjult underernæring i en kaloribar. Det er præcis den
                kombination, vi bygger ind i FunctionalFoods: makro <em>og</em> mikro synligt i opskrifterne.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="w-6 h-6 text-emerald-600" />
                Sådan bruger du siden sammen med vægttab
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    Vælg anti-inflammatoriske opskrifter og læg dem ind i en uge, hvor du holder et moderat kalorieunderskud.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                  <span>
                    Brug <Link href="/madbudget" className="text-emerald-700 font-medium hover:underline">Madbudget</Link> til
                    at få forslag til måltider, der matcher dine kalorier og samtidig holder fiber og mikronæring højt.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                  <span>
                    Tænk &quot;tilføj først&quot;: flere grøntsager, et ekstra krydderi, en skefuld linser – før du skærer alt
                    væk, der giver dig glæde ved maden.
                  </span>
                </li>
              </ul>
            </div>
            <div className="mt-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-2">Illustration (placeholder)</p>
              <p>
                En simpel infografik: &quot;Før/efter&quot; for energikurve i løbet af dagen – ubalanceret kost med hurtige
                kulhydrater vs. måltider med protein, fiber og sunde fedtstoffer. Kan suppleres med ikoner for søvn, humør og
                træning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">Konklusion</h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                Anti-inflammatorisk vægttab handler om at spise dig sundere og lettere – ikke om perfektion. Jo mere dine
                måltider ligner &quot;rigtig mad&quot; med råvarer, jo lettere er det ofte at holde kalorierne i skak uden at
                føle dig ussel.
              </p>
              <p>
                På FunctionalFoods kan du kombinere <strong>vægtmål</strong> med <strong>høj næringskvalitet</strong>: samme
                ret kan vise både kalorier og indhold af omega-3, jern, magnesium og antioxidanter, så du ved, at du ikke
                sulter din krop på vej ned i vægt.<Cite color="emerald" n={6} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="kilder" className="py-16 bg-gray-50 border-t border-gray-200 scroll-mt-20">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-emerald-800" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kilder og referencer</h2>
            </div>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Teksten er til information og inspiration og erstatter ikke individuel rådgivning. Ved sygdom eller medicin –
              tal med sundhedsfaglige om kostændringer.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
              <ol className="list-none space-y-5 text-sm text-gray-700 leading-relaxed">
                <li id="kilde-1" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-emerald-800 shrink-0 w-6">1.</span>
                  <span>
                    Estruch R, et al. Primary Prevention of Cardiovascular Disease with a Mediterranean Diet (PREDIMED).
                    <em> N Engl J Med</em>. 2013;368(14):1279-1290. (Middelhavskost, fedtprofil og helbred.){' '}
                    <a
                      href="https://doi.org/10.1056/NEJMoa1200303"
                      className="text-emerald-700 hover:underline break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      doi.org/10.1056/NEJMoa1200303
                    </a>
                  </span>
                </li>
                <li id="kilde-2" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-emerald-800 shrink-0 w-6">2.</span>
                  <span>
                    Calder PC. Omega-3 fatty acids and inflammatory processes. <em>Nutrients</em>. 2010;2(3):355-374.{' '}
                    <a
                      href="https://doi.org/10.3390/nu2030355"
                      className="text-emerald-700 hover:underline break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      doi.org/10.3390/nu2030355
                    </a>
                  </span>
                </li>
                <li id="kilde-3" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-emerald-800 shrink-0 w-6">3.</span>
                  <span>
                    Sonnenburg JL, Sonnenburg ED. Starving the microbial self: the deleterious consequences of a diet deficient
                    in microbiota-accessible carbohydrates. <em>Cell Metab</em>. 2014;20(5):779-786. (Fiber og tarmbakterier.){' '}
                    <a
                      href="https://doi.org/10.1016/j.cmet.2014.07.003"
                      className="text-emerald-700 hover:underline break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      doi.org/10.1016/j.cmet.2014.07.003
                    </a>
                  </span>
                </li>
                <li id="kilde-4" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-emerald-800 shrink-0 w-6">4.</span>
                  <span>
                    World Cancer Research Fund / American Institute for Cancer Research. Diet, Nutrition, Physical Activity
                    and Cancer: a Global Perspective. Continuous Update Project (overvægt, fedme og risiko).{' '}
                    <a
                      href="https://www.wcrf.org/diet-activity-and-cancer/"
                      className="text-emerald-700 hover:underline break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      wcrf.org
                    </a>
                  </span>
                </li>
                <li id="kilde-5" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-emerald-800 shrink-0 w-6">5.</span>
                  <span>
                    Lassale C, et al. Healthy dietary indices and risk of depressive outcomes: a systematic review and
                    meta-analysis of observational studies. <em>Mol Psychiatry</em>. 2019;24(7):965-986.{' '}
                    <a
                      href="https://doi.org/10.1038/s41380-018-0237-8"
                      className="text-emerald-700 hover:underline break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      doi.org/10.1038/s41380-018-0237-8
                    </a>
                  </span>
                </li>
                <li id="kilde-6" className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-emerald-800 shrink-0 w-6">6.</span>
                  <span>
                    Nordic Nutrition Recommendations 2023 – principper for balanceret kost i Norden.{' '}
                    <a
                      href="https://www.norden.org/en/publication/nordic-nutrition-recommendations-2023"
                      className="text-emerald-700 hover:underline break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      NNR 2023
                    </a>
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-emerald-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5" />
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-emerald-200">anti-inflammatoriske opskrifter</span>
          </h2>
          <p className="text-xl text-emerald-100 mb-10 max-w-3xl mx-auto">
            Udforsk opskrifter med fokus på hel råvarer, krydderier og sunde fedtstoffer – klar til din næste madplan.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap">
            <Link
              href="/anti-inflammatory/opskrifter"
              className="group bg-white text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center"
            >
              Se anti-inflammatoriske opskrifter
              <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
            </Link>
            <Link
              href="/madbudget"
              className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 flex items-center gap-2 justify-center"
            >
              Åbn Madbudget
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
