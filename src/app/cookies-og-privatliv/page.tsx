import type { Metadata } from 'next'
import Link from 'next/link'
import CookieSettingsFooterLink from '@/components/CookieSettingsFooterLink'

export const metadata: Metadata = {
  title: 'Cookies og privatliv | Functional Foods',
  description:
    'Sådan bruger vi cookies, Google Analytics og Meta Pixel — skrevet i et sprog vi selv ville gide at læse.',
  openGraph: {
    title: 'Cookies og privatliv',
    description: 'En enkel forklaring på, hvad der gemmes og hvorfor.',
  },
}

export default function CookiesOgPrivatlivPage() {
  return (
    <div className="bg-white text-slate-900">
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container max-w-3xl py-12 sm:py-16 px-4">
          <p className="text-sm font-medium text-emerald-800 mb-2">Roligt og uden juridisk jargon</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Cookies og privatliv
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Vi driver Functional Foods fordi vi brænder for mad, vægttab og gode vaner — ikke for at samle data om
            dig. Her er dog den ærlige version af, hvad sitet gør teknisk, så du ved, hvad du siger ja eller nej til i
            cookie-banneret.
          </p>
        </div>
      </section>

      <article className="container max-w-3xl py-10 sm:py-14 px-4 space-y-10 text-slate-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Det korte</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Uden dit <strong>samtykke</strong> lægger vi ikke målings-cookies fra Google eller Meta ind på siden.
            </li>
            <li>
              Dit valg gemmer vi lokalt i din browser (<strong>localStorage</strong>), så vi husker det næste gang du
              kommer forbi.
            </li>
            <li>
              Vil du ombestemme dig? Brug <strong>«Cookie-indstillinger»</strong> nederst på siden — så kan du vælge
              igen.
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            (På den måde slipper du for at blive spurgt ved hvert eneste klik, medmindre du selv nulstiller.)
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Hvad er en cookie overhovedet?</h2>
          <p>
            En cookie er en lille tekstfil, som en hjemmeside kan gemme på din enhed. Den bruges typisk til at huske
            login, sprogvalg — eller til statistik og annoncer. Nogle er nødvendige for at siden fungerer; andre er
            «ekstra» og kræver som udgangspunkt dit samtykke (sådan er reglerne i EU, og det er fint med os).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Google Analytics 4 (GA4)</h2>
          <p className="mb-3">
            Hvis du trykker <strong>Accepter</strong> i banneret, kan vi bruge{' '}
            <strong>Google Analytics 4</strong> til at se groft sagt: hvilke sider der læses, hvor trafikken kommer
            fra, og om noget driller teknisk. Det hjælper os med at forbedre opskrifter, tekster og flow — uden at
            kende dig personligt.
          </p>
          <p className="mb-3">
            Analytics kører via Googles standard (måling-ID, typisk noget i stil med <code className="text-sm bg-slate-100 px-1 rounded">G-…</code>).
            Du kan læse mere hos{' '}
            <a
              href="https://policies.google.com/privacy"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Meta Pixel (Facebook / Instagram)</h2>
          <p className="mb-3">
            Med samtykke kan vi også indlæse <strong>Meta Pixel</strong>. Det bruges til at måle, om annoncer og
            budskaber rammer rimeligt bredt, og til at vise mere relevante ting til folk, der faktisk interesserer sig
            for mad og vægttab — i stedet for tilfældig støj.
          </p>
          <p>
            Læs Metas privatliv her:{' '}
            <a
              href="https://www.facebook.com/privacy/policy"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
              target="_blank"
              rel="noopener noreferrer"
            >
              Meta — privatlivspolitik
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Andre gængse ting på siden</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Login / konto:</strong> Hvis du opretter dig, bruger vi en sikker tjeneste (typisk Supabase) til
              konto og session. Det er nødvendigt for at du kan gemme madplaner, præferencer osv.
            </li>
            <li>
              <strong>Chat eller hjælp:</strong> Visse funktioner (fx personlig vejledning) kan åbne et vindue mod en
              tredjepart — kun hvis du aktivt vælger det.
            </li>
            <li>
              <strong>Bot-beskyttelse:</strong> Ved tilmelding kan vi bruge en simpel tjek-boks (fx Cloudflare
              Turnstile) for at undgå spam-robotter.
            </li>
            <li>
              <strong>Nyhedsbrev:</strong> Tilmelding sker kun, hvis du selv udfylder en formular — og du kan altid
              afmelde dig i mailen.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Dine valg</h2>
          <p className="mb-4">
            Du bestemmer. Brug knapperne i cookie-banneret, eller tryk her for at åbne valget igen:
          </p>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 inline-block">
            <CookieSettingsFooterLink className="text-left text-sm font-medium text-emerald-900 hover:text-emerald-950 underline-offset-2 hover:underline" />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Bemærk: Linket åbner ikke en ny side — det viser cookie-banneret igen, så du kan vælge Accepter eller Afvis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Spørgsmål?</h2>
          <p>
            Skriv endelig, hvis noget virker uklart. Du kan også læse mere om idéen bag siden på{' '}
            <Link href="/bag-om-ff" className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950">
              Om os
            </Link>
            .
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Siden kan opdateres, når vi tilføjer nye værktøjer — så tjek gerne en gang imellem. Sidst opdateret: april
            2026.
          </p>
        </section>
      </article>
    </div>
  )
}
