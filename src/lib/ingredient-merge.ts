/**
 * Rewrite recipe ingredient JSON when merging one catalog ingredient into another.
 *
 * Match a line if:
 * - `id` is the source catalog UUID, or
 * - `name` equals the source name (case-insensitive, trimmed)
 *
 * Never replace `temp-*` / `rowId` ids — instruction tags may still point at those.
 * When the line's catalog `id` is the source UUID, it is rewritten to the target UUID.
 */

export type IngredientIdentity = {
  id: string
  name: string
}

export function normalizeIngredientName(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function ingredientLineMatchesSource(
  line: { id?: unknown; name?: unknown },
  source: IngredientIdentity
): boolean {
  const id = typeof line.id === 'string' ? line.id.trim() : ''
  if (id && id === source.id) return true
  const name = typeof line.name === 'string' ? line.name : ''
  if (name && normalizeIngredientName(name) === normalizeIngredientName(source.name)) return true
  return false
}

export function rewriteIngredientLine(
  line: Record<string, unknown>,
  source: IngredientIdentity,
  target: IngredientIdentity
): { line: Record<string, unknown>; changed: boolean } {
  if (!ingredientLineMatchesSource(line, source)) return { line, changed: false }

  const next: Record<string, unknown> = { ...line, name: target.name }
  const id = typeof line.id === 'string' ? line.id.trim() : ''
  if (id && id === source.id) {
    next.id = target.id
  }
  return { line: next, changed: true }
}

export function rewriteIngredientList(
  ingredients: unknown,
  source: IngredientIdentity,
  target: IngredientIdentity
): { next: unknown; renamedCount: number } {
  if (!Array.isArray(ingredients)) return { next: ingredients, renamedCount: 0 }

  let renamedCount = 0
  const next = ingredients.map((item) => {
    if (!item || typeof item !== 'object') return item
    const { line, changed } = rewriteIngredientLine(
      item as Record<string, unknown>,
      source,
      target
    )
    if (changed) renamedCount += 1
    return line
  })
  return { next, renamedCount }
}

export function rewriteIngredientGroups(
  groups: unknown,
  source: IngredientIdentity,
  target: IngredientIdentity
): { next: unknown; renamedCount: number } {
  if (!Array.isArray(groups)) return { next: groups, renamedCount: 0 }

  let renamedCount = 0
  const next = groups.map((group) => {
    if (!group || typeof group !== 'object') return group
    const g = group as Record<string, unknown>
    const rewritten = rewriteIngredientList(g.ingredients, source, target)
    renamedCount += rewritten.renamedCount
    if (rewritten.renamedCount === 0) return group
    return { ...g, ingredients: rewritten.next }
  })
  return { next, renamedCount }
}

export function rewriteRecipeIngredientFields(
  recipe: { ingredients?: unknown; ingredientGroups?: unknown },
  source: IngredientIdentity,
  target: IngredientIdentity
): {
  ingredients: unknown
  ingredientGroups: unknown
  renamedCount: number
  changed: boolean
} {
  const flat = rewriteIngredientList(recipe.ingredients, source, target)
  const groups = rewriteIngredientGroups(recipe.ingredientGroups, source, target)
  const renamedCount = flat.renamedCount + groups.renamedCount
  return {
    ingredients: flat.next,
    ingredientGroups: groups.next,
    renamedCount,
    changed: renamedCount > 0,
  }
}
