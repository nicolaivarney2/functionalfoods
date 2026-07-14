import Link from 'next/link'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { Cite } from '@/components/Cite'
import { HEALTH_DISCLAIMER, HEALTH_SOURCES } from '@/lib/health-sources'

export const metadata = {
  title: 'Kilder og beregningsmetode | Functional Foods',
  description:
    'Kilder til kalorieberegning, makromål, ernæringsreferenceværdier og vægttabsråd i Functional Foods-appen.',
}

export default function HealthMethodologyPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-gray-100 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/40 py-12 sm:py-16">
        <div className="container max-w-3xl">
          <Link
            href="/madbudget"
            className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Tilbage til Madbudget
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-4">
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            Kilder & metode
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Sådan beregner vi kalorier, makro og ernæringsråd
          </h1>
          <p className="mt-4 text-base text-gray-600 leading-relaxed">
            Denne side samler de videnskabelige og officielle kilder bag personlige kalorietal, makromål og
            vejledende ernæringsinformation i Functional Foods.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <div className="container max-w-3xl space-y-10 text-gray-700 leading-relaxed">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4 text-sm text-amber-950">
            {HEALTH_DISCLAIMER}
          </div>

          <article className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Kalorietarget og energibehov</h2>
            <p>
              Dit daglige kalorietarget estimeres ud fra basal stofskifte (BMR) med{' '}
              <strong>Mifflin-St Jeor-ligningen</strong>
              <Cite n={1} color="emerald" />, ganget med en aktivitetsfaktor for at finde dagligt energiforbrug
              (TDEE). Ved vægttabsmål trækkes ca. 20% fra TDEE; ved vedligehold bruges TDEE; ved muskelopbygning
              lægges ca. 15% til. Det følger almindelig praksis for struktureret energibalance
              <Cite n={5} color="emerald" />
              <Cite n={2} color="emerald" /> — ikke en medicinsk ordination.
            </p>
          </article>

          <article className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Makrofordeling</h2>
            <p>
              Protein, kulhydrat og fedt fordeles ud fra den valgte kosttype (fx keto, proteinrig, kalorietælling).
              Andelene ligger inden for vejledende rammer fra nordiske og nationale anbefalinger
              <Cite n={2} color="emerald" />
              <Cite n={3} color="emerald" /> og bruges til at sammenligne din madplan — ikke som individuelle
              behandlingsmål.
            </p>
          </article>

          <article className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Vitaminer og næringsdata</h2>
            <p>
              Opskrifters næringsindhold bygger på <strong>FRIDA/DTU</strong>
              <Cite n={4} color="emerald" />. Vitamindækning i appen sammenlignes med vejledende daglige
              referenceværdier for voksne (EFSA/Nordisk kontekst)
              <Cite n={8} color="emerald" />
              <Cite n={2} color="emerald" />.
            </p>
          </article>

          <article className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Vægttabsråd og livsstil</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Spis til mæthed ved måltider</strong> — generelt kostråd om portioner og vaner
                <Cite n={3} color="emerald" />.
              </li>
              <li>
                <strong>Fysisk aktivitet</strong> — daglig bevægelse kan øge energiforbrug og understøtte
                sundhed
                <Cite n={6} color="emerald" />.
              </li>
              <li>
                <strong>Periodisk faste</strong> — nogle bruger kortere spisevinduer; effekt og egnethed varierer
                individuelt og er beskrevet i faglitteratur
                <Cite n={7} color="emerald" />. Det er ikke en anbefaling til alle.
              </li>
            </ul>
          </article>

          <article id="kilder" className="scroll-mt-24 space-y-4 border-t border-gray-200 pt-10">
            <h2 className="text-xl font-bold text-gray-900">Referenceliste</h2>
            <ol className="space-y-4 text-sm">
              {HEALTH_SOURCES.map((source) => (
                <li key={source.id} id={`kilde-${source.id}`} className="scroll-mt-24 flex gap-3">
                  <span className="font-semibold text-emerald-800 shrink-0 w-6">{source.id}.</span>
                  <span>
                    {source.label}
                    {source.note ? (
                      <>
                        {' '}
                        <span className="text-gray-500">({source.note})</span>
                      </>
                    ) : null}{' '}
                    <a
                      href={source.href}
                      className="text-emerald-700 hover:underline break-words"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.href.replace(/^https?:\/\//, '')}
                    </a>
                  </span>
                </li>
              ))}
            </ol>
          </article>
        </div>
      </section>
    </main>
  )
}
