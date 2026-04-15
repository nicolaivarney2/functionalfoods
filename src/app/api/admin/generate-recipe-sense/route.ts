import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
import { generateMidjourneyPromptWithMeta } from '@/lib/midjourney-generator'
import { normalizeDanishRecipeTitle } from '@/lib/recipe-title-format'
import { buildRecipeVariationPrompt } from '@/lib/recipe-generation-diversity'
import {
  normalizeAiRecipeIngredients,
  type AiIngredientInput,
} from '@/lib/ai-recipe-ingredient-normalize'
import type { Ingredient, IngredientGroup } from '@/types/recipe'
import {
  SENSE_SPISEKASSE_GROUP_TITLES,
  buildIngredientGroupsWithIds,
  inferSenseIngredientGroupsFromFlat,
  orderSenseGroupsFromAi,
  senseGroupSizesMatchFlatLength,
  type SenseGroupFromAi,
} from '@/lib/sense-spisekasse'

interface ExistingRecipe {
  id: string
  title: string
  description: string
  dietaryCategories?: string[]
  ingredients?: Array<{ name?: string | null } | string>
}

/** Stivelse i Sense = 0–1 håndfuld pr. person — styr prompten uden at tælle kalorier. */
export type SenseStivelseNiveau = 'ingen' | 'standard' | 'ekstra'

interface SenseParameters {
  maaltid?: 'morgenmad' | 'frokost' | 'aftensmad' | 'snacks'
  stivelse?: SenseStivelseNiveau
  recipeType?: string
  inspiration?: string
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
  parameters?: SenseParameters
}

export async function POST(request: NextRequest) {
  try {
    const { categoryName, existingRecipes, parameters }: GenerateRecipeRequest = await request.json()

    if (!categoryName) {
      return NextResponse.json({ success: false, error: 'categoryName is required' }, { status: 400 })
    }

    console.log(`🌿 Generating Sense recipe: ${categoryName}`)

    const openaiConfig = getOpenAIConfig()
    if (!openaiConfig || !openaiConfig.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'OpenAI API key not configured',
          details: 'Please configure OpenAI API key in admin settings',
        },
        { status: 500 }
      )
    }

    const params: SenseParameters = parameters || {
      maaltid: 'aftensmad',
      stivelse: 'standard',
      recipeType: '',
      inspiration: '',
    }
    const resolvedMaaltid = params.maaltid ?? 'aftensmad'
    const existingTitles = existingRecipes.map((r) => r.title.toLowerCase())
    const systemPrompt = createSenseSystemPrompt(existingTitles, resolvedMaaltid)
    const parameterInstructions = buildSenseParameterInstructions(params)
    const variationPrompt = buildRecipeVariationPrompt({
      niche: 'sense',
      existingRecipes,
      mealType: params.maaltid,
      requestedRecipeType: params.recipeType,
      inspiration: params.inspiration,
    })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generer én ny Sense-opskrift til hverdagsbrug. Den skal være unik, realistisk og følge Sense-spisekassen (håndfulde — ikke kalorietælling). Krydderier og køkkenstil må frit hente inspiration fra hele verden, så længe Sense-balancen overholdes.

${senseMealCarbBlock(resolvedMaaltid)}

${parameterInstructions}
${variationPrompt}`,
          },
        ],
        temperature: 0.88,
        max_tokens: 2500,
      }),
    })

    if (!response.ok) {
      let errorPayload: Record<string, unknown> = {}
      try {
        errorPayload = (await response.json()) as Record<string, unknown>
      } catch {
        // svar er ikke JSON
      }
      const err = (errorPayload.error as { message?: string; type?: string; code?: string } | undefined) || {}
      const msg =
        typeof err.message === 'string' && err.message.trim()
          ? err.message.trim()
          : response.statusText || 'Ukendt fejl fra OpenAI'
      const code = typeof err.code === 'string' ? err.code : ''
      const type = typeof err.type === 'string' ? err.type : ''
      const lower = msg.toLowerCase()
      const isQuota =
        code === 'insufficient_quota' ||
        type === 'insufficient_quota' ||
        lower.includes('exceeded your current quota') ||
        lower.includes('check your plan and billing')

      const userError = isQuota
        ? `OpenAI: Forbrugsgrænse eller fakturering — tjek betalingsmetode og billing på platform.openai.com. Teknisk: ${msg}`
        : `OpenAI: ${msg}`

      console.error(`OpenAI chat/completions ${response.status}:`, userError)

      return NextResponse.json(
        {
          success: false,
          error: userError,
          details: msg,
          openaiCode: code || undefined,
        },
        { status: isQuota ? 503 : response.status >= 400 && response.status < 600 ? response.status : 502 }
      )
    }

    const completion = await response.json()
    const recipeContent = completion.choices[0]?.message?.content
    if (!recipeContent) {
      throw new Error('No recipe content generated')
    }

    const recipe = parseGeneratedRecipe(recipeContent)
    console.log(`✅ Generated Sense recipe: ${recipe.title}`)

    let aiTips = ''
    try {
      const tipsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/generate-tips`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: normalizeDanishRecipeTitle(recipe.title),
            description: recipe.description,
            difficulty: recipe.difficulty,
            totalTime: recipe.prepTime + recipe.cookTime,
            dietaryCategories: recipe.dietaryCategories,
          }),
        }
      )
      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json()
        aiTips = tipsData.tips || ''
      }
    } catch {
      // valgfrit
    }

    let midjourneyPrompt = ''
    let midjourneyPromptSource: 'openai' | 'heuristic' = 'heuristic'
    let midjourneyPromptError: string | null = null
    try {
      const mj = await generateMidjourneyPromptWithMeta(recipe)
      midjourneyPrompt = mj.prompt || ''
      midjourneyPromptSource = mj.source
      midjourneyPromptError = mj.error || null
    } catch (mjErr) {
      midjourneyPromptError =
        mjErr instanceof Error ? mjErr.message : 'Ukendt fejl ved Midjourney-prompt'
      console.error('Sense: Midjourney prompt fejlede:', mjErr)
    }

    return NextResponse.json({
      success: true,
      recipe,
      aiTips,
      midjourneyPrompt,
      midjourneyPromptSource,
      midjourneyPromptError,
    })
  } catch (error) {
    console.error('Error generating Sense recipe:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: message.includes('OpenAI') ? message : `Kunne ikke generere Sense-opskrift: ${message}`,
        details: message,
      },
      { status: 500 }
    )
  }
}

/**
 * Når brugeren vælger en klassisk RET-TYPE, skal output matche almindelig forventning
 * (fx lasagne = pasta/plader — ikke kartoffellag solgt som «lasagne»).
 */
function classicRetStructureHints(
  recipeTypeRaw: string | undefined,
  stivelse: SenseStivelseNiveau | undefined
): string[] {
  const raw = (recipeTypeRaw || '').trim().toLowerCase()
  if (!raw) return []

  const hints: string[] = []

  if (raw.includes('lasagn')) {
    hints.push(
      'LASAGNE: Brug **lasagneplader** (tørre eller friske, fuldkorn tilladt) i **Håndfuld 4** med konkret gram pr. portion. Tilføj ost/bechamel eller revet ost til lag som det hører til. Du må **ikke** lave «lasagne» kun med kartoffel-/squashlag som erstatning for pasta uden at **titel og beskrivelse** tydeligt siger fx kartoffel- eller grøntsagslasagne.'
    )
    if (stivelse === 'ingen') {
      hints.push(
        'STIVELSE «ingen» + lasagne: Enten meget tynde grøntsagslag (skriv «uden pasta/light» i titel) eller accepter en lille mængde fuldkornsplader — men **aldrig** kalde retten bare «lasagne» hvis der slet ingen lasagneplader er.'
      )
    }
  }

  if (raw.includes('carbonara')) {
    hints.push(
      'CARBONARA: Skal have **pasta** (Håndfuld 4) i realistisk mængde — ikke kartoffel eller «lag» uden pasta medmindre titlen siger noget andet.'
    )
  }

  if (raw.includes('pizza')) {
    hints.push(
      'PIZZA: Skal have en **dejbund** (eller pitabrød/tortilla som bund hvis det er angivet) med mængde — ikke en salat uden bund kaldet pizza.'
    )
  }

  if (raw.includes('burger')) {
    hints.push(
      'BURGER: Skal have **burgerbolle** (brød) og **patty/bøf** med mængder — ikke kun salat uden bolle.'
    )
  }

  if (/(^|\s)(pasta|spaghetti|penne|tagliatelle|fettuccine|ravioli|tortellini)(\s|$)/.test(raw) && !raw.includes('carbonara')) {
    hints.push(
      'PASTA-RET: Angiv pastatype og mængde i **Håndfuld 4** (skriv om det er tør eller kogt vægt).'
    )
  }

  if (raw.includes('risotto')) {
    hints.push('RISOTTO: Skal have **ris** (Håndfuld 4) som bærende stivelse — typisk arborio/carnaroli eller tilsvarende, med mængde.')
  }

  if (raw.includes('taco') || raw.includes('wrap')) {
    hints.push(
      'TACO/WRAP: Skal have **tortilla eller taco-skal** (Håndfuld 4 eller som angivet) med mængde — ikke kun fyld uden skal.'
    )
  }

  return hints
}

function senseMealCarbBlock(maaltid: string): string {
  if (maaltid === 'aftensmad') {
    return `AFTENSMAD (Sense): Måltidet skal kunne bygges som spisekasse — grønt som base, tydelig proteinkilde, én stivelseskilde med passende mængde (kartoffel, ris, pasta, brød …), og fedt fordelt (olie/smør/sovs).`
  }
  if (maaltid === 'morgenmad') {
    return `MORGENMAD (Sense): Fx grød, rugbrød, æg, skyr — med frugt/bær eller pålæg i mængder der passer til Sense (ingen kalorietabel i teksten).`
  }
  if (maaltid === 'frokost') {
    return `FROKOST (Sense): Fx madpakke, rugbrød, suppe med brød, salat med protein — stadig tanke om håndfulde og mæthed.`
  }
  return `SNACK (Sense): Lille måltid der mætter (protein + lidt frugt/grønt), ikke en dessert-cocktail af sukker.`
}

function buildSenseParameterInstructions(params: SenseParameters): string {
  const lines: string[] = []

  if (params.maaltid) {
    lines.push(`MÅLTID: Opskriften skal fungere som ${params.maaltid}.`)
  }

  const st = params.stivelse ?? 'standard'
  if (st === 'ingen') {
    lines.push(
      'STIVELSE: Minimal stivelse (0 håndfuld) — **mæt med ekstra grønt** og evt. lidt frugt; undgå at gøre bælgfrugt til "ersatz-stivelse" hver gang. Stadig ikke keto.'
    )
  } else if (st === 'ekstra') {
    lines.push(
      'STIVELSE: Brug en lidt mere generøs stivelsesdel end minimum (stadig inden for fornuftig Sense — fx større kartoffelportion eller ekstra brød), målrettet sultne dage eller motion.'
    )
  } else {
    lines.push(
      'STIVELSE: Standard Sense — ca. 0–1 håndfuld stivelse/frugt pr. person afhængigt af måltid; skriv mængder i gram så det er tydeligt.'
    )
  }

  if (params.recipeType?.trim()) {
    const rt = params.recipeType.trim()
    lines.push(`RET-TYPE: Lav en konkret ${rt} (ikke bare generisk "tallerken").`)
    for (const hint of classicRetStructureHints(rt, st)) {
      lines.push(hint)
    }
  }
  if (params.inspiration?.trim()) {
    lines.push(`INSPIRATION: "${params.inspiration.trim()}" — brug retningen uden at kopiere en kendt kogebog 1:1.`)
  }

  return lines.length ? `PARAMETRE:\n${lines.map((l) => `- ${l}`).join('\n')}\n\n` : ''
}

function createSenseSystemPrompt(existingTitles: string[], maaltid: string): string {
  const isAftensmad = maaltid === 'aftensmad'

  const variationBlock = isAftensmad
    ? `VARIATION (Sense — aftensmad):
- Varier proteinet (kylling, fisk, oksekød, svinekød, fars, æg …). Brug bælgfrugt eller tofu som hovedprotein når det passer til retten — ikke som fast skabelon i hver ret.
- Klassiske retnavne (lasagne, pizza, carbonara …): **bevar definerende ingredienser** (lasagneplader, pizzadej, pasta …) i passende Sense-mængder — undgå «kreativ» erstatning uden tydelig titel.
- Når der hører stivelse til måltidet: kartoffel, ris, pasta, brød, couscous, tortilla osv. i passende mængde; varier mellem ovn, pande, gryde og tallerken.
- Smag: karry, harissa, soja-ingefær, chipotle, tahin-citrus, thai-basilikum, jerk (mild), gochujang (mild) osv. er velkomment når Sense-balancen stadig er tydelig.
- **Undgå fast «honning + dijonsennep + citron + pandestegning»** som standardglace i hver ret — brug det kun når retten naturligt er honey-mustard; ellers vælg anden smagsbund (tomat, karry, yoghurt, eddike, kapers, urter …).
- Skift mellem ovn, pande, gryde og kogt tallerken så retterne ikke ligner hinanden for meget.`
    : `VARIATION (Sense):
- Hold måltidet enkelt og passende til tidspunktet (morgen/frokost/snack).
- Undgå tunge aftensmads-retter som morgenmad.`

  return `Du er diætist/kostvejleder og kok med dyb forståelse for **Sense** (Suzy Wengels metode): portionsforståelse med **hænderne**, **mæthed**, **2–3 måltider** om dagen, **ingen kalorietælling** i opskriftsteksten, og **ingen forbudte fødevarer** som gimmick.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 12).map((title) => `- ${title}`).join('\n')}

SENSE — KERNE (forklar kort i beskrivelsen med enkle ord, ikke som regelsæt):
1) **Grøntsager (ikke-stivelsesholdige):** ca. 1–2 håndfulde pr. person — fylde, fibre, smag (varier løg, rodfrugt, kål, tomater, salat …).
2) **Protein (håndfuld 3):** ca. 1 håndfuld pr. person — kød, fisk, æg eller magert mejeri efter hvad der passer til retten; tofu og bælgfrugt når det giver naturlig mening i retten.
3) **Stivelse eller frugt:** ca. 0–1 håndfuld pr. person (juster efter måltid; aftensmad kan have kartoffel/ris/pasta/brød i passende mængde).
4) **Fedt:** ca. 1–3 spsk pr. person totalt (olie, smør, dressing, ost, nødder … fordelt i retten).

VIKTIGT — DET HER ER IKKE:
- Ikke keto eller "max 20 g kulhydrat".
- Ikke "hjerne-kost", kognitiv boost, neuro-nudging eller lignende vinkel.
- Ikke ultratræningsbodybuilder-portioner — Sense er hverdagsbalance og vægtvedligehold/tab i et tempo man kan holde.
- Smag og køkken: må gerne være tydeligt internationale; undgå ikke krydderier eller retninger for at holde det «vestligt». Sense-spisekassen og måltidstype gælder stadig.

OPPSKRIFT — JSON (returner kun JSON):
{
  "title": "Titel på dansk i sætningscase",
  "description": "2–4 sætninger: hvad retten er, hvordan den mætter, og i et kort afsnit hvordan den passer til Sense-spisekassen (uden at liste kalorier).",
  "ingredientGroups": [
    { "name": "Håndfuld 1+2", "ingredients": [ { "name": "...", "amount": 100, "unit": "g" } ] },
    { "name": "Håndfuld 3", "ingredients": [ { "name": "...", "amount": 150, "unit": "g" } ] },
    { "name": "Håndfuld 4", "ingredients": [ { "name": "...", "amount": 80, "unit": "g" } ] },
    { "name": "Fedt", "ingredients": [ { "name": "...", "amount": 15, "unit": "g" } ] },
    { "name": "Smagsgivere", "ingredients": [ { "name": "...", "amount": 10, "unit": "g" } ] }
  ],
  "instructions": [ { "stepNumber": 1, "instruction": "...", "time": 10 } ],
  "servings": 2,
  "prepTime": 15,
  "cookTime": 25,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["Sense"],
  "nutritionalInfo": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 }
}

RETNAVNE OG KVALITET (vigtigt):
- Når **titel** eller **RET-TYPE** er en velkendt klassiker (lasagne, pizza, carbonara, burger, spaghetti med kødsovs, risotto, taco …), skal ingredienserne matche det, læseren forventer. **Lasagne = lag med lasagneplader** (stivelse i Håndfuld 4) + fyld/ost/sovs — ikke «lasagne» der kun er kartoffel + fisk/grønt uden pasta, medmindre titlen **eksplicit** siger kartoffel- eller grøntsagslasagne. Sense handler om passende mængder, ikke om at omdøbe en helt anden ret.

INGREDIENSREGLER — SPISEKASSE (obligatorisk):
- Du SKAL udfylde **ingredientGroups** med præcis disse gruppenavne (stavemåde og rækkefølge): ${SENSE_SPISEKASSE_GROUP_TITLES.map((t) => `"${t}"`).join(', ')}.
- **Håndfuld 1+2:** ikke-stivelsesholdigt grønt (salat, tomater, broccoli, løg, peberfrugt …). Ingen pasta/kartoffel her.
- **Håndfuld 3:** primær protein (kød, fisk, æg eller mejeri efter retten). Undgå at gøre bælgfrugt til eneste hovedprotein medmindre retten naturligt er fx chili, gryderet eller vegetar-aften.
- **Håndfuld 4:** stivelse eller frugt (kartoffel, ris, **pasta/lasagneplader**, brød, couscous, bær til måltid …). Ved lasagne/pastaret: pastaen ligger her med realistisk mængde.
- **Fedt:** olie, smør, fløde, dressing-base — det der tæller på fedt-spsk i Sense.
- **Smagsgivere:** bouillon, hvidløg, krydderier, citron, soyasauce, chili uden at flytte hovedingredienserne væk fra de rigtige håndfulde. Undgå at **hver** ret får samme sur-søde trio (honning + dijonsennep + citron) — varier som i en rigtig køkkenskuffe.
- Hver ingrediens kun **ét sted** (ét håndfuld-/fedt-/smagsgiver-felt). Tom undergruppe: brug tom array [ ].
- Alle mængder med tal; primært **g** (undtagen når det giver bedre mening med spsk/ml — men hold det enkelt).
- Portioner: altid **2** personer som udgangspunkt.
- Navngiv ingredienser med realistiske mængder (fx "400 g kartofler", "180 g laks", "10 g smør").

NÆRING (fornuftigt skøn pr. portion — skal stemme groft med Sense-balancen):
- Protein moderat til høj ift. hverdagsbehov, ikke bodybuilder-niveau.
- Kulhydrat **moderat** (typisk ikke keto-lavt); fiber fra grønt og fuldkorn hvor det giver mening.
- Fedt i normal hverdagsrange (husk dressing/olie tæller med).

${variationBlock}`
}

function parseGeneratedRecipe(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in generated content')
    }
    const recipe = JSON.parse(jsonMatch[0])
    if (!recipe.title || !recipe.instructions) {
      throw new Error('Missing required recipe fields')
    }
    recipe.dietaryCategories = getDietaryCategories('sense')

    const base = {
      title: normalizeDanishRecipeTitle(recipe.title),
      description: recipe.description || '',
      instructions: recipe.instructions || [],
      servings: 2,
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 25,
      difficulty: recipe.difficulty || 'Medium',
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('sense'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 480,
        protein: 32,
        carbs: 45,
        fat: 18,
        fiber: 8,
      },
    }

    if (Array.isArray(recipe.ingredientGroups) && recipe.ingredientGroups.length > 0) {
      const ordered = orderSenseGroupsFromAi(recipe.ingredientGroups as SenseGroupFromAi[])
      const flatRaw = ordered.flatMap((g) => (Array.isArray(g.ingredients) ? g.ingredients : []))
      if (flatRaw.length > 0 && senseGroupSizesMatchFlatLength(ordered, flatRaw.length)) {
        const flatNorm = normalizeAiRecipeIngredients(flatRaw as AiIngredientInput[])
        const flatWithIds: Ingredient[] = flatNorm.map((ing, i) => ({
          id: `temp-sense-ing-${i + 1}`,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          notes: ing.notes ?? undefined,
        }))
        const groupSizes = ordered.map((g) => ({
          name: g.name,
          count: Array.isArray(g.ingredients) ? g.ingredients.length : 0,
        }))
        const ingredientGroups: IngredientGroup[] = buildIngredientGroupsWithIds(flatWithIds, groupSizes)
        if (ingredientGroups.length > 0) {
          return {
            ...base,
            ingredients: flatWithIds,
            ingredientGroups,
          }
        }
      }
    }

    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) {
      throw new Error('Missing ingredientGroups or ingredients')
    }

    const flatNorm = normalizeAiRecipeIngredients(recipe.ingredients as AiIngredientInput[])
    const inferred = inferSenseIngredientGroupsFromFlat(flatNorm)
    if (inferred && inferred.length > 0) {
      return {
        ...base,
        ingredients: inferred.flatMap((g) => g.ingredients),
        ingredientGroups: inferred,
      }
    }

    return {
      ...base,
      ingredients: recipe.ingredients || [],
    }
  } catch (error) {
    console.error('Error parsing generated Sense recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}
