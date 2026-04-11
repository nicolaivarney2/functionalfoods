export type FunktionSlug =
  | 'madbudget-ai-madplaner'
  | 'madplaner-ud-fra-tilbud'
  | 'vaegttabsrejse'
  | 'makro-mikro-opskrifter'
  | '5000-opskrifter-i-8-nicher'
  | 'smart-indkob-liste-sms'
  | 'vaegt-tracker'

/** Ikon-navne der mappes til lucide-react i funktionssiden (ingen komponenter i denne fil – undgår webpack-chunk fejl). */
export type FunktionIconName =
  | 'Sparkles'
  | 'PiggyBank'
  | 'Calculator'
  | 'ChefHat'
  | 'LayoutGrid'
  | 'MessageSquare'
  | 'Scale'

export type FunktionImagePlacement = 'hero' | 'betweenHeroAndBullets' | 'afterBullets'

export type FunktionImage = {
  src: string
  alt: string
  placement?: FunktionImagePlacement
  compact?: boolean
}

export interface FunktionLanding {
  slug: FunktionSlug
  title: string
  shortTitle: string
  description: string
  iconName: FunktionIconName
  heroEyebrow: string
  heroTitle: string
  /** Ét indledende afsnit (bruges hvis `heroLeadParagraphs` ikke er sat) */
  heroLead?: string
  /** Flere afsnit under titlen (prioriteres over `heroLead`) */
  heroLeadParagraphs?: string[]
  bullets: { title: string; text: string }[]
  howItHelps: string
  ctaLabel: string
  ctaHref: string
  /** Ekstra knap (fx vægt tracker fra vægttabs-siden) */
  secondaryCta?: { label: string; href: string }
  /**
   * Statiske filer under public/.
   * `placement`: hero (standard for første billede), betweenHeroAndBullets, afterBullets (under punktlisten).
   * `compact`: mindre bredde (fx SMS-mockups).
   */
  images?: FunktionImage[]
}

export const FUNKTIONER: Record<FunktionSlug, FunktionLanding> = {
  'madbudget-ai-madplaner': {
    slug: 'madbudget-ai-madplaner',
    title: 'Madbudget (AI madplaner) | Functional Foods',
    shortTitle: 'Madbudget (AI madplaner)',
    description:
      'AI-drevne madplaner med ugeoversigt, daglig ernæring og indkøbslister på tværs af dine butikker – skift opskrifter og byg lige så mange uger du vil.',
    iconName: 'Sparkles',
    heroEyebrow: 'Funktion',
    heroTitle: 'Madbudget: AI-madplaner der passer til din uge',
    heroLeadParagraphs: [
      'Madbudget samler dine præferencer, energibehov og hverdag i én plan. Du får konkrete måltider og indkøb, så du slipper for at bygge ugen fra bunden selv.',
      'Lav så mange madplaner du vil, og skift opskrifter ud efter behov – uden at starte forfra hver gang.',
    ],
    bullets: [
      {
        title: 'Visuel uge- og dagoversigt',
        text: 'Se ugen samlet og zoom ind på den enkelte dag, så du altid ved hvad der spises hvornår.',
      },
      {
        title: 'Ernæring pr. dag og for hele ugen',
        text: 'Tal for makro og mikro (hvor data findes) summeres, så du kan se om ugen rammer dit mål – ikke kun ét måltid.',
      },
      {
        title: 'Fleksible måltider',
        text: 'Vælg alle måltider eller kun ét om dagen – afhængigt af hvor meget struktur du vil have i ugen.',
      },
      {
        title: 'Indkøb på tværs af favoritbutikker',
        text: 'Fuld indkøbsliste i alle de butikker du har valgt, så du kan sammenligne priser og handle dér det giver mening.',
      },
      {
        title: 'Personlig struktur',
        text: 'Planen tager udgangspunkt i hvor mange I er, hvad I kan lide, og hvordan ugen ser ud – ikke en generisk skabelon.',
      },
      {
        title: 'Koblet til danske råvarer',
        text: 'Opskrifter og næring er tænkt sammen med danske fødevarer og realistiske mængder.',
      },
    ],
    howItHelps:
      'Brug Madbudget når du vil have en plan, der føles som en co-pilot: den foreslår, du justerer – og du får både overblik, næring og indkøb i ét flow.',
    ctaLabel: 'Åbn Madbudget',
    ctaHref: '/madbudget',
    images: [
      {
        src: 'billeder/funktioner/functionalfoods-madbudget-1.png',
        alt: 'Madbudget: ugeoversigt og madplan i Functional Foods',
        placement: 'hero',
      },
      {
        src: 'billeder/funktioner/functionalfoods-madbudget-2.png',
        alt: 'Madbudget: indkøbsliste og butikker',
        placement: 'afterBullets',
      },
    ],
  },
  'madplaner-ud-fra-tilbud': {
    slug: 'madplaner-ud-fra-tilbud',
    title: 'Madplaner ud fra tilbud | Functional Foods',
    shortTitle: 'Madplaner ud fra tilbud',
    description:
      'Madplaner baseret på dine favoritbutikker og rigtige tilbudsdata – ikke gæt fra en chatbot uden integration.',
    iconName: 'PiggyBank',
    heroEyebrow: 'Funktion',
    heroTitle: 'Madplaner der følger butikkens tilbud',
    heroLeadParagraphs: [
      'Du tilvælger dine favoritbutikker – og det er dem, vi fokuserer på, når vi bygger planen ud fra aktuelle tilbud.',
      'I stedet for at handle efter en plan fra et andet univers starter vi med det, der er på tilbud hos dig – og lægger måltider der passer til.',
    ],
    bullets: [
      {
        title: 'Direkte integration til rigtige tilbud',
        text: 'AI-chatrobotter har som udgangspunkt ingen direkte integration til danske kæders tilbud. De kan forsøge at gætte eller omskrive “tilbudsagtige” idéer – men de rammer sjældent pris og sortiment i din lokale butik. Hos os er der direkte integration til data, så planen forholder sig til det, der faktisk står på hylderne.',
      },
      {
        title: 'Dine butikker i centrum',
        text: 'Når du har valgt favoritbutikker, er det dem, tilbuddene og planen kører ud fra – ikke et tilfældigt gennemsnit.',
      },
      {
        title: 'Reelle priser',
        text: 'Når planen forholder sig til tilbud, bliver budgettet mere end et tal på papiret.',
      },
      {
        title: 'Mindre madspild',
        text: 'Du køber det, ugen er bygget omkring – færre tilfældige varer der ender bagerst i køleskabet.',
      },
      {
        title: 'Sundhed i praksis',
        text: 'Vægttab handler også om at gøre det nemt at vælge rigtigt i butikken. Tilbudsplanen gør det konkret.',
      },
    ],
    howItHelps:
      'Vælg denne tilgang, hvis du vil have madplan og økonomi til at trække i samme retning – med data du kan stole på, især i uger med mange tilbud.',
    ctaLabel: 'Se dagligvarer og tilbud',
    ctaHref: '/dagligvarer',
    images: [
      {
        src: 'billeder/funktioner/functionalfoods-madplaner-ud-fra-tilbud.png',
        alt: 'Madplaner ud fra tilbud i Functional Foods',
      },
    ],
  },
  vaegttabsrejse: {
    slug: 'vaegttabsrejse',
    title: 'Vægttabsrejse (50+ parametre) | Functional Foods',
    shortTitle: 'Vægttabsrejse (50+ parametre)',
    description:
      'Personlig profil med 50+ parametre, krypteret lagring og kobling til vægt tracker – så råd og planer matcher din virkelighed.',
    iconName: 'Calculator',
    heroEyebrow: 'Funktion',
    heroTitle: 'Vægttabsrejse med mange personlige parametre',
    heroLead:
      'Jo bedre vi kender din hverdag, jo bedre kan vi prioritere: familie, aktivitet, mål, præferencer og mere end 50 andre datapunkter kan indgå.',
    bullets: [
      {
        title: 'Krypteret og sikker data',
        text: 'Dine profiloplysninger behandles fortroligt: krypteret lagring, så kun du og systemet har meningsfuld adgang til at drive dine planer og mål.',
      },
      {
        title: 'Følg fremgang med vægt tracker',
        text: 'Kobl den mentale plan med konkrete tal: brug vægt trackeren til at logge vægt over tid og se udviklingen i ro og mag.',
      },
      {
        title: 'Kontekst før kalorier',
        text: 'Tal giver først mening, når de sidder i din virkelighed – ikke som isolerede grafer.',
      },
      {
        title: 'Skånsom progression',
        text: 'Små justeringer over tid slår ofte store løfter, der ikke holder mandag til søndag.',
      },
      {
        title: 'Samme mål, forskellige uger',
        text: 'Systemet kan tilpasse sig ferie, travlhed og hverdagsstøj uden at du starter forfra.',
      },
    ],
    howItHelps:
      'Brug vægttabsrejsen, når du vil have et langsigtet spor – med tryghed omkring data og et klart billede af fremgang via vægt trackeren.',
    ctaLabel: 'Læs om vægttab',
    ctaHref: '/vaegttab',
    secondaryCta: { label: 'Åbn vægt tracker', href: '/vaegt-tracker' },
    images: [
      {
        src: 'billeder/funktioner/functionalfoods-vaegttabsrejse.png',
        alt: 'Vægttabsrejse og profil i Functional Foods',
      },
    ],
  },
  'makro-mikro-opskrifter': {
    slug: 'makro-mikro-opskrifter',
    title: 'Makro + mikro opskrifter | Functional Foods',
    shortTitle: 'Makro + mikro opskrifter',
    description:
      'Opskrifter med makronæringsstoffer og mikronæringsstoffer ud fra danske data – så du kan se helheden i dit måltid.',
    iconName: 'ChefHat',
    heroEyebrow: 'Funktion',
    heroTitle: 'Makro og mikro i samme opskrift',
    heroLead:
      'Du ser ikke kun protein, kulhydrat og fedt – du får også indblik i vitaminer og mineraler, når data findes i den danske fødevaredatabase.',
    bullets: [
      {
        title: 'Gennemsigtighed',
        text: 'Du kan sammenligne opskrifter og forstå, hvad der driver mæthed og næring.',
      },
      {
        title: 'Bedre valg i hverdagen',
        text: 'Når mikro synliggøres, bliver det lettere at variere kosten uden at gætte.',
      },
      {
        title: 'Samme sprog som planlægning',
        text: 'Når madplan og opskrifter taler samme næringssprog, slipper du for dobbeltarbejde.',
      },
    ],
    howItHelps:
      'Perfekt til dig, der vil tabe dig eller optimere sundhed – og vil se tallene bag maden, ikke kun overskrifter.',
    ctaLabel: 'Gå til opskrifter',
    ctaHref: '/opskriftsoversigt',
    images: [
      {
        src: 'billeder/funktioner/functionalfoods-ernaeringsberegnet.png',
        alt: 'Ernæringsberegning – makro og mikro på opskrifter',
      },
    ],
  },
  '5000-opskrifter-i-8-nicher': {
    slug: '5000-opskrifter-i-8-nicher',
    title: '5000 opskrifter i 8 nicher | Functional Foods',
    shortTitle: '5000 opskrifter i 8 nicher',
    description:
      'Overskuelige opskrifter i otte vægttabs- og kostnicher: ernæringsberegnet, portionsjustering, favoritter og gennemtestede hverdagsretter.',
    iconName: 'LayoutGrid',
    heroEyebrow: 'Funktion',
    heroTitle: 'Tusindvis af opskrifter på tværs af nicher',
    heroLead:
      'Uanset om du kører keto, sense, familiekost eller noget derimellem, er der inspiration at hente – uden at du skal lede på ti forskellige sider.',
    bullets: [
      {
        title: 'Otte vægttabs- og kostnicher',
        text: 'Masser af funktioner og filtre inden for otte tydelige kategorier, så du hurtigt finder det der passer til dit mål og din kostform.',
      },
      {
        title: 'Ernæringsberegnet',
        text: 'Se makro og mikro ud fra dansk data, når det findes – så du kan sammenligne og vælge med ro i maven.',
      },
      {
        title: 'Juster antal personer',
        text: 'Skaler portioner til husstanden, så du ikke står med forkerte mængder i køkkenet.',
      },
      {
        title: 'Gem favoritter',
        text: 'Markér opskrifter du vil tilbage til – perfekt når du planlægger uge efter uge.',
      },
      {
        title: 'Gennemtestede, simple opskrifter',
        text: 'Fokus på retter der kan laves i en travl hverdag – ikke kun “instagram-venlige” projekter.',
      },
      {
        title: 'Variation på tværs',
        text: 'Nicher hjælper dig med at filtrere – men du kan stadig krydse inspiration på tværs.',
      },
    ],
    howItHelps:
      'Brug biblioteket, når du vil have idéer i dag – med næringstal, portioner og favoritter der gør det nemt at blive ved.',
    ctaLabel: 'Udforsk opskrifter',
    ctaHref: '/opskriftsoversigt',
    images: [
      {
        src: 'billeder/funktioner/functionalfoods-opskrifter-i-8-nicher.png',
        alt: 'Opskrifter i otte kostnicher',
      },
    ],
  },
  'smart-indkob-liste-sms': {
    slug: 'smart-indkob-liste-sms',
    title: 'Smart-indkøbsliste på sms | Functional Foods',
    shortTitle: 'Smart-indkøbliste på sms',
    description:
      'Indkøbsliste på sms med mængder, priser og afkrydsning i den rækkefølge du møder varerne i butikken.',
    iconName: 'MessageSquare',
    heroEyebrow: 'Funktion',
    heroTitle: 'Smart-indkøbsliste på sms',
    heroLead:
      'Listen samler det, du skal bruge til ugen – formateret så du kan bruge den i butikken fra telefonen, inkl. deling og afkrydsning når du er logget ind.',
    bullets: [
      {
        title: 'Præcis mængde og antal',
        text: 'Se hvor meget du skal købe af hver vare – mindre gæt og færre forkerte indkøb.',
      },
      {
        title: 'Original- og tilbudspris',
        text: 'Få overblik over både normalpris og aktuel tilbudspris, når data findes, så du ved hvad du betaler.',
      },
      {
        title: 'Afkryds i butikkens rækkefølge',
        text: 'Kryds af løbende i kronologisk rækkefølge, der følger gangen i butikken og den mad du møder undervejs – mindre at hoppe frem og tilbage på listen.',
      },
      {
        title: 'Færre faner og apps',
        text: 'Sms er der alligevel – ideelt til hurtig handel og påmindelse i en travl hverdag.',
      },
      {
        title: 'Deling med familie',
        text: 'Send listen videre, så en anden kan tage turen – uden at I kopierer noter i messenger.',
      },
    ],
    howItHelps:
      'Vælg sms-listen, når du vil have planen i hånden med priser, mængder og en afkrydsning der følger din tur i butikken.',
    ctaLabel: 'Kom i gang',
    ctaHref: '/kom-i-gang',
    images: [
      {
        src: 'billeder/funktioner/functionalfoods-sms-funktion-1.png',
        alt: 'Smart-indkøbsliste på sms',
        placement: 'hero',
        compact: true,
      },
      {
        src: 'billeder/funktioner/functionalfoods-sms-funktion-2.PNG',
        alt: 'Indkøbsliste med priser og afkrydsning',
        placement: 'afterBullets',
        compact: true,
      },
    ],
  },
  'vaegt-tracker': {
    slug: 'vaegt-tracker',
    title: 'Vægt tracker | Functional Foods',
    shortTitle: 'Vægt tracker',
    description:
      'Log vægt, følg kurven over tid og kobl til din vægttabsrejse – med fokus på privatliv og sikker opbevaring.',
    iconName: 'Scale',
    heroEyebrow: 'Funktion',
    heroTitle: 'Vægt tracker: se fremgang over tid',
    heroLeadParagraphs: [
      'Vægt trackeren giver dig et sted at registrere vægt og følge udviklingen – uden regneark og uden at skulle huske tallene i hovedet.',
      'Den er tænkt sammen med resten af Functional Foods: jo mere du bruger profilen og værktøjerne, jo lettere er det at se sammenhængen mellem vaner, mad og resultat.',
    ],
    bullets: [
      {
        title: 'Kurve og historik',
        text: 'Se udvikling over uger og måneder, så du kan skelne mellem dårlige dage og den reelle trend.',
      },
      {
        title: 'Koblet til din rejse',
        text: 'Brug trackeren som supplement til vægttabsrejsen og dine mål – tal der understøtter beslutninger, ikke erstatter dem.',
      },
      {
        title: 'Privat og sikkert',
        text: 'Data om din krop er følsomme: vi behandler dem med samme respekt som resten af din profil – krypteret og kun til dig og systemets funktioner.',
      },
      {
        title: 'Mindre stress om tallene',
        text: 'Én fast rutine for at logge vægt gør det lettere at slippe konstant mental regning og i stedet handle på det du ser over tid.',
      },
    ],
    howItHelps:
      'Brug vægt trackeren når du vil have ro omkring fremgang: ét sted at logge, ét sted at se om det du gør i hverdagen faktisk flytter dig.',
    ctaLabel: 'Åbn vægt tracker',
    ctaHref: '/vaegt-tracker',
    images: [
      {
        src: 'billeder/funktioner/functionalfoods-vaegttracker.png',
        alt: 'Vægt tracker med kurve og historik',
      },
    ],
  },
}

export const FUNKTION_SLUGS = Object.keys(FUNKTIONER) as FunktionSlug[]

/** Rækkefølge på oversigtssiden /funktioner */
export const FUNKTION_OVERVIEW_ORDER: FunktionSlug[] = [
  'madbudget-ai-madplaner',
  'madplaner-ud-fra-tilbud',
  'vaegttabsrejse',
  'makro-mikro-opskrifter',
  '5000-opskrifter-i-8-nicher',
  'smart-indkob-liste-sms',
  'vaegt-tracker',
]
