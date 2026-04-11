/**
 * Danske opskriftstitler: sætningscase (kun første bogstav stort), ikke Title Case På Hvert Ord.
 */
export function normalizeDanishRecipeTitle(raw: string): string {
  const s = String(raw || '').trim().replace(/\s+/g, ' ')
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}
