export type BlogSeoCategoryProfile = {
  slug: string
  displayName: string
  audience: string
  positioning: string
  coreTopics: string[]
  searchIntents: string[]
  avoid: string[]
  toneGuidelines: string[]
  contentAngles: string[]
}

const BLOG_SEO_CATEGORY_PROFILES: Record<string, BlogSeoCategoryProfile> = {
  keto: {
    slug: 'keto',
    displayName: 'Keto',
    audience: 'Danske læsere der vil forstå eller bruge ketogen kost i praksis',
    positioning: 'Praktisk, troværdig og uden pseudovidenskab',
    coreTopics: ['ketose', 'kulhydrater', 'madvarer', 'bivirkninger', 'fejl', 'ugeplaner', 'opstart'],
    searchIntents: ['hvordan', 'hvad må man spise', 'fejl at undgå', 'bedste madvarer', 'symptomer og løsninger'],
    avoid: ['bodybuilding-only vinkler', 'meget generiske sundhedsartikler uden keto-vinkel'],
    toneGuidelines: ['rolig', 'konkret', 'praktisk', 'dansk hverdag'],
    contentAngles: ['guide', 'fejl og løsninger', 'madvarelister', 'ugeplan', 'myter vs fakta'],
  },
  sense: {
    slug: 'sense',
    displayName: 'Sense',
    audience: 'Læsere der vil have en realistisk og bæredygtig koststruktur i hverdagen',
    positioning: 'Dansk, hverdagsnær og vaneorienteret',
    coreTopics: ['håndmodellen', 'mæthed', 'måltidsstruktur', 'portioner', 'vaner', 'spisning ude'],
    searchIntents: ['hvordan gør man', 'eksempler', 'ugeplan', 'fejl at undgå', 'mad på budget'],
    avoid: ['hardcore fitness-vinkler', 'ekstreme quick fixes'],
    toneGuidelines: ['enkel', 'beroligende', 'praktisk'],
    contentAngles: ['trin-for-trin guide', 'hverdagsproblemer', 'måltidseksempler', 'planlægning'],
  },
  'proteinrig-kost': {
    slug: 'proteinrig-kost',
    displayName: 'Proteinrig kost',
    audience: 'Læsere der vil spise mere protein for mæthed, træning eller kropssammensætning',
    positioning: 'Praktisk kostrådgivning først, træning som relevant underemne',
    coreTopics: ['proteinrige måltider', 'mæthed', 'muskelmasse', 'træning', 'restitution', 'madvarer', 'morgenmad'],
    searchIntents: ['bedste kilder', 'hvor meget protein', 'nemme måltider', 'før/efter træning', 'på budget'],
    avoid: ['ren gym-bro tone', 'for meget supplement-fokus'],
    toneGuidelines: ['praktisk', 'hverdagsvenlig', 'troværdig'],
    contentAngles: ['madvarelister', 'måltidsideer', 'forklarende guides', 'fejl og misforståelser'],
  },
  '5-2': {
    slug: '5-2',
    displayName: '5:2 Diæt',
    audience: 'Læsere der vil forstå og strukturere 5:2 i praksis',
    positioning: 'Realistisk fastevejledning uden hype',
    coreTopics: ['fastedage', 'spisedage', 'kalorier', 'mæthed', 'struktur', 'fejl', 'ugeplan'],
    searchIntents: ['hvordan starter man', 'hvad spiser man', 'hvor mange kalorier', 'eksempel på dag', 'typiske fejl'],
    avoid: ['for aggressiv vægttabsretorik', 'medicinske påstande uden forbehold'],
    toneGuidelines: ['rolig', 'støttende', 'konkret'],
    contentAngles: ['praktiske guides', 'dagsplaner', 'FAQ', 'problemløsning'],
  },
  antiinflammatorisk: {
    slug: 'antiinflammatorisk',
    displayName: 'Antiinflammatorisk',
    audience: 'Læsere der vil bruge kost til at understøtte mindre inflammation og bedre velvære',
    positioning: 'Vidensbaseret og jordnær',
    coreTopics: ['antiinflammatoriske madvarer', 'omega-3', 'grøntsager', 'sukker', 'ultra-forarbejdet mad', 'måltidsvalg'],
    searchIntents: ['hvad skal man spise', 'hvad skal man undgå', 'daglige vaner', 'morgenmad/frokost/aftensmad'],
    avoid: ['helbredelsesløfter', 'alternativ behandler-tone'],
    toneGuidelines: ['rolig', 'forklarende', 'respektfuld'],
    contentAngles: ['madvareguide', 'begynder-guide', 'vaner', 'indkøbsliste'],
  },
  fleksitarisk: {
    slug: 'fleksitarisk',
    displayName: 'Fleksitarisk',
    audience: 'Læsere der vil spise mere plantebaseret uden at blive helt vegetariske',
    positioning: 'Moderne, realistisk og dansk hverdagsmad',
    coreTopics: ['mindre kød', 'planteprotein', 'måltider', 'indkøb', 'familievenligt', 'nem omstilling'],
    searchIntents: ['hvordan starter man', 'hvad spiser man', 'protein uden meget kød', 'familiemad'],
    avoid: ['moraliserende klima-tone som skygger for mad/praktik'],
    toneGuidelines: ['inspirerende', 'praktisk', 'nede på jorden'],
    contentAngles: ['begynder-guide', 'madideer', 'ombytninger', 'hverdagsstrategier'],
  },
  familiemad: {
    slug: 'familiemad',
    displayName: 'Kalorietælling',
    audience: 'Familier der vil have nemmere, sundere og mere realistisk hverdagsmad med styr på kalorierne',
    positioning: 'Travl hverdag, børn, budget, kalorier og smag i balance',
    coreTopics: ['hverdagsmad', 'børn', 'budget', 'madpakke', 'nem aftensmad', 'planlægning'],
    searchIntents: ['nemme retter', 'børnevenlig mad', 'billig aftensmad', 'måltidsplan'],
    avoid: ['for akademisk tone', 'for snævre nichevinkler'],
    toneGuidelines: ['varm', 'hjælpsom', 'konkret'],
    contentAngles: ['lister', 'planlægning', 'problemløsning', 'familietips'],
  },
}

export function getBlogSeoCategoryProfile(categoryNameOrSlug: string): BlogSeoCategoryProfile {
  const key = String(categoryNameOrSlug || '').trim().toLowerCase()
  if (BLOG_SEO_CATEGORY_PROFILES[key]) return BLOG_SEO_CATEGORY_PROFILES[key]

  const byName = Object.values(BLOG_SEO_CATEGORY_PROFILES).find(
    (profile) => profile.displayName.toLowerCase() === key
  )
  return byName || BLOG_SEO_CATEGORY_PROFILES.keto
}

