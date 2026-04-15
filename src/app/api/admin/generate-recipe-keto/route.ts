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

interface KetoParameters {
  proteinFokus: number // 0-3
  fedtIndhold: number // 0-3
  kulhydratStrikthed: number // 0-3
  hovedingrediens?: string // 'rodt-kod', 'fjaerkrae', 'fisk', 'vegetarisk', 'non-dairy'
  recipeType?: string // Predefined recipe type (burger, pizza, etc.)
  inspiration?: string // Free text inspiration
  maxTid?: 15 | 30 | 45 | null // minutes
  kompleksitet: number // 0-3
  maaltid: string // 'morgenmad', 'frokost', 'aftensmad', 'dessert', 'snacks'
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
  parameters?: KetoParameters
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

    // Default parameters if not provided
    const params: KetoParameters = parameters || {
      proteinFokus: 1,
      fedtIndhold: 2,
      kulhydratStrikthed: 1,
      maxTid: null,
      kompleksitet: 1,
      maaltid: 'aftensmad'
    }

    console.log(`🥑 Generating Keto recipe: ${categoryName}`)

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
    
    console.log('🔍 OpenAI Config:', {
      apiKey: openaiConfig.apiKey ? 'Set' : 'Not set'
    })
    
    // Build parameter instructions
    const parameterInstructions = buildParameterInstructions(params)
    const variationPrompt = buildRecipeVariationPrompt({
      niche: 'keto',
      existingRecipes,
      mealType: params.maaltid,
      requestedRecipeType: params.recipeType,
      preferredProtein: params.hovedingrediens,
      inspiration: params.inspiration,
    })
    
    // Generate recipe using standard OpenAI API
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
            content: createKetoSystemPrompt(existingTitles)
          },
          {
            role: "user",
            content: `Generer en ny Keto opskrift der er unik og ikke ligner eksisterende opskrifter. Respekter keto-reglerne. Krydderier og køkkenstil må frit hente inspiration fra hele verden.

${parameterInstructions}
${variationPrompt}`
          }
        ],
        temperature: 1.2,
        max_tokens: 2500
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const recipeContent = data.choices[0]?.message?.content
    
    if (!recipeContent) {
      throw new Error('No recipe content generated')
    }

    // Parse the generated recipe
    const recipe = parseGeneratedRecipe(recipeContent)
    
    console.log(`✅ Generated Keto recipe: ${recipe.title}`)

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

    // Generate Midjourney prompt using centralized function
    const midjourneyPrompt = await generateMidjourneyPrompt(recipe)

    return NextResponse.json({
      success: true,
      recipe,
      aiTips,
      midjourneyPrompt
    })

  } catch (error) {
    console.error('Error generating Keto recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Keto recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function buildParameterInstructions(params: KetoParameters): string {
  const instructions: string[] = []
  
  // Protein-fokus instructions
  if (params.proteinFokus === 0) {
    instructions.push('PROTEIN-FOKUS: Lav protein - fokusér på fedt som primær energikilde. Brug mindre mængder kød/fisk og mere fedt (avocado, nødder, olie, smør).')
  } else if (params.proteinFokus === 3) {
    instructions.push('PROTEIN-FOKUS: Høj protein - protein-rig keto ret. Brug større mængder kød/fisk/æg. Fokusér på mager protein som kyllingebryst, fisk, oksekød.')
  } else if (params.proteinFokus >= 2) {
    instructions.push('PROTEIN-FOKUS: Moderat til høj protein. Balancer mellem protein og fedt.')
  } else {
    instructions.push('PROTEIN-FOKUS: Moderat protein - standard keto balance (20-25% af kalorier).')
  }
  
  // Fedt-indhold instructions
  if (params.fedtIndhold === 0) {
    instructions.push('FEDT-INDHOLD: Moderat fedt - standard keto niveau (70-75% af kalorier).')
  } else if (params.fedtIndhold === 3) {
    instructions.push('FEDT-INDHOLD: Meget høj fedt - fat-bomb stil. Fokusér på fedtrige ingredienser: avocado, nødder, kokosolie, smør, fløde, fedt kød med skind. Må gerne være en "fat bomb" ret.')
  } else if (params.fedtIndhold >= 2) {
    instructions.push('FEDT-INDHOLD: Høj fedt - klassisk keto (75-80% af kalorier). Brug fedtrige ingredienser: avocado, nødder, olivenolie, smør, fedt kød.')
  } else {
    instructions.push('FEDT-INDHOLD: Moderat til høj fedt - standard keto niveau.')
  }
  
  // Kulhydrat-strikthed instructions
  if (params.kulhydratStrikthed === 0) {
    instructions.push('KULHYDRAT-STRICTHED: Meget strikt - maksimalt 10g netto kulhydrater per portion. Undgå grøntsager med højt kulhydratindhold. Fokusér på bladgrønt, avocado, nødder.')
  } else if (params.kulhydratStrikthed === 3) {
    instructions.push('KULHYDRAT-STRICTHED: Mere fleksibel - op til 25g netto kulhydrater per portion. Kan inkludere flere grøntsager som broccoli, blomkål, zucchini, tomat.')
  } else {
    instructions.push('KULHYDRAT-STRICTHED: Standard keto - maksimalt 20g netto kulhydrater per portion. Brug keto-venlige grøntsager: bladgrønt, broccoli, blomkål, zucchini.')
  }
  
  // Hovedingrediens instructions
  if (params.hovedingrediens) {
    const hovedingrediensMap: Record<string, string> = {
      'rodt-kod': 'HOVEDINGREDIENS: Rødt kød (oksekød, svinekød, lam, etc.). Fokusér på fedt kød som oksekød, svinekød, lam. Brug kød som primær ingrediens.',
      'fjaerkrae': 'HOVEDINGREDIENS: Fjerkræ (80% kylling, men kan også være kalkun, and, etc.). Fokusér på kylling som primær ingrediens i 80% af tilfældene. Kylling med skind er at foretrække for fedtindhold.',
      'fisk': 'HOVEDINGREDIENS: Fisk (laks, makrel, tun, etc.). Fokusér på fedt fisk som laks, makrel, sardiner, tun. Disse er rig på omega-3 og fedt.',
      'vegetarisk': 'HOVEDINGREDIENS: Vegetarisk. Fokusér på æg, avocado, nødder, frø, tofu, grøntsager. Ingen kød eller fisk.',
      'non-dairy': 'HOVEDINGREDIENS: Non-dairy (ingen mælkeprodukter). Undgå mælk, ost, fløde, smør. Brug kokosolie, olivenolie, ghee (hvis ok), nødder, avocado som fedtkilder i stedet.'
    }
    
    const instruction = hovedingrediensMap[params.hovedingrediens.toLowerCase()] || `HOVEDINGREDIENS: ${params.hovedingrediens}`
    instructions.push(instruction)
  }
  
  // Recipe type instructions (samme som Familiemad)
  if (params.recipeType && params.recipeType.trim() !== '') {
    const recipeTypeMap: Record<string, string> = {
      'burger': 'RET-TYPE: Generér en KETO burger opskrift. Brug kødboller eller kød, undgå brød (brug bladgrønt eller keto-brød alternativ).',
      'pizza': 'RET-TYPE: Generér en KETO pizza opskrift. Brug keto-pizza bund (fx. blomkålsbund eller nødde-bund).',
      'taco': 'RET-TYPE: Generér en KETO taco opskrift. Brug bladgrønt eller keto-tortillas i stedet for normale tortillas.',
      'lasagne': 'RET-TYPE: Generér en KETO lasagne opskrift. Brug blomkålsplader eller zucchini i stedet for pasta.',
      'pasta-bolognese': 'RET-TYPE: Generér en KETO pasta bolognese opskrift. Brug zucchini-nudler eller blomkålsris i stedet for pasta.',
      'pasta-carbonara': 'RET-TYPE: Generér en KETO pasta carbonara opskrift. Brug zucchini-nudler eller blomkålsris i stedet for pasta.',
      'pasta-med-kylling': 'RET-TYPE: Generér en KETO pasta med kylling opskrift. Brug zucchini-nudler eller blomkålsris i stedet for pasta.',
      'risotto': 'RET-TYPE: Generér en KETO risotto opskrift. Brug blomkålsris i stedet for ris.',
      'kylling-i-karry': 'RET-TYPE: Generér en KETO kylling i karry opskrift. Undgå sukker i saucen, brug kokosmælk.',
      'boller-i-karry': 'RET-TYPE: Generér en KETO boller i karry opskrift. Kødboller med keto-venlig sauce.',
      'frikadeller': 'RET-TYPE: Generér en KETO frikadeller opskrift. Undgå brød i farsen, brug æg og krydderier.',
      'hakkebof': 'RET-TYPE: Generér en KETO hakkebøf opskrift. Undgå brød, brug bladgrønt eller keto-brød alternativ.',
      'fiskefilet': 'RET-TYPE: Generér en KETO fiskefilet opskrift. Undgå panering med mel, brug mandelmel eller kokosmel.',
      'ovnbagt-kylling': 'RET-TYPE: Generér en KETO ovnbagt kylling opskrift.',
      'gryderet': 'RET-TYPE: Generér en KETO gryderet opskrift. En simpel, velsmagende gryderet uden kulhydrater.',
      'one-pot': 'RET-TYPE: Generér en KETO one-pot opskrift. Alt laves i én gryde/pande.',
      'wraps': 'RET-TYPE: Generér en KETO wraps opskrift. Brug bladgrønt eller keto-tortillas.',
      'suppe': 'RET-TYPE: Generér en KETO suppe opskrift. Undgå mel, brug fløde eller kokosmælk.',
      'bowl': 'RET-TYPE: Generér en KETO bowl opskrift. Protein, fedt og grøntsager i en skål.',
      'omelet': 'RET-TYPE: Generér en KETO omelet opskrift. Perfekt til morgenmad eller aftensmad.',
      'mac-and-cheese': 'RET-TYPE: Generér en KETO mac and cheese opskrift. Brug blomkålsris eller zucchini i stedet for pasta.',
      'pastasalat': 'RET-TYPE: Generér en KETO pastasalat opskrift. Brug zucchini-nudler eller blomkålsris i stedet for pasta.',
      'kyllingesalat': 'RET-TYPE: Generér en KETO kyllingesalat opskrift. Lun salat med kylling.'
    }
    
    const instruction = recipeTypeMap[params.recipeType.toLowerCase()] || `RET-TYPE: Generér en KETO ${params.recipeType} opskrift.`
    instructions.push(instruction)
  }
  
  // Inspiration instructions
  if (params.inspiration && params.inspiration.trim() !== '') {
    instructions.push(`INSPIRATION: Brugeren ønsker en opskrift inspireret af: "${params.inspiration}". Lav en KETO version af denne inspiration. Opskriften skal være keto-venlig, lav-kulhydrat, høj-fedt.`)
  }
  
  // Tid instructions
  if (params.maxTid === 15) {
    instructions.push('TID: Maksimalt 15 minutter total tid. Begræns antal steps og brug hurtige ingredienser.')
  } else if (params.maxTid === 30) {
    instructions.push('TID: Maksimalt 30 minutter total tid. Balanceret mellem hastighed og kompleksitet.')
  } else if (params.maxTid === 45) {
    instructions.push('TID: Maksimalt 45 minutter total tid. Mere komplekse retter er tilladt.')
  } else {
    instructions.push('TID: Ingen fast maksimal tid. Opskriften må gerne tage længere tid, hvis retten kræver det.')
  }
  
  // Kompleksitet instructions
  if (params.kompleksitet === 0) {
    instructions.push('KOMPLEKSITET: Enkel - få ingredienser (5-7 ingredienser), simple steps (4-5 steps), hurtig at lave.')
  } else if (params.kompleksitet === 3) {
    instructions.push('KOMPLEKSITET: Kompleks - mange ingredienser (10+ ingredienser), detaljerede steps (7-10 steps), avanceret teknikker.')
  } else if (params.kompleksitet >= 2) {
    instructions.push('KOMPLEKSITET: Mellem til kompleks - flere ingredienser (8-10 ingredienser), flere steps (6-8 steps).')
  } else {
    instructions.push('KOMPLEKSITET: Mellem - standard antal ingredienser (7-9 ingredienser), standard steps (5-7 steps).')
  }
  
  // Måltid instructions
  const maaltidMap: Record<string, string> = {
    'morgenmad': 'MÅLTID: Morgenmad - perfekt til start på dagen. Overvej æg, bacon, avocado, nødder, keto-pandekager, omelet.',
    'frokost': 'MÅLTID: Frokost - mellemmåltid eller let måltid. Overvej salater, wraps, bowls, eller mindre portioner.',
    'aftensmad': 'MÅLTID: Aftensmad - hovedmåltid. Fuldstændig ret med protein, fedt og grøntsager.',
    'dessert': 'MÅLTID: Dessert - keto-dessert eller fat bomb. Undgå sukker, brug stevia, erythritol, eller naturlig søde. Fokusér på fedt og smag.',
    'snacks': 'MÅLTID: Snacks - små keto-snacks eller fat bombs. Perfekt til mellemmåltider. Fokusér på fedt og protein.'
  }
  
  const maaltidInstruction = maaltidMap[params.maaltid.toLowerCase()] || `MÅLTID: ${params.maaltid}`
  instructions.push(maaltidInstruction)
  
  return instructions.length > 0 
    ? `PARAMETRE-SPECIFIKKE INSTRUKTIONER:\n${instructions.map(i => `- ${i}`).join('\n')}\n\n`
    : ''
}

function createKetoSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i Keto kost og praktisk madlavning. Skriv på dansk. Generer en detaljeret Keto opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

KETO KOST REGLER:
- Maksimalt 20g netto kulhydrater per portion
- Høj fedtindhold (70-80% af kalorier)
- Moderat protein (20-25% af kalorier)
- Fokus på: fedt kød, fisk, æg, avocado, nødder, oliven, kokosolie, smør
- Undgå: brød, pasta, ris, kartofler, sukker, frugt (undtagen bær), bælgfrugter

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Keto opskrift titel",
  "description": "Kort beskrivelse med fokus på keto fordele",
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
      "instruction": "Detaljeret instruktion med keto tips",
      "time": 10
    }
  ],
  "servings": 2,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["Keto", "LCHF/Paleo"],
  "nutritionalInfo": {
    "calories": 350,
    "protein": 25.0,
    "carbs": 8.0,
    "fat": 28.0,
    "fiber": 5.0
  }
}

INGREDIENS REGLER:
- ALT skal være i gram (g) - aldrig kg eller stk
- Kød: "500 g hakket oksekød", "200 g kyllingebryst"
- Grøntsager: "300 g broccoli", "200 g spinat"
- Fedt: "30 g olivenolie", "50 g smør"
- Nødder: "30 g mandler", "20 g valnødder"
- Bær: "100 g jordbær", "50 g blåbær"
- Krydderier: "5 g kurkuma", "10 g ingefær"
- Æg: "200 g æg" (ca. 4 stk)
- Fisk: "400 g laks", "300 g makrel"
- Ingen notes felt på ingredienser
- Portioner: altid 2
- Titel: sætningscase på dansk — kun første bogstav stort (fx "Kylling med broccoli"), ikke Title Case På Hvert Ord

KETO INGREDIENSER AT FOKUSERE PÅ:
- Fedt kød: oksekød, svinekød, lam, kylling med skind
- Fisk: laks, makrel, sardiner, tun
- Æg: hele æg, ikke kun hvide
- Fedt: avocado, nødder, frø, oliven, kokosolie, smør, ghee
- Grøntsager: broccoli, spinat, kål, zucchini, blomkål
- Bær: jordbær, hindbær, blåbær (små mængder)
- Krydderier: kurkuma, ingefær, kanel, chili

UNDGÅ:
- Korn: hvede, rug, havre, ris
- Bælgfrugter: bønner, linser, kikærter
- Frugt: æbler, bananer, druer (undtagen bær)
- Sukker: alle former for sukker
- Kartofler og stivelsesrige grøntsager

VARIATION:
- Undgå at falde tilbage til den samme sikre kombination af kylling/fisk + broccoli + peberfrugt + spinat.
- Variér retformat, grøntsagsvalg, smagsprofil og proteinvalg fra opskrift til opskrift.
- Smag: varier gerne internationalt (karry, harissa, chipotle, miso i små mængder, citrongræs, za'atar …) så længe kulhydratloftet overholdes.
- Hvis brugeren beder om morgenmad, frokost eller snacks, skal opskriften ligne det måltid tydeligt og ikke bare være en standard aftensmad i mindre format.`
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
    recipe.dietaryCategories = getDietaryCategories('keto')
    
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
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('keto'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 350,
        protein: 25,
        carbs: 8,
        fat: 28,
        fiber: 5
      }
    }
  } catch (error) {
    console.error('Error parsing generated Keto recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

// Removed local generateMidjourneyPrompt function - now using centralized version


