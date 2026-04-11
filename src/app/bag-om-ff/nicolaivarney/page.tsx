import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  HeartPulse,
  PenLine,
  Rocket,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Om Nicolai Varney | Functional Foods',
  description:
    'Hvem er nicolaivarney bag bloggen: paramediciner, stifter af Functional Foods, tidligere Ketoliv – og hvorfor sundhed skal kunne bruges i dansk hverdag.',
  openGraph: {
    title: 'Om Nicolai Varney',
    description:
      'Paramediciner og iværksætter bag Functional Foods. Læs om baggrund, arbejde og hvad du kan forvente af indholdet.',
  },
}

const activities = [
  {
    icon: Rocket,
    title: 'Functional Foods',
    text: 'At bygge madplaner og værktøjer der er forankret i danske butikker, tilbud og familier – ikke i teoretiske idealer.',
  },
  {
    icon: PenLine,
    title: 'Skrive & forklare',
    text: 'Blog, guides og indhold der skærer overflødighed fra og hjælper dig med at træffe bedre valg uden at miste overblikket.',
  },
  {
    icon: Stethoscope,
    title: 'Paramediciner',
    text: 'Klinisk erfaring fra det præhospitale: hurtige beslutninger, fysiologi og hvad der faktisk virker, når det gælder.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Mad & hverdag',
    text: 'Passion for mad der smager af noget – og som kan planlægges, så den passer ind i en travl uge.',
  },
]

export default function BagOmFFNicolaiVarneyPage() {
  return (
    <div className="bg-white text-slate-900">
      <nav
        className="border-b border-slate-200/80 bg-slate-50/90"
        aria-label="Brødkrumme"
      >
        <div className="container mx-auto px-4 py-3 max-w-4xl flex items-center gap-1.5 text-sm text-slate-600">
          <Link href="/bag-om-ff" className="text-emerald-700 hover:text-emerald-800 hover:underline">
            Om os
          </Link>
          <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />
          <span className="text-slate-900 font-medium">Nicolai Varney</span>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container mx-auto px-4 py-16 sm:py-20 max-w-4xl relative">
          <p className="text-emerald-300/90 text-sm font-medium tracking-wide uppercase mb-4">
            nicolaivarney · blog &amp; produkt
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
            Om Nicolai Varney
          </h1>
          <p className="mt-4 text-xl sm:text-2xl text-emerald-100/95 font-medium max-w-2xl leading-snug">
            Paramediciner og iværksætter – med fokus på sundhed der kan bruges i virkeligheden, ikke på papiret.
          </p>
          <p className="mt-6 text-lg text-emerald-100/90 leading-relaxed max-w-2xl">
            Jeg er ikke “vægttabscoach” – et titelord alle kan tage. Jeg er paramediciner. Den samme tilgang – at skære overflødighed fra og handle ud fra det, vi ved – er den, jeg bringer ind i det, jeg skriver og bygger her.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-slate-50/80">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-center">
            <div className="relative shrink-0 w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-xl border border-white/10 bg-slate-200">
              <Image
                src="https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/blog-sections/blog-section-1775638404611-acf5b7b13d.webp"
                alt="Nicolai Varney, stifter af Functional Foods"
                fill
                sizes="(min-width: 1024px) 288px, (min-width: 640px) 256px, 256px"
                className="object-cover object-center"
                priority
              />
            </div>
            <div className="text-center lg:text-left max-w-2xl">
              <p className="text-sm font-medium text-emerald-800 uppercase tracking-wide">
                Stifter, Functional Foods
              </p>
              <p className="mt-3 text-lg sm:text-xl text-slate-600 leading-relaxed">
                Autoriseret paramediciner · iværksætter · madentusiast · forfatter. Tidligere bl.a. stifter af{' '}
                <span className="text-slate-800 font-medium">Ketoliv, LalaToys og Woodstein</span> og forfatter
                til vægttabskategori bestselleren{' '}
                <cite className="not-italic font-medium text-slate-800">Ketoliv</cite>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 sm:py-16 max-w-6xl">
        <div className="max-w-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">Det jeg bruger tid på</h2>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Et overblik over de roller, der farver både bloggen og produktet – på linje med den måde, jeg gerne vil møde dig: konkret og uden unødig prestige.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {activities.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <Icon className="w-10 h-10 text-emerald-600 mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed text-sm sm:text-base">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 text-slate-100 py-14 sm:py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">Baggrund og tilgang</h2>
          <div className="mt-8 space-y-5 text-slate-300 leading-relaxed text-lg">
            <p>
              I det præhospitale beredskab arbejder jeg i krydsfeltet mellem akutte beslutninger, fysiologi og det der faktisk virker, når det gælder. Den erfaring bruger jeg, når jeg skriver om kost, vane og vægt: sundhed skal kunne stå distancen i en travl hverdag – ikke kun i et perfekt scenarie.
            </p>
            <p>
              Jeg brænder for at kombinere <strong className="font-semibold text-white">teknologi, vægttab og mad</strong> på en måde der gør en reel forskel. Målet er at lade systemet bære det tunge, så du kan bruge kræfter på livet uden for skærmen.
            </p>
            <p>
              I Functional Foods er fokus det næste skridt efter fællesskab og bøger om kost: produkter og indhold der er forankret i{' '}
              <span className="text-white font-medium">dansk dagligvarevirkelighed og tillid</span> – ikke i tomme løfter.
            </p>
          </div>
          <blockquote className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 text-emerald-100/95 italic text-lg leading-relaxed">
            Vi tager ikke et gammelt svar for gode varer, hvis den tilgængelige viden i dag peger en anden vej – men vi pakker det ind i noget du kan bruge i morgen, ikke kun i teorien.
          </blockquote>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14 sm:py-16 max-w-3xl">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-8 sm:p-10">
          <HeartPulse className="w-10 h-10 text-emerald-600 mb-4" strokeWidth={1.25} />
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Hvad du kan forvente af mine tekster</h2>
          <ul className="mt-6 space-y-3 text-slate-600 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-emerald-600 font-bold">·</span>
              <span>Professionel enkelhed frem for at gøre det sværere end nødvendigt.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-600 font-bold">·</span>
              <span>Økonomisk og praktisk realisme – også når vi taler om madplaner og budget.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-600 font-bold">·</span>
              <span>Dansk forankring: vaner og butikker du kender, ikke et generisk marked langt væk.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-slate-50/80 py-14">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <BookOpen className="w-10 h-10 text-emerald-600 mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-semibold text-slate-900">Hele historien om Functional Foods</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            På hovedsiden Om os finder du mission, team og løftet til dig som bruger.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/bag-om-ff"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold px-6 py-3.5 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Tilbage til Om os
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/kom-i-gang"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 font-medium px-6 py-3.5 hover:bg-slate-50 transition-colors"
            >
              Kom i gang
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-14 sm:py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl font-semibold text-slate-900 text-center">Kontakt</h2>
          <p className="mt-4 text-slate-600 leading-relaxed text-center">
            Har du brug for at kontakte mig personligt, så skriv til{' '}
            <a
              href="mailto:w@nicolaivarney.dk"
              className="text-emerald-700 font-medium hover:text-emerald-800 underline underline-offset-2"
            >
              w@nicolaivarney.dk
            </a>{' '}
            eller fang mig på sociale medier.
          </p>
          <ul className="mt-8 flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3 sm:gap-4">
            <li>
              <a
                href="https://www.instagram.com/nicolaivarney"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                Instagram
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" aria-hidden />
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/nicolaivarney"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                Facebook
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" aria-hidden />
              </a>
            </li>
            <li>
              <a
                href="https://dk.linkedin.com/in/nicolai-varney"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-colors"
              >
                LinkedIn
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" aria-hidden />
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
