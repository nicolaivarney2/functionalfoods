import { NextRequest, NextResponse } from 'next/server'
// import OpenAI from 'openai' // Not used
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

interface GLP1Parameters {
  maaltid?: 'morgenmad' | 'frokost' | 'aftensmad' | 'snacks'
  proteinKilde?: 'kylling' | 'fisk' | 'æg' | 'vegetarisk' | 'frit-valg'
  fiberFokus?: 0 | 1 | 2 | 3
  maethedsProfil?: 0 | 1 | 2 | 3
  recipeType?: string
  inspiration?: string
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
  parameters?: GLP1Parameters
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

    console.log(`🧠 Generating GLP-1 recipe: ${categoryName}`)

    // Get OpenAI config from existing system
    const openaiConfig = getOpenAIConfig()
    
    if (!openaiConfig || !openaiConfig.apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured',
          details: 'Please configure OpenAI API key in admin settings'
        },
        { status: 500 }
      )
    }


    // Get existing recipe titles to avoid duplicates
    const existingTitles = existingRecipes.map(r => r.title.toLowerCase())
    
    const params: GLP1Parameters = parameters || {
      maaltid: 'aftensmad',
      proteinKilde: 'frit-valg',
      fiberFokus: 2,
      maethedsProfil: 2,
      recipeType: '',
      inspiration: '',
    }

    const resolvedMaaltid = params.maaltid ?? 'aftensmad'

    // Create GLP-1-specific system prompt
    const systemPrompt = createGLP1SystemPrompt(existingTitles, resolvedMaaltid)
    const parameterInstructions = buildGLP1ParameterInstructions(params)
    const variationPrompt = buildRecipeVariationPrompt({
      niche: 'glp1',
      existingRecipes,
      mealType: params.maaltid,
      requestedRecipeType: params.recipeType,
      preferredProtein: params.proteinKilde,
      inspiration: params.inspiration,
    })
    
    // Generate recipe with OpenAI using existing config
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Generer en ny GLP-1 opskrift der er unik og ikke ligner eksisterende opskrifter.

Opskriften skal afspejle GLP-1 kost som mæthedskost:
- højt på protein
- god mængde fibre
- moderate sunde fedtstoffer
- solidt, rigtigt måltid
- velegnet til vægttab og stabil mæthed
${glpCarbInstructionForUser(resolvedMaaltid)}

Undgå at gøre den keto-agtig, snack-agtig eller dessert-agtig.

${parameterInstructions}
${variationPrompt}`
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
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

    // Parse the generated recipe
    const recipe = parseGeneratedRecipe(recipeContent)
    
    console.log(`✅ Generated GLP-1 recipe: ${recipe.title}`)

    // Generate AI tips for the recipe
    let aiTips = ''
    try {
      console.log('💡 Generating AI tips for recipe...')
      const tipsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/generate-tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: normalizeDanishRecipeTitle(recipe.title),
          description: recipe.description,
          difficulty: recipe.difficulty,
          totalTime: recipe.prepTime + recipe.cookTime,
          dietaryCategories: recipe.dietaryCategories
        })
      })

      if (tipsResponse.ok) {
        const tipsData = await tipsResponse.json()
        aiTips = tipsData.tips || ''
        console.log('✅ AI tips generated successfully')
      } else {
        console.log('⚠️ Failed to generate AI tips, continuing without tips')
      }
    } catch (error) {
      console.log('⚠️ Error generating AI tips:', error)
    }

    // Generate Midjourney prompt
    const midjourneyPrompt = await generateMidjourneyPrompt(recipe)

    return NextResponse.json({
      success: true,
      recipe,
      aiTips,
      midjourneyPrompt
    })

  } catch (error) {
    console.error('Error generating GLP-1 recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate GLP-1 recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function glpCarbInstructionForUser(maaltid: string): string {
  if (maaltid === 'aftensmad') {
    return `- AFTENSMAD — en LILLE mængde komplekse kulhydrater er OK og ønskelig: fx fuldkornsris, bulgur, quinoa, fuldkornspasta eller lidt kartoffel/batat — hold mængden beskeden (typisk ca. 40–70 g kogt ris/bulgur/quinoa/pasta pr. portion, eller ca. 60–100 g kartoffel/batat pr. portion). Undgå store kulhydratbomber, hvidt brød og tilsat sukker.`
  }
  return `- MORGON-/FROKOST-/SNACK: Hold måltidet ENKELT og spiseligt (æg, grød, skyr/kvark, cottage cheese, lidt brød, frugt/bær). Undgå tunge kogte korn (bulgur, quinoa, pasta, ris) og put ALDRIG sådan noget i smoothie, shake eller flydende måltid.`
}

function createGLP1SystemPrompt(existingTitles: string[], maaltid: string): string {
  const isAftensmad = maaltid === 'aftensmad'

  const complexCarbBlock = isAftensmad
    ? `- KOMPLEKSE KULHYDRATER (kun aftensmad): Retten må gerne indeholde lidt fuldkornsris, bulgur, quinoa, fuldkornspasta, perlespelt eller en lille mængde kartoffel/batat — som støtte til mæthed og variation, ikke som hovedfokus. Angiv realistiske gram (kogt vægt for korn/pasta: typisk ca. 40–70 g pr. portion; kartoffel/batat: typisk ca. 60–100 g pr. portion). Undgå store portioner og hurtige kulhydrater (sukker, juice, hvidt brød).`
    : `- MORGON-, FROKOST- ELLER SNACK: Ingen strategi med aftensmads-kulhydrater (bulgur, quinoa, pasta, ris i større mængder). Hold kulhydrat enkelt: grød, lidt havre, et par skiver fuldkornsbrød, frugt/bær. Aldrig bulgur, quinoa, pasta eller ris i smoothie eller shake. Foretræk tallerken/skål frem for "fancy" flydende måltider.`

  const fiberLine = isAftensmad
    ? `- Fibre i hvert måltid fra grøntsager, bælgfrugter, havre eller fuldkorn`
    : `- Fibre fra grøntsager, bælgfrugter og hvor det passer naturligt: lidt havre (fx grød), frugt/bær — uden tunge kogte korn som hovedelement`

  const vaeskeRegel = isAftensmad
    ? `- Ingen flydende kalorier som juice, sodavand eller måltider der primært er smoothie/shake`
    : `- Undgå juice og sodavand. Smoothie kun hvis den er meget simpel (fx skyr + bær + mælk/plantemælk) og uden korn, pasta, bulgur eller quinoa — ellers lav en spiselig morgenmad i stedet`

  const maaltidKontekst = isAftensmad
    ? `- Undgå snack-agtige opskrifter som hovedmåltid; tænk i rigtig aftensmad`
    : `- Måltidet skal være enkelt og genkendeligt for ${maaltid} — ikke som aftensmad og ikke overdrevet "kreativt" med irrelevante ingredienser`

  const formatIdeer = isAftensmad
    ? `- Tænk gerne i skåle, varme retter, supper, ovnretter, fiskeretter, kyllingeretter og mættende salater`
    : `- Tænk gerne i æggeretter, grød, skyr/kvark med enkel topping, cottage cheese, lun tallerken eller simpel frokostsalat — undgå komplekse bowls med mange inkongruente elementer`

  const stivelseBullet = isAftensmad
    ? `- Små mængder stivelse (fuldkorn): fuldkornsris, bulgur, quinoa, fuldkornspasta, perlespelt; lidt kartoffel eller sød kartoffel — altid som tilbehør i beskeden mængde pr. portion (se gramvejledning for aftensmad ovenfor)`
    : ''

  const undgaaSmoothie = isAftensmad
    ? `- Opskrifter der primært er dessert, smoothie, snack eller morgen-shake`
    : `- Dessert som hovedmåltid; smoothies med tunge eller mærkelige ingredienser; snack i stedet for måltid`

  return `Du er en ekspert i GLP-1 kost og naturligt vægttab. Generer en detaljeret GLP-1 opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

GLP-1 KOST PRINCIPPER:
- Fokus på mæthed frem for kalorietælling
- Protein i hvert måltid, gerne ca. 20-30 g protein per portion
${fiberLine}
${complexCarbBlock}
- Sunde fedtstoffer i moderate mængder for længere mæthed og stabilt blodsukker
- Solide, rigtige måltider der biologisk skaber mæthed
${vaeskeRegel}
${maaltidKontekst}
- Opskriften skal føles realistisk for vægttab og hverdagsmæthed, ikke som keto, dessert eller fitness-slankekur

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "GLP-1 opskrift titel",
  "description": "Kort beskrivelse med fokus på mæthed, protein, fibre og stabil energi",
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
      "instruction": "Detaljeret instruktion med GLP-1 relevante madlavningstips",
      "time": 10
    }
  ],
  "servings": 2,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["glp-1"],
  "nutritionalInfo": {
    "calories": 380,
    "protein": 30.0,
    "carbs": 28.0,
    "fat": 18.0,
    "fiber": 8.0
  }
}

INGREDIENS REGLER:
- ALT skal være i gram (g) - aldrig kg eller stk
- Kød: "300 g oksekød", "250 g kyllingebryst"
- Grøntsager: "300 g broccoli", "200 g spinat"
- Fedt: "15 g olivenolie", "20 g nødder", "80 g avocado"
- Nødder: "30 g mandler", "20 g valnødder"
- Bær: "100 g jordbær", "50 g blåbær"
- Krydderier: "5 g kurkuma", "10 g ingefær"
- Æg: "120 g æg" (ca. 2 stk)
- Fisk: "400 g laks", "300 g makrel"
- Ingen notes felt på ingredienser
- Portioner: altid 2
- Titel: dansk sætningscase — kun første bogstav stort (fx "Kylling med linser og broccoli")

GLP-1 INGREDIENSER (prioriter høj protein, fibre og sunde fedtstoffer):
- Protein: æg, kylling, kalkun, fisk, græsk yoghurt, hytteost, magert oksekød, bælgfrugter
- Fiberrige grøntsager: broccoli, blomkål, spinat, grønkål, kål, squash, gulerødder
- Fibre og langsom mæthed: linser, bønner, kikærter, havre, grove kerner
${stivelseBullet ? `${stivelseBullet}\n` : ''}- Sunde fedtstoffer: avocado, olivenolie, nødder, frø, fed fisk
- Smagsprofil: frisk, mættende, enkel, hverdagsvenlig og realistisk
${formatIdeer}

UNDGÅ:
- Flydende kalorier: juice, sodavand, alkohol
- Snacks: chips, kager, slik, små nibble-retter
- Processerede fødevarer med tilsat sukker
- Ekstrem lavkulhydrat-logik eller "fat bomb"-tankegang
- ${undgaaSmoothie}
- Meget fedtede retter uden fibre og grønt

VIGTIGT:
- Opskriften skal tydeligt afspejle GLP-1 kost som beskrevet ovenfor, ikke paleo, ikke klassisk LCHF og ikke ren keto.
- Beskrivelsen skal nævne mæthed, protein, fibre eller stabil energi på en naturlig måde.
- Opskriften må gerne være dansk og hverdagsrealistisk.
- Returner kun gyldig JSON.`
}

function buildGLP1ParameterInstructions(params: GLP1Parameters): string {
  const instructions: string[] = []

  if (params.maaltid) {
    const maaltidMap: Record<string, string> = {
      morgenmad:
        'MÅLTID: Morgenmad. Enkel, mættende morgenmad (æg, grød, skyr, cottage cheese, brød) — ikke aftensmad og ikke tunge korn i smoothie.',
      frokost:
        'MÅLTID: Frokost. Retten må gerne være let men mættende og realistisk at spise midt på dagen.',
      aftensmad:
        'MÅLTID: Aftensmad. Retten skal fungere som hovedmåltid med tydelig protein- og fiberdækning.',
      snacks:
        'MÅLTID: Snacks/mellemmåltid. Hold portionsstørrelsen mindre, men stadig med protein og fibre. Undgå dessert-agtig karakter.',
    }
    instructions.push(maaltidMap[params.maaltid] || `MÅLTID: ${params.maaltid}`)
  }

  if (params.proteinKilde && params.proteinKilde !== 'frit-valg') {
    const proteinMap: Record<string, string> = {
      kylling: 'PROTEIN-KILDE: Brug primært kylling eller kalkun som hovedprotein.',
      fisk: 'PROTEIN-KILDE: Brug primært fisk/skaldyr som hovedprotein.',
      æg: 'PROTEIN-KILDE: Brug primært æg og/eller æg-baserede proteinkilder.',
      vegetarisk: 'PROTEIN-KILDE: Vegetarisk proteinfokus via bælgfrugter, mejeri (hvis relevant), tofu/tempeh, æg.',
    }
    instructions.push(proteinMap[params.proteinKilde] || `PROTEIN-KILDE: ${params.proteinKilde}`)
  }

  if (typeof params.fiberFokus === 'number') {
    if (params.fiberFokus === 0) {
      instructions.push('FIBER-FOKUS: Lav til moderat fiberniveau, men stadig over standard.')
    } else if (params.fiberFokus >= 3) {
      instructions.push('FIBER-FOKUS: Højt fiberniveau med tydelige fiberrige komponenter i retten.')
    } else {
      const aft = (params.maaltid ?? 'aftensmad') === 'aftensmad'
      instructions.push(
        aft
          ? 'FIBER-FOKUS: Balanceret til høj fiber gennem grøntsager, bælgfrugter eller fuldkorn.'
          : 'FIBER-FOKUS: Fiber fra grøntsager og bælgfrugter; til morgenmad/frokost/snack undgå at presse store mængder kogte fuldkorn (bulgur, quinoa, pasta) ind — hold måltidet enkelt.'
      )
    }
  }

  if (typeof params.maethedsProfil === 'number') {
    if (params.maethedsProfil === 0) {
      instructions.push('MÆTHEDSPROFIL: Let og frisk, men stadig biologisk mættende.')
    } else if (params.maethedsProfil >= 3) {
      instructions.push('MÆTHEDSPROFIL: Meget mættende profil med tydelig protein/fiber-kombination.')
    } else {
      instructions.push('MÆTHEDSPROFIL: Balanceret mæthed uden at virke tung eller kalorietung.')
    }
  }

  if (params.recipeType && params.recipeType.trim()) {
    instructions.push(`RET-TYPE: Retten skal tydeligt ligne en ${params.recipeType} (ikke bare i titel, men i struktur og tilberedning).`)
  }

  if (params.inspiration && params.inspiration.trim()) {
    instructions.push(`INSPIRATION: "${params.inspiration}". Brug det som retning uden at kopiere en standardopskrift 1:1.`)
  }

  return instructions.length
    ? `PARAMETRE-SPECIFIKKE INSTRUKTIONER:\n${instructions.map((line) => `- ${line}`).join('\n')}\n\n`
    : ''
}

function parseGeneratedRecipe(content: string): any {
  try {
    // Try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in generated content')
    }

    const recipe = JSON.parse(jsonMatch[0])
    
    // Validate required fields
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Missing required recipe fields')
    }

    // Add category-specific dietary categories
    recipe.dietaryCategories = getDietaryCategories('glp-1')
    
    // Ensure all required fields exist
    return {
      title: normalizeDanishRecipeTitle(recipe.title),
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: 2, // Always 2 portions
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Medium',
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('glp-1'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 420,
        protein: 32,
        carbs: 24,
        fat: 18,
        fiber: 10
      }
    }
  } catch (error) {
    console.error('Error parsing generated GLP-1 recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

// Removed local generateMidjourneyPrompt function - now using centralized version


