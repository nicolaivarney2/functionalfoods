'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Atom, Brain, Eye, Flame } from 'lucide-react'

export default function KalorietaellingTeoriPage() {
  const [visible, setVisible] = useState(false)
  useEffect(() => setVisible(true), [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      <section className="relative bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 py-20 lg:py-28">
        <div className="container max-w-4xl">
          <Link
            href="/kalorietaelling"
            className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 mb-8 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbage til kalorietælling
          </Link>
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-3">Teori</p>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Hvorfor kalorietælling stadig er et stærkt værktøj - og hvorfor forudberegnede madplaner hjælper
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Her samler vi den fysiske logik bag vægttab, de psykologiske faldgruber de fleste møder, og hvordan
              FunctionalFoods designer rundt om dem: <strong>normal mad</strong>, <strong>klare tal</strong>,{' '}
              <strong>mindre gætteri</strong>.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-t border-gray-100">
        <div className="container max-w-3xl prose prose-lg prose-slate">
          <div className="flex items-center gap-3 not-prose mb-6">
            <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center">
              <Atom className="w-6 h-6 text-sky-800" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">1. Energibalance - termodynamikkens første lov</h2>
          </div>
          <p>
            Kroppen følger energibevarelse: hvis du over en længere periode får <strong>mere energi ind end du forbrænder</strong>,
            lagres overskuddet typisk som fedt. Er du i <strong>balance</strong>, holder vægten sig. Er du i et{' '}
            <strong>gennemsnitligt underskud</strong>, falder energilagerne - og vægten følger med, alt andet lige.
          </p>
          <p>
            Det betyder ikke, at alle kalorier føles ens i kroppen (mæthed, smag, mikronæring betyder noget for succes), men
            uden et rimeligt bud på energiindtag bliver underskuddet ofte et skøn - og skøn fejler systematisk. Derfor
            arbejder vi med <strong>planlagte kalorier</strong> i madplanen, så du ikke skal gætte dig frem hver aften.
          </p>
        </div>
      </section>

      <section className="py-16 bg-slate-50/80">
        <div className="container max-w-3xl prose prose-lg prose-slate">
          <div className="flex items-center gap-3 not-prose mb-6">
            <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
              <Brain className="w-6 h-6 text-violet-800" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">2. Beslutningstræthed</h2>
          </div>
          <p>
            Hverdagens mentale kapacitet er begrænset. Når du konstant skal vælge, veje, søge i apps og omregne, slides den
            konto ned - og når den er tom, vælger mange det, der er <em>nemt</em>, ikke det, der matcher målet.
          </p>
          <p>
            En madplan med forudlagte retter og kalorier flytter beslutningerne væk fra klokken 18.00, hvor viljen ofte er
            lav, og over i noget, du kan følge næsten på autopilot: <strong>du skal ikke vælge - du skal udføre</strong>. Det
            øger sandsynligheden for, at du faktisk holder planen i uger og måneder.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container max-w-3xl prose prose-lg prose-slate">
          <div className="flex items-center gap-3 not-prose mb-6">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <Eye className="w-6 h-6 text-amber-900" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">3. Portionsforvirring</h2>
          </div>
          <p>
            Studier viser igen og igen, at vi er dårlige til at gætte kalorieindtag - ofte med store fejl, især for fedt,
            olie, nødder og drikkevarer. En &quot;håndfuld&quot; eller &quot;lidt ekstra&quot; kan være hundredvis af
            kalorier.
          </p>
          <p>
            Foruddefinerede portioner i en plan fungerer som <strong>kalibrering</strong>: du lærer, hvordan en passende
            mængde ser ud på tallerkenen, uden at skulle veje alt for evigt. Målet er ikke perfektionisme - det er et
            realistisk og gentageligt mønster.
          </p>
        </div>
      </section>

      <section className="py-16 bg-emerald-50/50">
        <div className="container max-w-3xl prose prose-lg prose-slate">
          <div className="flex items-center gap-3 not-prose mb-6">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Flame className="w-6 h-6 text-emerald-900" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 m-0">4. Fordeling af makroer og mæthed (TEF og praksis)</h2>
          </div>
          <p>
            Protein har typisk højere <strong>termisk effekt af mad</strong> (TEF) end fedt og kulhydrat - kroppen bruger
            lidt flere kalorier på at fordøje det. Protein og fiber bidrager desuden ofte til <strong>mæthed pr. kalorie</strong>.
            Derfor er det ikke nok kun at tælle kalorier som isolerede tal; i praksis vælger vi sammensætninger, der gør det
            lettere at holde underskuddet uden konstant sultfølelse.
          </p>
          <p>
            På FunctionalFoods er retterne ernæringsberegnede, så du kan se protein, kulhydrat, fedt og fiber - ikke kun
            energien. Det understøtter både vægttab og familiehverdag: du kan justere portion, mens børnene stadig får den
            næring, de har brug for.
          </p>
        </div>
      </section>

      <section className="py-16 bg-white border-t border-gray-100">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Hvorfor &quot;tælle kalorier&quot;, når vi kan gøre det for dig?</h2>
          <ul className="space-y-4 text-gray-700 leading-relaxed">
            <li>
              <strong className="text-gray-900">Præcision:</strong> færre skjulte fejl fra gætteri og spontane tilvalg.
            </li>
            <li>
              <strong className="text-gray-900">Mental frihed:</strong> færre mikrobeslutninger i supermarkedet og køkkenet.
            </li>
            <li>
              <strong className="text-gray-900">Forudsigelighed:</strong> når gennemsnittet over ugen stemmer med dit mål,
                følger biologien med - uden at du skal være regnskabsfører ved hvert måltid.
            </li>
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/kalorietaelling/vaegttab"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Kalorietælling & vægttab
            </Link>
            <Link
              href="/madbudget"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            >
              Prøv Madbudget
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
