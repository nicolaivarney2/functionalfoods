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

const NON_FOOD_DEPARTMENTS = new Set(
  [
    'Personlig pleje',
    'Pleje',
    'Bolig & køkken',
    'Tøj & sko',
    'Tøj',
    'Leg',
    'Fritid & sport',
    'Elektronik',
    'Husholdning',
    'Non-food',
    'Nonfood',
    'Øvrig nonfood',
    'Byggemarked',
    'Have',
    'Biludstyr',
    'Dyremad',
  ].map(normalizeCatalogLabel),
)

const FOOD_DEPARTMENTS = new Set(
  [
    'Kolonial',
    'Drikkevarer',
    'Drikke',
    'Mejeri og køl',
    'Mejeri & køl',
    'Mejeri',
    'Køl',
    'Slik & snacks',
    'Slik',
    'Frost',
    'Brød og kager',
    'Brød & Bavinchi',
    'Frugt og grønt',
    'Frugt & grønt',
    'Kød & fisk',
    'Kød, fisk & fjerkræ',
    'Kød og fisk',
    'Kiosk',
    'Mad fra hele verden',
    'Nemt & hurtigt',
    'Ost m.v.',
  ].map(normalizeCatalogLabel),
)

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
