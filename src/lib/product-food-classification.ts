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
  'Baby & børn',
  'Baby og småbørn',
  'Baby og familie',
  'Dyr',
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
  if (dept && FOOD_DEPARTMENTS.has(dept)) return true
  if (category && FOOD_DEPARTMENTS.has(category)) return true
  if (subcategory && FOOD_DEPARTMENTS.has(subcategory)) return true
  if (!dept || AMBIGUOUS_DEPARTMENTS.has(dept)) return name.length > 0
  return false
}
