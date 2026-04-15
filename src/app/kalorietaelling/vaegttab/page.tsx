'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Scale,
  Heart,
  BookOpen,
  UtensilsCrossed,
  Sparkles,
  ListOrdered,
} from 'lucide-react'
import { Cite } from '@/components/Cite'

export default function KalorietaellingVaegttabPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className="relative bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 to-emerald-500/5" />
        </div>
        <div className="container relative text-center">
          <Link
            href="/kalorietaelling"
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tilbage til kalorietælling
          </Link>
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-900 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Kalorietælling & vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Vægttab med{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-emerald-600">
              kalorier på forhånd
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-6 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Når du ved, hvad ugen indeholder i energi og næring, behøver du ikke gætte dig frem hver aften. Hos os er
            kalorietælling <strong>forudberegnet</strong> i madplanen - bundet til ingredienserne - så underskuddet bliver et
            spor, du kan følge, ikke et regnestykke du skal finde på under pres.
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10">
            Baggrund:{' '}
            <Link href="/kalorietaelling/teori" className="text-sky-700 font-semibold hover:underline">
              teori om kalorietælling
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
              Hvorfor vi ved, at det virker (i praksis)
            </h2>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                <strong>Vægttab følger af et gennemsnitligt energiunderskud</strong> over uger og måneder. Det er ikke en
                mening - det er den samme energibalance, som kostfaglige anbefalinger bygger på. Det, der ofte knækker folk, er
                ikke forståelsen, men <strong>udførelsen</strong>: vi undervurderer kalorier, vi improviserer, når vi er trætte,
                og så forsvinder underskuddet i praksis.
              </p>
              <p>
                Kalorietælling på forhånd løser den del: ugen er <strong>lukket som et budget</strong>, før du går i gang. Du
                har stadig frihed i hverdagen - men inden for rammer, der faktisk matcher dit mål. Når tallene i planen kommer
                fra ingredienserne, bliver det også lettere at stole på summen for ugen - ikke kun på enkeltmåltider.
                <Cite color="blue" n={1} />
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-sky-50/40 to-white">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center">
                <ListOrdered className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Fra profil til tallerken</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                I{' '}
                <Link href="/madbudget" className="text-sky-700 font-semibold hover:underline">
                  Madbudget
                </Link>{' '}
                er flowet bevidst: du starter med <strong>familieindstillinger</strong> (hvem spiser hvad, butikker, mål). Så
                beregnes dit <strong>daglige kaloriebehov</strong> ud fra profilen. Derefter genereres en <strong>madplan</strong>{' '}
                med retter, der allerede har næringsdeklaration - og en <strong>indkøbsliste</strong> der kan tage udgangspunkt i
                tilbud. Til sidst er opgaven simpel: <strong>følg planen</strong>, kog det, der står på listen, og lad ugen
                arbejde for dig.
              </p>
              <p>
                Det er den praktiske side af kalorietælling: <strong>beslutningerne flyttes væk fra sult og træthed</strong> og
                ind i noget, du har forberedt. Jo færre spontane valg, der skal træffes undervejs, jo større sandsynlighed for,
                at gennemsnittet over ugen holder.
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
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Ernæringsberegnet - ikke bare &quot;sundt&quot;</h2>
            </div>
            <div className="prose prose-lg max-w-none text-gray-700 space-y-6 leading-relaxed">
              <p>
                &quot;Sundt&quot; uden tal kan stadig være i overskud energimæssigt. Derfor arbejder vi med{' '}
                <strong>kalorier, makroer og mikro</strong> der, hvor data findes - så du kan se protein og fiber for mæthed,
                og så ugen ikke kun føles rigtig, men også <strong>adderer rigtigt</strong>.
              </p>
              <p>
                Vil du dykke dybere i termodynamik, beslutningstræthed og portioner, er det samlet på{' '}
                <Link href="/kalorietaelling/teori" className="text-sky-700 font-semibold hover:underline">
                  teorien om kalorietælling
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-gray-50 to-sky-50/30">
        <div className="container">
          <div
            className={`max-w-4xl mx-auto transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Holdbarhed over tid</h2>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Vægttab handler ikke kun om én perfekt uge - det handler om at gentage et mønster, du kan holde. Når kalorietælling
              er lagt ind i planen, er det netop et mønster: <strong>færre valg, mere udførelse</strong>. Det giver ro i
              hovedet - og det gør det lettere at holde energien i det spor, du har valgt, uge efter uge.
            </p>
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/80 p-6 text-sm text-gray-600">
              <p className="font-medium text-gray-800 mb-2">Familie uden dobbelt køkken (valgfrit)</p>
              <p>
                Mange vil stadig spise sammen. Samme ret kan give forskellig energi på tallerkenen (portion, tilbehør,
                dressing). Det er et praktisk tip - ikke kernen i kalorietælling. Kernen er: <strong>du kender dagens og ugens
                tal, før du spiser</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="kilder" className="py-16 bg-gray-50 border-t scroll-mt-20">
        <div className="container max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-sky-800" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Kilder og referencer</h2>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm text-sm text-gray-700">
            <p id="kilde-1" className="scroll-mt-24">
              <span className="font-semibold text-sky-800">1.</span> Nordic Nutrition Recommendations 2023 - anbefalinger
              for energi, makronæringsstoffer og måltidsmønstre.{' '}
              <a
                href="https://www.norden.org/en/publication/nordic-nutrition-recommendations-2023"
                className="text-sky-700 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                NNR 2023
              </a>
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-sky-600 to-emerald-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5" />
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white">Kom i gang</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              href="/familie/opskrifter"
              className="bg-white text-sky-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-xl flex items-center gap-2 justify-center"
            >
              Se opskrifter
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </Link>
            <Link href="/madbudget" className="bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/30">
              Planlæg i Madbudget
            </Link>
            <Link
              href="/kalorietaelling/teori"
              className="border border-white/40 text-white px-8 py-4 rounded-2xl font-semibold hover:bg-white/10 inline-flex items-center gap-2 justify-center"
            >
              <Sparkles className="w-5 h-5" />
              Teori
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
