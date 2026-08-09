import {
  normalizeAiRecipeIngredients,
  normalizeAiRecipeInstructions,
  type AiIngredientInput,
} from '@/lib/ai-recipe-ingredient-normalize'
import {
  sanitizeIngredients,
  sanitizeInstructions,
  type ProvisionalIngredient,
  type ProvisionalInstruction,
} from '@/lib/provisional-recipes'

const UNIT_ALIASES: Record<string, string> = {
  gram: 'g',
  gr: 'g',
  kilo: 'kg',
  kilogram: 'kg',
  milliliter: 'ml',
  deciliter: 'dl',
  liter: 'l',
  teske: 'tsk',
  teskefuld: 'tsk',
  teskefulde: 'tsk',
  teskeer: 'tsk',
  spsk: 'spsk',
  spiseske: 'spsk',
  spiseskefuld: 'spsk',
  spiseskefulde: 'spsk',
  stykke: 'stk',
  stykker: 'stk',
  st: 'stk',
  fed: 'stk',
  fede: 'stk',
  bundter: 'bundt',
}

const INGREDIENT_LINE_RE =
  /^(\d+[,.]?\d*)\s*(stk|stykker?|styk|st|fed|fede|gram|g|kg|ml|dl|l|tsk|teske(?:r|fuld(?:e)?)?|spsk|spiseske(?:fuld(?:e)?)?|bundt(?:er)?)\.?\s+(.+)$/i

const FRACTION_LINE_RE =
  /^(\d+\/\d+|\d+[,.]?\d*)\s*(stk|stykker?|g|gram|ml|dl|tsk|spsk|bundt)\.?\s+(.+)$/i

function parseAmount(raw: string): number {
  const t = raw.trim().replace(',', '.')
  if (t.includes('/')) {
    const [a, b] = t.split('/').map(Number)
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : 0
}

function normalizeUnit(raw: string): string {
  const key = raw.toLowerCase().replace(/\.$/, '')
  return UNIT_ALIASES[key] || key
}

function splitNameAndInlineNotes(namePart: string): { name: string; notes: string | null } {
  const trimmed = namePart.trim()
  const comma = trimmed.indexOf(',')
  if (comma === -1) return { name: trimmed, notes: null }
  const name = trimmed.slice(0, comma).trim()
  const notes = trimmed.slice(comma + 1).trim()
  return { name: name || trimmed, notes: notes || null }
}

/** Parser én ingredienslinje (fx "300 gram kyllingebryst, i tern"). */
export function parseIngredientLine(line: string): ProvisionalIngredient | null {
  const trimmed = line.trim().replace(/^[-•*]\s*/, '')
  if (!trimmed || trimmed.length < 2) return null
  if (/^(ingredienser|topping|tilbehør|marinade|dressing|sauce)$/i.test(trimmed)) return null

  let match = trimmed.match(INGREDIENT_LINE_RE) || trimmed.match(FRACTION_LINE_RE)
  if (match) {
    const amount = parseAmount(match[1])
    const unit = normalizeUnit(match[2])
    const { name, notes } = splitNameAndInlineNotes(match[3])
    if (!name) return null
    return { name, amount, unit, notes }
  }

  // "salt og peber", "frisk persille"
  if (/^(salt|peber|salt og peber|frisk persille|olivenolie til stegning)$/i.test(trimmed)) {
    return { name: trimmed.toLowerCase(), amount: 0, unit: '', notes: null }
  }

  return null
}

export function parseIngredientsFromText(text: string): ProvisionalIngredient[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const parsed: ProvisionalIngredient[] = []
  for (const line of lines) {
    const ing = parseIngredientLine(line)
    if (ing) parsed.push(ing)
    if (parsed.length >= 60) break
  }
  return parsed
}

export function parseInstructionsFromText(text: string): ProvisionalInstruction[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(fremgangsmåde|instructions|sådan gør du)$/i.test(l))

  const steps: ProvisionalInstruction[] = []
  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.)]\s*/, '').trim()
    if (!cleaned || cleaned.length < 4) continue
    steps.push({ stepNumber: steps.length + 1, instruction: cleaned })
    if (steps.length >= 40) break
  }
  return steps
}

type JsonLdRecipe = {
  name?: string
  description?: string
  recipeYield?: string | number | string[]
  recipeIngredient?: string[] | string
  recipeInstructions?: unknown
}

function collectJsonLdRecipes(html: string): JsonLdRecipe[] {
  const out: JsonLdRecipe[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const json = JSON.parse(m[1])
      const nodes = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json]
      for (const node of nodes) {
        const type = node?.['@type']
        const types = Array.isArray(type) ? type : type ? [type] : []
        if (types.some((t: string) => String(t).toLowerCase() === 'recipe')) {
          out.push(node as JsonLdRecipe)
        }
      }
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }
  return out
}

function parseJsonLdInstructions(raw: unknown): ProvisionalInstruction[] {
  if (!raw) return []
  const items = Array.isArray(raw) ? raw : [raw]
  const steps: ProvisionalInstruction[] = []
  for (const item of items) {
    if (typeof item === 'string') {
      const t = item.trim()
      if (t) steps.push({ stepNumber: steps.length + 1, instruction: t })
      continue
    }
    if (item && typeof item === 'object') {
      const text =
        typeof (item as { text?: string }).text === 'string'
          ? (item as { text: string }).text
          : typeof (item as { name?: string }).name === 'string'
            ? (item as { name: string }).name
            : ''
      const t = text.trim()
      if (t) steps.push({ stepNumber: steps.length + 1, instruction: t })
    }
    if (steps.length >= 40) break
  }
  return steps
}

function parseServingsFromYield(yieldRaw: JsonLdRecipe['recipeYield']): number {
  if (yieldRaw == null) return 4
  const text = Array.isArray(yieldRaw) ? yieldRaw[0] : String(yieldRaw)
  const m = text.match(/(\d+[,.]?\d*)/)
  if (m) {
    const n = parseAmount(m[1])
    if (n > 0 && n <= 24) return Math.round(n)
  }
  return 4
}

export interface ParsedRecipeFromLink {
  title: string
  description: string | null
  servings: number
  ingredients: ProvisionalIngredient[]
  instructions: ProvisionalInstruction[]
  sourceUrl: string
}

/**
 * Strukturerer opskrift fra HTML (JSON-LD først, derefter danske sektioner).
 * Ingrediensnavne normaliseres som i admin-opskriftsmotoren.
 */
export function parseRecipeFromPageContent(
  html: string,
  structured: {
    url: string
    title?: string
    summary?: string
    ingredientsText?: string
    instructionsText?: string
  }
): ParsedRecipeFromLink {
  const jsonLdRecipes = collectJsonLdRecipes(html)
  const recipe = jsonLdRecipes[0]

  let title =
    (typeof recipe?.name === 'string' && recipe.name.trim()) ||
    structured.title?.trim() ||
    'Importeret opskrift'

  let description =
    (typeof recipe?.description === 'string' && recipe.description.trim()) ||
    structured.summary?.trim() ||
    null

  let servings = recipe ? parseServingsFromYield(recipe.recipeYield) : 4

  let rawIngredients: ProvisionalIngredient[] = []
  if (recipe?.recipeIngredient) {
    const list = Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient
      : [recipe.recipeIngredient]
    for (const line of list) {
      if (typeof line !== 'string') continue
      const ing = parseIngredientLine(line)
      if (ing) rawIngredients.push(ing)
    }
  }
  if (rawIngredients.length < 2 && structured.ingredientsText) {
    rawIngredients = parseIngredientsFromText(structured.ingredientsText)
  }

  let rawInstructions: ProvisionalInstruction[] = []
  if (recipe?.recipeInstructions) {
    rawInstructions = parseJsonLdInstructions(recipe.recipeInstructions)
  }
  if (rawInstructions.length < 1 && structured.instructionsText) {
    rawInstructions = parseInstructionsFromText(structured.instructionsText)
  }

  const normalized = normalizeAiRecipeIngredients(
    sanitizeIngredients(rawIngredients) as AiIngredientInput[]
  )
  const ingredients = sanitizeIngredients(normalized)
  const instructions = sanitizeInstructions(
    normalizeAiRecipeInstructions(rawInstructions)
  )

  if (ingredients.length < 1 && instructions.length < 1) {
    throw new Error('Kunne ikke læse ingredienser eller fremgangsmåde fra linket')
  }

  return {
    title: title.slice(0, 200),
    description: description ? description.slice(0, 2000) : null,
    servings,
    ingredients,
    instructions,
    sourceUrl: structured.url,
  }
}
