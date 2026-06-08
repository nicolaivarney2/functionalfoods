import { type ExclusionTagId, normalizeExclusionTag } from './constants'

/** Stored in ingredients.exclusions alongside food-exclusion tags */
export type OrganicTagId = 'organic-priority' | 'organic-animal'

export interface OrganicTagDefinition {
  id: OrganicTagId
  label: string
  description: string
  /** Maps to madbudget family setting */
  familySetting: 'prioritizeOrganic' | 'prioritizeAnimalOrganic'
}

export const ORGANIC_TAGS: readonly OrganicTagDefinition[] = [
  {
    id: 'organic-priority',
    label: 'Prioriter økologi',
    description:
      'Varer med øko/økologi i produktnavn prioriteres når familien vælger "Prioriter økologi".',
    familySetting: 'prioritizeOrganic',
  },
  {
    id: 'organic-animal',
    label: 'Animalsk økologi',
    description:
      'Øko-varer i mejeri/kød prioriteres når familien vælger "Prioriter animalsk økologi".',
    familySetting: 'prioritizeAnimalOrganic',
  },
] as const

export const ORGANIC_TAG_IDS = new Set<OrganicTagId>(ORGANIC_TAGS.map((t) => t.id))

export function normalizeOrganicTag(raw: string): OrganicTagId | null {
  const trimmed = String(raw || '').trim().toLowerCase()
  if (trimmed === 'organic-priority' || trimmed === 'organic-animal') {
    return trimmed as OrganicTagId
  }
  return null
}

export function normalizeOrganicTags(raw: unknown): OrganicTagId[] {
  if (!Array.isArray(raw)) return []
  const out = new Set<OrganicTagId>()
  for (const item of raw) {
    const normalized = normalizeOrganicTag(String(item))
    if (normalized) out.add(normalized)
  }
  return Array.from(out)
}

/** Matcher øko/økologi/økologisk/organic i ingrediensnavn. Uden \\b — JS behandler ø som ikke-ordtegn. */
export function hasOrganicInName(name: string): boolean {
  return /(øko\.?|økologi|økologisk|organic)/i.test(String(name || ''))
}

/** Mejeri- og kød-kategorier (til øko-scan script) */
export function isMejeriOrKødCategory(category: string | null | undefined): boolean {
  const cat = String(category || '').toLowerCase().trim()
  return (
    cat === 'mejeri' ||
    cat === 'protein' ||
    cat === 'kød' ||
    cat === 'mejeri og køl' ||
    cat === 'kød og fisk'
  )
}

export interface ParsedIngredientTags {
  foodExclusions: ExclusionTagId[]
  organicTags: OrganicTagId[]
  all: string[]
}

export function parseIngredientTags(raw: unknown): ParsedIngredientTags {
  if (!Array.isArray(raw)) {
    return { foodExclusions: [], organicTags: [], all: [] }
  }

  const food = new Set<ExclusionTagId>()
  const organic = new Set<OrganicTagId>()

  for (const item of raw) {
    const str = String(item)
    const foodTag = normalizeExclusionTag(str)
    if (foodTag) {
      food.add(foodTag)
      continue
    }
    const organicTag = normalizeOrganicTag(str)
    if (organicTag) organic.add(organicTag)
  }

  const foodExclusions = Array.from(food)
  const organicTags = Array.from(organic)
  return {
    foodExclusions,
    organicTags,
    all: [...foodExclusions, ...organicTags],
  }
}

export function mergeIngredientTags(
  current: unknown,
  patch: {
    setFoodExclusions?: ExclusionTagId[]
    setOrganicTags?: OrganicTagId[]
    addFood?: ExclusionTagId[]
    removeFood?: ExclusionTagId[]
    addOrganic?: OrganicTagId[]
    removeOrganic?: OrganicTagId[]
  }
): string[] {
  const parsed = parseIngredientTags(current)
  let food = new Set(parsed.foodExclusions)
  let org = new Set(parsed.organicTags)

  if (patch.setFoodExclusions) food = new Set(patch.setFoodExclusions)
  if (patch.setOrganicTags) org = new Set(patch.setOrganicTags)
  for (const t of patch.addFood ?? []) food.add(t)
  for (const t of patch.removeFood ?? []) food.delete(t)
  for (const t of patch.addOrganic ?? []) org.add(t)
  for (const t of patch.removeOrganic ?? []) org.delete(t)

  return [...Array.from(food), ...Array.from(org)]
}

/**
 * Øko-scan: navn + kategori → foreslåede økologi-tags.
 * Bruges kun af øko-scriptet og som forslag i admin — aldrig for fravalg.
 */
export function suggestOrganicTagsFromNameAndCategory(
  name: string,
  category: string | null | undefined
): OrganicTagId[] {
  if (!hasOrganicInName(name)) return []

  const tags = new Set<OrganicTagId>(['organic-priority'])
  if (isMejeriOrKødCategory(category)) {
    tags.add('organic-animal')
  }
  return Array.from(tags)
}
