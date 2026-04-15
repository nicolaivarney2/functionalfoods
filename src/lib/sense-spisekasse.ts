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

function foldIngredientName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function isFedtToken(n: string): boolean {
  return /(olivenolie|rapsolie|kokosolie|smor\b|flode|mayonnaise|ghee|bearnaise)/.test(n)
}

function isSmagToken(n: string): boolean {
  return /(salt|peber|bouillon|tern|eddike|edikk|citron|lime|hvidl|ingefaer|sennep|honning|karry|paprika|chili|dild|persille|timian|oregano|basilikum|koriander|estragon|sojasauce|soja|mirin|balsam|sirup|fond|stock|krydder)/.test(
    n
  )
}

/** Stivelse / Håndfuld 4 — inkl. flertal «kartofler» (én f), som ikke matcher «kartoffel». */
function isStivelseToken(n: string): boolean {
  return /(kartoffel|kartofler|kartoffeler|kartoffelmos|\bris\b|pasta|spaghetti|penne|lasagne|couscous|bulgur|quinoa|perlespelt|hirse|polenta|nudel|brod\b|brot\b|wrap|tortilla|flatbrod|grod|havre|gryn)/.test(
    n
  )
}

function isProteinToken(n: string): boolean {
  return /(fisk|laks|torsk|kulmule|sej|makrel|reje|hummer|krabbe|kylling|kalkun|oksek|svine|flaesk|skinke|fars|bof|pølse|medister|lamm|tofu|aeg|skink|tun|bonne|linse|kikaert|halloumi|mozzarella|feta|parmesan|skyr|kvark|cottage)/.test(
    n
  )
}

/**
 * Én linjes Sense-spisekasse-rubrik ud fra navn (heuristik).
 * Rækkefølge: fedt → smag → stivelse → protein → grønt (1+2).
 */
export function classifySenseIngredientLine(name: string): SenseSpisekasseGroupTitle {
  const n = foldIngredientName(name)
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
