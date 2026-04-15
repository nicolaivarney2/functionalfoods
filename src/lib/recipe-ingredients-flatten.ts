/**
 * Flader `ingredientGroups` til én ingrediensliste (fx til Midjourney eller normalisering),
 * når den flade `ingredients` mangler eller er tom.
 */
export function flattenRecipeIngredientsForMj(recipe: unknown): Record<string, unknown> {
  if (!recipe || typeof recipe !== 'object') return recipe as Record<string, unknown>
  const r = recipe as Record<string, unknown>
  const flat = Array.isArray(r.ingredients) ? (r.ingredients as unknown[]) : []
  if (flat.length > 0) return r
  const groups = r.ingredientGroups
  if (!Array.isArray(groups) || groups.length === 0) return r
  const merged = groups.flatMap((g: unknown) => {
    if (!g || typeof g !== 'object') return []
    const ing = (g as { ingredients?: unknown[] }).ingredients
    return Array.isArray(ing) ? ing : []
  })
  if (merged.length === 0) return r
  return { ...r, ingredients: merged }
}
