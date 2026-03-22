import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Heart,
  HeartPulse,
  Lightbulb,
  MapPin,
  Rocket,
  Shield,
  Sparkles,
  Store,
  Users,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Om os | Functional Foods',
  description:
    'Hvem står bag Functional Foods, og hvorfor vi bygger madplaner der følger danske tilbud, din familie og dit budget.',
  openGraph: {
    title: 'Om Functional Foods',
    description:
      'Mission, team og løfte: sundhed i hverdagen uden unødig kompleksitet – med rod i evidens og dansk dagligvarevirkelighed.',
  },
}

export default function BagOmFFPage() {
  return (
    <div className="bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container mx-auto px-4 py-16 sm:py-24 max-w-4xl relative">
          <p className="text-emerald-300/90 text-sm font-medium tracking-wide uppercase mb-4">
            Functional Foods
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            Sundhed skal ikke være et fuldtidsjob – det skal være en{' '}
            <span className="text-amber-300">funktion af din hverdag</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-emerald-100/95 leading-relaxed max-w-2xl">
            Vi bygger værktøjer, der tager udgangspunkt i danske butikker, rigtige priser og den virkelighed du faktisk lever i – ikke i perfekte slides.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="border-b border-slate-100 bg-slate-50/80">
        <div className="container mx-auto px-4 py-14 sm:py-18 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">Hvorfor vi findes</h2>
          <div className="mt-6 space-y-4 text-slate-600 leading-relaxed text-lg">
            <p>
              Vægttab og sundhed er for mange blevet unødigt kompliceret: uoverskuelige madplaner, eksotiske ingredienslister og budgetter der eksploderer, fordi planen ikke er skrevet til{' '}
              <em className="text-slate-800 not-italic font-medium">dit</em> indkøb.
            </p>
            <p>
              Hos Functional Foods er målet enkelt: at fjerne friktionen mellem dig og de valg, du alligevel vil træffe. Vi kombinerer teknologi med en reel passion for mad og hverdag – så du kan bruge kræfter på at leve, ikke på at jonglere regneark og specialvarer.
            </p>
            <p className="text-slate-800 font-medium">
              Vi synkroniserer madplaner med det, der faktisk er på tilbud i danske dagligvarebutikker – og tilpasser familie, smag og energibehov. Sundhed behøver hverken være dyrt eller tidskrævende at planlægge.
            </p>
          </div>
        </div>
      </section>

      {/* Pain → svar */}
      <section className="container mx-auto px-4 py-14 sm:py-18 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">Det vi ser derude</h2>
          <p className="mt-3 text-slate-600">
            Tre mønstre, vi har valgt at løse på – i stedet for at gentage gamle løfter.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Lightbulb,
              title: 'Uoverskuelighed',
              text: 'For meget teori og for lidt struktur der passer ind i en travl uge.',
              accent: 'bg-amber-50 border-amber-100 text-amber-900',
            },
            {
              icon: Sparkles,
              title: '“Perfekte” planer',
              text: 'Opskrifter med alt for mange ingredienser – og en indkøbsregning der ikke holder i praksis.',
              accent: 'bg-rose-50 border-rose-100 text-rose-900',
            },
            {
              icon: Store,
              title: 'Løsrevet fra butikken',
              text: 'Planen kunne virke på papiret, men den taler ikke med det, du kan købe til en fair pris her og nu.',
              accent: 'bg-emerald-50 border-emerald-100 text-emerald-900',
            },
          ].map(({ icon: Icon, title, text, accent }) => (
            <article
              key={title}
              className={`rounded-2xl border p-6 shadow-sm ${accent}`}
            >
              <Icon className="w-10 h-10 mb-4 opacity-90" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed opacity-95">{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FF difference */}
      <section className="bg-slate-900 text-slate-100 py-14 sm:py-18">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white">Hvad vi gør anderledes</h2>
              <p className="mt-4 text-slate-300 leading-relaxed">
                Vi lover ikke mirakler. Vi lover et system, der er bygget til dansk hverdag: butikker du kender, tilbud der findes i virkeligheden, og planer du kan regenerere når ugen skifter.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Madplaner der forholder sig til aktuelle tilbud og priser – ikke til en ideel verdenshandel.',
                  'Familie, smag og kalorier samlet, så planen kan bruges – ikke bare læses.',
                  'Teknologi der tager det tunge (planlægning, overblik, struktur), så du kan fokusere på at spise og leve.',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-200 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-8 backdrop-blur-sm">
              <HeartPulse className="w-12 h-12 text-emerald-400 mb-4" strokeWidth={1.25} />
              <blockquote className="text-lg sm:text-xl text-white font-medium leading-snug">
                Vi tager ikke et gammelt svar for gode varer, hvis den tilgængelige viden i dag peger en anden vej – men vi pakker det ind i noget du kan bruge i morgen, ikke kun i teorien.
              </blockquote>
              <p className="mt-6 text-sm text-slate-400">
                Det er den samme nysgerrighed, vi bruger i produktet: lytte, måle og forbedre – i takt med at du bruger det.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="container mx-auto px-4 py-14 sm:py-20 max-w-6xl">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-5 gap-0">
            <div className="lg:col-span-2 bg-gradient-to-br from-emerald-700 to-emerald-900 p-10 lg:p-12 text-white flex flex-col justify-center min-h-[280px]">
              <p className="text-emerald-200 text-sm font-medium uppercase tracking-wide">Stifter</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold">Nicolai Varney</h2>
              <p className="mt-4 text-emerald-100/95 leading-relaxed">
                Autoriseret paramediciner · iværksætter · madentusiast · forfatter
              </p>
            </div>
            <div className="lg:col-span-3 p-8 sm:p-10 lg:p-12 space-y-5 text-slate-600 leading-relaxed">
              <p className="text-slate-900 font-semibold text-lg">
                Jeg er ikke “vægttabscoach” – et titelord alle kan tage. Jeg er paramediciner.
              </p>
              <p>
                I det præhospitale beredskab arbejder jeg i krydsfeltet mellem akutte beslutninger, fysiologi og det der faktisk virker, når det gælder. Den tilgang – at skære overflødighed fra og handle ud fra det, vi ved – er den samme, jeg bringer ind i Functional Foods.
              </p>
              <p>
                Jeg brænder for at kombinere <strong className="font-semibold text-slate-800">teknologi, vægttab og mad</strong> på en måde der gør en reel forskel: at lade systemet bære det tunge, så flere kan få overskud til livet udenfor app’en.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-900 text-xs font-medium px-3 py-1 border border-emerald-100">
                  <HeartPulse className="w-3.5 h-3.5" /> Paramediciner
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-800 text-xs font-medium px-3 py-1 border border-slate-200">
                  <Rocket className="w-3.5 h-3.5" /> Serieiværksætter
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-950 text-xs font-medium px-3 py-1 border border-amber-100">
                  <BookOpen className="w-3.5 h-3.5" /> Forfatter
                </span>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">
                  Tidligere bl.a. stifter af <span className="text-slate-700 font-medium">Ketoliv</span> og forfatter til bestselleren{' '}
                  <cite className="not-italic">Ketoliv</cite> – erfaring med at bygge fællesskab og indhold omkring kost, og med hvad der skal til for at gøre sundhed <em className="not-italic">bæredygtig</em> over tid. I Functional Foods er fokus det næste skridt:{' '}
                  <span className="text-slate-800 font-medium">
                    produkter der er forankret i dansk dagligvarevirkelighed og tillid – ikke i tomme løfter.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 border-y border-slate-100 py-14 sm:py-18">
        <div className="container mx-auto px-4 max-w-6xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 text-center mb-10">
            Vores løfte til dig
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: 'Dansk forankring',
                desc: 'Vi bygger til danske butikker, vaner og standarder – ikke til et generisk marked et andet steds på kortet.',
              },
              {
                icon: Shield,
                title: 'Økonomisk realisme',
                desc: 'Planer der kan møde et budget – og et valgfrit ugentligt budgetloft, så vi i praksis prioriterer tilbud og enkelhed.',
              },
              {
                icon: Users,
                title: 'Professionel enkelhed',
                desc: 'Ingen prestige i at gøre det sværere end nødvendigt. Mad der smager godt, og et system du faktisk bruger.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center px-2">
                <div className="inline-flex rounded-2xl bg-white p-4 shadow-sm border border-slate-100 mb-4">
                  <Icon className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Culture + CTA */}
      <section className="container mx-auto px-4 py-14 sm:py-18 max-w-3xl text-center">
        <Heart className="w-10 h-10 text-rose-500 mx-auto mb-4" strokeWidth={1.5} />
        <h2 className="text-2xl font-semibold text-slate-900">Kort fra dig til os</h2>
        <p className="mt-4 text-slate-600 leading-relaxed">
          Vi er et lille, nørdet hold med hjertet på det rette sted. Du er den vigtigste i ligningen: vi lytter, når du fortæller os hvad der virker – og hvad der skal være bedre. Du bestemmer retningen; vi lægger stenene på vejen.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/kom-i-gang"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold px-6 py-3.5 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Opret dig
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/madbudget"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 font-medium px-6 py-3.5 hover:bg-slate-50 transition-colors"
          >
            Se Madbudget
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Spørgsmål eller feedback? Skriv til os via din profil eller den kontakt du allerede har til Functional Foods – vi læser med.
        </p>
      </section>
    </div>
  )
}
