/**
 * Normaliserer AI-genererede ingredienser før gem så navne matcher FRIDA/produkt-matching
 * (rene basisnavne i `name`, tilberedning i `notes`), og almindelige enhedsfejl rettes.
 */

export type AiIngredientInput = {
  name: string
  amount: number
  unit: string
  notes?: string | null
}

export type AiIngredientOutput = {
  name: string
  amount: number
  unit: string
  notes: string | null
}

export type AiInstructionInput = {
  stepNumber?: number
  instruction: string
  time?: number
  tips?: string | null
}

export type AiInstructionOutput = {
  stepNumber?: number
  instruction: string
  time?: number
  tips?: string | null
}

/** ~53 g pr. mellemstort æg (LLM skriver ofte gram). */
const GRAMS_PER_EGG = 53
/** ~13,5 g pr. spsk planteolie. */
const GRAMS_PER_SPSK_OIL = 13.5
/** ~15 g pr. spsk citronsaft. */
const GRAMS_PER_SPSK_LEMON_JUICE = 15
/** Typisk vægt for 1 hel citron. */
const GRAMS_PER_LEMON = 50
/** ~3 g pr. hvidløgsfed. */
const GRAMS_PER_GARLIC_CLOVE = 3
/** Typisk vægt for et lille bundt friske krydderurter. */
const GRAMS_PER_HERB_BUNDLE = 50

const TYPO_FIXES: [RegExp, string][] = [
  [/olivenolei/gi, 'olivenolie'],
  [/oliven\s*olie/gi, 'olivenolie'],
]

const NAME_CANONICAL_FIXES: [RegExp, string][] = [
  // Ost
  [/^cheddar\s*ost$/i, 'cheddar'],
  // Grønt
  [/^rød\s+peberfrugt$/i, 'peberfrugter'],
]

/**
 * Tillægsord / tilberedning der typisk ligger efter komma og skal i `notes`.
 * Eksempel: "løg, finthakket" → name "løg", notes "finthakket"
 */
const PREP_DESCRIPTOR =
  /^(finthakket|fint\s*hakket|groft\s*hakket|groftrevet|hakket|skåret|snittet|i\s+skiver|i\s+tern|i\s+både|rivet|groft\s*revet|fint\s*revet|hele|halve|skrællet|skrællede|marineret|marinerede|kogt|kogte|blancheret|ristet|ristede|frossen|frosne|optøet|frisk|tørret|knust|presset|hakket\s+fint)(?:\s+.+)?$/i

function mergeNotes(...parts: (string | null | undefined)[]): string | null {
  const s = parts
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join('; ')
  return s.length > 0 ? s : null
}

function looksLikePrepDescriptor(s: string): boolean {
  const t = s.trim()
  if (t.length < 2 || t.length > 80) return false
  if (/\d/.test(t)) return false
  return PREP_DESCRIPTOR.test(t)
}

/** Fjern mængde/enhed i starten af navn hvis modellen har dubleret dem. */
function stripLeadingAmountFromName(name: string): string {
  let s = name.trim()
  s = s.replace(/^\d+[.,]?\d*\s*(stk|st|stykker?|g|gram|kg|ml|dl|l|spsk|tsk|tesk)\s+/i, '')
  return s.trim()
}

function applyTypoFixes(name: string): string {
  let s = name
  for (const [re, rep] of TYPO_FIXES) {
    s = s.replace(re, rep)
  }
  return s
}

function applyCanonicalNameFixes(name: string): string {
  let s = name
  for (const [re, rep] of NAME_CANONICAL_FIXES) {
    s = s.replace(re, rep)
  }
  return s
}

/**
 * "løg, finthakket" / "Løg (finthakket)" → base + ekstra til notes
 */
function splitNameAndPrep(name: string, existingNotes?: string | null): { name: string; notes: string | null } {
  let n = stripLeadingAmountFromName(name)
  n = applyTypoFixes(n)

  const extra: string[] = []
  if (existingNotes?.trim()) extra.push(existingNotes.trim())

  // Parentes: tomat (hakket)
  const par = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(n.trim())
  if (par) {
    const base = par[1].trim()
    const inside = par[2].trim()
    if (looksLikePrepDescriptor(inside)) {
      extra.push(inside)
      n = base
    }
  }

  // Komma: kun første komma
  const comma = /^([^,]+),\s*(.+)$/.exec(n.trim())
  if (comma) {
    const left = comma[1].trim()
    const right = comma[2].trim()
    if (looksLikePrepDescriptor(right)) {
      extra.push(right)
      n = left
    }
  }

  const cleaned = n
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  const canonical = applyCanonicalNameFixes(cleaned)

  return {
    name: canonical.length > 0 ? canonical : 'ingrediens',
    notes: mergeNotes(...extra),
  }
}

function normalizeUnit(u: string): string {
  const x = (u || '').trim().toLowerCase()
  if (x === 'gram' || x === 'grams') return 'g'
  if (x === 'stk.' || x === 'st.') return 'stk'
  return x
}

function isEggName(name: string): boolean {
  return /\b(æg|æggehvide|æggeblomme|egg|eggs)\b/i.test(name)
}

function isOliveOilName(name: string): boolean {
  return /olivenolie|olive\s*oil|extra\s*virgin/i.test(name)
}

function isLemonJuiceName(name: string): boolean {
  return /citronsaft|lemon\s*juice/i.test(name)
}

function isWholeLemonName(name: string): boolean {
  return (/\bcitron(er)?\b|\blemon(s)?\b/i.test(name)) && !isLemonJuiceName(name)
}

function isGarlicName(name: string): boolean {
  return /\b(hvidløg|hvidløgsfed|hvidløgsfedd?)\b/i.test(name)
}

function getFreshHerbBaseName(name: string): 'persille' | 'basilikum' | 'timian' | 'mynte' | null {
  const n = name.toLowerCase()
  if (/\bpersille\b/.test(n)) return 'persille'
  if (/\bbasilikum\b/.test(n)) return 'basilikum'
  if (/\btimian\b/.test(n)) return 'timian'
  if (/\bmynte\b/.test(n)) return 'mynte'
  return null
}

/** Konverter g → stk / spsk / fed efter behov. */
function adjustUnitsAndAmounts(name: string, amount: number, unit: string): { name: string; amount: number; unit: string } {
  const u = normalizeUnit(unit)
  const n = name
  let a = Number(amount)
  if (!Number.isFinite(a) || a <= 0) a = 1

  // Æg: gram → stk
  if (isEggName(n) && (u === 'g' || u === 'gram')) {
    const pieces = Math.max(1, Math.round(a / GRAMS_PER_EGG))
    return { name: n, amount: pieces, unit: 'stk' }
  }

  // Olivenolie: gram → spsk
  if (isOliveOilName(n) && (u === 'g' || u === 'gram')) {
    const spsk = Math.round((a / GRAMS_PER_SPSK_OIL) * 10) / 10
    const rounded = spsk < 0.25 ? 0.5 : Math.max(0.5, spsk)
    return { name: n, amount: rounded, unit: 'spsk' }
  }

  // Citronsaft: gram → spsk
  if (isLemonJuiceName(n) && (u === 'g' || u === 'gram')) {
    const spsk = Math.round((a / GRAMS_PER_SPSK_LEMON_JUICE) * 10) / 10
    const rounded = spsk < 0.25 ? 0.5 : Math.max(0.5, spsk)
    return { name: n, amount: rounded, unit: 'spsk' }
  }

  // Hel citron: gram → stk
  if (isWholeLemonName(n) && (u === 'g' || u === 'gram')) {
    const pieces = Math.max(0.5, Math.round((a / GRAMS_PER_LEMON) * 2) / 2)
    return { name: n, amount: pieces, unit: 'stk' }
  }

  // Friske krydderurter: gram → bundt
  const freshHerb = getFreshHerbBaseName(n)
  if (freshHerb && (u === 'g' || u === 'gram')) {
    const bundles = Math.max(0.5, Math.round((a / GRAMS_PER_HERB_BUNDLE) * 2) / 2)
    return { name: freshHerb, amount: bundles, unit: 'bundt' }
  }

  // Hvidløg: gram → stk (fed); ensret navn til hvidløgsfed
  if (isGarlicName(n) && (u === 'g' || u === 'gram')) {
    const fed = Math.max(1, Math.round(a / GRAMS_PER_GARLIC_CLOVE))
    const nm = /\bhvidløg\b/i.test(n) && !/hvidløgsfed/i.test(n) ? n.replace(/\bhvidløg\b/gi, 'hvidløgsfed') : n
    return { name: nm.toLowerCase(), amount: fed, unit: 'stk' }
  }

  // Allerede stk for hvidløg → navn til hvidløgsfed
  if (isGarlicName(n) && (u === 'stk' || u === 'st' || u === 'stykke' || u === 'stykker')) {
    const nm = /\bhvidløg\b/i.test(n) && !/hvidløgsfed/i.test(n) ? n.replace(/\bhvidløg\b/gi, 'hvidløgsfed') : n
    return { name: nm.toLowerCase(), amount: a, unit: 'stk' }
  }

  return { name: n.toLowerCase(), amount: a, unit: u || 'stk' }
}

/**
 * Bruges ved gem af AI-opskrifter (save-ai-draft, save-generated-recipe).
 */
export function normalizeAiRecipeIngredients(ingredients: AiIngredientInput[]): AiIngredientOutput[] {
  if (!Array.isArray(ingredients)) return []

  return ingredients.map((raw) => {
    const split = splitNameAndPrep(String(raw.name || ''), raw.notes)
    const adj = adjustUnitsAndAmounts(split.name, Number(raw.amount), String(raw.unit || 'stk'))
    return {
      name: adj.name,
      amount: adj.amount,
      unit: adj.unit,
      notes: split.notes,
    }
  })
}

function stripCelsiusMentions(text: string): string {
  return text
    .replace(/\s*°\s*c\b/gi, ' grader')
    .replace(/\s+grader\s+cel[sc]ius\b/gi, ' grader')
    .replace(/\s+cel[sc]ius\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function normalizeAiRecipeInstructions(
  instructions: AiInstructionInput[]
): AiInstructionOutput[] {
  if (!Array.isArray(instructions)) return []

  return instructions.map((raw) => ({
    ...raw,
    instruction: stripCelsiusMentions(String(raw.instruction || '')),
    tips: raw.tips ? stripCelsiusMentions(String(raw.tips)) : raw.tips ?? null,
  }))
}
