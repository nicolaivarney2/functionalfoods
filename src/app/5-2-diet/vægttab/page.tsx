'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Scale,
  Flame,
  Calculator,
  Check,
  BookOpen,
  Calendar,
} from 'lucide-react'
import { Cite } from '@/components/Cite'

export default function FiveTwoDietWeightLossTheoryPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className="relative bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5" />
        </div>
        <div className="container relative text-center">
          <Link href="/5-2-diet" className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til 5:2 Diæt
          </Link>
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            5:2 Diæt & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            5:2-diæt for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            To lette dage og fem almindelige: et simpelt regelsæt, der skaber kalorieunderskud i ugen uden at du skal tælle
            hver eneste bid mandag til fredag.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">Sådan virker det i praksis</h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                På de <strong>fem &quot;5-dage&quot;</strong> spiser du efter sult og sunde vaner – ikke som fri adgang til
                junkfood, men uden streng kalorietælling. På de <strong>to &quot;2-dage&quot;</strong> holder du dig omkring
                500–600 kcal (kvinder ofte i den lave ende, mænd lidt højere), fordelt på proteinholdige og fiberrige valg så
                du ikke kun lever af saft.
              </p>
              <p>
                Den gennemsnitlige ugentlige kaloriebalance bliver lavere end ved fri spisning, hvilket over tid giver vægttab
                for de fleste – uden at du behøver mikrostyre hver dag.<Cite color="amber" n={1} />
              </p>
              <p>
                <strong>Intermitterende faste</strong> i denne form handler mindre om magi og mere om struktur: færre
                beslutninger, tydeligere rammer og lettere at kombinere med job og familie end mange små faste-vinduer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-amber-50/40 to-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Hvad siger forskningen?</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed mb-8">
              <p>
                Den oprindelige 5:2-form blev populær i medierne efter Michael Mosleys TV-dokumentarer; siden er der kommet
                randomiserede forsøg, der sammenligner 5:2 med kontinuerlig kaloribegrænsning – ofte med sammenligneligt
                vægttab over 3–6 måneder, når det samlede kalorieindtag matcher.<Cite color="amber" n={2} />
              </p>
              <p>
                Nogle studier viser også forbedret insulinfølsomhed og blodtryk hos overvægtige voksne, men effekterne er
                individuelle og kræver, at fastedagene faktisk er moderate – ikke en sultekur der ender i overspisning dagen
                efter.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-2">Illustration (placeholder)</p>
              <p>
                Graf: ugens kalorier – fem stabile søjler og to lave, med teksten &quot;underskud i gennemsnit uden daglig
                tælling&quot;.
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
              <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Byg lavkaloriedagen med næring</h2>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-8 mb-8">
              <ul className="space-y-3 text-gray-800">
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Protein: æg, skyr, tofu, kylling – holder sulten nede.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Grøntsager i store mængder: salat, suppe, wok med minimalt olie.</span>
                </li>
                <li className="flex gap-3">
                  <Check className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Drik vand, te, kaffe uden kalorier – undgå at &quot;spise&quot; kalorier i drikkevarer.</span>
                </li>
              </ul>
            </div>
            <p className="text-gray-700 leading-relaxed mb-6">
              På FunctionalFoods vælger du blot{' '}
              <Link href="/madbudget" className="text-amber-700 font-semibold hover:underline">
                Madbudget
              </Link>{' '}
              og sætter 5:2 som kostplan. Så klarer systemet resten og bygger en præcis ugeplan, der er
              ernæringsberegnet, vægttabsoptimeret og sammensat ud fra tilbud i de butikker, du har valgt. Det gør 5:2 langt
              lettere at følge i praksis, fordi du ikke selv skal sidde og regne kalorier, fordeling eller indkøb sammen.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-amber-50/20">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Hvem bør være ekstra forsigtige?</h2>
            </div>
            <p className="text-gray-700 leading-relaxed space-y-4">
              Gravide, ammende, personer med diabetes (især på insulin), spiseforstyrrelser eller medicin der kræver mad bør
              tale med læge eller diætist før lavkaloriedage. Børn og teenagere skal som udgangspunkt ikke følge 5:2 efter voksenmodel.
            </p>
          </div>
        </div>
      </section>

      <section id="kilder" className="py-16 bg-gray-50 border-t scroll-mt-20">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-800" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kilder og referencer</h2>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm text-sm text-gray-700 space-y-4">
            <p id="kilde-1" className="scroll-mt-24">
              <span className="font-semibold text-amber-800">1.</span> Harvie MN, et al. The effect of intermittent energy
              and carbohydrate restriction v. daily energy restriction on weight loss and metabolic disease risk markers in
              overweight women. <em>Br J Nutr</em>. 2013;110(8):1534-1547.{' '}
              <a href="https://doi.org/10.1017/S0007114513000792" className="text-amber-800 hover:underline" target="_blank" rel="noopener noreferrer">
                DOI
              </a>
            </p>
            <p id="kilde-2" className="scroll-mt-24">
              <span className="font-semibold text-amber-800">2.</span> Seimon RV, et al. Do intermittent diets provide
              physiological benefits over continuous diets for weight loss? <em>Obes Rev</em>. 2015;16(12):1040-1050.{' '}
              <a href="https://doi.org/10.1111/obr.12327" className="text-amber-800 hover:underline" target="_blank" rel="noopener noreferrer">
                DOI
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-amber-600 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5" />
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">Næste skridt</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              href="/5-2-diet/opskrifter"
              className="bg-white text-amber-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-xl flex items-center gap-2 justify-center"
            >
              Se 5:2-opskrifter
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </Link>
            <Link href="/madbudget" className="bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/30">
              Åbn Madbudget
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
