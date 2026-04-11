/**
 * Shared diet/tag matching for /api/recipes?diet= and opskriftsoversigt counts.
 * Keep in sync with niche /…/opskrifter pages (same filter strings).
 */

export function normalizeDiet(value: string): string {
  return value.trim().toLowerCase()
}

export function recipeMatchesDiet(recipe: { dietaryCategories?: unknown }, dietFilter: string): boolean {
  if (!Array.isArray(recipe.dietaryCategories)) return false
  const normalizedFilter = normalizeDiet(dietFilter)
  return recipe.dietaryCategories.some((cat) => {
    if (typeof cat !== 'string') return false
    const normalizedCategory = normalizeDiet(cat)
    if (normalizedFilter === 'glp-1') {
      return normalizedCategory.includes('glp-1') || normalizedCategory.includes('glp1')
    }
    if (normalizedFilter === 'flexitarian') {
      return normalizedCategory.includes('fleksitarisk') || normalizedCategory.includes('flexitarian')
    }
    if (normalizedFilter === 'anti-inflammatory' || normalizedFilter === 'antiinflammatory') {
      return (
        normalizedCategory.includes('antiinflammatorisk') ||
        normalizedCategory.includes('anti-inflammatorisk') ||
        normalizedCategory.includes('anti inflammatorisk')
      )
    }
    if (
      normalizedFilter === '5-2' ||
      normalizedFilter === '5-2-diet' ||
      normalizedFilter === '52' ||
      normalizedFilter === '5:2' ||
      normalizedFilter === '5:2 diæt'
    ) {
      return (
        normalizedCategory.includes('5:2') ||
        normalizedCategory.includes('5-2') ||
        normalizedCategory.includes('5:2 diæt') ||
        normalizedCategory.includes('5:2 faste')
      )
    }
    return normalizedCategory.includes(normalizedFilter)
  })
}

/** Same idea as /familie/opskrifter — broader than exact tag "Familiemad". */
export function recipeMatchesFamilieCategories(recipe: { dietaryCategories?: unknown }): boolean {
  if (!Array.isArray(recipe.dietaryCategories)) return false
  return recipe.dietaryCategories.some((cat) => {
    if (typeof cat !== 'string') return false
    const catLower = cat.toLowerCase().trim()
    return (
      catLower === 'familiemad' ||
      catLower.includes('familiemad') ||
      catLower === 'familie' ||
      catLower.includes('familie') ||
      catLower === 'family' ||
      catLower.includes('family')
    )
  })
}

/** Maps opskriftsoversigt category `id` to the same diet string as /api/recipes?diet= */
const OVERVIEW_ID_TO_DIET_PARAM: Record<string, string> = {
  Keto: 'keto',
  Sense: 'sense',
  'GLP-1 kost': 'glp-1',
  'Proteinrig kost': 'proteinrig',
  Antiinflammatorisk: 'antiinflammatorisk',
  Fleksitarisk: 'fleksitarisk',
  '5:2': '5:2',
}

export function recipeMatchesOverviewCategory(
  recipe: { dietaryCategories?: unknown },
  categoryId: string
): boolean {
  if (categoryId === 'Familiemad') {
    return recipeMatchesFamilieCategories(recipe)
  }
  const param = OVERVIEW_ID_TO_DIET_PARAM[categoryId]
  if (!param) return false
  return recipeMatchesDiet(recipe, param)
}
