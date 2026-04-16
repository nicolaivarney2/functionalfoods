type ExistingRecipeLike = {
  title?: string
  description?: string
  ingredients?: Array<{ name?: string | null } | string>
}

type SupportedNiche = 'keto' | 'glp1' | 'proteinrig' | 'sense'

type DiversityContext = {
  niche: SupportedNiche
  existingRecipes?: ExistingRecipeLike[]
  mealType?: string
  requestedRecipeType?: string
  preferredProtein?: string
  preferredStyle?: string
  inspiration?: string
}

const STOP_WORDS = new Set([
  'med',
  'og',
  'eller',
  'for',
  'til',
  'fra',
  'uden',
  'over',
  'under',
  'i',
  'på',
  'af',
  'en',
  'et',
  'den',
  'det',
  'de',
  'som',
  'ret',
  'opskrift',
  'keto',
  'glp',
  'kost',
  'med',
  'til',
])

const SIGNAL_ALIASES: Record<string, string[]> = {
  broccoli: ['broccoli'],
  spinat: ['spinat'],
  grønkål: ['grønkål', 'groenkaal'],
  peberfrugt: ['peberfrugt'],
  blomkål: ['blomkål', 'blomkaal'],
  squash: ['squash', 'zucchini'],
  kylling: ['kylling', 'kyllingebryst'],
  kalkun: ['kalkun'],
  laks: ['laks'],
  tun: ['tun'],
  oksekød: ['oksekød', 'oksekoed', 'hakkebøf', 'hakkebof', 'okse'],
  svinekød: ['svinekød', 'svinekoed', 'svin', 'flæsk', 'skinke', 'kotelet'],
  lam: ['lam', 'lammekød', 'lammekoed', 'lammek'],
  kikærter: ['kikærter', 'kikaerter'],
  linser: ['linser'],
  avocado: ['avocado'],
  æg: ['æg', 'aeg', 'omelet'],
  feta: ['feta'],
  salat: ['salat'],
  suppe: ['suppe'],
  bowl: ['bowl'],
  lasagne: ['lasagne'],
  gryderet: ['gryderet'],
  fennikel: ['fennikel'],
  gulerod: ['gulerødder', 'gulerod', 'gulerød'],
  honning: ['honning'],
  dijon: ['dijon', 'dijonsennep'],
}

const KETO_FORMATS: Record<string, string[]> = {
  morgenmad: ['omelet', 'æggebakke fra ovn', 'lun morgenmadsskål', 'morgenmadstallerken'],
  frokost: ['lun salat', 'bowl', 'wraps i salatblade', 'suppe'],
  snacks: ['små salat-wraps', 'æggebidder', 'sprøde ostesnacks med dip', 'mættende mini-tallerken'],
  aftensmad: ['gryderet', 'ovnret', 'panderet', 'fyldte grøntsager', 'cremet suppe'],
  dessert: ['keto-dessert', 'bagt dessert', 'cremet dessert'],
  default: ['gryderet', 'ovnret', 'panderet', 'bowl'],
}

const GLP1_FORMATS: Record<string, string[]> = {
  morgenmad: ['æggeret eller omelet', 'havregrød', 'cottage cheese tallerken', 'lun morgenmadstallerken'],
  frokost: ['mættende salat', 'varm bowl', 'suppe', 'ovnret i portionsform'],
  snacks: ['lille proteinrigt mellemmåltid', 'mini-bowl', 'mættende snacktallerken'],
  aftensmad: ['ovnret', 'gryderet', 'suppe', 'varm tallerkenret', 'sheet-pan ret'],
  default: ['ovnret', 'gryderet', 'suppe', 'salat', 'bowl'],
}

/** Proteinrig: flere rettyper end GLP-1 så generatoren ikke kører i ring. */
const PROTEINRIG_FORMATS: Record<string, string[]> = {
  morgenmad: [
    'æggeret eller omelet',
    'bagt æggefad med grøntsager og ost',
    'havregrød med protein og frugt',
    'cottage cheese- eller skyr tallerken med topping',
    'lun morgenmadstallerken',
    'rugbrød med magert pålæg og grønt',
  ],
  frokost: [
    'mættende salat',
    'varm bowl',
    'wrap eller sandwich med fuldkorn',
    'suppe med protein og en smule brød',
    'ovnret i portionsform',
    'poké-inspireret skål uden at gentage samme grønt-trio som sidst',
  ],
  snacks: [
    'lille proteinrigt mellemmåltid',
    'mini-bowl',
    'mættende snacktallerken',
    'skyr med nødder og bær',
    'æggebidder eller cottage dips',
  ],
  aftensmad: [
    'ovnret',
    'gryderet',
    'suppe',
    'varm tallerkenret',
    'sheet-pan ret',
    'pastaret med magert protein',
    'risotto eller perlespeltotto',
    'wok med sauce og masser af grønt',
    'taco- eller buddha bowl',
    'hjemmelavet burger eller bøf med tilbehør',
    'fiskefrikadeller eller fiskefilet med kartoffel/korn',
    'gryderet med rodfrugt (ikke kun gulerod)',
    'fyldt aubergine eller squash',
    'karryret med kokosmælk (moderat fedt)',
  ],
  default: [
    'ovnret',
    'gryderet',
    'suppe',
    'salat',
    'bowl',
    'pastaret',
    'wok',
  ],
}

const KETO_FLAVORS = ['citron og urter', 'røget paprika og hvidløg', 'timian, rosmarin og svampe', 'karry og kokos', 'chili og lime']
const GLP1_FLAVORS = ['citron og urter', 'mild karry', 'frisk grønt med urter', 'middelhav med urter', 'ingefær og lime']

const PROTEINRIG_FLAVORS = [
  'urter, dill og citron',
  'middelhav med tomat, oliven og oregano',
  'asiatisk soy, sesam og ingefær',
  'indisk-inspireret med garam masala og yoghurt',
  'mexicansk med spidskommen, lime og chili (uden ekstra sukker)',
  'mellemøstlig med tahin, citron og hvidløg',
  'fransk urter og hvidløg',
  'thai-inspireret med limeblade og kokos (måltid, ikke dessert)',
  'tyrkisk mynte og yoghurt',
  'koreansk-inspireret gochujang/sesam (mild varme)',
  'italiensk basilikum og tomat',
  'smøret svamp og timian',
]

/** Sense: hverdagsretter med spisekasse; undgå vegetar/kikært som fast skabelon. */
const SENSE_FORMATS: Record<string, string[]> = {
  morgenmad: [
    'havregrød eller birkes',
    'rugbrød med pålæg og grønt',
    'skyr/kvark med frugt og lidt nødder',
    'æggeret eller omelet med grønt',
    'rugbrød med æg og avokado',
  ],
  frokost: [
    'rugbrødsmad med magert pålæg og grønt',
    'lun rest fra aftensmad med salat til',
    'suppe med brød til',
    'klassisk smørrebrødsinspireret tallerken',
  ],
  snacks: [
    'skyr med topping',
    'frugt og lidt nødder',
    'grøntsager og dip',
  ],
  aftensmad: [
    'ovnbagt fisk eller kylling med kartofler, sovs og grønt',
    'hakket oksekød i tomatsauce med pasta og salat',
    'frikadeller eller medister med kogte kartofler, sovs og grønt',
    'gryderet med kød og rodfrugt (ikke kun bælgfrugt)',
    'pandestegt fisk med kartofler og remoulade-dressing',
    'wok med kød/fisk og lidt ris (ikke ren nudel-ret)',
    'færdig hverdagsret: ét kød/fisk, én stivelse, masser af grønt',
    'suppe med kød/fisk og brød',
  ],
  default: ['tallerkenret', 'gryderet', 'ovnret', 'pandestegt'],
}

const SENSE_FLAVORS = [
  'klassisk med persille, timian og citron',
  'ovnristet med rosmarin og hvidløg',
  'dild og citron (fisk og kartofler)',
  'tomat, hvidløg og basilikum (pastaret eller gryde)',
  'mild paprika og løg (gryderet)',
  'mild karry (hverdagsniveau, ikke restaurant-thai)',
  'eddike eller lime mod fedme (sur balance uden honning)',
  'kapers, citron og urter (ingen sød dressing)',
  'ingefær, sesam og forårsløg (lidt soy — hverdagsniveau)',
  'røget paprika, løg og timian',
  'tahin, citron og hvidløg (cremet uden sød glace)',
  'miso og appelsin eller lime (små mængder)',
  'pul biber eller mild urfa (varme uden sødme)',
  'græsk yoghurt, mynte og agurk (koldt tilbehør)',
  'balsamico og tomat (lidt sødme fra tomat, ikke honning)',
]

const SENSE_PRODUCE_POOL = [
  'blandet salat eller spidskål',
  'tomat og agurk',
  'broccoli eller blomkål',
  'gulerod og ærter',
  'spinat eller grønkål',
  'squash eller aubergine',
  'champignon',
  'rødbede eller pastinak',
  'løg og hvidløg',
  'grønne bønner eller sugarsnaps',
  'radiser eller agurk',
  'selleri eller porre',
  'æbler eller pærer (til måltid, ikke dessert)',
  'bær som topping',
  'friske krydderurter',
]

const KETO_PRODUCE_ROTATIONS = [
  ['blomkål', 'svampe', 'fennikel'],
  ['spidskål', 'squash', 'radiser'],
  ['aubergine', 'selleri', 'grønne bønner'],
  ['rosenkål', 'kålrabi', 'asparges'],
]

const GLP1_PRODUCE_ROTATIONS = [
  ['gulerødder', 'spidskål', 'linser'],
  ['blomkål', 'fennikel', 'kikærter'],
  ['grønne bønner', 'kål', 'havre'],
  ['squash', 'tomater', 'bønner'],
]

/**
 * Bred pulje til proteinrig — undgår at én fast trio (fx fennikel + gulerod + kikærter) dominerer.
 * Ved hver generation vælges 4 tilfældige, forskellige punkter som inspiration (ikke obligatorisk alt i én ret).
 */
const PROTEINRIG_PRODUCE_POOL = [
  'squash eller zucchini',
  'tomat (frisk eller hakkede på dåse)',
  'grønne bønner eller sugarsnaps',
  'broccoli',
  'blomkål',
  'spidskål eller savojkål',
  'rødkål eller hvidkål',
  'grønkål eller rosenkål',
  'kålrabi',
  'aubergine',
  'porrer eller forårsløg',
  'radiser',
  'agurk i salat eller tzatziki-inspireret',
  'spinat eller rucola',
  'champignon eller blandede svampe',
  'asparges',
  'ærter eller edamame',
  'pastinak eller persillerod',
  'rødbede',
  'selleri',
  'majs',
  'peberfrugt',
  'ingefær og hvidløg som smagsbund',
  'friske urter (fx koriander, basilikum, timian)',
  'citron eller lime',
  'kikærter (kun hvis det passer til retten — ikke i hver opskrift)',
  'sorte bønner eller kidneybønner',
  'røde eller brune linser',
  'perlespelt eller byg som tilbehør',
  'kartoffel eller batat',
  'fuldkornspasta eller bulgur som tilbehør',
  'fennikel (sjældnere hovedgrønt — brug kun når det giver mening)',
  'gulerødder (som én blandt flere grøntsager — ikke standardtrio)',
]

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function pickRandomDistinct<T>(pool: T[], count: number): T[] {
  if (pool.length === 0) return []
  const copy = [...pool]
  const n = Math.min(count, copy.length)
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length)
    out.push(copy[idx])
    copy.splice(idx, 1)
  }
  return out
}

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9æøå\s-]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

function getRecipeText(recipe: ExistingRecipeLike): string {
  const ingredientNames = Array.isArray(recipe.ingredients)
    ? recipe.ingredients
        .map((ingredient) =>
          typeof ingredient === 'string' ? ingredient : String(ingredient?.name || '')
        )
        .join(' ')
    : ''

  return [recipe.title || '', recipe.description || '', ingredientNames].join(' ')
}

function getRecurringSignals(existingRecipes: ExistingRecipeLike[] = []): string[] {
  const counts = new Map<string, number>()

  for (const recipe of existingRecipes.slice(0, 60)) {
    const text = getRecipeText(recipe)
    const tokens = tokenize(text)

    for (const [signal, aliases] of Object.entries(SIGNAL_ALIASES)) {
      if (aliases.some((alias) => tokens.includes(alias))) {
        counts.set(signal, (counts.get(signal) || 0) + 1)
      }
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count >= 2)
    .map(([signal]) => signal)
    .slice(0, 5)
}

function getFormatsByNiche(niche: SupportedNiche, mealType?: string): string[] {
  const key = (mealType || '').toLowerCase()
  const collection =
    niche === 'keto'
      ? KETO_FORMATS
      : niche === 'proteinrig'
        ? PROTEINRIG_FORMATS
        : niche === 'sense'
          ? SENSE_FORMATS
          : GLP1_FORMATS
  return collection[key] || collection.default
}

function getProduceRotation(niche: SupportedNiche): string[] {
  if (niche === 'keto') return randomItem(KETO_PRODUCE_ROTATIONS)
  if (niche === 'proteinrig') return pickRandomDistinct(PROTEINRIG_PRODUCE_POOL, 4)
  if (niche === 'sense') return pickRandomDistinct(SENSE_PRODUCE_POOL, 4)
  return randomItem(GLP1_PRODUCE_ROTATIONS)
}

export function buildRecipeVariationPrompt({
  niche,
  existingRecipes = [],
  mealType,
  requestedRecipeType,
  preferredProtein,
  preferredStyle,
  inspiration,
}: DiversityContext): string {
  const recurringSignals = getRecurringSignals(existingRecipes)
  const baseAvoids: string[] =
    niche === 'keto'
      ? ['broccoli', 'spinat', 'peberfrugt']
      : niche === 'proteinrig'
        ? ['broccoli', 'spinat', 'peberfrugt', 'kylling']
        : niche === 'sense'
          ? ['broccoli', 'spinat', 'peberfrugt']
          : ['broccoli', 'spinat', 'peberfrugt', 'kylling', 'kikærter']

  /** Altid læg basis-undgåelser oven i gentagne signaler — ellers forsvinder de og modellen kollapser mod samme grønt-par. */
  const avoidSignals = [...new Set([...baseAvoids, ...recurringSignals])].slice(0, 12)
  const formatHint = requestedRecipeType?.trim() || randomItem(getFormatsByNiche(niche, mealType))
  const flavorHint = randomItem(
    niche === 'keto'
      ? KETO_FLAVORS
      : niche === 'proteinrig'
        ? PROTEINRIG_FLAVORS
        : niche === 'sense'
          ? SENSE_FLAVORS
          : GLP1_FLAVORS
  )
  const produceRotation = getProduceRotation(niche)

  const lines = [
    'VARIATIONS-SPOR (brug dette aktivt):',
    '- Smag og køkken: Varier gerne på tværs af hele verden (asiatisk, latinamerikansk, mellemøstlig, afrikansk, europæisk …). Undgå ikke krydderier eller retninger for at holde det «hjemligt» — niche, kategori og kostregler har førsteprioritet.',
    '- **Anti-gentagelse:** Undgå den samme «AI-skabelon» i hver ret: **ikke** fast combo af honning + dijonsennep + citron + hvidløg + olie + pandestegning som standard. Vælg **én** tydelig smagsakse ad gangen og skift tilberedning (ovn, gryde, damp, grill, lang simren, bagt i fad …).',
    `- Retformat: ${formatHint}.`,
    `- Smagsprofil: ${flavorHint}.`,
    `- Grønt- og tilbehørsinspiration (vælg 2–4 elementer der passer til retten — ikke alt i én ret): ${produceRotation.join(' · ')}.`,
    `- Undgå denne gang, hvis muligt: ${avoidSignals.join(', ')}.`,
  ]

  if (niche === 'sense') {
    lines.push(
      '- Undgå at gentage præcis samme trio (fx kylling + broccoli + ris). Varier format og smag gerne internationalt, så længe Sense-spisekassen overholdes; undgå vegetar/kikærte-fokus som fast skabelon.'
    )
    lines.push(
      '- Grønt: Brug **ikke** automatisk «to ens 150 g grøntsager + protein» som fast layout — varier snit, mængder og kombinationer (fx én hovedgrønt + salat-top, eller rodfrugt + grønne bønner).'
    )
  } else {
    lines.push('- Gør retten tydeligt anderledes end standardmønstret "protein + broccoli/peberfrugt + bladgrønt".')
  }

  if (niche === 'keto') {
    lines.push(
      '- PROTEIN (DK): Varier primært mellem kylling med skind, svinekød, oksekød, hakket kød, bacon/pølser i passende mængder og fed fisk (laks, makrel, sild, tun). Brug **lam/lammekød højst sjældent** (ca. hver 8.–10. ret eller sjældnere) — det er niche i dansk hverdagskost og må ikke dominere keto-opskrifterne.'
    )
  }

  if (niche === 'proteinrig') {
    lines.push(
      '- MADHORISONT: Tænk bredt på tværs af køkkener, årstider og kulhydratkilder (kartoffel, batat, bulgur, ris, pasta, perlespelt, bønner/linser) — undgå at gentage samme "fennikel + kikærter + gulerødder"-DNA som hovedmønster.'
    )
    lines.push(
      '- BÆLGFRUGT: Kikærter er tilladt, men må ikke være standard i hver ret; skift gerne med linser, edamame, bønner eller helt uden bælgfrugt i nogle måltider.'
    )
  }

  if (niche === 'sense') {
    lines.push(
      '- SENSE-SPISEKASSE: Byg retten så den tydeligt kan forklares med håndfulde — masser af ikke-stivelsesholdigt grønt (1–2 håndfulde pr. person), 1 håndfuld protein, 0–1 håndfuld stivelse/frugt efter måltidstype, og fedt som olie/smør/nødder svarende til ca. 1–3 spsk pr. person (fordelt i retten).'
    )
    lines.push(
      '- PROTEIN: Varier — kød og fisk passer til mange aftener; æg og mejeri også. Undgå at kikærter, linser eller tofu bliver hovedprotein i ret efter ret.'
    )
    lines.push(
      '- BÆLGFRUGT: Tilladt når retten kalder på det (fx chili, gryderet); brug dem ikke som standard-erstatning for kød/fisk hver gang.'
    )
    lines.push(
      '- IKKE KETO: Sense er moderat kulhydrat; undgå at lave retten om til lavkulhydrat/keto. Ingen “hjerne-boost” eller kognitiv sundhed som hovedvinkel — fokus er vaner, mæthed og balancerede portioner.'
    )
  }

  const meal = (mealType || 'aftensmad').toLowerCase()
  const isAftensmad = meal === 'aftensmad'

  if (niche === 'glp1') {
    if (isAftensmad) {
      lines.push(
        '- Kulhydrat (aftensmad): Inkluder gerne en lille mængde komplekse kulhydrater (fuldkornsris, bulgur, quinoa, fuldkornspasta eller lidt kartoffel/batat). Typisk ca. 40–70 g kogt korn/pasta pr. portion eller 60–100 g kartoffel/batat; undgå store portioner, hvidt brød og sukker.',
      )
    } else {
      lines.push(
        '- Kulhydrat (morgenmad/frokost/snack): Hold det enkelt — fx æg, grød, skyr/kvark, cottage cheese, lidt brød eller frugt/bær. Undgå tunge kogte korn (bulgur, quinoa, pasta, ris) og især aldrig i smoothie, shake eller flydende måltid.',
      )
    }
  }
  if (niche === 'proteinrig') {
    if (isAftensmad) {
      lines.push(
        '- Kulhydrat (aftensmad): Inkluder gerne moderate mængder komplekse kulhydrater (fuldkornsris, bulgur, quinoa, fuldkornspasta, kartoffel/batat) sammen med den høje protein — typisk ca. 80–150 g kogt korn/pasta pr. portion eller 150–220 g kartoffel/batat.',
      )
    } else {
      lines.push(
        '- Kulhydrat (morgenmad/frokost/snack): Enkle kilder (grød, brød, lidt frugt); undgå store portioner bulgur/quinoa/pasta/ris og aldrig tunge korn i smoothie eller shake.',
      )
    }
  }
  if (niche === 'sense') {
    if (isAftensmad) {
      lines.push(
        '- Kulhydrat (Sense aftensmad): Inkluder én tydelig stivelseskilde pr. portion med realistiske mængder — fx 120–220 g kartoffel/kogt kartoffel, 80–140 g kogt ris/bulgur/perlespelt, 2 skiver rugbrød, eller 70–120 g kogt fuldkornspasta — juster ned hvis retten allerede har meget frugt.',
      )
    } else {
      lines.push(
        '- Kulhydrat (Sense morgenmad/frokost/snack): Brød, grød, lidt frugt eller lidt korn passer godt; undgå gigantiske portioner pasta/ris og undgå søde drikke som måltid.',
      )
    }
  }

  if (preferredProtein && preferredProtein.trim() && preferredProtein !== 'frit-valg') {
    lines.push(`- Proteinretning: Lad ${preferredProtein} være den tydelige hovedkilde til protein.`)
  }

  if (preferredStyle && preferredStyle.trim()) {
    lines.push(`- Stil: Retten skal føles som ${preferredStyle}.`)
  }

  if (mealType && mealType.trim()) {
    lines.push(`- Måltid: Opskriften skal tydeligt fungere som ${mealType}.`)
  }

  if (inspiration && inspiration.trim()) {
    lines.push(`- Inspiration: Bevar gerne følelsen af "${inspiration}", men uden at kopiere en standardret 1:1.`)
  }

  return `${lines.join('\n')}\n`
}

