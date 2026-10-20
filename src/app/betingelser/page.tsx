import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Betingelser | Functional Foods',
  description:
    'Vilkår for brug af Functional Foods. Tjenesten er gratis. Henvisningsprogrammet kan give et Lifetime-badge.',
  alternates: {
    canonical: 'https://www.functionalfoods.dk/betingelser',
  },
  openGraph: {
    title: 'Betingelser | Functional Foods',
    description: 'Vilkår for Functional Foods. Tjenesten er gratis.',
    url: 'https://www.functionalfoods.dk/betingelser',
  },
}

const LAST_UPDATED = '20. oktober 2026'

export default function BetingelserPage() {
  return (
    <div className="bg-white text-slate-900">
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container max-w-3xl px-4 py-12 sm:py-16">
          <p className="mb-2 text-sm font-medium text-emerald-800">Vilkår</p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Betingelser</h1>
          <p className="text-lg leading-relaxed text-slate-600">
            Disse betingelser gælder, når du bruger Functional Foods på web og i appen — herunder oprettelse
            og henvisningsprogrammet.
          </p>
          <p className="mt-4 text-sm text-slate-500">Sidst opdateret: {LAST_UPDATED}</p>
        </div>
      </section>

      <article className="container max-w-3xl space-y-10 px-4 py-10 text-slate-700 leading-relaxed sm:py-14">
        <section>
          <h2 className="text-xl font-bold text-slate-900">1. Tjenesten</h2>
          <p className="mt-3">
            Functional Foods er et værktøj til madplaner, indkøb og kostoverblik. Indholdet er til information og
            inspiration og erstatter ikke professionel medicinsk rådgivning.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">2. Konto</h2>
          <p className="mt-3">
            Functional Foods er gratis på ubestemt tid. En konto giver madplan, madlog, prisalarmer, community og
            personlig vejledning. Har du et ældre abonnement, kan du opsige det i den kanal, du betalte i (web, App
            Store eller Google Play), så der ikke trækkes mere. Privatlivspolitik:{' '}
            <Link href="/cookies-og-privatliv" className="font-medium text-emerald-800 underline underline-offset-2">
              Cookies og privatliv
            </Link>
            .
          </p>
        </section>

        <section id="henvisning">
          <h2 className="text-xl font-bold text-slate-900">3. Henvisningsprogram og Lifetime</h2>
          <p className="mt-3">
            Du kan dele dit unikke henvisningslink eller din kode. Når 10 personer downloader appen og opretter sig
            via din henvisning, kan du få et <strong>Lifetime</strong>-badge. Tjenesten er allerede gratis. Lifetime
            tildeles manuelt efter gennemgang. Du ser badget i appen, når det er givet.
          </p>
          <p className="mt-3">
            Henvisningsprogrammet med gratis Lifetime som bonus må ikke misbruges. Hvis vi vurderer, at der reelt
            kun er 10 oprettelser uden at nogen af dem oprigtigt har prøvet konceptet, og vi kan dokumentere det, er
            vi berettiget til at fratage Lifetime-abonnementet igen, da det i så fald er vundet i ond tro.
          </p>
          <p className="mt-3">
            Eksempler på misbrug kan være masseoprettelse af tomme konti, fiktive e-mails eller aftaler, hvor de
            henviste aldrig har til hensigt at bruge Functional Foods. Vi ser på om kontiene har ægte brug — fx
            profil, madplan eller aktivitet — før vi tildeler eller tilbagekalder.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900">4. Kontakt</h2>
          <p className="mt-3">
            Spørgsmål: {''}
            <a href="mailto:nicolai@functionalfoods.dk" className="font-medium text-emerald-800 underline underline-offset-2">
              nicolai@functionalfoods.dk
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  )
}
