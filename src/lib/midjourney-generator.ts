import OpenAI from 'openai'
import { normalizeDanishRecipeTitle } from '@/lib/recipe-title-format'
import { getOpenAIConfig } from '@/lib/openai-config'
import { flattenRecipeIngredientsForMj } from '@/lib/recipe-ingredients-flatten'

/** Flere ingredienser + mængder så MJ ser hvad der dominerer (fx spidskål i salat). */
const MJ_INGREDIENT_MAX = 14

/** Fast Midjourney-wrapper — realistisk 90° flatlay uden AI-glans. */
const MJ_PREFIX = 'Flatlay photograph from directly above of'
const MJ_STYLE =
  'editorial food photography, slight imperfections, candid shot, authentic homecooked meal look, matte lighting, real life texture'
const MJ_PARAMS =
  '--ar 4:3 --style raw --no 3d render, glossy, plastic, tilt, side angle, close-up, depth of field, blur, studio lights, fake look, hyperrealistic, commercial lighting, text, macro, bokeh, golden hour, sunlight, sunbeams, dramatic lighting'

/** Tallerken + bordflade varierer pr. opskrift, så billederne ikke ser identiske ud. */
const MJ_TABLE_SETTINGS = [
  'Dark grey matte ceramic plate on a textured slate surface',
  'Off-white stoneware plate with uneven glaze on a weathered oak table',
  'Deep green speckled ceramic plate on a pale concrete worktop',
  'Plain white porcelain plate with a thin rim on a dark walnut table',
  'Sand-coloured handmade ceramic plate on a wrinkled linen tablecloth',
  'Charcoal stoneware shallow bowl on a scratched grey kitchen worktop',
  'Warm terracotta-toned plate on a raw pine board',
  'Pale blue-grey ceramic plate on a worn white-painted wooden table',
]

const MJ_LIGHTS = [
  'Soft natural window light',
  'Even soft daylight from a north-facing window',
  'Neutral indoor daylight, even and unobtrusive',
  'Soft overcast indoor light with no directional sun',
]

/** Neutrale ting ved siden af tallerkenen — aldrig krydderi/peberkværn. */
const MJ_NEUTRAL_PROPS = [
  'a crumpled beige linen napkin',
  'a folded grey cotton napkin with a fork on top',
  'a worn stainless steel fork and knife placed loosely',
  'a used cloth napkin with a knife resting at an angle',
  'a half-full glass of water at the edge of the frame',
  'an empty ceramic side plate partly in frame',
  'a small wooden serving spoon',
  'a stack of two small side plates at the edge of the frame',
  'a striped tea towel bunched up at the edge',
  'a wooden cutting board partly in frame',
]

/**
 * Ting der hører til retten. Mønstrene matches mod ASCII-translittereret tekst
 * (æ→ae, ø→oe, å→aa), så \b virker på danske ord.
 */
const MJ_RECIPE_PROPS: { match: RegExp; prop: string }[] = [
  { match: /\b(citron|lemon)/, prop: 'two lemon wedges on the surface' },
  { match: /\blimes?\b/, prop: 'a halved lime on the surface' },
  { match: /\b(persille|parsley)/, prop: 'a few sprigs of fresh parsley on the surface' },
  { match: /\b(basilikum|basil)/, prop: 'a small bunch of fresh basil on the surface' },
  { match: /\b(koriander|coriander|cilantro)/, prop: 'a few loose coriander leaves on the surface' },
  { match: /\b(dild|dill)/, prop: 'a small bunch of fresh dill on the surface' },
  { match: /\b(mynte|mint)/, prop: 'a few fresh mint leaves on the surface' },
  { match: /\b(timian|thyme|rosmarin|rosemary|oregano)/, prop: 'a sprig of fresh herbs on the surface' },
  { match: /\b(chili|jalape)/, prop: 'one whole fresh chili on the surface' },
  { match: /\b(cherrytomat|tomat|tomato)/, prop: 'two loose cherry tomatoes on the surface' },
  { match: /\boliven(?!olie)|\bolives?\b/, prop: 'a few olives in a tiny dish' },
  { match: /\b(parmesan|revet ost|grated cheese)/, prop: 'a small bowl of grated cheese' },
  { match: /\bfeta/, prop: 'a small piece of feta on a scrap of baking paper' },
  { match: /\b(yoghurt|yogurt|skyr|creme fraiche|cremefraiche|tzatziki|hummus)/, prop: 'a small bowl of yogurt dressing' },
  { match: /\bpesto/, prop: 'a small bowl of pesto with a spoon in it' },
  { match: /\b(dressing|vinaigrette)/, prop: 'a small jug of dressing' },
  { match: /\b(soja|soy sauce|sesam)/, prop: 'a small dish of soy sauce' },
  { match: /\b(rugbroed|broed|bread|flute|tortilla|pita|naan)/, prop: 'a slice of bread on a small wooden board' },
  { match: /noedder\b|\bmandler\b|\b(walnut|almond|nuts|cashew)/, prop: 'a small handful of nuts on the surface' },
  { match: /\b(spinat|spinach|rucola|rocket|salatblade)/, prop: 'a few loose green leaves on the surface' },
  { match: /\bavocado/, prop: 'half an avocado on the surface' },
  { match: /\b(agurk|cucumber)/, prop: 'a couple of cucumber slices on the surface' },
  { match: /\b(gulerod|guleroedder|carrot)/, prop: 'one unpeeled carrot on the surface' },
  { match: /(?<!hvid)loeg\b|\b(red onion|onion|skalotte|shallot)/, prop: 'half a red onion on a small board' },
  { match: /\b(hvidloeg|garlic)/, prop: 'a whole garlic bulb on the surface' },
  { match: /\b(kartof|potato)/, prop: 'two unpeeled potatoes on the surface' },
  { match: /(?<!g)ris\b|\b(rice|risotto)/, prop: 'a small bowl of extra rice' },
  { match: /\b(pasta|spaghetti|nudler|noodle)/, prop: 'a small bowl of extra pasta' },
  { match: /\b(boenner|beans|kikaerter|chickpea|linser|lentil)/, prop: 'a small bowl of beans' },
  { match: /\baeg\b|\begg/, prop: 'two whole eggs on the surface' },
  { match: /\b(smoer|butter)/, prop: 'a small dish of butter' },
  { match: /\b(honning|honey)/, prop: 'a small jar of honey with a spoon beside it' },
  { match: /baer\b|\b(blueberr|berries|berry)/, prop: 'a small bowl of fresh berries' },
]

function formatIngredientsForMjPrompt(ingredients: unknown): { numbered: string; csv: string } {
  if (!Array.isArray(ingredients)) return { numbered: '', csv: '' }
  const lines: string[] = []
  const names: string[] = []
  for (let i = 0; i < ingredients.length && i < MJ_INGREDIENT_MAX; i++) {
    const ing = ingredients[i] as { name?: string; amount?: number; unit?: string }
    const name = (ing?.name && String(ing.name).trim()) || ''
    if (!name) continue
    const amount = ing?.amount != null && Number.isFinite(Number(ing.amount)) ? Number(ing.amount) : ''
    const unit = (ing?.unit && String(ing.unit).trim()) || ''
    const parts = [amount, unit].filter(Boolean).join(' ')
    lines.push(parts ? `${i + 1}. ${parts} ${name}` : `${i + 1}. ${name}`)
    names.push(name)
  }
  return {
    numbered: lines.join('\n'),
    csv: names.join(', '),
  }
}

function formatInstructionsForMjPrompt(instructions: unknown): string {
  if (!Array.isArray(instructions)) return ''
  return instructions
    .slice(0, 4)
    .map((step, index) => {
      const raw =
        typeof step === 'string'
          ? step
          : typeof (step as { instruction?: unknown })?.instruction === 'string'
            ? String((step as { instruction?: unknown }).instruction)
            : ''
      const clean = raw.replace(/\s+/g, ' ').trim()
      if (!clean) return ''
      return `${index + 1}. ${clean}`
    })
    .filter(Boolean)
    .join('\n')
}

/**
 * Centralized Midjourney prompt: English-only food description (Midjourney forstår bedst ensartet engelsk).
 * V6+ realistisk flatlay — ingen hyperrealistic/beautifully plated-hype.
 */
export type MidjourneyPromptMeta = {
  prompt: string
  source: 'openai' | 'heuristic'
  error?: string
}

export async function generateMidjourneyPrompt(recipe: any): Promise<string> {
  const result = await generateMidjourneyPromptWithMeta(recipe)
  return result.prompt
}

export async function generateMidjourneyPromptWithMeta(recipe: any): Promise<MidjourneyPromptMeta> {
  const recipeForMj = flattenRecipeIngredientsForMj(recipe)

  if (!recipeForMj || !recipeForMj.title) {
    return {
      prompt: buildFinalPrompt('a simple home-cooked plated meal'),
      source: 'heuristic',
    }
  }

  const normalizedTitle = normalizeDanishRecipeTitle(String(recipeForMj.title))
  const ingredientsForPrompt = formatIngredientsForMjPrompt(recipeForMj.ingredients)
  const instructionsForPrompt = formatInstructionsForMjPrompt(recipeForMj.instructions)
  const scene: MjSceneInput = { seedKey: normalizedTitle, ingredientsCsv: ingredientsForPrompt.csv }

  const apiKey = resolveOpenAIApiKey()
  if (!apiKey) {
    console.warn('Midjourney prompt: no OpenAI key — using heuristic dish description')
    return {
      prompt: buildFinalPrompt(
        heuristicEnglishFoodScene(normalizedTitle, ingredientsForPrompt.csv),
        scene
      ),
      source: 'heuristic',
      error: 'No OpenAI API key available for Midjourney prompt generation',
    }
  }

  const openai = new OpenAI({ apiKey })

  try {
    const finalPhrase = await composeMidjourneyFoodPhrase(
      openai,
      normalizedTitle,
      typeof recipeForMj.description === 'string' ? recipeForMj.description : '',
      ingredientsForPrompt.numbered,
      instructionsForPrompt
    )
    return {
      prompt: buildFinalPrompt(finalPhrase, scene),
      source: 'openai',
    }
  } catch (error) {
    console.error('Error generating Midjourney prompt:', error)
    const heuristic = heuristicEnglishFoodScene(normalizedTitle, ingredientsForPrompt.csv)
    return {
      prompt: buildFinalPrompt(stripBannedMjPhrases(heuristic), scene),
      source: 'heuristic',
      error: error instanceof Error ? error.message : 'Unknown Midjourney prompt error',
    }
  }
}

async function composeMidjourneyFoodPhrase(
  openai: OpenAI,
  recipeTitle: string,
  recipeDescription: string,
  ingredientsNumbered: string,
  instructionsNumbered: string
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You write ONE plain English food phrase for Midjourney v6+ flatlay photography of the finished plated dish.

OUTPUT RULES (strict):
1. One flowing phrase, 18–40 words. Name only what is visibly on the plate.
2. 100% English. Translate every Danish/Nordic word fully.
3. Mention the true centerpiece from the title and instructions. If fish → name the fish. If turkey → turkey breast. If hakkebøf → minced beef patty.
4. Use ingredient amounts for visual weight. Large-volume vegetables (cabbage, salad, potatoes, pasta, rice) should appear as major visible parts — not tiny garnish.
5. Omit low-visibility pantry items unless they form a visible sauce, glaze, or topping (usually skip olive oil, lemon juice, salt, pepper, garlic alone).
6. STRIP ALL marketing / AI hype words. Never use: juicy, tender, vibrant, delicious, satisfying, perfect for, colorful, mouthwatering, gourmet, restaurant-quality, beautifully, crispy golden, melt-in-your-mouth, family meal, weeknight, busy.
7. Do NOT output broken word lists. Prefer plain food phrases like "chicken breast with ginger garlic glaze over whole grain noodles, broccoli and edamame" or "two spinach feta chicken patties with a side salad of cherry tomatoes and cucumber".
8. Do NOT add camera/meta words: no flatlay, overhead, top-down, photo, hyperrealistic, high detail, sharp, beautifully plated, natural colors. Those are added elsewhere.
9. Do NOT describe the surroundings: no plate colour, table, surface, napkin, cutlery, glass, or bowls of seasoning next to the dish. Those are added elsewhere.
10. No quotes. No markdown. No lifestyle story ("perfect for busy weeknights").`,
      },
      {
        role: 'user',
        content: `Recipe title: "${recipeTitle}"
Recipe description: "${recipeDescription || 'not listed'}"

Ingredients (amounts matter):
${ingredientsNumbered || 'not listed'}

Instructions preview:
${instructionsNumbered || 'not listed'}

Write the plain plated dish phrase now.`,
      },
    ],
    max_tokens: 220,
    temperature: 0.2,
  })

  let out = completion.choices[0]?.message?.content?.trim().replace(/^["']|["']$/g, '') || ''
  out = stripBannedMjPhrases(out)
  out = stripCameraAndMetaWords(out)
  if (out.length >= 10) return out
  throw new Error('Midjourney phrase too short')
}

/** Fjerner ord der ofte dublerer ydre MJ-wrapper eller skaber støj. */
function stripCameraAndMetaWords(s: string): string {
  return s
    .replace(/\boverhead\s+view\s+of\s+a\s+plated\s+dish\s+featuring\b/gi, '')
    .replace(/\boverhead\s+view\s+of\b/gi, '')
    .replace(/\bflatlay\s+photograph\s+from\s+directly\s+above\s+of\b/gi, '')
    .replace(/\b90-degree\s+overhead\s+flatlay\s+photo\s+of\b/gi, '')
    .replace(/\boverhead\b/gi, '')
    .replace(/\bflatlay\b/gi, '')
    .replace(/\bplated\s+dish\s+featuring\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resolveOpenAIApiKey(): string | null {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return process.env.OPENAI_API_KEY.trim()
  }
  const cfg = getOpenAIConfig()
  return cfg?.apiKey?.trim() || null
}

export type MjSceneInput = {
  /** Stabil nøgle (typisk titlen) så samme opskrift altid får samme opsætning. */
  seedKey: string
  ingredientsCsv: string
}

/** FNV-1a — deterministisk variation pr. opskrift uden at gemme state. */
function sceneHash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickVariant<T>(pool: T[], seedKey: string, salt: string): T {
  return pool[sceneHash(`${salt}|${seedKey}`) % pool.length]
}

/** æ/ø/å → ae/oe/aa og alt andet end bogstaver/tal til mellemrum, så \b-mønstre virker. */
function toAsciiWords(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Vælger én ting der hører til retten, fx citronskiver eller en skål dressing. */
function pickRecipeProp(scene: MjSceneInput): string | null {
  const haystack = toAsciiWords(`${scene.seedKey} ${scene.ingredientsCsv}`)
  const matches = MJ_RECIPE_PROPS.filter((entry) => entry.match.test(haystack)).map((entry) => entry.prop)
  if (matches.length === 0) return null
  return pickVariant(matches, scene.seedKey, 'recipe-prop')
}

/** 1 neutral ting + 1 ting fra opskriften (eller 2 neutrale hvis intet matcher). */
function buildSideProps(scene: MjSceneInput | undefined): string {
  if (!scene?.seedKey) return MJ_NEUTRAL_PROPS[0]

  const recipeProp = pickRecipeProp(scene)
  // Undgå fx "cutting board" + "bread on a small wooden board" i samme billede
  const neutralPool = recipeProp?.includes('board')
    ? MJ_NEUTRAL_PROPS.filter((prop) => !prop.includes('board'))
    : MJ_NEUTRAL_PROPS
  const neutral = pickVariant(neutralPool, scene.seedKey, 'neutral-prop')
  if (recipeProp) return `${neutral} and ${recipeProp}`

  const rest = neutralPool.filter((prop) => prop !== neutral)
  return `${neutral} and ${pickVariant(rest, scene.seedKey, 'neutral-prop-2')}`
}

/**
 * Samler endelig Midjourney-prompt:
 * Flatlay above + plain food + props ved siden af + matte setting + --style raw + --no …
 * Tallerken, lys og props varierer pr. opskrift, men er ens ved regenerering af samme opskrift.
 */
function buildFinalPrompt(foodPhrase: string, scene?: MjSceneInput): string {
  const clean = stripBannedMjPhrases(foodPhrase.replace(/\s+/g, ' ').trim())
  const seedKey = scene?.seedKey || clean
  const table = pickVariant(MJ_TABLE_SETTINGS, seedKey, 'table')
  const light = pickVariant(MJ_LIGHTS, seedKey, 'light')
  return `${MJ_PREFIX} ${clean}. Next to the plate: ${buildSideProps(scene)}. ${table}. ${light}, ${MJ_STYLE} ${MJ_PARAMS}`
}

function stripBannedMjPhrases(s: string): string {
  return s
    .replace(/\bbeautifully plated\b/gi, '')
    .replace(/\bhyperrealistic\b/gi, '')
    .replace(/\btop-?down\b/gi, '')
    .replace(/\bnatural colors?\b/gi, '')
    .replace(/\bsharp food detail\b/gi, '')
    .replace(/\bhigh detail\b/gi, '')
    .replace(/\bsteam(?:\s+rising)?\b/gi, '')
    .replace(/\bjuicy\b/gi, '')
    .replace(/\btender\b/gi, '')
    .replace(/\bvibrant\b/gi, '')
    .replace(/\bdelicious\b/gi, '')
    .replace(/\bsatisfying\b/gi, '')
    .replace(/\bmouthwatering\b/gi, '')
    .replace(/\bgourmet\b/gi, '')
    .replace(/\bcolorful\b/gi, '')
    .replace(/\bperfect for\b[^.!,]*/gi, '')
    .replace(/\bcreating a\b[^.!,]*/gi, '')
    .replace(/\bdelightful balance[^.!,]*/gi, '')
    .replace(/\bfamily meal\b/gi, '')
    .replace(/\bbusy weeknights?\b/gi, '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim()
}

const SKIP = new Set([
  'og',
  'eller',
  'med',
  'uden',
  'fra',
  'til',
  'på',
  'i',
  'en',
  'et',
  'af',
  'som',
  'der',
  'det',
  'den',
  'stk',
  'st',
  'spsk',
  'tsk',
  'dl',
  'ml',
  'g',
  'kg',
  // Undgå løse danske tillægsord der giver forkerte MJ-fortolkninger (fx "hakket" + "beef")
  'hakket',
  'groft',
  'fint',
  'salt',
  'peber',
])

/**
 * Sidste udvej uden brugbar model: kendte danske madord → engelsk, plus rå titelord der ligner engelsk.
 */
function heuristicEnglishFoodScene(title: string, ingredientsCsv: string): string {
  const compound: [RegExp, string][] = [
    [/hakkebøf(?:er)?|hakket\s+bøf|hakkede\s+bøffer/gi, 'mincedbeefpatty'],
    [/hakket\s+oksekød|oksekød\s*,?\s*hakket/gi, 'mincedbeef'],
    [/fetaost/gi, 'fetacheese'],
    [/rugkerner/gi, 'ryegrains'],
    [/spinatsalat/gi, 'spinachsalad'],
    [/spidskål/gi, 'pointedcabbage'],
    [/kalkunbryst/gi, 'turkeybreast'],
    [/edamamebønner|edamame/gi, 'edamame'],
    [/persille/gi, 'parsley'],
    [/citronsaft/gi, 'lemonjuice'],
    [/rød\s*peberfrugt|peberfrugt/gi, 'bellpepper'],
    [/kyllingebryst/gi, 'chickenbreast'],
    [/hvidløgsfed|hvidløg/gi, 'garlic'],
    [/olivenolie/gi, 'oliveoil'],
    [/fuldkornspasta|pastaskruer/gi, 'whole wheat pasta'],
    [/ovnbagte|ovnbagt/gi, 'roasted'],
    [/rejericeotto/gi, 'shrimprisotto'],
    [/citron(?:saft)?/gi, 'lemon'],
    [/avocado[\s-]*dressing/gi, 'avocadodressing'],
  ]

  const words: Record<string, string> = {
    kylling: 'chicken',
    kalkun: 'turkey',
    laks: 'salmon',
    tun: 'tuna',
    torsk: 'cod',
    rejer: 'shrimp',
    oksekød: 'beef',
    svinekød: 'pork',
    lam: 'lamb',
    bacon: 'bacon',
    æg: 'eggs',
    pasta: 'pasta',
    ris: 'rice',
    kartofler: 'potatoes',
    kartoffel: 'potato',
    broccoli: 'broccoli',
    spinat: 'spinach',
    salat: 'salad',
    avocado: 'avocado',
    tomat: 'tomato',
    tomater: 'tomatoes',
    løg: 'onion',
    rødløg: 'red onion',
    hvidløg: 'garlic',
    feta: 'feta',
    fetaost: 'feta cheese',
    ost: 'cheese',
    skyr: 'skyr',
    fløde: 'cream',
    smør: 'butter',
    oliven: 'olives',
    quinoa: 'quinoa',
    bulgur: 'bulgur',
    couscous: 'couscous',
    bønner: 'beans',
    linser: 'lentils',
    kikærter: 'chickpeas',
    nødder: 'nuts',
    mandler: 'almonds',
    valnødder: 'walnuts',
    suppe: 'soup',
    gryderet: 'stew',
    wok: 'wok',
    burger: 'burger',
    pizza: 'pizza',
    lasagne: 'lasagna',
    taco: 'tacos',
    wrap: 'wrap',
    bowl: 'bowl',
    omelet: 'omelette',
    grillet: 'grilled',
    stegt: 'pan-fried',
    dampet: 'steamed',
    kogt: 'boiled',
    cremet: 'creamy',
    krydret: 'spiced',
    frisk: 'fresh',
    lun: 'warm',
    kold: 'cold',
    dressing: 'dressing',
    sauce: 'sauce',
    pesto: 'pesto',
    karry: 'curry',
    chili: 'chili',
    mexicansk: 'Mexican',
    thai: 'Thai',
    indisk: 'Indian',
    italiensk: 'Italian',
    asiatisk: 'Asian',
    keto: 'keto-style',
    blomkål: 'cauliflower',
    squash: 'zucchini',
    gulerod: 'carrot',
    gulerødder: 'carrots',
    ærter: 'peas',
    majs: 'corn',
    risotto: 'risotto',
    bellpepper: 'bell pepper',
    oliveoil: 'olive oil',
    lemonjuice: 'lemon juice',
    turkeybreast: 'turkey breast',
    chickenbreast: 'chicken breast',
    fetacheese: 'feta cheese',
    ryegrains: 'rye grains',
    spinachsalad: 'spinach salad',
    pointedcabbage: 'pointed cabbage',
    mincedbeef: 'minced beef',
    mincedbeefpatty: 'minced beef patty',
    avocadodressing: 'avocado dressing',
    shrimprisotto: 'shrimp risotto',
  }

  let blob = `${title} ${ingredientsCsv}`.toLowerCase()
  for (const [re, en] of compound) {
    blob = blob.replace(re, ` ${en} `)
  }

  const rawTokens = blob.split(/[^a-zæøåäöü0-9]+/i).filter(Boolean)
  const out: string[] = []
  for (const t of rawTokens) {
    if (SKIP.has(t) || /^\d+$/.test(t)) continue
    const mapped = words[t]
    if (mapped) {
      out.push(mapped)
      continue
    }
    // Engelske låneord i titel (undgå at sende rester af dansk videre)
    if (t.length >= 4 && /^[a-z]+$/i.test(t) && /[aeiouy]/i.test(t)) {
      out.push(t)
    }
  }

  const uniq = [...new Set(out)].slice(0, 14)
  const strippedTitle = title.replace(/[0-9]+[.,]?\d*\s*(g|kg|ml|l|dl|stk|st|spsk|tsk|tesk)\s*/gi, '').trim()

  const core =
    uniq.length >= 2
      ? uniq.join(', ')
      : strippedTitle.length > 0
        ? strippedTitle
        : 'simple home-cooked plated food'

  return core.length > 380 ? core.slice(0, 377) + '...' : core
}
