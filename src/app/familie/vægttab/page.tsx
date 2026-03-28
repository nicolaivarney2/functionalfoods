'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Scale,
  Users,
  Heart,
  BookOpen,
  UtensilsCrossed,
  Baby,
  Sparkles,
} from 'lucide-react'
import { Cite } from '@/components/Cite'

export default function FamilieWeightLossTheoryPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5" />
        </div>
        <div className="container relative text-center">
          <Link href="/familie" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Familiemad
          </Link>
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Familiemad & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Familiemad for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Én madplan til bordet – ernæringsberegnet til dit kalorieunderskud, men stadig smag og fællesskab for børn og
            voksne.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">Hvorfor familiemad og vægttab hører sammen</h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                Når voksne skal tabe sig, sker det ofte i et hjem hvor børn stadig skal have vækst, calcium og energi til
                leg. At lave <strong>to forskellige menuer</strong> hver aften er hurtigt uholdbart. Familiemad-konceptet
                handler om én ret med næring til alle – og så justerer den voksne portion eller tilbehør, så dit daglige
                kalorieunderskud stadig rammer målet.
              </p>
              <p>
                På FunctionalFoods er opskrifterne bygget med fuld næringsdeklaration: du kan stole på, at proteinet, fiberen
                og mikronæringen er med – ikke kun &quot;lave kalorier&quot; på etiketten.<Cite color="blue" n={1} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-blue-50/40 to-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Ernæringsberegnet – ikke bare &quot;sundt&quot;</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                <strong>Vægttab kræver et gennemsnitligt underskud</strong> over tid. Familiemad betyder ikke, at alle skal
                spise slankemad: det betyder, at retterne er sammensat, så du kan trække voksneportionen ned i energi (fx
                mindre pasta, mere salat, magert kød) uden at børnene mister vækstnæring.
              </p>
              <p>
                Med <Link href="/madbudget" className="text-blue-700 font-semibold hover:underline">Madbudget</Link> kan du
                planlægge ugen med samme retter til familien og se præcis, hvordan dine kalorier fordeler sig – inklusiv
                protein for mæthed og fiber for tarm og stabilt blodsukker.
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
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Praktiske strategier</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-10">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Baby className="w-5 h-5" /> Børn
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Fuld fedt i mejerier til små børn efter anbefaling, ekstra grønt på tallerkenen, og fælles proteinkilde
                  (fisk, kylling, bønner) som alle kan lide.
                </p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50/50 p-6">
                <h3 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Voksne
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Skær i olie, dressing og stivelse først; behold samme protein og grønt. Suppler med gåture eller styrke når
                  hverdagen tillader det.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-2">Illustration (placeholder)</p>
              <p>
                Familie om bordet: samme gryderet, forskellige skåle med tilbehør (salat, brød, ekstra ost til børn) – med
                små kalorie-tal ved siden af voksenportionen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Mental overskud i en travl hverdag</h2>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed">
              Når du ikke skal træffe 14 forskellige diætbeslutninger om dagen, frigør du mental kapacitet til alt det andet –
              børn, job, søvn. En planlagt familiemenu med dokumenteret næring er et stærkt værktøj til bæredygtigt vægttab.
            </p>
          </div>
        </div>
      </section>

      <section id="kilder" className="py-16 bg-gray-50 border-t scroll-mt-20">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-800" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kilder og referencer</h2>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm text-sm text-gray-700">
            <p id="kilde-1" className="scroll-mt-24">
              <span className="font-semibold text-blue-800">1.</span> Nordic Nutrition Recommendations 2023 – anbefalinger for
              børn, unge og voksne (familiemåltider og næringsstoffer).{' '}
              <a href="https://www.norden.org/en/publication/nordic-nutrition-recommendations-2023" className="text-blue-700 hover:underline" target="_blank" rel="noopener noreferrer">
                NNR 2023
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5" />
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">Kom i gang</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              href="/familie/opskrifter"
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-xl flex items-center gap-2 justify-center"
            >
              Se familiemad-opskrifter
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </Link>
            <Link href="/madbudget" className="bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/30">
              Planlæg i Madbudget
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
