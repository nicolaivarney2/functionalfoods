import type { Ingredient, IngredientGroup } from '@/types/recipe'

/** Faste gruppenavne som Sense-brugere genkender (jf. spisekasse / håndfulde). */
export const SENSE_SPISEKASSE_GROUP_TITLES = [
  'Håndfuld 1+2',
  'Håndfuld 3',
  'Håndfuld 4',
  'Fedt',
  'Smagsgivere',
] as const

export type SenseSpisekasseGroupTitle = (typeof SENSE_SPISEKASSE_GROUP_TITLES)[number]

export type SenseGroupFromAi = {
  name: string
  ingredients: Array<{
    name: string
    amount: number | string
    unit?: string
    notes?: string
  }>
}

function slugId(prefix: string, name: string): string {
  const s = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${prefix}-${s || 'gruppe'}`
}

/**
 * Tjekker om en opskrift skal vises som Sense-spisekasse (kategori + grupper i data).
 */
export function recipeHasSenseSpisekasse(recipe: {
  dietaryCategories?: string[]
  ingredientGroups?: IngredientGroup[]
}): boolean {
  const tags = recipe.dietaryCategories || []
  const isSense = tags.some((t) => String(t).toLowerCase() === 'sense')
  return isSense && Array.isArray(recipe.ingredientGroups) && recipe.ingredientGroups.length > 0
}

/**
 * Tjekker om opskriften har "sense" + mindst én anden diætkategori.
 * I så fald skal Sense-spisekassen være "slået fra" som default — brugeren
 * skal selv aktivere visningen via en knap ved antal personer.
 */
export function recipeHasSenseWithOtherDietCategory(recipe: {
  dietaryCategories?: string[]
}): boolean {
  const tags = (recipe.dietaryCategories || []).filter(
    (t): t is string => typeof t === 'string' && t.trim() !== ''
  )
  if (tags.length < 2) return false
  const normalized = tags.map((t) => t.toLowerCase().trim())
  const hasSense = normalized.includes('sense')
  if (!hasSense) return false
  return normalized.some((t) => t !== 'sense')
}

/**
 * Efter normalisering af hele den flade ingrediensliste: fordel samme rækkefølge i grupper
 * ud fra antal ingredienser pr. gruppe (tæl fra AI / kladde).
 */
export function buildIngredientGroupsWithIds(
  flatWithIds: Ingredient[],
  groupSizes: { name: string; count: number }[]
): IngredientGroup[] {
  let offset = 0
  const out: IngredientGroup[] = []
  for (const { name, count } of groupSizes) {
    if (count <= 0) continue
    const slice = flatWithIds.slice(offset, offset + count)
    offset += count
    if (slice.length === 0) continue
    out.push({
      id: slugId('sense-gruppe', name),
      name,
      ingredients: slice,
    })
  }
  if (offset !== flatWithIds.length) {
    return []
  }
  return out
}

/**
 * Validerer at gruppestørrelser matcher fladt antal (til gem).
 */
export function senseGroupSizesMatchFlatLength(
  groups: Array<{ ingredients?: unknown[] }>,
  flatLength: number
): boolean {
  const sum = groups.reduce((n, g) => n + (Array.isArray(g.ingredients) ? g.ingredients.length : 0), 0)
  return sum === flatLength && flatLength > 0
}

function normalizeGroupTitle(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * Sætter grupper i kanonisk rækkefølge (Håndfuld 1+2 → … → Smagsgivere).
 * Manglende grupper udfyldes med tomme ingredienslister så AI kan udelade en rubrik.
 */
export function orderSenseGroupsFromAi(groups: SenseGroupFromAi[]): SenseGroupFromAi[] {
  if (!Array.isArray(groups) || groups.length === 0) return []
  const remaining = groups.filter((g) => g && typeof g.name === 'string')
  const out: SenseGroupFromAi[] = []

  for (const title of SENSE_SPISEKASSE_GROUP_TITLES) {
    const want = normalizeGroupTitle(title)
    const idx = remaining.findIndex((g) => normalizeGroupTitle(g.name) === want)
    if (idx >= 0) {
      out.push({
        name: title,
        ingredients: Array.isArray(remaining[idx].ingredients) ? remaining[idx].ingredients : [],
      })
      remaining.splice(idx, 1)
    } else {
      out.push({ name: title, ingredients: [] })
    }
  }

  for (const g of remaining) {
    const n = String(g.name || '').trim()
    if (!n) continue
    out.push({
      name: n,
      ingredients: Array.isArray(g.ingredients) ? g.ingredients : [],
    })
  }

  return out
}

type FlatIngInput = { name: string; amount: number; unit: string; notes?: string | null }

/**
 * Lowercase + æ/ø/å → ae/oe/aa, så `\b` og ASCII-mønstre virker på danske navne.
 * æ/ø/å SKAL mappes før NFD: ellers bliver å → a (ring-diacritic strippes) i stedet for aa.
 */
function foldIngredientName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function isFedtToken(n: string): boolean {
  // «olie» alene (og sesam-/solsikkeolie …) — ikke kun olivenolie/rapsolie.
  // Kant-saucer: mayo, bearnaise, remoulade, aioli, dressing tæller som fedt i Sense.
  return /(olivenolie|rapsolie|kokosolie|sesamolie|solsikkeolie|majsolie|\bolie\b|smoer\b|\bmaelk\b|floede|creme fraiche|cremefraiche|mayonnaise|\bmayo\b|ghee|bearnaise|hollandaise|aioli|remoulade|tahin|tahini|peanutbutter|noeddesmoer|avocado|\bnoedder\b|mandler|valnoed|cashew|pinjekerner|solsikkekerner|graeskarkerner|graeskarfr|chiafr|hoerfroe|hoerfr|sesamfr|kokosmaelk|kokosfloede|\bpesto\b|dressing|vinaigrette|guacamole|\branch\b|\bdip\b)/.test(
    n
  )
}

function isSmagToken(n: string): boolean {
  // Vigtigt: `\bpeber\b` — ikke bare `peber`, ellers bliver peberfrugt smagsgiver.
  // `soja` kun som sauce (ikke sojabønner). Tomatpuré/passata = smag; hakkede tomater er grønt.
  return /(\bsalt\b|\bpeber\b|bouillon|bouillontern|eddike|edikk|\bcitron\b|\blime\b|limesaft|citronsaft|hvidloeg|ingefaer|sennep|honning|karry|\bpaprika\b|\bchili\b|chiliflager|dild|persille|timian|oregano|basilikum|koriander|estragon|\bmynte\b|rosmarin|kanel|kommen|spidskommen|gurkemeje|safran|muskat|nellike|sojasauce|soy\s*sauce|mirin|balsam|sirup|\bfond\b|\bstock\b|krydderi|krydderur|fish sauce|fiskesauce|worcestersauce|sriracha|ketchup|chilisauce|barbecuesauce|bbq|chutney|\bsalsa\b|tomatpure|tomatpuree|tomatpasta|passata|passeata|harissa|miso)/.test(
    n
  )
}

/**
 * Stivelse / Håndfuld 4 — inkl. frugt (Sense: 0–1 håndfuld stivelse eller frugt).
 * `ris\b` fanger jasminris/basmatiris; blomkålsris fanget tidligere som tvunget grønt.
 */
function isStivelseToken(n: string): boolean {
  return /(kartoffel|kartofler|kartoffeler|kartoffelmos|bagekartoffel|batat|soed\s*kartoffel|soedkartoffel|ris\b|risotto|risnudel|pasta|spaghetti|penne|fusilli|farfalle|tagliatelle|fettuccine|macaroni|lasagne|couscous|bulgur|quinoa|perlespelt|hirse|polenta|nudler|nudel|udon|soba|ramen|mie\b|vermicelli|orzo|broed|brot\b|rugbroed|knaekkebroed|pita|naan|wrap|tortilla|flatbroed|groed|havre|gryn|majs\b|popcorn|\bbaer\b|blaabaer|jordbaer|hindbaer|solbaer|banan|\baeble\b|\bpaere\b|appelsin|mandarin|clementin|mango|ananas|vindruer|\bdruer\b|kiwi|melon|vandmelon|honningmelon|fersken|nektarin|blomme|kirsebaer|rosiner|dadler)/.test(
    n
  )
}

function isProteinToken(n: string): boolean {
  return /(fisk|laks|torsk|kulmule|sej|makrel|reje|hummer|krabbe|kylling|kalkun|oksekoed|oksek|svine|flaesk|bacon|skinke|fars|\bboef\b|hakkeboef|poelse|medister|lamm|tofu|tempeh|edamame|sojabonne|\baeg\b|aeggehvide|skink|tun|boenner|boenne|linse|kikaert|halloumi|mozzarella|feta|parmesan|skyr|kvark|cottage|hytteost|hummus|humus|yoghurt)/.test(
    n
  )
}

/** Grønt der ellers kan falde forkert pga. delstreng — tving Håndfuld 1+2. */
function isForcedGronToken(n: string): boolean {
  // tomat: kun hele ord (ikke tomatpuré). blomkaal fanger blomkålsris før ris-stivelse.
  return /(peberfrugt|foraarsloeg|porre|spidskaal|hvidkaal|roedkaal|kinakaal|groenkaal|broccoli|blomkaal|squash|zucchini|courgette|aubergine|agurk|cherrytomat|\btomater?\b|spinat|rucola|iceberg|bladsalat|\bsalat\b|selleri|fennikel|asparges|groenne boenner|boennespidser|sukkeraerter|\baerter\b|champignon|svampe|portobello|radise|roedbede|pastinak|kaalroe|gulerod)/.test(
    n
  )
}

/**
 * Én linjes Sense-spisekasse-rubrik ud fra navn (heuristik).
 * Rækkefølge: tvunget grønt → fedt → smag → stivelse → protein → grønt (1+2).
 */
export function classifySenseIngredientLine(name: string): SenseSpisekasseGroupTitle {
  const n = foldIngredientName(name)
  if (isForcedGronToken(n)) return 'Håndfuld 1+2'
  if (isFedtToken(n)) return 'Fedt'
  if (isSmagToken(n)) return 'Smagsgivere'
  if (isStivelseToken(n)) return 'Håndfuld 4'
  if (isProteinToken(n)) return 'Håndfuld 3'
  return 'Håndfuld 1+2'
}

/** Én gruppe-label pr. ingrediens i **samme rækkefølge** som listen (til admin / defaults). */
export function inferSenseGroupLabelsInListOrder(ingredients: FlatIngInput[]): string[] {
  return ingredients.map((ing) => classifySenseIngredientLine(ing.name))
}

/** Udled gruppe pr. linje ud fra eksisterende `ingredientGroups` (id-match), ellers heuristik. */
export function senseGroupAssignmentsFromRecipeGroups(
  flat: Array<{ id?: string; name?: string }>,
  groups: IngredientGroup[] | undefined
): string[] {
  const idToGroup = new Map<string, string>()
  if (Array.isArray(groups)) {
    for (const g of groups) {
      for (const ing of g.ingredients || []) {
        if (ing.id) idToGroup.set(String(ing.id), g.name)
      }
    }
  }
  const allowed = new Set<string>(SENSE_SPISEKASSE_GROUP_TITLES as unknown as string[])
  return flat.map((ing) => {
    const fromId = ing.id ? idToGroup.get(String(ing.id)) : undefined
    if (fromId && allowed.has(fromId)) return fromId
    return classifySenseIngredientLine(String(ing.name || ''))
  })
}

/**
 * Byg `ingredientGroups` + kanonisk flad rækkefølge ud fra admin-valg pr. række.
 */
export function buildSenseIngredientGroupsFromAssignments(
  rows: Ingredient[],
  groupPerRow: string[]
): IngredientGroup[] | null {
  if (!Array.isArray(rows) || !Array.isArray(groupPerRow) || rows.length !== groupPerRow.length || rows.length === 0) {
    return null
  }
  const titles = [...SENSE_SPISEKASSE_GROUP_TITLES] as string[]
  const allowed = new Set(titles)
  const byTitle = new Map<string, Ingredient[]>()
  for (const t of titles) byTitle.set(t, [])
  for (let i = 0; i < rows.length; i++) {
    let g = String(groupPerRow[i] || titles[0]).trim()
    if (!allowed.has(g)) g = titles[0]
    byTitle.get(g)!.push(rows[i])
  }
  const flatOrdered = titles.flatMap((t) => byTitle.get(t) || [])
  const sizes = titles.map((name) => ({ name, count: (byTitle.get(name) || []).length }))
  const built = buildIngredientGroupsWithIds(flatOrdered, sizes)
  return built.length > 0 ? built : null
}

/**
 * Når AI har glemt/forvrænger `ingredientGroups`, men den flade liste er korrekt:
 * fordel ingredienser i de fem Sense-grupper ud fra danske nøgleord (heuristik).
 * Rækkefølgen bliver: 1+2 → 3 → 4 → Fedt → Smagsgivere (krævet af `buildIngredientGroupsWithIds`).
 */
export function inferSenseIngredientGroupsFromFlat(ingredients: FlatIngInput[]): IngredientGroup[] | null {
  if (!Array.isArray(ingredients) || ingredients.length === 0) return null

  const veg: FlatIngInput[] = []
  const protein: FlatIngInput[] = []
  const stivelse: FlatIngInput[] = []
  const fedt: FlatIngInput[] = []
  const smag: FlatIngInput[] = []

  for (const ing of ingredients) {
    const t = classifySenseIngredientLine(ing.name)
    if (t === 'Fedt') fedt.push(ing)
    else if (t === 'Smagsgivere') smag.push(ing)
    else if (t === 'Håndfuld 4') stivelse.push(ing)
    else if (t === 'Håndfuld 3') protein.push(ing)
    else veg.push(ing)
  }

  if (veg.length === 0 && protein.length === 0 && stivelse.length === 0) return null

  const flatOrdered = [...veg, ...protein, ...stivelse, ...fedt, ...smag]
  const sizes = [
    { name: 'Håndfuld 1+2', count: veg.length },
    { name: 'Håndfuld 3', count: protein.length },
    { name: 'Håndfuld 4', count: stivelse.length },
    { name: 'Fedt', count: fedt.length },
    { name: 'Smagsgivere', count: smag.length },
  ]

  const withIds: Ingredient[] = flatOrdered.map((ing) => ({
    id: crypto.randomUUID(),
    name: ing.name,
    amount: Number(ing.amount) || 0,
    unit: ing.unit,
    ...(ing.notes != null && ing.notes !== '' ? { notes: ing.notes } : {}),
  }))

  const built = buildIngredientGroupsWithIds(
    withIds,
    sizes.map((s) => ({ name: s.name, count: s.count }))
  )
  return built.length > 0 ? built : null
}
