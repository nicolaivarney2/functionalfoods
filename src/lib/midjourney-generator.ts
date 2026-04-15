import OpenAI from 'openai'
import { normalizeDanishRecipeTitle } from '@/lib/recipe-title-format'
import { getOpenAIConfig } from '@/lib/openai-config'
import { flattenRecipeIngredientsForMj } from '@/lib/recipe-ingredients-flatten'

/** Flere ingredienser + mængder så MJ ser hvad der dominerer (fx spidskål i salat). */
const MJ_INGREDIENT_MAX = 14

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
  const baseSuffix =
    'served on a dark gray ceramic plate on a rustic dark textured matte surface, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3'

  const recipeForMj = flattenRecipeIngredientsForMj(recipe)

  if (!recipeForMj || !recipeForMj.title) {
    return {
      prompt: buildFinalPrompt('a well-composed home-cooked meal', baseSuffix),
      source: 'heuristic',
    }
  }

  const normalizedTitle = normalizeDanishRecipeTitle(String(recipeForMj.title))
  const ingredientsForPrompt = formatIngredientsForMjPrompt(recipeForMj.ingredients)
  const instructionsForPrompt = formatInstructionsForMjPrompt(recipeForMj.instructions)

  const apiKey = resolveOpenAIApiKey()
  if (!apiKey) {
    console.warn('Midjourney prompt: no OpenAI key — using heuristic dish description')
    return {
      prompt: buildFinalPrompt(
        heuristicEnglishFoodScene(normalizedTitle, ingredientsForPrompt.csv),
        baseSuffix
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
      prompt: buildFinalPrompt(finalPhrase, baseSuffix),
      source: 'openai',
    }
  } catch (error) {
    console.error('Error generating Midjourney prompt:', error)
    const heuristic = heuristicEnglishFoodScene(normalizedTitle, ingredientsForPrompt.csv)
    return {
      prompt: buildFinalPrompt(stripBannedMjPhrases(heuristic), baseSuffix),
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
        content: `You write ONE English phrase for Midjourney v6 food photography of the finished plated dish.

OUTPUT RULES (strict):
1. One flowing phrase, 24–55 words. Describe the finished food on the plate, not raw ingredients.
2. 100% English. Translate every Danish/Nordic word fully.
3. Mention the true centerpiece from the title and instructions. If the recipe is a fish dish, the fish must be named. If the recipe is a turkey dish, name turkey breast. If the recipe is hakkebøf, say minced beef patty / beef patty.
4. Use ingredient amounts to understand visual weight. Large-volume vegetables (for example cabbage, salad greens, potatoes, pasta, rice) should appear as major visible parts of the dish, not tiny garnish.
5. Do NOT mention low-visibility pantry items or cooking agents unless clearly visible in the finished dish. Usually omit olive oil, lemon juice, salt, pepper, garlic, and similar ingredients unless the instructions make them a visible sauce, dressing, glaze, or topping.
6. Do NOT output broken word lists. Use complete food phrases like "pan-fried plaice fillet with shredded pointed cabbage slaw and edamame" or "grilled turkey breast over a generous pointed cabbage and edamame salad with red bell pepper".
7. Do NOT add camera/meta words: no "overhead", "top-down", "photo", "hyperrealistic", "beautifully plated", "natural colors", or "sharp food detail". Those are added elsewhere.
8. No quotes. No markdown.`,
      },
      {
        role: 'user',
        content: `Recipe title: "${recipeTitle}"
Recipe description: "${recipeDescription || 'not listed'}"

Ingredients (amounts matter):
${ingredientsNumbered || 'not listed'}

Instructions preview:
${instructionsNumbered || 'not listed'}

Write the final plated dish phrase now.`,
      },
    ],
    max_tokens: 320,
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
    .replace(/\boverhead\b/gi, '')
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

/** Indre *…* = madbeskrivelse + fast stil — derefter servering/lys som før. */
function buildFinalPrompt(foodPhrase: string, baseSuffix: string): string {
  const clean = foodPhrase.replace(/\s+/g, ' ').trim()
  const style = 'natural colors, sharp food detail, beautifully plated'
  return `top-down hyperrealistic photo of *${clean}, ${style}*, ${baseSuffix}`
}

function stripBannedMjPhrases(s: string): string {
  return s
    .replace(/\bbeautifully plated\b/gi, '')
    .replace(/\bhyperrealistic\b/gi, '')
    .replace(/\btop-?down\b/gi, '')
    .replace(/\bnatural colors\b/gi, '')
    .replace(/\bsharp food detail\b/gi, '')
    .replace(/\bsteam(?:\s+rising)?\b/gi, '')
    .replace(/\s+/g, ' ')
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
        : 'seasoned home-cooked food'

  // Stil (natural colors, beautifully plated) sættes i buildFinalPrompt — kun mad her
  const scene = core
  return scene.length > 380 ? scene.slice(0, 377) + '...' : scene
}
