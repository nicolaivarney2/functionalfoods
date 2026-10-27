/** Måltider der kan sættes med ét klik i publishing. */
export const QUICK_MEAL_CATEGORIES = ['Morgenmad', 'Frokost', 'Aftensmad'] as const

const MEAL_CATEGORY_BY_KEY: Record<string, string> = {
  morgenmad: 'Morgenmad',
  breakfast: 'Morgenmad',
  frokost: 'Frokost',
  lunch: 'Frokost',
  aftensmad: 'Aftensmad',
  middag: 'Aftensmad',
  dinner: 'Aftensmad',
  dessert: 'Desserter',
  snacks: 'Snack',
  snack: 'Snack',
}

/** Måltid vælges som hovedkategori foran emne-tags som Salater. */
const MEAL_MAIN_PRIORITY = [
  'Morgenmad',
  'Frokost',
  'Aftensmad',
  'Snack',
  'Snacks',
  'Desserter',
]

export function mealCategoryFromMaaltid(maaltid?: string | null): string | null {
  const key = (maaltid || '').trim().toLowerCase()
  if (!key) return null
  return MEAL_CATEGORY_BY_KEY[key] || null
}

/**
 * AI-gem brugte kun niche-navnet (fx «Sund mad») som kategori.
 * Måltidet fra genereringen lægges på som hovedkategori, og niche-navnet beholdes som underkategori.
 */
export function categoriesForGeneratedRecipe(
  nicheCategory: string,
  maaltid?: string | null
): { mainCategory: string; subCategories: string[] } {
  const meal = mealCategoryFromMaaltid(maaltid)
  const niche = nicheCategory.trim() || 'Aftensmad'
  if (!meal || meal === niche) {
    return { mainCategory: meal || niche, subCategories: [] }
  }
  return { mainCategory: meal, subCategories: [niche] }
}

export function recipeCategoryNames(recipe: {
  mainCategory?: string | null
  subCategories?: string[] | null
  dietaryCategories?: string[] | null
}): string[] {
  const all: string[] = []
  const push = (value?: string | null) => {
    const name = (value || '').trim()
    if (name && !all.includes(name)) all.push(name)
  }
  push(recipe.mainCategory)
  for (const category of recipe.subCategories || []) push(category)
  for (const category of recipe.dietaryCategories || []) push(category)
  return all
}

export function recipeHasCategory(recipe: {
  mainCategory?: string | null
  subCategories?: string[] | null
  dietaryCategories?: string[] | null
}, category: string): boolean {
  const wanted = category.trim().toLowerCase()
  return recipeCategoryNames(recipe).some((name) => name.toLowerCase() === wanted)
}

export function partitionRecipeCategories(
  all: string[],
  allowed: string[],
  dietary: string[],
  fallbackMain?: string | null
): { mainCategory: string; subCategories: string[]; dietaryCategories: string[] } {
  const unique: string[] = []
  for (const raw of all) {
    const name = raw.trim()
    if (name && !unique.includes(name)) unique.push(name)
  }

  const dietarySet = new Set(dietary)
  const allowedSet = new Set(allowed)
  const selectedDietary = unique.filter((category) => dietarySet.has(category))
  const allowedSelected = unique.filter(
    (category) => allowedSet.has(category) && !dietarySet.has(category)
  )
  const extras = unique.filter(
    (category) => !dietarySet.has(category) && !allowedSet.has(category)
  )
  const fallback = fallbackMain && unique.includes(fallbackMain.trim()) ? fallbackMain.trim() : ''
  const mainCategory =
    allowedSelected.find((category) => MEAL_MAIN_PRIORITY.includes(category)) ||
    allowedSelected[0] ||
    extras[0] ||
    fallback ||
    'Aftensmad'
  const subCategories = [...allowedSelected, ...extras].filter((category) => category !== mainCategory)

  return { mainCategory, subCategories, dietaryCategories: selectedDietary }
}

export function sameCategoryList(a?: string[] | null, b?: string[] | null): boolean {
  if (!a || !b || a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}
