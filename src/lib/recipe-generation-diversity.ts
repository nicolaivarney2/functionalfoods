type ExistingRecipeLike = {
  title?: string
  description?: string
  ingredients?: Array<{ name?: string | null } | string>
}

type SupportedNiche = 'keto' | 'glp1' | 'proteinrig'

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

/** Samme formater som GLP-1; kulhydrat-niveau styres i route-prompts. */
const PROTEINRIG_FORMATS = GLP1_FORMATS

const KETO_FLAVORS = ['citron og urter', 'røget paprika og hvidløg', 'smørstegt nordisk', 'karry og kokos', 'chili og lime']
const GLP1_FLAVORS = ['citron og urter', 'mild karry', 'nordisk grøn', 'middelhav med urter', 'ingefær og lime']

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

const PROTEINRIG_PRODUCE_ROTATIONS = [
  ['squash', 'tomater', 'grønne bønner'],
  ['aubergine', 'spidskål', 'linser'],
  ['fennikel', 'gulerødder', 'kikærter'],
  ['blomkål', 'broccoli', 'edamamebønner'],
]

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
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
    niche === 'keto' ? KETO_FORMATS : niche === 'proteinrig' ? PROTEINRIG_FORMATS : GLP1_FORMATS
  return collection[key] || collection.default
}

function getProduceRotation(niche: SupportedNiche): string[] {
  if (niche === 'keto') return randomItem(KETO_PRODUCE_ROTATIONS)
  if (niche === 'proteinrig') return randomItem(PROTEINRIG_PRODUCE_ROTATIONS)
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
  const defaultAvoids =
    niche === 'keto'
      ? ['broccoli', 'spinat', 'peberfrugt']
      : niche === 'proteinrig'
        ? ['broccoli', 'spinat', 'peberfrugt', 'kylling']
        : ['broccoli', 'spinat', 'peberfrugt', 'kylling', 'kikærter']

  const avoidSignals = recurringSignals.length > 0 ? recurringSignals : defaultAvoids
  const formatHint = requestedRecipeType?.trim() || randomItem(getFormatsByNiche(niche, mealType))
  const flavorHint = randomItem(niche === 'keto' ? KETO_FLAVORS : GLP1_FLAVORS)
  const produceRotation = getProduceRotation(niche)

  const lines = [
    'VARIATIONS-SPOR (brug dette aktivt):',
    `- Retformat: ${formatHint}.`,
    `- Smagsprofil: ${flavorHint}.`,
    `- Grøntrotation: Prioriter gerne ${produceRotation.join(', ')} i stedet for de mest oplagte standardvalg.`,
    `- Undgå denne gang, hvis muligt: ${avoidSignals.join(', ')}.`,
    '- Gør retten tydeligt anderledes end standardmønstret "protein + broccoli/peberfrugt + bladgrønt".',
  ]

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

