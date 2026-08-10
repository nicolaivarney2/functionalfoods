/**
 * Ingredient quantity tags in recipe instructions.
 *
 * AI writes name-tags:  "Steg [[ing:kyllingebryst]] med [[ing:hvidløgsfed]]"
 * Duplicate rows:       "Tilsæt [[ing:smør]] … pensl med [[ing:smør#2]]"
 * Stored form:          "Steg {{ing:<rowId>}} med {{ing:<rowId>}}"
 * Rendered form:        "Steg 125 g kyllingebryst med 0.5 stk hvidløgsfed" (scaled)
 *
 * `id` remains the catalog UUID (shopping/nutrition). Tags use `rowId` so the
 * same catalog ingredient can appear twice with different amounts.
 */

import { formatIngredientQuantityLabel } from '@/lib/recipe-ingredient-amount'
import type { Ingredient, Recipe, RecipeStep } from '@/types/recipe'

export const INGREDIENT_TAG_PREFIX = '{{ing:'
export const INGREDIENT_TAG_REGEX = /\{\{ing:([a-zA-Z0-9_-]+)\}\}/g

/** AI-facing name tags — exact `name` from the ingredients list, optional `#n`. */
export const INGREDIENT_NAME_TAG_REGEX = /\[\[ing:([^\]]+)\]\]/gi

export type LinkableIngredient = Pick<Ingredient, 'id' | 'rowId' | 'name' | 'amount' | 'unit'>

export type InstructionPart =
  | { type: 'text'; value: string }
  | { type: 'ingredient'; id: string }

const PREP_PREFIX =
  /^(finthakket|fint\s*hakket|groft\s*hakket|hakket|revet|rivet|skåret|tern|skiver|frisk|tørret|tørrede|kogt|dampet|fintsnittet)\s+/i

const AMOUNT_UNIT =
  '(?:g|kg|ml|l|dl|tsk|spsk|stk|stykker|skiver|bundt|fed|nip|knivspids)'

/**
 * Cosmetic descriptors absorbed into the tag so prose stays readable
 * ("tørret timian" → "0.75 tsk timian", not "tørret 0.75 tsk timian").
 * The detail is still visible in the ingredients list / notes.
 */
const DESCRIPTOR_WORDS = [
  'tørrede',
  'tørret',
  'friskkværnet',
  'friskpresset',
  'friske',
  'frisk',
  'finthakket',
  'fintsnittet',
  'hakkede',
  'hakket',
  'revet',
  'revne',
  'groft',
  'grofthakket',
  'fint',
  'blandede',
  'blandet',
  'drænede',
  'drænet',
  'kogte',
  'kogt',
  'pikant',
  'røget',
  'røde',
  'rød',
  'grønne',
  'grøn',
  'gule',
  'gul',
  'søde',
  'sød',
  'milde',
  'mild',
]

const DESCRIPTOR_GROUP = `(?:(?:${DESCRIPTOR_WORDS.join('|')})\\s+)?`

/** Leading article absorbed with the descriptor ("de sorte bønner" → "240 g sorte bønner"). */
const ARTICLE_GROUP = '(?:(?:den|det|de)\\s+)?'

const DANISH_ENDINGS = ['ene', 'erne', 'en', 'et', 'er', ''] as const

const SKIP_FULL_MATCHES = new Set([
  'saltet',
  'pebret',
  'røget',
  'kogt',
  'stegt',
  'bagt',
  'dampet',
  'marineret',
])

/**
 * Extra surface forms that map to a catalog-ish stem.
 * Used so "hvidløg" in text can link to ingredient "hvidløgsfed".
 */
const STEM_ALIASES: Record<string, string[]> = {
  hvidløg: ['hvidløg', 'hvidløgsfed', 'hvidløgsfedene', 'hvidløgene'],
  hvidløgsfed: ['hvidløg', 'hvidløgsfed', 'hvidløgsfedene', 'hvidløgene'],
  kyllingebryst: [
    'kylling',
    'kyllingen',
    'kyllingebryst',
    'kyllingebrystet',
    'kyllingeskiver',
    'kyllingeskiverne',
    'kyllingefileter',
    'kyllingefilet',
  ],
  kylling: ['kylling', 'kyllingen', 'kyllingebryst', 'kyllingeskiver', 'kyllingeskiverne'],
  peberfrugt: ['peberfrugt', 'peberfrugter', 'peberfrugterne'],
  peberfrugter: ['peberfrugt', 'peberfrugter', 'peberfrugterne'],
  mozzarella: ['mozzarella', 'mozzarellaost', 'mozzarella ost'],
  'mozzarella ost': ['mozzarella', 'mozzarellaost', 'mozzarella ost'],
  aubergine: ['aubergine', 'auberginen', 'auberginer', 'auberginerne'],
  squash: ['squash', 'squashen', 'squashes'],
  citronsaft: ['citronsaft', 'citron', 'citronen', 'citroner'],
  basilikum: ['basilikum', 'basilikumen', 'frisk basilikum'],
  rugbrød: ['rugbrød', 'rugbrødet', 'rugbrødsskiver', 'rugbrødsskiverne', 'skiver rugbrød'],
  'soltørrede tomater': ['soltørrede tomater', 'soltørret tomat', 'soltørrede tomaterne'],
  olivenolie: ['olivenolie', 'olivenolien'],
}

export const PLANOMA_INSTRUCTION_AMOUNT_RULE = `
FREMGangsMÅDE OG MÆNGDER (KRITISK):
- Alle mængder (g, ml, tsk, spsk, stk osv.) må KUN stå i ingredients-listen
- I instructions: nævn IKKE gram/ml/antal — systemet indsætter skalerede mængder automatisk
- Når du nævner en ingrediens i et trin, WRAP den i et tag med det PRÆCISE name fra ingredients-listen:
  Korrekt: "Steg [[ing:kyllingebryst]] med [[ing:hvidløgsfed]]."
  Forkert: "Steg 125 g kylling med hvidløg." (ingen mængde, og ikke synonym/varianter)
- Tag-navnet SKAL være ordret det samme som "name" i ingredients (fx "hvidløgsfed", ikke "hvidløg";
  "mozzarella ost", ikke "mozzarellaost"; "peberfrugter", ikke "rød peberfrugt")
- Eksempel: ingredients har name "blomkål" → skriv "Tilsæt [[ing:blomkål]]" (systemet viser "300 g blomkål")
- Når samme ingrediens bruges i FLERE trin med forskellige mængder: lav SEPARATE linjer i ingredients
  (fx to "smør"-linjer) og nævn hver med [[ing:smør]] i det trin, mængden hører til (systemet binder i rækkefølge).
  Ved søgt rækkefølge: [[ing:smør#1]] / [[ing:smør#2]] (1-baseret blandt linjer med samme name).
`.trim()

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Tag key for a recipe line: rowId when present, else catalog id (legacy). */
export function ingredientTagId(ingredient: Pick<LinkableIngredient, 'id' | 'rowId'>): string {
  return String(ingredient.rowId || ingredient.id || '').trim()
}

export function ingredientTag(id: string): string {
  return `{{ing:${id}}}`
}

/**
 * Ensure every recipe line has a unique rowId (preserves existing when unique).
 */
export function ensureIngredientRowIds<T extends { id?: string | null; rowId?: string | null }>(
  ingredients: T[]
): Array<T & { rowId: string }> {
  if (!Array.isArray(ingredients)) return []

  const used = new Set<string>()
  return ingredients.map((ingredient) => {
    let rowId = String(ingredient.rowId || '').trim()
    if (!rowId || used.has(rowId)) {
      rowId = crypto.randomUUID()
    }
    used.add(rowId)
    return { ...ingredient, rowId }
  })
}

export function collectRecipeIngredients(recipe: Pick<Recipe, 'ingredients' | 'ingredientGroups'>): Ingredient[] {
  if (recipe.ingredientGroups && recipe.ingredientGroups.length > 0) {
    return recipe.ingredientGroups.flatMap((group) => group.ingredients)
  }
  return recipe.ingredients || []
}

/**
 * Map for tag lookup. Primary key is rowId (or id). Catalog id is only indexed
 * when a single line uses it — so legacy {{ing:catalogUuid}} still resolves.
 */
export function ingredientsByIdMap(ingredients: LinkableIngredient[]): Map<string, LinkableIngredient> {
  const map = new Map<string, LinkableIngredient>()
  const catalogCounts = new Map<string, number>()

  for (const ingredient of ingredients) {
    if (!ingredient) continue
    const tagId = ingredientTagId(ingredient)
    if (tagId) map.set(tagId, ingredient)
    if (ingredient.id) {
      catalogCounts.set(ingredient.id, (catalogCounts.get(ingredient.id) || 0) + 1)
    }
  }

  for (const ingredient of ingredients) {
    if (!ingredient?.id) continue
    if (catalogCounts.get(ingredient.id) === 1 && !map.has(ingredient.id)) {
      map.set(ingredient.id, ingredient)
    }
  }

  return map
}

/** Resolve a stored tag id to a line (rowId first, then unique/legacy catalog id). */
export function resolveTaggedIngredient(
  tagId: string,
  ingredients: LinkableIngredient[]
): LinkableIngredient | undefined {
  if (!tagId) return undefined
  const byId = ingredientsByIdMap(ingredients)
  const direct = byId.get(tagId)
  if (direct) return direct
  return ingredients.find((i) => i.id === tagId)
}

/**
 * 1-based occurrence index among lines sharing the same nameCore.
 * Returns null when the name is unique in the list.
 */
export function duplicateNameOccurrenceIndex(
  ingredients: Array<Pick<LinkableIngredient, 'name'>>,
  index: number
): number | null {
  const target = ingredients[index]
  if (!target) return null
  const core = nameCore(target.name)
  if (!core) return null

  const sameNameIndexes: number[] = []
  for (let i = 0; i < ingredients.length; i++) {
    if (nameCore(ingredients[i]?.name || '') === core) sameNameIndexes.push(i)
  }
  if (sameNameIndexes.length < 2) return null
  return sameNameIndexes.indexOf(index) + 1
}

/** Label used inside instruction prose — drops trailing notes ("peberfrugter, kan undlades"). */
export function formatIngredientTagLabel(
  ingredient: LinkableIngredient,
  multiplier = 1
): string {
  return formatIngredientQuantityLabel(
    { ...ingredient, name: nameCore(ingredient.name) },
    multiplier
  )
}

/** Plain ingredient name for instruction prose (no amount, no notes). */
export function ingredientNameForInstruction(name: string): string {
  return nameCore(name)
}

function normalizeNameKey(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Primary name without trailing notes: "peberfrugter, kan undlades" → "peberfrugter" */
function nameCore(name: string): string {
  return normalizeNameKey(name).split(',')[0]?.trim() || ''
}

function compactName(name: string): string {
  return nameCore(name).replace(/[\s-]+/g, '')
}

function nameMatchVariants(name: string): string[] {
  const core = nameCore(name)
  if (!core || core.length < 2) return []

  const variants = new Set<string>([core])
  const stripped = core.replace(PREP_PREFIX, '').trim()
  if (stripped) variants.add(stripped)

  const withoutParens = core.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (withoutParens) variants.add(withoutParens)

  const compact = compactName(core)
  if (compact.length >= 3) variants.add(compact)

  // peberfrugter → peberfrugt
  if (core.endsWith('er') && core.length > 5) variants.add(core.slice(0, -2))
  if (core.endsWith('e') && core.length > 4) variants.add(core.slice(0, -1))

  // Stem aliases (hvidløgsfed ↔ hvidløg, etc.)
  for (const key of [core, stripped, compact]) {
    const aliases = STEM_ALIASES[key]
    if (aliases) aliases.forEach((a) => variants.add(a))
  }
  // Also: if any STEM_ALIASES value matches core, add that bucket
  for (const [stem, aliases] of Object.entries(STEM_ALIASES)) {
    if (aliases.includes(core) || aliases.includes(compact) || stem === core) {
      aliases.forEach((a) => variants.add(a))
      variants.add(stem)
    }
  }

  return [...variants].filter((v) => v.length >= 2)
}

type TextMatch = { start: number; end: number; id: string }

function isLetterChar(ch: string | undefined): boolean {
  return !!ch && /\p{L}/u.test(ch)
}

function isInsideProtected(start: number, end: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([s, e]) => start < e && end > s)
}

function overlapsExisting(start: number, end: number, matches: TextMatch[]): boolean {
  return matches.some((m) => start < m.end && end > m.start)
}

function ingredientMatchesName(ingredient: LinkableIngredient, needle: string, needleCompact: string): boolean {
  if (nameCore(ingredient.name) === needle) return true
  if (compactName(ingredient.name) === needleCompact) return true
  const variants = nameMatchVariants(ingredient.name)
  return variants.includes(needle) || variants.includes(needleCompact)
}

/**
 * Parse AI tag payload: "smør" | "smør#2" → { name, occurrence? }.
 * occurrence is 1-based among same-name rows when `#n` is present.
 */
function parseNameTagPayload(raw: string): { name: string; occurrence: number | null } {
  const trimmed = String(raw || '').trim()
  const hashMatch = trimmed.match(/^(.*?)#(\d+)$/)
  if (hashMatch) {
    const occurrence = Number(hashMatch[2])
    if (Number.isFinite(occurrence) && occurrence >= 1) {
      return { name: hashMatch[1].trim(), occurrence }
    }
  }
  return { name: trimmed, occurrence: null }
}

function findIngredientByName(
  rawName: string,
  ingredients: LinkableIngredient[],
  options: { seenIds?: Set<string> } = {}
): LinkableIngredient | undefined {
  const { name, occurrence } = parseNameTagPayload(rawName)
  const needle = nameCore(name)
  const needleCompact = compactName(name)
  if (!needle) return undefined

  const matches = ingredients.filter((i) => ingredientMatchesName(i, needle, needleCompact))
  if (matches.length === 0) return undefined

  if (occurrence != null) {
    return matches[occurrence - 1]
  }

  const seenIds = options.seenIds
  if (seenIds) {
    const next = matches.find((i) => {
      const tagId = ingredientTagId(i)
      return tagId && !seenIds.has(tagId)
    })
    if (next) return next
  }

  return matches[0]
}

/**
 * Convert AI name-tags [[ing:kyllingebryst]] / [[ing:smør#2]] → {{ing:rowId}}.
 * Unresolved tags fall back to the plain name (still readable).
 * When `seenIds` is provided it is mutated (ordinal consumption across steps).
 */
export function resolveIngredientNameTagsInText(
  text: string,
  ingredients: LinkableIngredient[],
  options: { seenIds?: Set<string> } = {}
): string {
  if (!text || !ingredients?.length) return text

  const seenIds = options.seenIds

  return text.replace(INGREDIENT_NAME_TAG_REGEX, (_full, rawName: string) => {
    const found = findIngredientByName(String(rawName || ''), ingredients, { seenIds })
    if (!found) return String(rawName || '').trim().replace(/#\d+$/, '').trim() || String(rawName || '').trim()
    const tagId = ingredientTagId(found)
    if (!tagId) return String(rawName || '').trim()
    seenIds?.add(tagId)
    return ingredientTag(tagId)
  })
}

export type LinkOptions = {
  /**
   * Tag ids (rowId) already tagged earlier in the recipe. Fuzzy matches for these
   * are skipped so later references stay plain text.
   * The set is mutated with newly tagged ids.
   */
  seenIds?: Set<string>
}

/**
 * Find ingredient mentions in instruction text and replace with {{ing:rowId}} tags.
 * Prefers longer names; strips leading amount+unit when AI included them anyway.
 */
export function linkIngredientTagsInText(
  text: string,
  ingredients: LinkableIngredient[],
  options: LinkOptions = {}
): string {
  if (!text || !ingredients?.length) return text

  const seenIds = options.seenIds ?? new Set<string>()

  // 1) Direct connection: resolve AI [[ing:name]] / [[ing:name#n]] tags first
  const working = resolveIngredientNameTagsInText(text, ingredients, { seenIds })

  const protectedRanges: Array<[number, number]> = []
  for (const m of working.matchAll(/\{\{ing:([^}]+)\}\}/g)) {
    if (m.index != null) protectedRanges.push([m.index, m.index + m[0].length])
    if (m[1]) seenIds.add(m[1])
  }

  const matches: TextMatch[] = []
  const sorted = ingredients
    .map((ingredient, index) => ({ ingredient, index }))
    .filter(({ ingredient }) => ingredientTagId(ingredient) && ingredient.name)
    .sort((a, b) => {
      const lengthDiff = nameCore(b.ingredient.name).length - nameCore(a.ingredient.name).length
      return lengthDiff !== 0 ? lengthDiff : a.index - b.index
    })

  for (const { ingredient } of sorted) {
    const tagId = ingredientTagId(ingredient)
    if (!tagId || seenIds.has(tagId)) continue

    let claimed = false

    for (const variant of nameMatchVariants(ingredient.name)) {
      if (claimed) break
      for (const ending of DANISH_ENDINGS) {
        if (claimed) break
        if (variant.length <= 4 && ending === 'et') continue

        const form = `${variant}${ending}`
        if (SKIP_FULL_MATCHES.has(form)) continue

        // Absorb a cosmetic descriptor only when it isn't part of the ingredient name
        const allowDescriptor = !DESCRIPTOR_WORDS.some((word) =>
          nameCore(ingredient.name).startsWith(`${word} `)
        )

        const prefixGroup = allowDescriptor
          ? `${ARTICLE_GROUP}${DESCRIPTOR_GROUP}`
          : ARTICLE_GROUP

        const pattern = new RegExp(
          `${prefixGroup}(?:\\d+(?:[.,]\\d+)?\\s*${AMOUNT_UNIT}?\\s+)?${escapeRegExp(form)}`,
          'gi'
        )

        let match: RegExpExecArray | null
        while ((match = pattern.exec(working)) !== null) {
          const start = match.index
          const end = start + match[0].length
          if (isLetterChar(working[start - 1]) || isLetterChar(working[end])) continue
          if (isInsideProtected(start, end, protectedRanges)) continue
          if (overlapsExisting(start, end, matches)) continue

          const matchedCore = match[0]
            .replace(new RegExp(`^${ARTICLE_GROUP}`, 'i'), '')
            .replace(new RegExp(`^${DESCRIPTOR_GROUP}`, 'i'), '')
            .replace(new RegExp(`^\\d+(?:[.,]\\d+)?\\s*${AMOUNT_UNIT}?\\s+`, 'i'), '')
          if (SKIP_FULL_MATCHES.has(matchedCore.toLowerCase())) continue

          matches.push({ start, end, id: tagId })
          claimed = true
          break
        }
      }
    }
  }

  if (matches.length === 0) return working

  matches.sort((a, b) => a.start - b.start)

  // Only the first mention of each recipe line carries the amount
  const usedIds = new Set<string>()
  const firstMentions = matches.filter((match) => {
    if (usedIds.has(match.id)) return false
    usedIds.add(match.id)
    seenIds.add(match.id)
    return true
  })

  let result = ''
  let cursor = 0
  for (const match of firstMentions) {
    result += working.slice(cursor, match.start)
    result += ingredientTag(match.id)
    cursor = match.end
  }
  result += working.slice(cursor)
  return result
}

export function linkIngredientTagsInInstructions<T extends { instruction: string }>(
  instructions: T[],
  ingredients: LinkableIngredient[]
): T[] {
  if (!Array.isArray(instructions) || !ingredients?.length) return instructions

  const withRowIds = ensureIngredientRowIds(ingredients)

  // Shared across steps so each recipe line only gets its amount on first mention
  const seenIds = new Set<string>()

  return instructions.map((step) => ({
    ...step,
    instruction: linkIngredientTagsInText(String(step.instruction || ''), withRowIds, {
      seenIds,
    }),
  }))
}

export function parseInstructionWithIngredientTags(instruction: string): InstructionPart[] {
  const text = String(instruction || '')
  if (!text) return [{ type: 'text', value: '' }]

  const parts: InstructionPart[] = []
  let lastIndex = 0
  const re = new RegExp(INGREDIENT_TAG_REGEX.source, 'g')
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'ingredient', id: match[1] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }]
}

export function expandIngredientTagsInInstruction(
  instruction: string,
  ingredients: LinkableIngredient[],
  multiplier = 1
): string {
  return parseInstructionWithIngredientTags(instruction)
    .map((part) => {
      if (part.type === 'text') return part.value
      const ingredient = resolveTaggedIngredient(part.id, ingredients)
      if (!ingredient) return ''
      return formatIngredientTagLabel(ingredient, multiplier)
    })
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function expandIngredientTagsInSteps(
  steps: RecipeStep[],
  ingredients: LinkableIngredient[],
  multiplier = 1
): RecipeStep[] {
  return steps.map((step) => ({
    ...step,
    instruction: expandIngredientTagsInInstruction(step.instruction, ingredients, multiplier),
  }))
}
