import type { Recipe } from '@/types/recipe'

/**
 * Visnings-tal for opskrifter: i en indledende periode vises tallet × multiplier,
 * så det matcher øget synlighed i starten. Samme logik som "hver visning tæller som 3".
 *
 * Slå fra: sæt `NEXT_PUBLIC_RECIPE_VIEW_BOOST_UNTIL` til en dato i fortiden (fx 2000-01-01).
 * Eller sæt `NEXT_PUBLIC_RECIPE_VIEW_BOOST_MULTIPLIER=1`.
 */

function endOfDayLocal(yyyyMmDd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim())
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  return new Date(y, mo, d, 23, 59, 59, 999)
}

export function isRecipeViewBoostActive(): boolean {
  const untilRaw =
    typeof process.env.NEXT_PUBLIC_RECIPE_VIEW_BOOST_UNTIL === 'string'
      ? process.env.NEXT_PUBLIC_RECIPE_VIEW_BOOST_UNTIL.trim()
      : ''
  const until = untilRaw || '2026-12-31'
  const end = endOfDayLocal(until)
  if (!end || Number.isNaN(end.getTime())) return false
  return Date.now() <= end.getTime()
}

export function getRecipeViewDisplayMultiplier(): number {
  const raw = process.env.NEXT_PUBLIC_RECIPE_VIEW_BOOST_MULTIPLIER
  const n = raw != null && String(raw).trim() !== '' ? Number(raw) : 3
  if (!Number.isFinite(n) || n < 1) return 1
  return isRecipeViewBoostActive() ? Math.floor(n) : 1
}

/** Brug til visning (ikke til analytics/JSON-LD). */
export function getDisplayedRecipeViews(rawViews: number): number {
  const base = Math.max(0, Math.round(rawViews))
  const m = getRecipeViewDisplayMultiplier()
  return Math.round(base * m)
}

function readPageViewsIncrement(recipe: Pick<Recipe, 'pageViews'> & { page_views?: number }): number {
  const raw = recipe.pageViews ?? recipe.page_views
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

/** Startværdi før FF-visninger: Ketoliv-tal hvis sat, ellers deterministisk slug-fallback. */
export function getRecipeViewBaseline(recipe: Pick<Recipe, 'slug' | 'ketolivViews'>): number {
  const k = Number(recipe.ketolivViews)
  if (Number.isFinite(k) && k > 0) return k
  const slug = String(recipe.slug || '')
  return 1000 + slug.length * 100 + (slug.charCodeAt(0) || 0) * 10
}

/** Rå visningstal til UI = baseline + registrerede FF-sidevisninger (`pageViews` i DB). */
export function getRecipeViewRawTotal(
  recipe: Pick<Recipe, 'slug' | 'ketolivViews' | 'pageViews'> & { page_views?: number }
): number {
  return getRecipeViewBaseline(recipe) + readPageViewsIncrement(recipe)
}
