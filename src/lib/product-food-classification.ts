/**
 * Classify fooddata catalog products as food vs non-food for the ingredient match queue.
 */

export function normalizeCatalogLabel(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
}

/** Raw department/category labels in DB that are never food (used for SQL/API filters). */
export const NON_FOOD_CATALOG_LABELS = [
  'Personlig pleje',
  'Pleje',
  'Bolig & køkken',
  'Tøj & sko',
  'Tøj',
  'Leg',
  'Fritid & sport',
  'Elektronik',
  'Husholdning',
  'Husholdning & rengøring',
  'Non-food',
  'Nonfood',
  'Øvrig nonfood',
  'Byggemarked',
  'Have',
  'Biludstyr',
  'Dyremad',
  'Dyr',
  'Babypleje',
  'Tobak',
  'Kosttilskud',
  // Skjult fra /dagligvarer — vin, øl, sodavand dominerer ellers tilbudslisten
  'Drikkevarer',
  'Drikke',
] as const

/** Raw department/category labels in DB that are food (whitelist for /dagligvarer). */
export const FOOD_CATALOG_LABELS = [
  'Frugt og grønt',
  'Frugt & grønt',
  'Brød og kager',
  'Brød & Bavinchi',
  'Brød',
  'Kød og fisk',
  'Kød & fisk',
  'Kød, fisk & fjerkræ',
  'Kolonial',
  'Mejeri og køl',
  'Mejeri & køl',
  'Mejeri',
  'Køl',
  'Ost m.v.',
  'Frost',
  'Slik og snacks',
  'Slik & snacks',
  'Slik',
  'Kiosk',
  'Nemt og hurtigt',
  'Nemt & hurtigt',
  'Mad fra hele verden',
  'Babymad',
] as const

const NON_FOOD_DEPARTMENTS = new Set(NON_FOOD_CATALOG_LABELS.map(normalizeCatalogLabel))

const FOOD_DEPARTMENTS = new Set(FOOD_CATALOG_LABELS.map(normalizeCatalogLabel))

const AMBIGUOUS_DEPARTMENTS = new Set(
  [
    '365discount',
    'Kvickly',
    'SuperBrugsen',
    'Løvbjerg',
    'Lidl',
    'MENY',
    'SPAR',
    'ABC Lavpris',
    'Min Købmand',
    'Brugsen',
    'Not Categorized',
    'Baby & børn',
    'Baby og småbørn',
    'Baby og familie',
  ].map(normalizeCatalogLabel),
)

const NON_FOOD_NAME_PATTERNS: RegExp[] = [
  /\bshampoo\b/,
  /\bshowergel\b/,
  /\btandpasta\b/,
  /\bdeodorant\b/,
  /\bhundesnack/,
  /\bhundefoder\b/,
  /\bkattemad\b/,
  /\bleget[oe]j\b/,
  /\bstegepande\b/,
  /\bstr[oe]mpe/,
  /\bkreatin\b/,
  /\bmultivitamin\b/,
  /\bproteinpulver\b/,
  /\bble\b/,
  /\bsutter\b/,
]

const WINE_NAME_PATTERNS = [
  /roedvin/,
  /hvidvin/,
  /rosevin/,
  /mousserende/,
  /champagne/,
  /prosecco/,
  /cava/,
  /portvin/,
  /dessertvin/,
  /alkoholfri vin/,
  /(?:^|\s)vin(?:\s|$|,|&)/,
]

export type CatalogProductFoodInput = {
  department?: string | null
  category?: string | null
  subcategory?: string | null
  name?: string | null
}

function hasNonFoodName(name: string): boolean {
  if (!name) return false
  return NON_FOOD_NAME_PATTERNS.some((pattern) => pattern.test(name))
}

function wordIn(hay: string, word: string): boolean {
  if (!hay || !word) return false
  return new RegExp(`(?:^|[^a-z0-9])${word}(?:$|[^a-z0-9])`).test(hay)
}

function taxonomyText(dept: string, category: string, subcategory: string): string {
  return [dept, category, subcategory].filter(Boolean).join(' | ')
}

function isWineProduct(input: CatalogProductFoodInput): boolean {
  const name = normalizeCatalogLabel(input.name)
  if (WINE_NAME_PATTERNS.some((pattern) => pattern.test(name))) return true

  const categoryText = `${normalizeCatalogLabel(input.category)} ${normalizeCatalogLabel(input.subcategory)}`.trim()
  if (!categoryText) return false
  return categoryText === 'vin' || /^vin\b/.test(categoryText) || /\bvin\b/.test(categoryText)
}

/** Chips/nødder under slik-afdelingen er stadig madplan-relevante. */
function isSnackKeepTaxonomy(category: string, subcategory: string): boolean {
  const t = `${category} ${subcategory}`
  if (wordIn(t, 'slik') || wordIn(t, 'chokolade')) return false
  return /chips|nodder|notter|popcorn|oliven|dip/.test(t)
}

/**
 * Hylder der ikke skal i ingrediens-køen: slik, chokolade, vin, spiritus,
 * energidrik, babypleje — plus tobak, øl/cider og kosttilskud.
 * Babymad og chips/nødder beholdes.
 */
export function isExcludedFromIngredientMatchQueue(input: CatalogProductFoodInput): boolean {
  if (isWineProduct(input)) return true

  const dept = normalizeCatalogLabel(input.department)
  const category = normalizeCatalogLabel(input.category)
  const subcategory = normalizeCatalogLabel(input.subcategory)
  const name = normalizeCatalogLabel(input.name)
  const tax = taxonomyText(dept, category, subcategory)

  if (isSnackKeepTaxonomy(category, subcategory)) {
    // chips/nødder: ikke slik/chokolade-ekskludering
  } else if (
    wordIn(category, 'slik') ||
    wordIn(subcategory, 'slik') ||
    wordIn(dept, 'slik') ||
    wordIn(category, 'chokolade') ||
    wordIn(subcategory, 'chokolade')
  ) {
    return true
  }

  if (wordIn(tax, 'babymad') || wordIn(tax, 'borneernæring') || wordIn(tax, 'boerneeernaering')) {
    // babymad beholdes — ikke babypleje
  } else if (
    wordIn(tax, 'spiritus') ||
    wordIn(tax, 'likor') ||
    wordIn(tax, 'babypleje') ||
    wordIn(tax, 'energidrik') ||
    wordIn(tax, 'energidrikke') ||
    wordIn(tax, 'sportsdrik') ||
    wordIn(tax, 'sportsdrikke') ||
    wordIn(tax, 'tobak') ||
    wordIn(tax, 'kosttilskud') ||
    wordIn(tax, 'oel') ||
    wordIn(tax, 'cider')
  ) {
    return true
  }

  if (
    /spiritus|\blikor\b|whisky|whiskey|vodka|\bgin\b|\brom\b|\brum\b|cognac|tequila|snaps|akvavit/.test(
      name,
    )
  ) {
    return true
  }
  if (/energidrik|sportsdrik|red bull|monster energy|powerade|gatorade/.test(name)) {
    return true
  }
  if (/babypleje|\bbleer\b|vaadserviet|babyolie|babyshampoo|zinksalve/.test(name)) {
    return true
  }
  if (/tobak|cigaret|\bsnus\b/.test(name)) {
    return true
  }
  if (/kosttilskud|multivitamin|proteinpulver|\bkreatin\b/.test(name)) {
    return true
  }

  return false
}

export function getFoodCatalogLabelsForFilter(): string[] {
  return Array.from(new Set(FOOD_CATALOG_LABELS))
}

export function getNonFoodCatalogLabelsForFilter(): string[] {
  return Array.from(new Set(NON_FOOD_CATALOG_LABELS))
}

export function isFoodCatalogProduct(input: CatalogProductFoodInput): boolean {
  const dept = normalizeCatalogLabel(input.department)
  const category = normalizeCatalogLabel(input.category)
  const subcategory = normalizeCatalogLabel(input.subcategory)
  const name = normalizeCatalogLabel(input.name)

  if (hasNonFoodName(name)) return false
  if (dept && NON_FOOD_DEPARTMENTS.has(dept)) return false
  if (category && NON_FOOD_DEPARTMENTS.has(category)) return false
  if (subcategory && NON_FOOD_DEPARTMENTS.has(subcategory)) return false
  if (isExcludedFromIngredientMatchQueue(input)) return false
  if (dept && FOOD_DEPARTMENTS.has(dept)) return true
  if (category && FOOD_DEPARTMENTS.has(category)) return true
  if (subcategory && FOOD_DEPARTMENTS.has(subcategory)) return true
  if (!dept || AMBIGUOUS_DEPARTMENTS.has(dept)) return name.length > 0
  return false
}
