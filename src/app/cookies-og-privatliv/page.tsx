import type { Metadata } from 'next'
import Link from 'next/link'
import CookieSettingsFooterLink from '@/components/CookieSettingsFooterLink'

export const metadata: Metadata = {
  title: 'Privatlivspolitik | Functional Foods',
  description:
    'Privatlivspolitik for Functional Foods: konto, sundheds- og madlogsdata, betalinger, cookies, dine rettigheder og sletning af konto.',
  alternates: {
    canonical: 'https://functionalfoods.dk/cookies-og-privatliv',
  },
  openGraph: {
    title: 'Privatlivspolitik | Functional Foods',
    description:
      'Hvilke personoplysninger vi behandler, hvorfor, hvem der hjælper os, og hvordan du sletter din konto.',
    url: 'https://functionalfoods.dk/cookies-og-privatliv',
  },
}

const LAST_UPDATED = '17. juli 2026'

export default function CookiesOgPrivatlivPage() {
  return (
    <div className="bg-white text-slate-900">
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container max-w-3xl py-12 sm:py-16 px-4">
          <p className="text-sm font-medium text-emerald-800 mb-2">Privatlivspolitik</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Cookies og privatliv
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Denne politik forklarer, hvordan Functional Foods behandler personoplysninger, når du bruger vores
            website (functionalfoods.dk) og vores mobilapp. Den dækker konto, madplaner, vægt- og
            ernæringsdata, betalinger, cookies og dine rettigheder efter GDPR.
          </p>
          <p className="mt-4 text-sm text-slate-500">Sidst opdateret: {LAST_UPDATED}</p>
        </div>
      </section>

      <article className="container max-w-3xl py-10 sm:py-14 px-4 space-y-10 text-slate-700 leading-relaxed">
        <nav aria-label="Indhold" className="rounded-xl border border-slate-200 bg-slate-50/80 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900 mb-2">Indhold</p>
          <ol className="list-decimal pl-5 text-sm space-y-1.5 text-emerald-900">
            <li>
              <a href="#dataansvarlig" className="underline underline-offset-2 hover:text-emerald-950">
                Dataansvarlig
              </a>
            </li>
            <li>
              <a href="#hvilke-data" className="underline underline-offset-2 hover:text-emerald-950">
                Hvilke oplysninger vi behandler
              </a>
            </li>
            <li>
              <a href="#formaal" className="underline underline-offset-2 hover:text-emerald-950">
                Formål og retsgrundlag
              </a>
            </li>
            <li>
              <a href="#sundhedsdata" className="underline underline-offset-2 hover:text-emerald-950">
                Sundheds- og livsstilsdata
              </a>
            </li>
            <li>
              <a href="#betalinger" className="underline underline-offset-2 hover:text-emerald-950">
                Betalinger og abonnement
              </a>
            </li>
            <li>
              <a href="#modtagere" className="underline underline-offset-2 hover:text-emerald-950">
                Modtagere og underleverandører
              </a>
            </li>
            <li>
              <a href="#cookies" className="underline underline-offset-2 hover:text-emerald-950">
                Cookies og analyse
              </a>
            </li>
            <li>
              <a href="#opbevaring" className="underline underline-offset-2 hover:text-emerald-950">
                Opbevaring
              </a>
            </li>
            <li>
              <a href="#sikkerhed" className="underline underline-offset-2 hover:text-emerald-950">
                Sikkerhed
              </a>
            </li>
            <li>
              <a href="#rettigheder" className="underline underline-offset-2 hover:text-emerald-950">
                Dine rettigheder
              </a>
            </li>
            <li>
              <a href="#sletning" className="underline underline-offset-2 hover:text-emerald-950">
                Sletning af konto
              </a>
            </li>
            <li>
              <a href="#boern" className="underline underline-offset-2 hover:text-emerald-950">
                Børn
              </a>
            </li>
            <li>
              <a href="#aendringer" className="underline underline-offset-2 hover:text-emerald-950">
                Ændringer
              </a>
            </li>
            <li>
              <a href="#kontakt" className="underline underline-offset-2 hover:text-emerald-950">
                Kontakt
              </a>
            </li>
          </ol>
        </nav>

        <section id="dataansvarlig" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Dataansvarlig</h2>
          <p className="mb-3">
            Dataansvarlig for behandlingen er <strong>Functional Foods</strong> (functionalfoods.dk), drevet af
            Nicolai Varney, Danmark.
          </p>
          <p>
            Kontakt om privatliv:{' '}
            <a
              href="mailto:hej@functionalfoods.dk"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
            >
              hej@functionalfoods.dk
            </a>
            .
          </p>
        </section>

        <section id="hvilke-data" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Hvilke oplysninger vi behandler</h2>
          <p className="mb-3">Afhængigt af, hvordan du bruger tjenesten, kan vi behandle:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Kontooplysninger:</strong> e-mail, navn (hvis du angiver det), login-oplysninger og
              autentificering (fx e-mail/adgangskode eller login via tredjepart som Apple/Google, hvis du vælger
              det).
            </li>
            <li>
              <strong>Profil og præferencer:</strong> kosttilgang, ekskluderede fødevarer, måltider pr. dag,
              familieoplysninger du selv indtaster, gemte opskrifter, madplaner, indkøbslister og prisalarmer.
            </li>
            <li>
              <strong>Vægt- og ernæringsrelaterede data:</strong> fx alder, køn, højde, vægt, aktivitetsniveau,
              vægtmål, madlogs (kalorier/makroer), vægtlogs og fremskridtsfotos, hvis du uploader dem. Se også
              afsnit 4.
            </li>
            <li>
              <strong>Betalings- og abonnementsdata:</strong> abonnementsniveau, kunde-id hos betalingstjeneste,
              status på abonnement. Vi gemmer ikke fulde kortnumre selv — det håndteres af betalingsudbyderen.
            </li>
            <li>
              <strong>Kommunikation:</strong> beskeder du sender til os (fx e-mail, feedback eller Messenger-vejledning,
              hvis du aktivt kobler det), samt nyhedsbrevstilmelding hvis du selv tilmelder dig.
            </li>
            <li>
              <strong>Tekniske data:</strong> IP-adresse, enheds-/browseroplysninger, logfiler, cookie-valg og
              brugsstatistik (kun efter samtykke, hvor det kræves — se afsnit 7).
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            Du behøver ikke oprette konto for at læse offentligt indhold. Mange personlige funktioner (madplan,
            dagbog, abonnement) kræver dog en konto.
          </p>
        </section>

        <section id="formaal" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Formål og retsgrundlag</h2>
          <p className="mb-3">Vi behandler oplysninger for at:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Levere tjenesten</strong> — oprette og administrere din konto, generere madplaner, gemme
              præferencer, vise dagbog/vægttracker og synkronisere mellem web og app (kontrakt / art. 6(1)(b)
              GDPR).
            </li>
            <li>
              <strong>Håndtere betaling og abonnement</strong> — Stripe på web og App Store / RevenueCat i appen
              (kontrakt / art. 6(1)(b)).
            </li>
            <li>
              <strong>Sende servicebeskeder</strong> — fx kvitteringer, vigtige kontomail og sikkerhedsrelateret
              information (kontrakt / legitim interesse).
            </li>
            <li>
              <strong>Nyhedsbrev og marketing</strong> — kun hvis du tilmelder dig eller giver samtykke; du kan
              altid afmelde dig (samtykke / art. 6(1)(a)).
            </li>
            <li>
              <strong>Forbedre produktet og måle trafik</strong> — statistik og annoncemåling via cookies/pixels
              efter samtykke (samtykke / art. 6(1)(a)).
            </li>
            <li>
              <strong>Sikkerhed og misbrug</strong> — fx spam-beskyttelse (legitim interesse / art. 6(1)(f)).
            </li>
            <li>
              <strong>Overholde lov</strong> — fx bogføringsregler for betalinger (retlig forpligtelse / art.
              6(1)(c)).
            </li>
          </ul>
        </section>

        <section id="sundhedsdata" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Sundheds- og livsstilsdata</h2>
          <p className="mb-3">
            Functional Foods er et værktøj til madplaner, vægttab og livsstil — ikke en medicinsk tjeneste.
            Oplysninger om vægt, højde, alder, køn, aktivitetsniveau, kostvalg, madlogs og lignende kan efter
            omstændighederne anses for følsomme eller nært knyttet til sundhed.
          </p>
          <p className="mb-3">
            Vi behandler sådanne oplysninger <strong>kun fordi du selv indtaster eller uploader dem</strong>, og
            fordi de er nødvendige for de funktioner, du vælger at bruge (fx personlig kalorie-/makroberegning,
            madplan og vægttracker). Retsgrundlaget er dit <strong>udtrykkelige samtykke</strong> (GDPR art.
            9(2)(a)) og/eller at behandlingen er nødvendig for at levere den tjeneste, du har bedt om.
          </p>
          <p className="mb-3">
            Vi sælger ikke dine sundheds- eller livsstilsdata. De bruges ikke til at diagnosticere sygdom eller
            erstatte læge, diætist eller anden sundhedsprofessionel. Se også vores generelle disclaimer i footeren
            på sitet.
          </p>
          <p>
            Fremskridtsfotos du uploader, gemmes privat og er kun tilgængelige for dig (via sikre links), medmindre
            du selv deler dem andetsteds.
          </p>
        </section>

        <section id="betalinger" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Betalinger og abonnement</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Web:</strong> Betaling for abonnement sker via <strong>Stripe</strong>. Stripe behandler
              betalingskortoplysninger som selvstændig dataansvarlig/betalingsudbyder efter deres vilkår. Vi
              modtager typisk kunde-id, abonnementsstatus og nødvendige oplysninger til at aktivere dit
              medlemskab — ikke dit fulde kortnummer.
            </li>
            <li>
              <strong>App (iOS):</strong> Køb kan ske via <strong>Apple App Store</strong> med{' '}
              <strong>RevenueCat</strong> til at synkronisere abonnementsstatus. Apple er ansvarlig for selve
              betalingstransaktionen efter Apples vilkår.
            </li>
          </ul>
          <p className="mt-4">
            Læs mere hos{' '}
            <a
              href="https://stripe.com/privacy"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
              target="_blank"
              rel="noopener noreferrer"
            >
              Stripe
            </a>
            ,{' '}
            <a
              href="https://www.apple.com/legal/privacy/"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
              target="_blank"
              rel="noopener noreferrer"
            >
              Apple
            </a>{' '}
            og{' '}
            <a
              href="https://www.revenuecat.com/privacy"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
              target="_blank"
              rel="noopener noreferrer"
            >
              RevenueCat
            </a>
            .
          </p>
        </section>

        <section id="modtagere" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Modtagere og underleverandører</h2>
          <p className="mb-3">
            Vi deler kun oplysninger, når det er nødvendigt for at drive tjenesten, eller når loven kræver det.
            Typiske kategorier:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Hosting og database / auth:</strong> Supabase (konto, lagring af dine data med
              adgangskontrol).
            </li>
            <li>
              <strong>Betaling:</strong> Stripe (web), Apple / RevenueCat (app).
            </li>
            <li>
              <strong>E-mail / nyhedsbrev:</strong> fx Loops og lignende e-mailværktøjer, når du tilmelder dig
              eller modtager service-/produktmail.
            </li>
            <li>
              <strong>Analyse og annoncer (efter samtykke):</strong> Google Analytics 4, Meta Pixel.
            </li>
            <li>
              <strong>Sikkerhed:</strong> fx Cloudflare Turnstile ved tilmelding for at begrænse spam.
            </li>
            <li>
              <strong>Support / vejledning:</strong> hvis du aktivt bruger Messenger-vejledning, kan samtalen
              kobles til din konto via den løsning, vi bruger til det (fx ManyChat) — kun når du selv vælger det.
            </li>
          </ul>
          <p className="mt-4">
            Nogle underleverandører kan behandle data uden for EU/EØS. I så fald bruger vi passende
            overførselsgrundlag (fx EU-kommissionens standardkontraktbestemmelser eller tilsvarende), hvor det er
            påkrævet.
          </p>
        </section>

        <section id="cookies" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Cookies og analyse</h2>
          <p className="mb-3">
            En cookie er en lille tekstfil, som en hjemmeside kan gemme på din enhed. Nogle er nødvendige for at
            siden fungerer (fx login/session); andre bruges til statistik og annoncer og kræver dit samtykke i EU.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Det korte</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Uden dit <strong>samtykke</strong> lægger vi ikke målings-cookies fra Google eller Meta ind på siden.
            </li>
            <li>
              Dit valg gemmer vi lokalt i din browser (<strong>localStorage</strong>), så vi husker det næste gang
              du kommer forbi.
            </li>
            <li>
              Vil du ombestemme dig? Brug <strong>«Cookie-indstillinger»</strong> nederst på siden — så kan du vælge
              igen.
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Google Analytics 4 (GA4)</h3>
          <p className="mb-3">
            Hvis du trykker <strong>Accepter</strong> i banneret, kan vi bruge <strong>Google Analytics 4</strong>{' '}
            til at se groft sagt: hvilke sider der læses, hvor trafikken kommer fra, og om noget driller teknisk.
            Det hjælper os med at forbedre opskrifter, tekster og flow.
          </p>
          <p className="mb-3">
            Analytics kører via Googles standard (måling-ID, typisk noget i stil med{' '}
            <code className="text-sm bg-slate-100 px-1 rounded">G-…</code>). Du kan læse mere hos{' '}
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

          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Meta Pixel (Facebook / Instagram)</h3>
          <p className="mb-3">
            Med samtykke kan vi også indlæse <strong>Meta Pixel</strong>. Det bruges til at måle, om annoncer og
            budskaber rammer rimeligt, og til at vise mere relevante ting til folk, der interesserer sig for mad og
            vægttab.
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

          <h3 className="text-lg font-semibold text-slate-900 mt-6 mb-2">Dine cookie-valg</h3>
          <p className="mb-4">
            Du bestemmer. Brug knapperne i cookie-banneret, eller tryk her for at åbne valget igen:
          </p>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 inline-block">
            <CookieSettingsFooterLink className="text-left text-sm font-medium text-emerald-900 hover:text-emerald-950 underline-offset-2 hover:underline" />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Linket åbner ikke en ny side — det viser cookie-banneret igen, så du kan vælge Accepter eller Afvis.
          </p>
        </section>

        <section id="opbevaring" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Opbevaring</h2>
          <p className="mb-3">Vi opbevarer personoplysninger, så længe det er nødvendigt til formålene ovenfor:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Kontodata og indhold du gemmer</strong> (profiler, madplaner, logs m.m.) — typisk indtil du
              sletter kontoen, eller indtil dataene ikke længere er nødvendige for tjenesten.
            </li>
            <li>
              <strong>Betalings- og bogføringsrelaterede oplysninger</strong> — i den periode, lovgivningen kræver
              (ofte flere år for regnskabsmateriale).
            </li>
            <li>
              <strong>Cookie-/samtykkevalg</strong> — i din browser, indtil du nulstiller eller ændrer valget.
            </li>
            <li>
              <strong>Nyhedsbrev</strong> — indtil du afmelder dig.
            </li>
          </ul>
        </section>

        <section id="sikkerhed" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">9. Sikkerhed</h2>
          <p>
            Vi beskytter data med passende tekniske og organisatoriske foranstaltninger — blandt andet
            krypteret forbindelse (HTTPS), adgangskontrol, row-level security i databasen hvor det er relevant, og
            begrænset adgang for dem, der driver tjenesten. Ingen løsning er 100 % risikofrie; skriv til os, hvis
            du mistænker et sikkerhedsproblem.
          </p>
        </section>

        <section id="rettigheder" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">10. Dine rettigheder</h2>
          <p className="mb-3">Efter GDPR har du blandt andet ret til at:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Få indsigt</strong> i, hvilke personoplysninger vi behandler om dig
            </li>
            <li>
              <strong>Få rettet</strong> forkerte oplysninger
            </li>
            <li>
              <strong>Få slettet</strong> oplysninger («retten til at blive glemt»), med forbehold for lovpligtig
              opbevaring
            </li>
            <li>
              <strong>Begrænse</strong> eller <strong>gøre indsigelse</strong> mod visse behandlinger
            </li>
            <li>
              <strong>Dataportabilitet</strong> — få udleveret data, du har givet os, i et almindeligt format, hvor
              det er teknisk muligt
            </li>
            <li>
              <strong>Trække samtykke tilbage</strong> — fx cookies eller nyhedsbrev — uden at det påvirker
              lovligheden af behandling før tilbagetrækningen
            </li>
            <li>
              <strong>Klage</strong> til Datatilsynet (
              <a
                href="https://www.datatilsynet.dk"
                className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
                target="_blank"
                rel="noopener noreferrer"
              >
                datatilsynet.dk
              </a>
              )
            </li>
          </ul>
          <p className="mt-4">
            Skriv til{' '}
            <a
              href="mailto:hej@functionalfoods.dk"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
            >
              hej@functionalfoods.dk
            </a>
            , hvis du vil udøve dine rettigheder. Vi svarer inden for rimelig tid.
          </p>
        </section>

        <section id="sletning" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">11. Sletning af konto</h2>
          <p className="mb-3">Du kan til enhver tid anmode om at få slettet din konto og tilknyttede data.</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>I appen:</strong> Brug funktionen til at slette konto (hvor den er tilgængelig under
              indstillinger/profil). Det sletter din auth-bruger og tilknyttede brugerdata, vi har lagret.
            </li>
            <li>
              <strong>På web / via e-mail:</strong> Skriv til{' '}
              <a
                href="mailto:hej@functionalfoods.dk?subject=Slet%20min%20konto"
                className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
              >
                hej@functionalfoods.dk
              </a>{' '}
              fra den e-mail, der er knyttet til kontoen, med emnet «Slet min konto».
            </li>
          </ul>
          <p className="mt-4">
            Bemærk: Betalings-/regnskabsoplysninger hos Stripe eller Apple kan blive opbevaret hos dem efter deres
            og lovens regler, også efter at din Functional Foods-konto er slettet. Aktive abonnementer bør opsiges
            via den kanal, du købte dem (web/Stripe eller App Store), hvis du ikke længere ønsker betaling.
          </p>
        </section>

        <section id="boern" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">12. Børn</h2>
          <p>
            Tjenesten er rettet mod voksne. Vi indsamler ikke bevidst personoplysninger fra børn under 16 år uden
            forældres/værges samtykke. Familieprofiler kan indeholde oplysninger, du selv indtaster om husstanden —
            det er dit ansvar, at du har ret til at indtaste dem. Kontakt os, hvis du mener, vi har data om et barn
            uden gyldigt grundlag, så sletter vi dem.
          </p>
        </section>

        <section id="aendringer" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">13. Ændringer</h2>
          <p>
            Vi kan opdatere denne privatlivspolitik, når vi tilføjer funktioner, skifter underleverandører eller
            reglerne ændrer sig. Den seneste version ligger altid på denne side med dato øverst. Ved væsentlige
            ændringer bestræber vi os på at gøre dig opmærksom på det (fx via sitet eller e-mail, hvis det er
            relevant).
          </p>
        </section>

        <section id="kontakt" className="scroll-mt-24">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">14. Kontakt</h2>
          <p className="mb-3">
            Spørgsmål om privatliv, indsigt eller sletning:{' '}
            <a
              href="mailto:hej@functionalfoods.dk"
              className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
            >
              hej@functionalfoods.dk
            </a>
          </p>
          <p>
            Du kan også læse mere om os på{' '}
            <Link href="/bag-om-ff" className="text-emerald-800 underline underline-offset-2 hover:text-emerald-950">
              Om os
            </Link>
            .
          </p>
          <p className="mt-6 text-sm text-slate-500">Sidst opdateret: {LAST_UPDATED}</p>
        </section>
      </article>
    </div>
  )
}
