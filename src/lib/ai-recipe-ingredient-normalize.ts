/**
 * Normaliserer AI-genererede ingredienser før gem så navne matcher FRIDA/produkt-matching
 * (rene basisnavne i `name`, tilberedning i `notes`), og almindelige enhedsfejl rettes.
 *
 * Porteret fra Planomo. Mængde i navnet hører hjemme i amount/unit.
 */

/** AI/kilder lægger tit mængde ind i navnet ("1 stk hvidløgsfed"). */
function stripLeadingAmountFromName(name: string): string {
  return String(name || '')
    .trim()
    .replace(
      /^\d+[.,]?\d*\s*(stk|st|stykker?|g|gram|kg|ml|dl|l|liter|spsk|tsk|tesk|teskefuld|teskefulde|bundt|fed|fedd?|knsp|knivspids)\.?\s+/i,
      '',
    )
    .trim()
}

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
/** Typisk vægt for 1 hoved broccoli. */
const GRAMS_PER_BROCCOLI_HEAD = 350
/** ~25 g pr. bundt friske krydderurter. */
const GRAMS_PER_HERB_BUNDLE = 25
/** ~3 g pr. hvidløgsfed. */
const GRAMS_PER_GARLIC_CLOVE = 3
/** ~15 g pr. spsk tomatpuré. */
const GRAMS_PER_SPSK_TOMATO_PUREE = 15
/** ~5 g pr. tsk tomatpuré. */
const GRAMS_PER_TSK_TOMATO_PUREE = 5
/** Typisk vægt for 1 jalapeno (frisk). */
const GRAMS_PER_JALAPENO = 15

const TYPO_FIXES: [RegExp, string][] = [
  [/olivenolei/gi, 'olivenolie'],
  [/oliven\s*olie/gi, 'olivenolie'],
  [/groft\s*sakt/gi, 'groft salt'],
  [/avokado/gi, 'avocado'],
  [/jalapeños/gi, 'jalapeno'],
  [/jalapeño/gi, 'jalapeno'],
  [/jalapenøer/gi, 'jalapeno'],
  [/jalapenø/gi, 'jalapeno'],
  [/jalapenos/gi, 'jalapeno'],
  [/tomatpuré/gi, 'tomatpure'],
]

const PASTA_SHAPE =
  /(?:pasta|spaghetti|penne|fusilli|tagliatelle|skruer|macaroni|rigatoni|linguine|fettuccine|lasagneplader?)/i

const NAME_CANONICAL_FIXES: [RegExp, string][] = [
  // Ost
  [/^cheddar\s*ost$/i, 'cheddar'],
  [/^maasdammer\s*ost$/i, 'maasdam'],
  [/^maasdam\s*ost$/i, 'maasdam'],
  // Krydderi — ensret basisnavne (Arla m.fl. er ofte for specifikke)
  [/^groft\s+salt$/i, 'salt'],
  [/^fint\s+salt$/i, 'salt'],
  [/^friskkværnet\s+(?:sort\s+)?peber$/i, 'peber'],
  [/^frisk\s*kvaernet\s+(?:sort\s+)?peber$/i, 'peber'],
  [/^friskkværnet\s+peber$/i, 'peber'],
  [/^(?:friskkværnet\s+|frisk\s*kvaernet\s+)?(?:sort|hvid|hvide)\s+peber$/i, 'peber'],
  [/^peberkorn$/i, 'peber'],
  [/^peber\s+i\s+korn$/i, 'peber'],
  [/^rosa\s+peberkorn$/i, 'peber'],
  [/^(?:sorte?|grønne?|gronne?|hvide?)\s+peberkorn$/i, 'peber'],
  // Olie — aldrig bare «olie» (katalog + matching er olivenolie)
  [/^olie$/i, 'olivenolie'],
  [/^planteolie$/i, 'olivenolie'],
  [/^madolie$/i, 'olivenolie'],
  [/^rapsolie$/i, 'olivenolie'],
  [/^karrypaste$/i, 'karrypasta'],
  [/^grøn(?:ne)?\s+karrypaste$/i, 'grøn karrypasta'],
  [/^rød(?:e)?\s+karrypaste$/i, 'rød karrypasta'],
  [/^gul(?:e)?\s+karrypaste$/i, 'gul karrypasta'],
  [/^grønærter$/i, 'grønne ærter'],
  // Grønt — farve er ikke en anden vare. Rød, grøn og gul er peberfrugter.
  [/^(?:rød|røde|grøn|grønne|gron|gronne|gul|gule|orange)\s+peberfrugt(?:er)?$/i, 'peberfrugter'],
  [/^(?:red|green|yellow|orange|bell)(?:\s+bell)?\s+peppers?$/i, 'peberfrugter'],
  [/^bell\s+peppers?$/i, 'peberfrugter'],
  [/^peppers$/i, 'peberfrugter'],
  // Wraps / tortilla-varianter
  [/^tortillawraps?$/i, 'wraps'],
  [/^tortilla\s*wraps?$/i, 'wraps'],
  [/^hvedetortillas?$/i, 'wraps'],
  [/^fuldkornstortillas?$/i, 'wraps'],
  [/^majstortillaer$/i, 'tortillas'],
  [/^majstortillas?$/i, 'tortillas'],
  // Pasta — hold basisnavn, ikke form (fx skruer)
  [/^tørret\s+pasta$/i, 'pasta'],
  [/^torret\s+pasta$/i, 'pasta'],
  [
    new RegExp(
      `^(?:tørret|torret)\\s+(?:${PASTA_SHAPE.source}|pasta(?:\\s+${PASTA_SHAPE.source})?)$`,
      'i',
    ),
    'pasta',
  ],
  [new RegExp(`^${PASTA_SHAPE.source}$`, 'i'), 'pasta'],
  // Krydderurter — hold basisnavn
  [/^frisk\s+persille$/i, 'persille'],
  [/^tørret\s+persille(?:,\s*kan\s+undværes)?$/i, 'persille'],
  [/^tomatsauce(?:\s+til\s+pizza)?$/i, 'pizzasauce'],
  [/^koncentreret\s+tomatpur[eé]$/i, 'tomatpure'],
  [/^tomatpur[eé]\s*,?\s*koncentreret$/i, 'tomatpure'],
  // Hakket kød er en vare — ikke "oksekød" + notes "hakket"
  [/^hakket\s+okse$/i, 'hakket oksekød'],
  [/^okse(?:kød)?\s+hakket$/i, 'hakket oksekød'],
  [/^jalapeno(?:er|s|es)?$/i, 'jalapeno'],
  [/^laks$/i, 'laksefilet'],
  [/^laksefileter$/i, 'laksefilet'],
  [/^laksestykker?$/i, 'laksefilet'],
  [/^lakseflet$/i, 'laksefilet'],
]

/**
 * Tillægsord / tilberedning der typisk ligger efter komma og skal i `notes`.
 * Eksempel: "løg, finthakket" → name "løg", notes "finthakket"
 */
const PREP_DESCRIPTOR =
  /^(finthakket|fint\s*hakket|fintsnittet|fint\s*snittet|groft\s*hakket|groftrevet|hakket|skåret|snittet|i\s+skiver|i\s+tern|i\s+både|i\s+kvarte|i\s+kvarter|rivet|revet|groft\s*revet|fint\s*revet|hele|halve|skrællet|skrællede|marineret|marinerede|kogt|kogte|blancheret|ristet|ristede|grillet|grillede|stegt|stegte|paneret|panerede|frossen|frosne|optøet|frisk|tørret|knust|presset|hakket\s+fint)(?:\s+.+)?$/i

/** Noter der ikke er en vare og ikke er et trin. */
const NOISE_NOTE = /^(?:til\s+smag|efter\s+smag|friskkværnet|friskkvaernet)$/i

/** "fx skruer", "eks. penne" — eksempler fra kilder som Arla, ikke tilberedning. */
const EXAMPLE_DESCRIPTOR = /^(?:fx\.?|eks\.?|e\.g\.?|f\.eks\.?|for\s+eksempel)\b/i

function mergeNotes(...parts: (string | null | undefined)[]): string | null {
  const s = parts
    .map((p) => (p || '').trim())
    .filter((part) => part.length > 0 && !NOISE_NOTE.test(part))
    .join('; ')
  return s.length > 0 ? s : null
}

function looksLikePrepDescriptor(s: string): boolean {
  const t = s.trim()
  if (t.length < 2 || t.length > 80) return false
  if (/\d/.test(t)) return false
  if (looksLikeExampleDescriptor(t)) return false
  return PREP_DESCRIPTOR.test(t)
}

function looksLikeExampleDescriptor(s: string): boolean {
  return EXAMPLE_DESCRIPTOR.test(s.trim())
}

/**
 * "revet cheddar- og maasdammerost" → to ingrediensnavne med samme mængde/enhed.
 */
function trySplitCompoundName(name: string): string[] | null {
  const m = /^(.+?)-\s*og\s+(.+)$/i.exec(name.trim())
  if (!m) return null
  const left = m[1].trim()
  const right = m[2].trim()
  if (!left || !right) return null
  if (!/ost|cheddar|maasdam|mozzarella|gruyere|emmentaler|gouda|havarti|danbo/i.test(`${left} ${right}`)) {
    return null
  }
  return [left, right]
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

const MINCED_MEAT_CANONICAL: Array<{ base: RegExp; name: string }> = [
  { base: /^okse(?:kød)?$/i, name: 'hakket oksekød' },
  { base: /^svine(?:kød)?$/i, name: 'hakket svinekød' },
  { base: /^kylling(?:ekød)?$/i, name: 'hakket kylling' },
  { base: /^kalkun(?:kød)?$/i, name: 'hakket kalkun' },
  { base: /^lamme?kød$/i, name: 'hakket lammekød' },
  { base: /^kalve?kød$/i, name: 'hakket kalvekød' },
]

function isMincedMeatBaseName(name: string): boolean {
  const n = name.trim()
  return MINCED_MEAT_CANONICAL.some(({ base }) => base.test(n))
}

function canonicalMincedMeatName(baseName: string): string | null {
  const n = baseName.trim()
  const hit = MINCED_MEAT_CANONICAL.find(({ base }) => base.test(n))
  return hit?.name ?? null
}

function isPlainHakketPrep(value: string): boolean {
  return /^hakket$/i.test(value.trim())
}

function isSalmonBaseName(name: string): boolean {
  return /^laks(?:efileter?|estykker?|eflet)?$/i.test(name.trim())
}

/**
 * "oksekød - Hakket" / "hakket oksekød" er hakket kød som produkt, ikke tilberedning.
 */
function foldMincedMeatProduct(
  name: string,
  notes: string | null,
): { name: string; notes: string | null } {
  let n = String(name || '').replace(/\s+/g, ' ').trim()
  const extraParts = (notes || '')
    .split(/;\s*/)
    .map((p) => p.trim())
    .filter(Boolean)

  const dashHakket = /^(.+?)\s*[-–—,]\s*hakket$/i.exec(n)
  if (dashHakket) {
    extraParts.push('hakket')
    n = dashHakket[1].trim()
  }

  const leadingHakket = /^hakket\s+(.+)$/i.exec(n)
  if (leadingHakket) {
    extraParts.push('hakket')
    n = leadingHakket[1].trim()
  }

  const trailingHakket = /^(.+?)\s+hakket$/i.exec(n)
  if (trailingHakket && isMincedMeatBaseName(trailingHakket[1])) {
    extraParts.push('hakket')
    n = trailingHakket[1].trim()
  }

  const hasHakket = extraParts.some((p) => isPlainHakketPrep(p))
  const minced = hasHakket ? canonicalMincedMeatName(n) : null
  if (!minced) {
    return { name: n, notes: mergeNotes(...extraParts) }
  }

  const keptNotes = extraParts.filter((p) => !isPlainHakketPrep(p))
  return { name: minced, notes: mergeNotes(...keptNotes) }
}

/**
 * "løg, finthakket" / "Løg (finthakket)" → base + ekstra til notes
 */
function splitNameAndPrep(name: string, existingNotes?: string | null): { name: string; notes: string | null } {
  let n = stripLeadingAmountFromName(name)
  n = applyTypoFixes(n)

  const extra: string[] = []
  if (existingNotes?.trim()) extra.push(existingNotes.trim())

  const tilStaple = /^(salt|peber|olivenolie|smør|smoer)\s+til\s+(.+)$/i.exec(n.trim())
  if (tilStaple) {
    extra.push(`til ${tilStaple[2].trim()}`)
    n = tilStaple[1]
  }

  // Tilberedning foran navn: "revet cheddar" → cheddar + notes "revet"
  const leadingPrep = /^(.+?)\s+(.+)$/i
  const leadingPrepMatch = leadingPrep.exec(n.trim())
  if (leadingPrepMatch) {
    const maybePrep = leadingPrepMatch[1].trim()
    const rest = leadingPrepMatch[2].trim()
    if (looksLikePrepDescriptor(maybePrep) && rest.length >= 2) {
      if (isPlainHakketPrep(maybePrep) && isMincedMeatBaseName(rest)) {
        n = `hakket ${rest}`
      } else if (/^(røget|roget|gravad)$/i.test(maybePrep) && isSalmonBaseName(rest)) {
        n = `${maybePrep} ${rest}`
      } else if (maybePrep.toLowerCase() === 'frisk' && getFreshHerbBaseName(rest)) {
        n = rest
      } else {
        extra.push(maybePrep)
        n = rest
      }
    }
  }

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
    if (looksLikeExampleDescriptor(right)) {
      n = left
    } else if (isPlainHakketPrep(right) && isMincedMeatBaseName(left)) {
      n = `hakket ${left}`
    } else if (/^(røget|roget|gravad)$/i.test(right) && isSalmonBaseName(left)) {
      n = `${right} ${left}`
    } else if (looksLikePrepDescriptor(right)) {
      extra.push(right)
      n = left
    }
  }

  const cleaned = n
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  const canonical = applyCanonicalNameFixes(cleaned)
  const folded = foldMincedMeatProduct(canonical, mergeNotes(...extra))

  return {
    name: folded.name,
    notes: folded.notes,
  }
}

function normalizeUnit(u: string): string {
  const x = (u || '').trim().toLowerCase().replace(/\.$/, '')
  if (x === 'gram' || x === 'grams' || x === 'gr') return 'g'
  if (x === 'stk' || x === 'st' || x === 'stykke' || x === 'stykker') return 'stk'
  if (x === 'spiseskefuld' || x === 'spiseskefulde') return 'spsk'
  if (x === 'teskefuld' || x === 'teskefulde' || x === 'teske') return 'tsk'
  if (x === 'deciliter') return 'dl'
  if (x === 'liter' || x === 'ltr') return 'l'
  if (x === 'milliliter') return 'ml'
  if (x === 'tbsp' || x === 'tbs' || x === 'tablespoon' || x === 'tablespoons') return 'spsk'
  if (x === 'tsp' || x === 'teaspoon' || x === 'teaspoons') return 'tsk'
  if (x === 'piece' || x === 'pieces' || x === 'pc' || x === 'pcs' || x === 'clove' || x === 'cloves') return 'stk'
  if (x === 'ounce' || x === 'ounces' || x === 'oz') return 'oz'
  if (x === 'pound' || x === 'pounds' || x === 'lb' || x === 'lbs') return 'lb'
  if (x === 'dåser' || x === 'daase' || x === 'daaser' || x === 'ds' || x === 'can' || x === 'cans') return 'dåse'
  if (x === 'efter smag' || x === 'efter behag' || x === 'efter behov') return 'knivspids'
  return x
}

/** Typisk dansk dåse, så indkøbslisten kan regne i gram eller ml. */
function cannedMeasure(name: string, cans: number): { amount: number; unit: 'g' | 'ml' } {
  const n = name.toLowerCase()
  const count = Number.isFinite(cans) && cans > 0 ? cans : 1
  if (/kokosmælk|kokosmaelk|kokosfløde|kokosflode/.test(n)) {
    return { amount: Math.round(count * 400), unit: 'ml' }
  }
  if (/majs/.test(n)) return { amount: Math.round(count * 285), unit: 'g' }
  if (/\btun\b|tunfisk/.test(n)) return { amount: Math.round(count * 150), unit: 'g' }
  return { amount: Math.round(count * 400), unit: 'g' }
}

function isEggName(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (n === 'æg' || n === 'aeg' || n === 'egg' || n === 'eggs') return true
  return /(?:^|[^a-zæøå])æg(?:gehvide|geblomme)?(?:[^a-zæøå]|$)/i.test(n)
}

function isOliveOilName(name: string): boolean {
  const n = name.trim().toLowerCase()
  if (/^(olie|planteolie|madolie|rapsolie)$/.test(n)) return true
  return /olivenolie|olive\s*oil|extra\s*virgin/i.test(n)
}

function isCucumberName(name: string): boolean {
  return /^agurk(er)?$/i.test(name.trim())
}

function isBroccoliName(name: string): boolean {
  return /^broccoli$/i.test(name.trim())
}

/** Friske krydderurter: aldrig et helt bundt til 2 portioner — ¼–½. */
const MAX_HERB_BUNDLES = 0.5
const DEFAULT_HERB_BUNDLES = 0.25

function capHerbBundles(amount: number): number {
  if (!Number.isFinite(amount) || amount >= 1) return DEFAULT_HERB_BUNDLES
  if (amount <= 0) return DEFAULT_HERB_BUNDLES
  return Math.min(MAX_HERB_BUNDLES, Math.max(DEFAULT_HERB_BUNDLES, amount))
}

function isSaltName(name: string): boolean {
  return /^salt$/i.test(name.trim())
}

function isPepperName(name: string): boolean {
  return /^peber$/i.test(name.trim())
}

function isTomatpureName(name: string): boolean {
  return /^tomatpur[eé]$/i.test(name.trim())
}

function isJalapenoName(name: string): boolean {
  const n = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return /\bjalapen[oø](?:er|s|es)?\b/.test(n)
}

/** Kilder (fx Arla) bruger ofte "rosa peberkorn" — i Planomo er det bare peber. */
function isPeppercornSourceName(name: string): boolean {
  return /\bpeberkorn\b|\bpeber\s+i\s+korn\b|\bhel(?:e)?\s+peber(?:korn)?\b/i.test(name)
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

/** Typisk DK-pakke til torskefilet / laksefilet. */
const FISH_FILLET_PACK_G = 225
const FISH_FILLET_SNAP_MIN_G = 150
const FISH_FILLET_SNAP_MAX_G = 300

function isCodOrSalmonFilletName(name: string): boolean {
  const n = name.trim().toLowerCase().replace(/\s+/g, '')
  return /^(torskefilet(?:er)?|laksefilet(?:er)?)$/.test(n)
}

function getFreshHerbBaseName(name: string): string | null {
  const n = name
    .toLowerCase()
    .replace(/^frisk\s+/, '')
    .trim()
  const herbs = [
    'persille',
    'basilikum',
    'timian',
    'mynte',
    'koriander',
    'dild',
    'oregano',
    'rosmarin',
    'purløg',
    'purloeg',
    'forårsløg',
    'foraarsloeg',
    'salatløg',
  ] as const
  for (const herb of herbs) {
    if (n === herb || n.endsWith(` ${herb}`)) return herb
  }
  return null
}

function formatFreshHerbName(baseName: string): string {
  return `frisk ${baseName}`
}

/** tsk/spsk/knivspids er tørret krydderi — ikke et bundt frisk urt. */
function drySpiceUnit(u: string): string | null {
  if (u === 'tsk' || u === 'tesk' || u === 'teskefuld' || u === 'teskefulde') return 'tsk'
  if (u === 'spsk') return 'spsk'
  if (u === 'knsp' || u === 'knivspids' || u === 'nip') return 'knivspids'
  return null
}

/** Konverter g → stk / spsk / fed efter behov. */
function adjustUnitsAndAmounts(
  name: string,
  amount: number,
  unit: string,
  options?: { peppercornSource?: boolean; driedHerb?: boolean; explicitFresh?: boolean },
): { name: string; amount: number; unit: string } {
  let u = normalizeUnit(unit)
  const n = name
  let a = Number(amount)
  if (!Number.isFinite(a) || a <= 0) a = 1

  // Systemet regner i g, ml, tsk, spsk og stk. dl og dåse findes ikke der.
  if (u === 'dl') {
    a = Math.round(a * 100)
    u = 'ml'
  } else if (u === 'l') {
    a = Math.round(a * 1000)
    u = 'ml'
  } else if (u === 'kg' || u === 'kilo') {
    a = Math.round(a * 1000)
    u = 'g'
  } else if (u === 'cup' || u === 'cups') {
    a = Math.round(a * 240)
    u = 'ml'
  } else if (u === 'oz') {
    a = Math.round(a * 28)
    u = 'g'
  } else if (u === 'lb') {
    a = Math.round(a * 454)
    u = 'g'
  } else if (u === 'dåse') {
    const canned = cannedMeasure(n, a)
    return { name: n.toLowerCase(), amount: canned.amount, unit: canned.unit }
  }

  // Torskefilet / laksefilet: 150–300 g → 225 g (typisk pakke)
  if (isCodOrSalmonFilletName(n) && (u === 'g' || u === 'gram')) {
    if (a >= FISH_FILLET_SNAP_MIN_G && a <= FISH_FILLET_SNAP_MAX_G) {
      return { name: n, amount: FISH_FILLET_PACK_G, unit: 'g' }
    }
  }

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

  // Friske krydderurter: enhed bundt. tsk/spsk uden «frisk» i kilden er krydderiglas.
  const freshHerb = getFreshHerbBaseName(n)
  const keptDryUnit = drySpiceUnit(u)
  if (freshHerb && !options?.explicitFresh && (keptDryUnit || options?.driedHerb)) {
    const unitOut = keptDryUnit ?? (u === 'g' || u === 'gram' ? 'g' : 'tsk')
    return { name: freshHerb, amount: a, unit: unitOut }
  }
  if (freshHerb) {
    let bundles = a
    if (u === 'g' || u === 'gram') {
      bundles = Math.round((a / GRAMS_PER_HERB_BUNDLE) * 4) / 4
    } else if (u === 'stk' || u === 'st' || u === 'stykke' || u === 'stykker' || u === 'håndfuld' || u === 'haandfuld') {
      bundles = a >= 1 ? DEFAULT_HERB_BUNDLES : a
    }
    return {
      name: formatFreshHerbName(freshHerb),
      amount: capHerbBundles(bundles),
      unit: 'bundt',
    }
  }

  // Agurk: et helt stk er for meget som tilbehør/dressing til 2 portioner
  if (isCucumberName(n) && (u === 'stk' || u === 'st' || u === 'stykke' || u === 'stykker')) {
    return { name: n, amount: a >= 1 ? 0.5 : Math.max(0.25, a), unit: 'stk' }
  }

  // Broccoli: altid stk (hoved), ikke gram
  if (isBroccoliName(n)) {
    let pieces = a
    if (u === 'g' || u === 'gram') {
      pieces = Math.max(0.5, Math.round((a / GRAMS_PER_BROCCOLI_HEAD) * 2) / 2)
    }
    return { name: 'broccoli', amount: pieces, unit: 'stk' }
  }

  // Salt: ensret til tsk — typisk 0,5 tsk i opskrifter (kilder skriver ofte 1 tsk)
  if (isSaltName(n)) {
    let amount = a
    let unit = u
    if (unit === 'knsp' || unit === 'knivspids') {
      amount = 0.5
      unit = 'tsk'
    } else if (unit !== 'tsk' && unit !== 'tesk' && unit !== 'teskefuld' && unit !== 'teskefulde') {
      unit = 'tsk'
      if (amount >= 1) amount = 0.5
    } else if (amount === 1) {
      amount = 0.5
    }
    return { name: 'salt', amount, unit: 'tsk' }
  }

  // Peberkorn fra kilder → 0,25 tsk peber (ikke "rosa peberkorn" som separat vare)
  if (options?.peppercornSource) {
    return { name: 'peber', amount: 0.25, unit: 'tsk' }
  }

  // Peber: ensret til tsk — kilder skriver ofte stk
  if (isPepperName(n)) {
    let amount = a
    let unit = u
    if (unit === 'knsp' || unit === 'knivspids') {
      amount = 0.25
      unit = 'tsk'
    } else if (unit === 'stk' || unit === 'st' || unit === 'stykke' || unit === 'stykker') {
      amount = amount === 1 ? 0.25 : amount
      unit = 'tsk'
    } else if (unit !== 'tsk' && unit !== 'tesk' && unit !== 'teskefuld' && unit !== 'teskefulde') {
      unit = 'tsk'
      if (amount >= 1) amount = 0.25
    }
    return { name: 'peber', amount, unit: 'tsk' }
  }

  // Tomatpuré: altid gram (kilder skriver ofte spsk/stk for "koncentreret tomatpuré")
  if (isTomatpureName(n)) {
    let amount = a
    if (u === 'spsk') {
      amount = Math.round(amount * GRAMS_PER_SPSK_TOMATO_PUREE)
    } else if (u === 'tsk' || u === 'tesk' || u === 'teskefuld' || u === 'teskefulde') {
      amount = Math.round(amount * GRAMS_PER_TSK_TOMATO_PUREE)
    } else if (u !== 'g' && u !== 'gram' && (u === 'stk' || u === 'st' || u === 'stykke' || u === 'stykker')) {
      amount = Math.round(amount * 70)
    }
    return { name: 'tomatpure', amount, unit: 'g' }
  }

  // Jalapeno: altid gram (AI skriver ofte stk)
  if (isJalapenoName(n)) {
    let amount = a
    if (u === 'stk' || u === 'st' || u === 'stykke' || u === 'stykker') {
      amount = Math.max(GRAMS_PER_JALAPENO, Math.round(a * GRAMS_PER_JALAPENO))
    } else if (u === 'spsk') {
      amount = Math.max(1, Math.round(a * GRAMS_PER_JALAPENO))
    } else if (u === 'tsk' || u === 'tesk' || u === 'teskefuld' || u === 'teskefulde') {
      amount = Math.max(1, Math.round(a * 5))
    }
    return { name: 'jalapeno', amount, unit: 'g' }
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
function normalizeOneAiIngredient(raw: AiIngredientInput): AiIngredientOutput {
  const rawName = String(raw.name || '')
  const split = splitNameAndPrep(rawName, raw.notes)
  const sourceText = `${rawName} ${raw.notes || ''} ${split.notes || ''}`
  const driedHerb = /\b(tørret|torret|tørrede|torrede)\b/i.test(sourceText)
  const explicitFresh = !driedHerb && /\bfrisk(?:e)?\b/i.test(sourceText)
  const adj = adjustUnitsAndAmounts(
    split.name,
    Number(raw.amount),
    String(raw.unit || 'stk'),
    { peppercornSource: isPeppercornSourceName(rawName), driedHerb, explicitFresh },
  )
  return {
    name: adj.name,
    amount: adj.amount,
    unit: adj.unit,
    notes: split.notes,
  }
}

export function normalizeAiRecipeIngredients(ingredients: AiIngredientInput[]): AiIngredientOutput[] {
  if (!Array.isArray(ingredients)) return []

  return ingredients.flatMap((raw) => {
    const compoundParts = trySplitCompoundName(String(raw.name || ''))
    if (compoundParts) {
      const partCount = compoundParts.length
      const splitAmount = Number(raw.amount) / partCount
      const sharedPrep = compoundParts[0].match(/^(revet|rivet|hakket|finthakket|fint\s*hakket|groft\s*hakket)\s+/i)?.[1]
      return compoundParts.map((part) => {
        const name = sharedPrep && compoundParts.length > 1 && !new RegExp(`^${sharedPrep}\\s+`, 'i').test(part)
          ? `${sharedPrep} ${part}`
          : part
        return normalizeOneAiIngredient({
          ...raw,
          name,
          amount: splitAmount,
        })
      })
    }
    return [normalizeOneAiIngredient(raw)]
  }).filter((ingredient) => {
    const name = ingredient.name.trim().toLowerCase()
    return name.length > 0 && name !== 'ingrediens'
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

const SKIP_NOTE = /^(?:notes?|ingen|n\/a|–|-|\.)$/i

const NOTE_STOP_WORDS = new Set([
  'og',
  'eller',
  'med',
  'til',
  'på',
  'paa',
  'af',
  'i',
  'en',
  'et',
  'den',
  'det',
  'de',
  'som',
  'der',
  'fra',
  'ved',
  'kan',
  'skal',
  'gerne',
  'efter',
  'smag',
  'uden',
  'ikke',
])

type PrepClause = {
  clause: string
  covered: (text: string) => boolean
  /** Én sætning, når handlingen mangler i fremgangsmåden. `tag` er [[ing:navn]]. */
  alone: (tag: string) => string
  /**
   * step: handlingen bliver sit eget trin, og noten fjernes fra ingrediensen.
   * aside: noten bliver stående (fx frosne) og nævnes ved varen.
   */
  fold: 'step' | 'aside'
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function noteParts(notes: string | null | undefined): string[] {
  return String(notes || '')
    .split(/\s*;\s*/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0 && !SKIP_NOTE.test(part))
}

function noteAlreadyInName(name: string, note: string): boolean {
  const hay = name.toLowerCase()
  const needle = note.toLowerCase().trim()
  if (!needle) return true
  if (hay.includes(needle)) return true
  const stem = needle.replace(/(?:ede|et|en|er|ne|e)$/i, '')
  return stem.length >= 4 && hay.includes(stem)
}

function clause(
  note: string,
  covered: (text: string) => boolean,
  alone: (tag: string) => string,
  fold: PrepClause['fold'] = 'aside',
): PrepClause {
  return { clause: note, covered, alone, fold }
}

/**
 * Side-noter som "revet", "halverede", "skal og saft" skal med i fremgangsmåden.
 * Tillægsord lige før navnet bliver slugt, når mængden sættes ind, så handlingen
 * skrives som udsagnsord — eller som en sætning efter ingrediensen.
 */
function prepClauseForNote(note: string): PrepClause | null {
  const n = note.toLowerCase()

  if (/^(?:(?:fint|groft)\s*)?hakk(?:et|ede)$/.test(n) || n === 'hakket fint') {
    return clause(note, (t) => /\bhak/i.test(t), (tag) => `Hak ${tag}.`, 'step')
  }
  if (/^(?:(?:fint|groft)\s*)?rev(?:et|ne)$/.test(n) || n === 'rivet') {
    return clause(note, (t) => /\briv|\brev/i.test(t), (tag) => `Riv ${tag}.`, 'step')
  }
  if (/^(?:halve|halveret|halverede)$/.test(n)) {
    return clause(note, (t) => /\bhalv/i.test(t), (tag) => `Halvér ${tag}.`, 'step')
  }
  if (/^i\s+tern(?:inger)?$/.test(n)) {
    return clause(note, (t) => /\btern/i.test(t), (tag) => `Skær ${tag} i tern.`, 'step')
  }
  if (/^i\s+skiver$/.test(n)) {
    return clause(note, (t) => /\bskiv/i.test(t), (tag) => `Skær ${tag} i skiver.`, 'step')
  }
  if (/^i\s+både$/.test(n)) {
    return clause(note, (t) => /\bbåde\b/i.test(t), (tag) => `Skær ${tag} i både.`, 'step')
  }
  if (/^i\s+kvarte(?:r)?$/.test(n)) {
    return clause(note, (t) => /\bkvarte/i.test(t), (tag) => `Skær ${tag} i kvarte.`, 'step')
  }
  if (/^skår(?:et|ne)$/.test(n)) {
    return clause(note, (t) => /\bskær|\bskår|\bskiv/i.test(t), (tag) => `Skær ${tag}.`, 'step')
  }
  if (/^(?:(?:fint)\s*)?snitt(?:et|ede)$/.test(n) || n === 'fintsnittet') {
    return clause(note, (t) => /\bsnit/i.test(t), (tag) => `Snit ${tag}.`, 'step')
  }
  if (/^skræll(?:et|ede)$/.test(n)) {
    return clause(note, (t) => /\bskræl/i.test(t), (tag) => `Skræl ${tag}.`, 'step')
  }
  if (/^dræn(?:et|ede)$/.test(n)) {
    return clause(note, (t) => /\bdræn/i.test(t), (tag) => `Dræn ${tag}.`, 'step')
  }
  if (/^knust(?:e)?$/.test(n)) {
    return clause(note, (t) => /\bknus/i.test(t), (tag) => `Knus ${tag}.`, 'step')
  }
  if (/^presset(?:e)?$/.test(n)) {
    return clause(note, (t) => /\bpres/i.test(t), (tag) => `Pres ${tag}.`, 'step')
  }
  if (/skal\s+og\s+saft/.test(n)) {
    return clause(
      note,
      (t) => /\bskal\b/i.test(t) && /\bsaft\b/i.test(t),
      (tag) => `Brug skal og saft af ${tag}.`,
      'step',
    )
  }
  if (/^blancher(?:et|ede)$/.test(n)) {
    return clause(note, (t) => /\bblanch/i.test(t), (tag) => `Blanchér ${tag}.`, 'step')
  }
  if (/^grill(?:et|ede)$/.test(n)) {
    return clause(note, (t) => /\bgrill/i.test(t), (tag) => `Grill ${tag}.`, 'step')
  }
  if (/^stegt(?:e)?$/.test(n)) {
    return clause(note, (t) => /\bsteg/i.test(t), (tag) => `Steg ${tag}.`, 'step')
  }
  if (/^paner(?:et|ede)$/.test(n)) {
    return clause(note, (t) => /\bpaner/i.test(t), (tag) => `Panér ${tag}.`, 'step')
  }
  if (/^fros(?:sen|ne|set)$/.test(n)) {
    return clause(note, (t) => /\bfros|\bfrost|\boptø/i.test(t), (tag) => `Brug ${tag}, ${note}.`)
  }
  if (/^salt(?:et|ede)$/.test(n)) {
    return clause(note, (t) => /\bsaltet/i.test(t), (tag) => `Brug ${tag}, ${note}.`)
  }
  if (/^frisk(?:e)?$/.test(n)) {
    return clause(note, (t) => /\bfrisk/i.test(t), (tag) => `Brug ${tag}, ${note}.`)
  }
  if (/^t[øo]rre(?:t|de)$/.test(n)) {
    return clause(note, (t) => /\btør|\btor/i.test(t), (tag) => `Brug ${tag}, ${note}.`)
  }
  if (/^ristet(?:e)?$/.test(n)) {
    return clause(note, (t) => /\brist/i.test(t), (tag) => `Rist ${tag}.`, 'step')
  }
  if (/^marineret(?:e)?$/.test(n)) {
    return clause(note, (t) => /\bmarin/i.test(t), (tag) => `Marinér ${tag}.`, 'step')
  }
  if (/^kogt(?:e)?$/.test(n)) {
    return clause(note, (t) => /\bkog/i.test(t), (tag) => `Kog ${tag}.`, 'step')
  }
  if (n === 'optøet' || n === 'optoet') {
    return clause(note, (t) => /\boptø|\boptoet|\btøet/i.test(t), (tag) => `Brug ${tag}, ${note}.`)
  }

  const tokens = n
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 4 && !NOTE_STOP_WORDS.has(word))
  if (tokens.length === 0 && n.length < 3) return null
  return clause(
    note,
    (text) => {
      const lower = text.toLowerCase()
      if (tokens.length === 0) return lower.includes(n)
      return tokens.every((token) => lower.includes(token))
    },
    (tag) => `Brug ${tag}, ${note}.`,
  )
}

type Mention = { start: number; end: number }

function findNthMention(instruction: string, name: string, occurrence: number): Mention | null {
  const needle = name.trim()
  if (!needle) return null
  const tagRe = new RegExp(`\\[\\[ing:${escapeRegExp(needle)}(?:#(\\d+))?\\]\\]`, 'gi')
  const plainTags: Mention[] = []
  let exactNumbered: Mention | null = null
  let sawNumbered = false
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(instruction))) {
    const span = { start: match.index, end: match.index + match[0].length }
    if (match[1]) {
      sawNumbered = true
      if (Number(match[1]) === occurrence) exactNumbered = span
      continue
    }
    plainTags.push(span)
  }
  if (sawNumbered) return exactNumbered
  if (plainTags.length > 0) return plainTags[occurrence - 1] ?? plainTags[plainTags.length - 1] ?? null

  const lower = instruction.toLowerCase()
  const wanted = needle.toLowerCase()
  const plains: Mention[] = []
  let from = 0
  while (from < lower.length) {
    const index = lower.indexOf(wanted, from)
    if (index < 0) break
    const before = index === 0 ? '' : instruction[index - 1]
    const after = instruction[index + wanted.length] ?? ''
    const boundary = (ch: string) => !ch || /[\s,.;:!?()[\]«»"'/]/.test(ch)
    const tagStart = instruction.lastIndexOf('[[', index)
    const tagEnd = tagStart >= 0 ? instruction.indexOf(']]', tagStart) : -1
    const insideTag = tagStart >= 0 && tagEnd >= index
    if (!insideTag && boundary(before) && boundary(after)) {
      plains.push({ start: index, end: index + wanted.length })
    }
    from = index + wanted.length
  }
  return plains[occurrence - 1] ?? (plains.length > 0 ? plains[plains.length - 1] : null)
}

function proseWithoutTags(instruction: string, name: string): string {
  const own = new RegExp(`\\[\\[ing:${escapeRegExp(name.trim())}(?:#\\d+)?\\]\\]`, 'gi')
  return instruction.replace(own, ' ').replace(/\[\[[^\]]+\]\]/g, ' ')
}

function occurrenceIndex(ingredients: Array<{ name: string }>, index: number): number {
  const name = ingredients[index]?.name?.trim().toLowerCase()
  let count = 0
  for (let i = 0; i <= index; i++) {
    if (ingredients[i]?.name?.trim().toLowerCase() === name) count++
  }
  return count
}

/**
 * Sætter ingrediens-noter ind i fremgangsmåden, når trinnet kun nævner varen.
 * Noten kommer efter tagget, så den ikke bliver slugt som tillægsord foran navnet.
 * Mangler varen helt i trinnene, lægges et forbered-trin foran.
 */
function weavePrepNotesIntoInstructions(
  instructions: AiInstructionOutput[],
  ingredients: Array<{ name: string; notes?: string | null }>,
): AiInstructionOutput[] {
  if (!ingredients.length) return instructions

  const steps = instructions.map((step) => ({ ...step }))
  const insertions: Array<{ stepIndex: number; end: number; text: string }> = []
  const missing: string[] = []
  const dropped = new Map<number, Set<string>>()

  const dropNote = (index: number, part: string) => {
    const set = dropped.get(index) ?? new Set<string>()
    set.add(part.toLowerCase())
    dropped.set(index, set)
  }

  ingredients.forEach((ingredient, index) => {
    const name = String(ingredient.name || '').trim()
    if (!name) return
    const occurrence = occurrenceIndex(ingredients, index)
    const pending: PrepClause[] = []
    const stepPending: PrepClause[] = []

    for (const part of noteParts(ingredient.notes)) {
      if (NOISE_NOTE.test(part) || noteAlreadyInName(name, part)) {
        dropNote(index, part)
        continue
      }
      const spec = prepClauseForNote(part)
      if (!spec) continue
      const mentioned = steps.filter((step) => findNthMention(step.instruction, name, occurrence))
      const blob = mentioned.map((step) => proseWithoutTags(step.instruction, name)).join('\n')
      const covered = Boolean(blob && spec.covered(blob))
      if (spec.fold === 'step') {
        dropNote(index, part)
        if (!covered) stepPending.push(spec)
        continue
      }
      if (covered) continue
      pending.push(spec)
    }

    if (stepPending.length > 0) {
      const tag = `[[ing:${name}]]`
      for (const spec of stepPending) missing.push(spec.alone(tag))
    }
    if (pending.length === 0) return

    let mention: (Mention & { stepIndex: number }) | null = null
    for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
      const found = findNthMention(steps[stepIndex].instruction, name, occurrence)
      if (found) {
        mention = { ...found, stepIndex }
        break
      }
    }

    if (mention) {
      const text = `, ${pending.map((item) => item.clause).join(', ')}`
      insertions.push({ stepIndex: mention.stepIndex, end: mention.end, text })
      return
    }

    const tag = `[[ing:${name}]]`
    const [first, ...rest] = pending
    const sentence = first.alone(tag).replace(/\.$/, '')
    const extra = rest.map((item) => item.clause).join(', ')
    missing.push(extra ? `${sentence}, ${extra}.` : `${sentence}.`)
  })

  for (const [index, parts] of dropped) {
    const ingredient = ingredients[index]
    if (!ingredient) continue
    const kept = noteParts(ingredient.notes).filter((part) => !parts.has(part.toLowerCase()))
    ingredient.notes = kept.length > 0 ? kept.join('; ') : null
  }

  const byStep = new Map<number, Array<{ end: number; text: string }>>()
  for (const insertion of insertions) {
    const list = byStep.get(insertion.stepIndex) ?? []
    list.push({ end: insertion.end, text: insertion.text })
    byStep.set(insertion.stepIndex, list)
  }
  for (const [stepIndex, list] of byStep) {
    const grouped = new Map<number, string[]>()
    for (const insertion of list) {
      const texts = grouped.get(insertion.end) ?? []
      texts.push(insertion.text.replace(/^,\s*/, ''))
      grouped.set(insertion.end, texts)
    }
    const ordered = [...grouped.entries()].sort((a, b) => b[0] - a[0])
    let text = steps[stepIndex].instruction
    for (const [end, texts] of ordered) {
      const unique = [...new Set(texts)]
      const next = text.slice(end).trimStart()[0] ?? ''
      const needsComma = next !== '' && !',.;:!?)'.includes(next)
      text = `${text.slice(0, end)}, ${unique.join(', ')}${needsComma ? ',' : ''}${text.slice(end)}`
    }
    steps[stepIndex] = { ...steps[stepIndex], instruction: text }
  }

  if (missing.length === 0) return steps

  const numbered = steps.some((step) => typeof step.stepNumber === 'number')
  const prep: AiInstructionOutput = {
    instruction: missing.join(' '),
    tips: null,
    ...(numbered ? { stepNumber: 1 } : {}),
  }
  const rest = numbered
    ? steps.map((step) =>
        typeof step.stepNumber === 'number' ? { ...step, stepNumber: step.stepNumber + 1 } : step,
      )
    : steps
  return [prep, ...rest]
}

export function normalizeAiRecipeInstructions(
  instructions: AiInstructionInput[],
  ingredients?: Array<{ name: string; notes?: string | null }>,
): AiInstructionOutput[] {
  if (!Array.isArray(instructions)) return []

  const cleaned = instructions.map((raw) => ({
    ...raw,
    instruction: stripCelsiusMentions(String(raw.instruction || '')),
    tips: raw.tips ? stripCelsiusMentions(String(raw.tips)) : raw.tips ?? null,
  }))

  if (!ingredients?.length) return cleaned
  return weavePrepNotesIntoInstructions(cleaned, ingredients)
}
