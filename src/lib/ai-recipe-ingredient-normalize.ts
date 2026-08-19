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
  time?: number | null
  tips?: string | null
}

export type AiInstructionOutput = {
  stepNumber?: number
  instruction: string
  time?: number | null
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
/** ~5 g pr. tsk salt. */
const GRAMS_PER_TSK_SALT = 5
/** ~2,5 g pr. tsk peber. */
const GRAMS_PER_TSK_PEPPER = 2.5
/** Husets standard — AI skyder typisk 1–2 tsk; folk justerer selv op. */
const TSK_SALT_MAX = 0.5
const TSK_PEPPER_MAX = 0.25
const TSK_SEASONING_MIN = 0.25

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

function isSaltName(name: string): boolean {
  return /\b(salt|havsalt|flagesalt|bordsalt)\b/i.test(name)
}

function isPepperName(name: string): boolean {
  // Undgå peberfrugt / peberrod / chilipeber — kun krydderiet sort/hvid peber.
  if (/peberfrugt|peberrod|chilipeber|cayenne/i.test(name)) return false
  return /\b(peber|peberkorn)\b/i.test(name)
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

  // Salt og peber: altid i tsk. Cap til 0,5 / 0,25 — AI overdriver ellers.
  if (isSaltName(n) || isPepperName(n)) {
    const isSalt = isSaltName(n)
    const gramsPerTsk = isSalt ? GRAMS_PER_TSK_SALT : GRAMS_PER_TSK_PEPPER
    const maxTsk = isSalt ? TSK_SALT_MAX : TSK_PEPPER_MAX
    let tsk: number
    if (u === 'g' || u === 'gram') {
      tsk = a / gramsPerTsk
    } else if (u === 'spsk') {
      tsk = a * 3
    } else if (u === 'knsp' || u === 'knivspids' || u === 'nip') {
      tsk = TSK_SEASONING_MIN
    } else {
      // allerede tsk eller ukendt enhed (fx stk) → behandl tallet som tsk
      tsk = a
    }
    const rounded = Math.round(tsk * 4) / 4
    const clamped = Math.min(maxTsk, Math.max(TSK_SEASONING_MIN, rounded))
    return { name: n.toLowerCase(), amount: clamped, unit: 'tsk' }
  }

  // Olivenolie: gram → spsk (hele tal, fx 1 eller 2 — ikke 1,1/2,2)
  if (isOliveOilName(n) && (u === 'g' || u === 'gram')) {
    const spsk = a / GRAMS_PER_SPSK_OIL
    const rounded = spsk < 0.75 ? 0.5 : Math.round(spsk)
    return { name: n, amount: rounded, unit: 'spsk' }
  }

  // Olivenolie allerede i spsk: rund til hele tal (min. 0,5)
  if (isOliveOilName(n) && u === 'spsk') {
    const rounded = a < 0.75 ? 0.5 : Math.round(a)
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

/** Standard tilberedning af dansk saucebrev (Knorr-type) til 2 personer. */
const SAUCE_PACKET_BUTTER_G = 30
const SAUCE_PACKET_MILK_ML = 200

function saucePacketKind(name: string): 'bearnaise' | 'hollandaise' | null {
  const n = name.toLowerCase()
  if (/b[ée]arnaise/.test(n)) return 'bearnaise'
  if (/hollandaise/.test(n)) return 'hollandaise'
  return null
}

function isReadyMadeSauceUnit(unit: string): boolean {
  return /^(spsk|tsk|ml|dl|l)$/i.test(unit)
}

function notesAreForSauce(notes: string | null): boolean {
  return /til saucen|saucebrev|\bbrev\b|bearnaise|hollandaise/i.test(notes || '')
}

function isMilkName(name: string): boolean {
  const n = name.toLowerCase()
  if (/kokosmælk|kokosmaelk|havremælk|mandelmælk|sojamælk/i.test(n)) return false
  return /\b(mælk|minimælk|sødmælk|letmælk|skummetmælk)\b/i.test(n)
}

function isButterName(name: string): boolean {
  return /\bsmør\b/i.test(name) && !/peanut|nødde|jordnød|æble/i.test(name)
}

function isSaucePacketRow(ing: Pick<AiIngredientOutput, 'name' | 'unit' | 'amount' | 'notes'>): boolean {
  if (saucePacketKind(ing.name) == null) return false
  if (isReadyMadeSauceUnit(ing.unit)) return false
  const n = `${ing.name} ${ing.notes || ''}`.toLowerCase()
  if (/\bbrev\b|pulver|\bpose\b/.test(n)) return true
  if (ing.unit === 'stk' || ing.unit === 'st' || ing.unit === 'stykke' || ing.unit === 'stykker') return true
  if ((ing.unit === 'g' || ing.unit === 'gram') && ing.amount <= 40) return true
  return false
}

/**
 * Saucebrev er pulver: tving 1 stk + 30 g smør + 200 ml mælk (egne linjer til saucen).
 */
function ensureSaucePacketCompanions(ingredients: AiIngredientOutput[]): AiIngredientOutput[] {
  const packetIdx = ingredients.findIndex((ing) => isSaucePacketRow(ing))
  if (packetIdx < 0) return ingredients

  const out = ingredients.map((ing, i) => {
    if (i !== packetIdx) return ing
    const kind = saucePacketKind(ing.name) || 'bearnaise'
    const notes = /\bbrev\b/i.test(ing.notes || '') ? ing.notes : mergeNotes(ing.notes, 'brev')
    return {
      name: kind === 'hollandaise' ? 'hollandaisesauce' : 'bearnaisesauce',
      amount: 1,
      unit: 'stk',
      notes,
    }
  })

  const hasSauceButter = out.some((ing) => isButterName(ing.name) && notesAreForSauce(ing.notes))
  const hasSauceMilk = out.some((ing) => isMilkName(ing.name) && notesAreForSauce(ing.notes))

  if (!hasSauceButter) {
    const dedicatedButter = out.find(
      (ing) => isButterName(ing.name) && ing.unit === 'g' && ing.amount === SAUCE_PACKET_BUTTER_G
    )
    if (dedicatedButter) {
      dedicatedButter.notes = mergeNotes(dedicatedButter.notes, 'til saucen')
    } else {
      out.push({
        name: 'smør',
        amount: SAUCE_PACKET_BUTTER_G,
        unit: 'g',
        notes: 'til saucen',
      })
    }
  }

  if (!hasSauceMilk) {
    const existingMilk = out.find((ing) => isMilkName(ing.name))
    const milkMl =
      existingMilk == null
        ? 0
        : existingMilk.unit === 'ml'
          ? existingMilk.amount
          : existingMilk.unit === 'dl'
            ? existingMilk.amount * 100
            : existingMilk.unit === 'l'
              ? existingMilk.amount * 1000
              : 0
    if (existingMilk && milkMl >= SAUCE_PACKET_MILK_ML) {
      existingMilk.notes = mergeNotes(existingMilk.notes, 'til saucen')
    } else {
      out.push({
        name: 'mælk',
        amount: SAUCE_PACKET_MILK_ML,
        unit: 'ml',
        notes: 'til saucen',
      })
    }
  }

  return out.filter((ing, i) => i === packetIdx || !isSaucePacketRow(ing))
}

function isTzatzikiName(name: string): boolean {
  return /\btzatziki\b/i.test(name)
}

function isYogurtName(name: string): boolean {
  return /\b(græsk\s*yoghurt|graesk\s*yoghurt|yoghurt|yogurt)\b/i.test(name)
}

function isCucumberName(name: string): boolean {
  return /\bagurk/i.test(name)
}

function notesAreForTzatziki(notes: string | null): boolean {
  return /tzatziki/i.test(notes || '')
}

/**
 * Tzatziki købes ikke som én vare — udvid til græsk yoghurt, agurk, hvidløg og citron.
 */
function ensureTzatzikiComponents(ingredients: AiIngredientOutput[]): AiIngredientOutput[] {
  if (!ingredients.some((ing) => isTzatzikiName(ing.name))) return ingredients

  const out = ingredients.filter((ing) => !isTzatzikiName(ing.name))

  if (!out.some((ing) => isYogurtName(ing.name) && notesAreForTzatziki(ing.notes))) {
    const existing = out.find((ing) => isYogurtName(ing.name) && ing.unit === 'g' && ing.amount >= 200)
    if (existing) {
      existing.notes = mergeNotes(existing.notes, 'til tzatziki')
    } else {
      out.push({ name: 'græsk yoghurt', amount: 200, unit: 'g', notes: 'til tzatziki' })
    }
  }

  if (!out.some((ing) => isCucumberName(ing.name) && notesAreForTzatziki(ing.notes))) {
    out.push({ name: 'agurk', amount: 150, unit: 'g', notes: 'groftrevet, til tzatziki' })
  }

  if (!out.some((ing) => isGarlicName(ing.name) && notesAreForTzatziki(ing.notes))) {
    out.push({ name: 'hvidløgsfed', amount: 1, unit: 'stk', notes: 'til tzatziki' })
  }

  if (!out.some((ing) => isLemonJuiceName(ing.name) && notesAreForTzatziki(ing.notes))) {
    out.push({ name: 'citronsaft', amount: 1, unit: 'spsk', notes: 'til tzatziki' })
  }

  return out
}

/**
 * Bruges ved gem af AI-opskrifter (save-ai-draft, save-generated-recipe).
 */
export function normalizeAiRecipeIngredients(ingredients: AiIngredientInput[]): AiIngredientOutput[] {
  if (!Array.isArray(ingredients)) return []

  const mapped = ingredients.map((raw) => {
    const split = splitNameAndPrep(String(raw.name || ''), raw.notes)
    const adj = adjustUnitsAndAmounts(split.name, Number(raw.amount), String(raw.unit || 'stk'))
    return {
      name: adj.name,
      amount: adj.amount,
      unit: adj.unit,
      notes: split.notes,
    }
  })

  return ensureTzatzikiComponents(ensureSaucePacketCompanions(mapped))
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
