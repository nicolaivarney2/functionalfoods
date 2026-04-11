import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
import { generateMidjourneyPrompt } from '@/lib/midjourney-generator'
import { normalizeDanishRecipeTitle } from '@/lib/recipe-title-format'
import { buildRecipeVariationPrompt } from '@/lib/recipe-generation-diversity'

interface ExistingRecipe {
  id: string
  title: string
  description: string
  dietaryCategories?: string[]
  ingredients?: Array<{ name?: string | null } | string>
}

interface ProteinrigParameters {
  maaltid?: 'morgenmad' | 'frokost' | 'aftensmad' | 'snacks'
  proteinKilde?: 'kylling' | 'fisk' | 'æg' | 'oksekød' | 'vegetarisk' | 'frit-valg'
  recipeType?: string
  inspiration?: string
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
  parameters?: ProteinrigParameters
}

export async function POST(request: NextRequest) {
  try {
    const { categoryName, existingRecipes, parameters }: GenerateRecipeRequest = await request.json()

    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: 'categoryName is required' },
        { status: 400 }
      )
    }

    console.log(`💪 Generating Proteinrig kost recipe: ${categoryName}`)

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

    const params: ProteinrigParameters = parameters || {
      maaltid: 'aftensmad',
      proteinKilde: 'frit-valg',
      recipeType: '',
      inspiration: '',
    }
    const resolvedMaaltid = params.maaltid ?? 'aftensmad'
    const existingTitles = existingRecipes.map((r) => r.title.toLowerCase())
    const systemPrompt = createProteinrigSystemPrompt(existingTitles, resolvedMaaltid)
    const parameterInstructions = buildProteinrigParameterInstructions(params)
    const variationPrompt = buildRecipeVariationPrompt({
      niche: 'proteinrig',
      existingRecipes,
      mealType: params.maaltid,
      requestedRecipeType: params.recipeType,
      preferredProtein: params.proteinKilde,
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
            content: `Generer en ny proteinrig opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på danske ingredienser og tydelige proteinkilder (magert kød, fisk, æg, mejeriprodukter, bælgfrugter). Balancerede kulhydrater og fedt — ikke keto, ikke ekstrem lavkalorie.

${proteinrigCarbInstructionForUser(resolvedMaaltid)}

${parameterInstructions}
${variationPrompt}`,
          },
        ],
        temperature: 0.85,
        max_tokens: 2500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const completion = await response.json()
    const recipeContent = completion.choices[0]?.message?.content

    if (!recipeContent) {
      throw new Error('No recipe content generated')
    }

    const recipe = parseGeneratedRecipe(recipeContent)
    console.log(`✅ Generated Proteinrig kost recipe: ${recipe.title}`)

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

    const midjourneyPrompt = await generateMidjourneyPrompt(recipe)

    return NextResponse.json({
      success: true,
      recipe,
      aiTips,
      midjourneyPrompt,
    })
  } catch (error) {
    console.error('Error generating Proteinrig kost recipe:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate Proteinrig kost recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function proteinrigCarbInstructionForUser(maaltid: string): string {
  if (maaltid === 'aftensmad') {
    return `AFTENSMAD: Komplekse kulhydrater er en naturlig del af måltidet — fuldkornsris, bulgur, quinoa, fuldkornspasta, perlespelt og kartoffel/batat i moderate mængder (typisk ca. 80–150 g kogt korn/pasta pr. portion eller ca. 150–220 g kartoffel/batat), sammen med høj protein.`
  }
  return `MORGON-/FROKOST-/SNACK: Hold måltidet enkelt (æg, grød, skyr/kvark, cottage cheese, brød, frugt). Undgå store portioner bulgur/quinoa/pasta/ris og put aldrig tunge korn i smoothie eller shake.`
}

function createProteinrigSystemPrompt(existingTitles: string[], maaltid: string): string {
  const isAftensmad = maaltid === 'aftensmad'

  const kulhydratPrincip = isAftensmad
    ? `- Kulhydrat og fedt (aftensmad): balanceret — brug gerne moderate mængder komplekse kulhydrater sammen med proteinet: fuldkornsris, bulgur, quinoa, fuldkornspasta, perlespelt, kartoffel/batat (typisk ca. 80–150 g kogt korn/pasta pr. portion eller 150–220 g kartoffel/batat), plus grøntsager; olivenolie, nødder, avocado i moderate mængder. Det er IKKE keto: undgå ekstremt lavt kulhydrat.`
    : `- Kulhydrat (morgenmad/frokost/snack): enkelt — grød, brød, lidt frugt/bær; undgå aftensmads-kulhydrater i store mængder og aldrig bulgur, quinoa, pasta eller ris i smoothie/shake.`

  const kulhydratIngrediensBullet = isAftensmad
    ? `- Kulhydrat tilbehør (moderate mængder, aftensmad): fuldkornsris, bulgur, quinoa, fuldkornspasta, perlespelt, kartoffel, batat — se gramvejledning under principper`
    : `- Kulhydrat: kun enkle kilder til dette måltid (grød, brød, frugt) — ikke tunge kogte korn som hovedelement`

  const variationBlock = isAftensmad
    ? `VARIATION:
- Undgå standardmønstret kød + peberfrugt + broccoli + olie + salt/peber.
- Varier retformat tydeligt mellem fx lasagne, suppe, bowl, gryderet, ovnret, salat eller wraps.
- Hvis brugeren angiver ret-type, skal den respekteres tydeligt i både ingredienser og tilberedning.`
    : `VARIATION:
- Undgå standardmønstret kød + peberfrugt + broccoli + olie + salt/peber.
- Til morgenmad/frokost/snack: varier kun inden for enkle formater (æggeret, grød, sandwich, salat, skyr-/cottage tallerken) — ikke lasagne, tunge gryderetter eller ovnretter som morgenmad.
- Hvis brugeren angiver ret-type, skal den respekteres når den passer til måltidet.`

  return `Du er en ekspert i proteinrig kost, sportsernæring og dansk hverdagsmad. Generer en detaljeret opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map((title) => `- ${title}`).join('\n')}

PROTEINRIG KOST — PRINCIPPER:
- Høj proteinandel: sigter efter ca. 25–35% af kalorierne fra protein (typisk ~1,6–2,2 g protein/kg kropsvægt pr. dag fordelt på måltider — her: ét måltid med tydeligt højt protein pr. portion).
- Primære proteinkilder: magert kød (kylling, kalkun, svinekam), fisk og skaldyr, æg, mejeriprodukter med højt protein (skyr, kvark, cottage cheese), tofu/tempeh, bælgfrugter.
${kulhydratPrincip}
- Mæthed: retter der mætter godt uden at være kaloriebomber, medmindre det er et bevidst stort måltid.
- Undgå "tomme" kalorier: begræns sukker og tilsat fedt uden protein.

OPPSKRIFT FORMAT (returner kun JSON):
- "title": dansk sætningscase — kun stort begyndelsesbogstav i første ord (fx "Grillet kylling med skyr-dip"), aldrig Title Case På Hvert Ord.

{
  "title": "Proteinrig opskrift titel",
  "description": "Kort beskrivelse med fokus på protein og mæthed",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion",
      "time": 10
    }
  ],
  "servings": 2,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["Proteinrig kost"],
  "nutritionalInfo": {
    "calories": 520,
    "protein": 45.0,
    "carbs": 42.0,
    "fat": 16.0,
    "fiber": 7.0
  }
}

NÆRING — KRAV FOR DENNE KATEGORI:
- I "nutritionalInfo" skal protein pr. portion være tydeligt højt (typisk mindst ~35 g protein ved voksne måltider, medmindre det er en snack/dessert).
- Protein bør være den dominerende makronæringsstof i gram sammenlignet med et almindeligt måltid.

INGREDIENS REGLER:
- ALT skal være i gram (g) — aldrig kg eller stk
- Kød/fisk: "200 g kyllingebryst", "400 g laks"
- Mejeri: "150 g skyr", "100 g cottage cheese"
- Æg: "200 g æg" (ca. 4 stk)
- Bælgfrugter: "200 g kogte kikærter", "120 g røde linser tørre"
- Grøntsager og tilbehør i gram
- Portioner: altid 2
- Ingen "notes" på ingredienser medmindre nødvendigt

PROTEINRIGE INGREDIENSER AT FOKUSERE PÅ:
- Kylling, kalkun, magert svinekød, oksekød (magre udskæringer)
- Fisk, tun, rejer, æg
- Skyr, kvark, cottage cheese, ost (moderat)
- Tofu, tempeh, linser, bønner, kikærter
${kulhydratIngrediensBullet}
- Valgfrit: proteinpulver kun hvis det giver mening i retten (fx en meget simpel shake), ellers helst hel mad; undgå proteinpulver som undskyldning for mærkelige smoothie-ingredienser

${variationBlock}`
}

function buildProteinrigParameterInstructions(params: ProteinrigParameters): string {
  const instructions: string[] = []

  if (params.maaltid) {
    const m = params.maaltid
    instructions.push(
      m === 'morgenmad'
        ? `MÅLTID: Morgenmad — enkel, højprotein morgenmad uden tunge korn i smoothie.`
        : `MÅLTID: Opskriften skal fungere tydeligt som ${m}.`
    )
  }

  if (params.proteinKilde && params.proteinKilde !== 'frit-valg') {
    instructions.push(`PROTEIN-KILDE: ${params.proteinKilde} skal være primær proteinkilde.`)
  }

  if (params.recipeType && params.recipeType.trim()) {
    instructions.push(`RET-TYPE: Lav konkret en ${params.recipeType} (ikke bare en generisk ret med ny titel).`)
  }

  if (params.inspiration && params.inspiration.trim()) {
    instructions.push(`INSPIRATION: "${params.inspiration}" — brug retningen kreativt uden at kopiere 1:1.`)
  }

  return instructions.length
    ? `PARAMETRE-SPECIFIKKE INSTRUKTIONER:\n${instructions.map((line) => `- ${line}`).join('\n')}\n\n`
    : ''
}

function parseGeneratedRecipe(content: string): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in generated content')
    }

    const recipe = JSON.parse(jsonMatch[0])

    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Missing required recipe fields')
    }

    recipe.dietaryCategories = getDietaryCategories('proteinrig-kost')

    return {
      title: normalizeDanishRecipeTitle(recipe.title),
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: 2,
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Medium',
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('proteinrig-kost'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 450,
        protein: 40,
        carbs: 25,
        fat: 18,
        fiber: 5,
      },
    }
  } catch (error) {
    console.error('Error parsing generated Proteinrig kost recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}
