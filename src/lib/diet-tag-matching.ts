/**
 * Single source of truth for matching recipe `dietaryCategories` / meal-plan tags
 * to diet slugs, URL params, and overview labels (hyphen vs space, Danish synonyms).
 */

/** Extra recipe-tag strings per canonical meal-plan / factory diet `id`. */
const DIET_MATCH_ALIASES: Record<string, readonly string[]> = {
  'anti-inflammatory': ['antiinflammatorisk', 'anti inflammatorisk'],
  flexitarian: ['fleksitarisk'],
  mediterranean: ['middelhavskost', 'middelhavsk', 'middelhavsk kost'],
  'lchf-paleo': ['lchf', 'paleo', 'lchf paleo', 'lchf/paleo'],
  familiemad: ['familie mad', 'familie-mad', 'sense'],
  'proteinrig-kost': ['proteinrig kost'],
  'glp-1': ['glp 1', 'glp-1 kost'],
  '5-2': ['5:2', '5 2'],
}

/**
 * Map query strings (API `?diet=`, overview keys) to canonical diet ids used in
 * `DIET_MATCH_ALIASES` and `MealPlanConfig.dietaryApproach.id`.
 */
const DIET_QUERY_TO_CANONICAL_IDS: Record<string, readonly string[]> = {
  proteinrig: ['proteinrig-kost'],
  'proteinrig kost': ['proteinrig-kost'],
  'proteinrig-kost': ['proteinrig-kost'],
  antiinflammatorisk: ['anti-inflammatory'],
  'anti-inflammatory': ['anti-inflammatory'],
  antiinflammatory: ['anti-inflammatory'],
  fleksitarisk: ['flexitarian'],
  flexitarian: ['flexitarian'],
  '5:2': ['5-2'],
  '5-2': ['5-2'],
  '5-2-diet': ['5-2'],
  '52': ['5-2'],
  '5:2 diæt': ['5-2'],
  '5:2 faste': ['5-2'],
  lchf: ['lchf-paleo'],
  paleo: ['lchf-paleo'],
  'glp-1 kost': ['glp-1'],
}

export function cleanDietTag(s: string): string {
  return s.toLowerCase().replace(/[\[\]]/g, '').trim()
}

/** Fold hyphens, spaces, punctuation so "proteinrig-kost" matches "proteinrig kost". */
export function normalizeDietMatchKey(s: string): string {
  return cleanDietTag(s).replace(/[^a-z0-9æøå]/gi, '')
}

function canonicalIdsForDietQuery(query: string): readonly string[] {
  const f = cleanDietTag(query)
  return DIET_QUERY_TO_CANONICAL_IDS[f] ?? [f]
}

function mergeKeysForCanonicalId(keys: Set<string>, canonicalId: string): void {
  const id = cleanDietTag(canonicalId)
  const add = (raw: string) => {
    const c = cleanDietTag(raw)
    keys.add(c)
    keys.add(normalizeDietMatchKey(raw))
  }
  add(id)
  const extras = DIET_MATCH_ALIASES[id] ?? []
  for (const e of extras) add(e)
}

/**
 * All acceptable normalized forms for a diet query (slug, URL param, or label).
 */
export function buildAcceptableDietKeys(dietQuery: string): Set<string> {
  const keys = new Set<string>()
  for (const canonicalId of canonicalIdsForDietQuery(dietQuery)) {
    mergeKeysForCanonicalId(keys, canonicalId)
  }
  return keys
}

export function recipeDietTagMatches(tag: string, acceptableKeys: Set<string>): boolean {
  const c = cleanDietTag(tag)
  if (acceptableKeys.has(c)) return true
  return acceptableKeys.has(normalizeDietMatchKey(tag))
}

/**
 * Map profil-/API-værdi til id som `dietaryFactory.getDiet()` forventer
 * (fx `proteinrig` → `proteinrig-kost`). Ukendte værdier returneres uændret.
 */
export function resolveFactoryDietId(slug: string | undefined | null): string {
  const raw = cleanDietTag(slug || '')
  if (!raw) return 'sense'
  const direct = DIET_QUERY_TO_CANONICAL_IDS[raw]
  if (direct?.length) return direct[0]
  const nk = normalizeDietMatchKey(raw)
  for (const [key, ids] of Object.entries(DIET_QUERY_TO_CANONICAL_IDS)) {
    if (normalizeDietMatchKey(key) === nk && ids.length) return ids[0]
  }
  return raw
}

export function recipeTagsMatchDietQuery(
  tags: readonly string[] | undefined,
  dietQuery: string
): boolean {
  if (!tags?.length) return false
  const acceptable = buildAcceptableDietKeys(dietQuery)
  return tags.some((t) => typeof t === 'string' && recipeDietTagMatches(t, acceptable))
}
