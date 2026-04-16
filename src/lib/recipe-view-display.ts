import type { Recipe } from '@/types/recipe'

/**
 * Visnings-tal for opskrifter: valgfri "boost" ganger kun baseline (Ketoliv/slug-fallback),
 * så hver registreret FF-sidevisning (`pageViews` i DB) øger det viste tal med præcis +1.
 *
 * Slå boost fra: sæt `NEXT_PUBLIC_RECIPE_VIEW_BOOST_UNTIL` til en dato i fortiden (fx 2000-01-01),
 * eller sæt `NEXT_PUBLIC_RECIPE_VIEW_BOOST_MULTIPLIER=1`.
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

/**
 * Vist antal visninger: boost gælder kun baseline; hver FF-pageView tæller +1 i UI.
 * (Tidligere blev hele summen ganget med multiplier, så ét besøg så ud som +3.)
 */
export function getDisplayedRecipeViewTotal(
  recipe: Pick<Recipe, 'slug' | 'ketolivViews' | 'pageViews'> & { page_views?: number; pageviews?: number }
): number {
  const baseline = getRecipeViewBaseline(recipe)
  const pv = readPageViewsIncrement(recipe)
  const m = getRecipeViewDisplayMultiplier()
  const b = Math.max(0, Math.round(baseline))
  const p = Math.max(0, Math.round(pv))
  if (m <= 1) return b + p
  return Math.round(b * m) + p
}

function coerceNonNegativeInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) return Math.floor(n)
  }
  return 0
}

function readPageViewsIncrement(
  recipe: Pick<Recipe, 'pageViews'> & { page_views?: number; pageviews?: number }
): number {
  const raw = recipe.pageViews ?? recipe.page_views ?? recipe.pageviews
  return coerceNonNegativeInt(raw)
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
  recipe: Pick<Recipe, 'slug' | 'ketolivViews' | 'pageViews'> & { page_views?: number; pageviews?: number }
): number {
  return getRecipeViewBaseline(recipe) + readPageViewsIncrement(recipe)
}
