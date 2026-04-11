/**
 * Nyhedsbrev pr. blog-kategori: forskellig copy + evt. forskellig form-URL (automation).
 * Sæt NEXT_PUBLIC_NEWSLETTER_FORM_<SLUG> eller NEXT_PUBLIC_NEWSLETTER_FORM_DEFAULT i .env
 * (f.eks. ConvertKit/Mailchimp form action URL).
 */

export type NewsletterVariant = {
  headline: string
  subline: string
  perks: string[]
  /** Kort label til skjult felt / tagging */
  audienceTag: string
  /** Accent til gradient (hex) */
  accentFrom: string
  accentTo: string
  borderColor: string
}

const DEFAULT: NewsletterVariant = {
  headline: 'Få mere ud af det du læser her',
  subline:
    'Én kort mail om ugen med de bedste råd og artikler — så du slipper for at lede selv.',
  perks: [
    'Konkrete tips du kan bruge med det samme',
    'Ingen spam — kun indhold der matcher dit fokus',
    'Afmelding med ét klik',
  ],
  audienceTag: 'functionalfoods',
  accentFrom: '#2563eb',
  accentTo: '#4f46e5',
  borderColor: '#93c5fd',
}

const VARIANTS: Record<string, NewsletterVariant> = {
  keto: {
    headline: 'Vil du have keto til at føles nemmere?',
    subline:
      'Få ugentlige keto-tips, opskrifter og forklaringer — skrevet så du faktisk kan bruge dem i hverdagen.',
    perks: [
      'Praktiske hacks til ketose og energi',
      'Indsigt i hvorfor kroppen reagerer som den gør',
      'Kun relevant for keto — ikke generelt støj',
    ],
    audienceTag: 'keto',
    accentFrom: '#059669',
    accentTo: '#0d9488',
    borderColor: '#6ee7b7',
  },
  sense: {
    headline: 'Hold motivationen — også når hverdagen presser',
    subline:
      'Sense handler om balance, ikke perfektion. Få små påmindelser og idéer der støtter dig på lang sigt.',
    perks: [
      'Rolig, realistisk tilgang til mad og vaner',
      'Inspiration der passer til Sense-stilen',
      'Du bestemmer — vi sender kun det du har bedt om',
    ],
    audienceTag: 'sense',
    accentFrom: '#7c3aed',
    accentTo: '#c026d3',
    borderColor: '#d8b4fe',
  },
  mentalt: {
    headline: 'Stærkere vaner uden dårlig samvittighed',
    subline:
      'Korte mails om adfærd, vaner og mindset — så du kan bygge noget der holder, skridt for skridt.',
    perks: [
      'Fokus på det der faktisk virker i praksis',
      'Ingen skam — kun konkrete værktøjer',
      'Passer til dig der vil ændre mønstre over tid',
    ],
    audienceTag: 'mentalt',
    accentFrom: '#0369a1',
    accentTo: '#2563eb',
    borderColor: '#7dd3fc',
  },
  'glp-1': {
    headline: 'Hold dig opdateret om kost & GLP-1',
    subline:
      'Evidens og praktiske pointer — så du kan træffe bedre valg sammen med din læge.',
    perks: [
      'Sundhedsfagligt funderet indhold',
      'Kost og livsstil i kontekst — ikke løfter om mirakler',
      'Respekt for at medicin er individuelt',
    ],
    audienceTag: 'glp-1',
    accentFrom: '#0e7490',
    accentTo: '#0284c7',
    borderColor: '#67e8f9',
  },
  flexitarian: {
    headline: 'Mere grønt uden at gå på kompromis med smag',
    subline:
      'Inspiration til fleksibel plantebaseret kost — når du vil skrue op for grøntsager og ned for stress.',
    perks: [
      'Idéer til hverdagsmåltider',
      'Balance frem for regler',
      'Kun når du vil have det i indbakken',
    ],
    audienceTag: 'flexitarian',
    accentFrom: '#16a34a',
    accentTo: '#15803d',
    borderColor: '#86efac',
  },
  familie: {
    headline: 'Sundere familiekost uden bøvl hver aften',
    subline:
      'Tips til måltider der fungerer når tiden er knap — og børn er ved bordet.',
    perks: [
      'Realistiske løsninger til travle uger',
      'Idéer både børn og voksne kan spise',
      'Ingen krav om perfektion',
    ],
    audienceTag: 'familie',
    accentFrom: '#ea580c',
    accentTo: '#dc2626',
    borderColor: '#fdba74',
  },
  'anti-inflammatory': {
    headline: 'Antiinflammatorisk kost — uden at blive overvældet',
    subline:
      'Rolige, overskuelige mails om hvad der typisk virker — og hvordan du tager små skridt.',
    perks: [
      'Fokus på fødevarer og mønstre — ikke trends',
      'Kort og brugbart',
      'Du vælger selv tempoet',
    ],
    audienceTag: 'anti-inflammatory',
    accentFrom: '#b45309',
    accentTo: '#ca8a04',
    borderColor: '#fcd34d',
  },
  '5-2-diet': {
    headline: '5:2 der passer ind i dit liv',
    subline:
      'Påmindelser og idéer til fastedage og normale dage — så strukturen ikke slipper.',
    perks: [
      'Praktisk til travle uger',
      'Ingen moralpræken',
      'Kun hvis du vil modtage det',
    ],
    audienceTag: '5-2-diet',
    accentFrom: '#4f46e5',
    accentTo: '#7c3aed',
    borderColor: '#c4b5fd',
  },
  'proteinrig-kost': {
    headline: 'Protein der mætter — uden at tælle hvert gram',
    subline:
      'Idéer til måltider og snacks når du vil holde dig mæt og stærk.',
    perks: [
      'Simpel kostlogik',
      'Gode proteinkilder i hverdagen',
      'Til dig der træner eller bare vil have mere mæthed',
    ],
    audienceTag: 'proteinrig-kost',
    accentFrom: '#be123c',
    accentTo: '#9f1239',
    borderColor: '#fda4af',
  },
}

function normalizeSlug(slug: string | undefined): string {
  if (!slug || typeof slug !== 'string') return ''
  return slug.trim().toLowerCase()
}

export function getNewsletterVariant(categorySlug?: string): NewsletterVariant {
  const key = normalizeSlug(categorySlug)
  if (key && VARIANTS[key]) return VARIANTS[key]
  return DEFAULT
}

/** Miljø-nøgle pr. kategori: NEXT_PUBLIC_NEWSLETTER_FORM_KETO, NEXT_PUBLIC_NEWSLETTER_FORM_SENSE, … */
export function getNewsletterFormAction(categorySlug?: string): string {
  const key = normalizeSlug(categorySlug).replace(/-/g, '_')
  const env = process.env as Record<string, string | undefined>
  if (key) {
    const specific = env[`NEXT_PUBLIC_NEWSLETTER_FORM_${key.toUpperCase()}`]
    if (specific?.trim()) return specific.trim()
  }
  const fallback = env.NEXT_PUBLIC_NEWSLETTER_FORM_DEFAULT?.trim()
  return fallback || ''
}
