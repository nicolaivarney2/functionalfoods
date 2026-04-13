/**
 * Shared diet/tag matching for /api/recipes?diet= and opskriftsoversigt counts.
 * Core rules live in `diet-tag-matching.ts`.
 */

import { recipeTagsMatchDietQuery } from './diet-tag-matching'

export function normalizeDiet(value: string): string {
  return value.trim().toLowerCase()
}

export function recipeMatchesDiet(recipe: { dietaryCategories?: unknown }, dietFilter: string): boolean {
  if (!Array.isArray(recipe.dietaryCategories)) return false
  const cats = recipe.dietaryCategories.filter((c): c is string => typeof c === 'string')
  return recipeTagsMatchDietQuery(cats, dietFilter)
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
