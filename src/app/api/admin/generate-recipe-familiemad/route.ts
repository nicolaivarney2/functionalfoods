import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
import { generateMidjourneyPrompt } from '@/lib/midjourney-generator'
import { normalizeDanishRecipeTitle } from '@/lib/recipe-title-format'

interface ExistingRecipe {
  id: string
  title: string
  description: string
  dietaryCategories?: string[]
}

interface FamiliemadParameters {
  onePot: number // 0-3
  stivelsesKlassiker: number // 0-3
  mereGront: number // 0-3
  bornefavorit: number // 0-3
  maxTid: 15 | 30 | 45 | null
  recipeType?: string // Predefined recipe type (burger, pizza, etc.)
  inspiration?: string // Free text inspiration (e.g., "børneversion af burger")
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
  parameters?: FamiliemadParameters
}

export async function POST(request: NextRequest) {
  try {
    const { categoryName, existingRecipes, parameters }: GenerateRecipeRequest = await request.json()
    
    // Default parameters if not provided
    const params: FamiliemadParameters = parameters || {
      onePot: 1,
      stivelsesKlassiker: 2,
      mereGront: 1,
      bornefavorit: 2,
      maxTid: null
    }
    
    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: 'categoryName is required' },
        { status: 400 }
      )
    }

    console.log(`👨‍👩‍👧‍👦 Generating Familiemad recipe: ${categoryName}`)

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

    // Filter to only Familiemad recipes and get titles + key ingredients
    const familiemadRecipes = existingRecipes.filter((r: any) => {
      const categories = r.dietaryCategories || r.dietary_categories || []
      if (Array.isArray(categories)) {
        return categories.some((cat: string) => 
          cat?.toLowerCase().includes('familiemad') || 
          cat?.toLowerCase().includes('familie')
        )
      }
      return false
    })
    
    // Get titles and key ingredients (first 3-5) for better duplicate detection
    const existingRecipeInfo = familiemadRecipes
      .slice(0, 30) // Limit to most recent 30 to avoid too long prompts
      .map((r: any) => {
        const title = r.title?.toLowerCase() || ''
        const ingredients = (r.ingredients || [])
          .slice(0, 5)
          .map((ing: any) => ing.name?.toLowerCase() || '')
          .filter(Boolean)
          .join(', ')
        return { title, ingredients }
      })
    
    const existingTitles = existingRecipeInfo.map(r => r.title)
    
    console.log('🔍 OpenAI Config:', {
      apiKey: openaiConfig.apiKey ? 'Set' : 'Not set'
    })
    
    console.log('📊 Familiemad Parameters:', params)
    console.log(`📋 Found ${familiemadRecipes.length} existing Familiemad recipes, showing ${existingRecipeInfo.length} to ChatGPT`)
    
    // Build parameter-specific instructions
    const parameterInstructions = buildParameterInstructions(params)
    
    const baseMessages = [
      {
        role: "system",
        content: `Du er FunctionalFoods opskriftsassistent for Familiemad. Skriv altid på dansk.

Formål: Generér familievenlige opskrifter der passer til familier i hverdagen. FOKUSÉR PÅ RETTER SOM BØRN VIL SPISE — ikke voksen-gastro som hovedvinkel. Smag og køkken må gerne være internationale (mild karry, ramen-inspireret, quesadilla, teriyaki (sødt i måde), tikka-mild …), så længe det er realistisk og børnevenligt.

${parameterInstructions}

EKSEMPLER PÅ BØRNEVENLIGE FAMILIERETTER (varier mellem disse — ikke kun kartofler!):
- Pasta bolognese
- Pasta med kødsovs
- Pasta carbonara
- Spaghetti med kødsovs
- Spaghetti med kylling
- Penne med tomatsauce
- Lasagne (børnevenlig version)
- Kylling i karry med ris
- Boller i karry (klassisk børnevenlig ret)
- Ris med kylling og grøntsager
- Risotto med kylling
- Frikadeller med kartofler og brun sovs
- Fiskefilet med kartofler og remoulade
- Hakkebøf med løg og kartofler
- Ovnbagt kylling med grøntsager

UNDGÅ:
- Meget stærk chili eller retter der primært er «voksen stærk»
- Voksen-gastro som hovedvinkel (fx tunge, alkoholholdige saucer, rå marinerede specialiteter som hovedret)
- Ingredienser der er urealistiske for travle familier (kun hvis ikke i parameter-inspiration)

INGREDIENS FORMATERING - VIGTIGT:
- Brug ALTID små bogstaver i ingrediensnavne (name feltet) - IKKE stort forbogstav!
- Eksempler: "kartofler" (IKKE "Kartofler"), "kyllingebryst" (IKKE "Kyllingebryst"), "løg" (IKKE "Løg")
- Hvidløg: "1 stk hvidløgsfed" (IKKE "2 fed hvidløg" eller "1 stk hvidløg")
- Persille: "0,25 bundt persille" (IKKE "1 håndfuld persille" eller "1 bundt persille")
- Purløg: "1 stk purløg" med "fintsnittet" i notes feltet (IKKE "fintsnittet purløg")
- Andre krydderurter: "0,5 bundt timian", "0,25 bundt rosmarin"
- UNDGÅ duplikationer: Skriv kun "1 stk hvidløgsfed" ikke "1 stk hvidløgsfed" og "1 stk hvidløg"

MÆNGDER TIL 2 PERSONER - KRITISK:
Opskriften er ALTID til 2 personer. Brug REALISTISKE mængder - ikke for meget!
- Hakket oksekød/svinekød: 300-400 g (IKKE 500g eller mere - det er for meget!)
- Kyllingebryst/filet: 200-300 g (IKKE 400g eller mere)
- Fiskefilet: 200-300 g
- Kartofler: 400-500 g (ok, da de fylder meget)
- Ris/pasta (tør): 150-200 g (ikke mere end 200g)
- Grøntsager (broccoli, blomkål, etc.): 200-300 g
- Gulerødder: 2-3 stk (ikke 4-5 stk)
- Løg: 1 stk (ikke 2 stk)
- Tomater: 2-3 stk (ikke 4-5 stk)
- Æg: 2-3 stk (ikke 4 stk)
- Mælk/fløde: 2-3 dl (ikke 5 dl)
- Smør/olie: 20-30 g (ikke 50g)
HUSK: Disse mængder er til 2 personer. Hvis du er i tvivl, vælg den mindre mængde.

MAD SKAL VÆRE:
- Enkel, budgetvenlig og praktisk
- Brug almindelige ingredienser der er lette at få fat i
- Retter som børn vil spise
- ALTID 2 portioner (servings: "2")

TITEL REGLER:
- Varier titlerne - ikke altid "børnevenlig" eller "børnevenlige"
- Brug beskrivende titler: "Kylling med kartofler", "Pasta bolognese", "Frikadeller med brun sovs"
- Kun brug "børnevenlig" når det er relevant for retten

VARIATION - KRITISK:
- Hver opskrift SKAL være UNIK og forskellig fra tidligere genererede opskrifter
- Varier mellem forskellige ret-typer: gryderetter, ovnbagte retter, pasta-retter, ris-retter, kartoffel-retter
- Brug forskellige proteiner: kylling, oksekød, svinekød, fisk, vegetarisk
- Varier grøntsager og tilberedningsmetoder
- IKKE generer den samme opskrift to gange - hver opskrift skal have sin egen unikke karakter

ONE-POT OG PASTA-RETTER:
- VIGTIGT: Mange pasta-retter ER one-pot retter, da pastaen koges sammen med saucen og ingredienserne i samme gryde/pande
- Når "one-pot" parameteren er høj, prioriter pasta-retter (spaghetti, penne, lasagne, etc.)
- Når både "one-pot" og "stivelses-klassiker" er høje, er pasta-retter ideelle
- Eksempler på one-pot pasta-retter: spaghetti bolognese, pasta carbonara, penne med tomatsauce, pasta med kylling og grøntsager

STRUKTUR-VARIATION - VIGTIGT:
Varier strukturen af opskrifterne for at undgå ensartet format:
- Nogle opskrifter kan have 4-5 steps, andre 6-8 steps - varier antallet
- Nogle instruktioner kan være korte og direkte, andre mere detaljerede
- Varier om du bruger grupper i ingredienser (nogle gange "Kød", "Sauce", andre gange ingen grupper)
- Varier om du bruger grupper i instruktioner (nogle gange "Forberedelse", "Tilberedning", andre gange ingen grupper)
- Nogle opskrifter kan starte med at stege kød, andre med at koge pasta/ris, andre med at forberede grøntsager
- Varier rækkefølgen af steps - ikke altid samme struktur
- Summary kan være kort (1-2 sætninger) eller lidt længere (3-4 sætninger) - varier det

Returnér kun valid JSON i det nøjagtige format. VIKTIGT: amount skal være et positivt tal - IKKE tom eller 0.

VOKSEN-TWIST (VALGFRI) - OBLIGATORISK SEKTION:
Opskriften SKAL altid inkludere en "voksen-twist" sektion i notes feltet. Denne sektion skal give 2-3 hurtige forslag til at gøre retten mere spændende for voksne uden at ødelægge børneversionen.
Twist-typer kan være:
- Stærk/syrlig topping ved bordet (chiliolie, sriracha-mayo, pickles)
- Crunch/umami (ristede nødder, sprøde løg, parmesan)
- Friskhed (citron, urter, salsa verde)
- Ekstra sauce til voksne (fx stærkere variant i lille skål)
VIKTIGT: Twists må IKKE være integreret i selve børnebasen - det skal kunne tilføjes individuelt ved servering.
Format: "<p><strong>Voksen-twist (valgfrit):</strong></p><ul><li>Forslag 1</li><li>Forslag 2</li><li>Forslag 3</li></ul>"`
      },
      {
        role: "user",
        content: `Generer en NY og UNIK Familiemad opskrift der er FULDSTÆNDIG forskellig fra eksisterende opskrifter.

KRITISK: Denne opskrift skal være UNIK - ikke bare en lille variation af en eksisterende opskrift.
- Vælg en HELT ANDEN ret-type end eksisterende opskrifter
- Brug forskellige ingredienser og tilberedningsmetoder
- Varier protein, grøntsager og base (pasta/ris/kartofler)
- Hver opskrift skal have sin egen karakter og smagsprofil

STRUKTUR-VARIATION - VIGTIGT:
Varier strukturen for at undgå ensartet format:
- Varier antal steps (4-8 steps, ikke altid samme antal)
- Varier længden af instruktioner (nogle korte, nogle mere detaljerede)
- Varier om du bruger grupper i ingredienser og instruktioner (nogle gange ja, nogle gange nej)
- Varier rækkefølgen af steps (ikke altid samme struktur)
- Varier længden af summary (1-4 sætninger)
- Brug forskellige formuleringer - ikke samme sprogbrug hver gang

PARAMETRE DER SKAL PÅVIRKE OPSKRIFTEN:
${parameterInstructions}

EKSISTERENDE OPSKRIFTER (undgå at duplikere eller ligne disse - vælg noget HELT ANDET):
${existingRecipeInfo.length > 0 
  ? existingRecipeInfo.map(r => `- ${r.title}${r.ingredients ? ` (${r.ingredients})` : ''}`).join('\n')
  : '(Ingen eksisterende Familiemad opskrifter - du har frit valg)'}

FORSLAG TIL VARIATION (brug disse som inspiration, ikke direkte kopi - BALANCER mellem pasta, ris og kartofler):
- Italienske pasta-retter: spaghetti bolognese, spaghetti med kødsovs, pasta carbonara, penne med tomatsauce, lasagne, pasta med kylling, pasta med fisk, pasta med grøntsager
- Dansk klassikere: boller i karry, frikadeller med brun sovs, hakkebøf med løg, kylling i karry
- Ris-retter: risotto med kylling, ris med kylling og grønt, ris med kød og sauce, ris med fisk, ris med grøntsager
- Kartoffel-retter: kartoffelmos, ovnbagte kartofler, kartoffelgratin, kartofler i gryde
- Gryderetter: karry, stuvning, gryderet med sauce
- Ovnbagte retter: ovnbagt kylling, ovnbagt fisk, ovnbagte grøntsager
- Forskellige proteiner: kylling, oksekød, svinekød, fisk, vegetarisk
- Forskellige grøntsager: broccoli, gulerødder, blomkål, zucchini, spinat

VIKTIGT: Varier mellem pasta, ris og kartofler - ikke altid kartofler! Hvis du har genereret flere kartoffel-retter i træk, vælg pasta eller ris i stedet.

INGREDIENS FORMATERING - FØLG DISSE REGLER:
- Brug ALTID små bogstaver i ingrediensnavne (name feltet) - IKKE stort forbogstav!
- Eksempler: "kartofler" (IKKE "Kartofler"), "kyllingebryst" (IKKE "Kyllingebryst"), "løg" (IKKE "Løg")
- Hvidløg: "1 stk hvidløgsfed" (IKKE "2 fed hvidløg" eller "1 stk hvidløg")
- Persille: "0,25 bundt persille" (IKKE "1 håndfuld persille" eller "1 bundt persille")
- Purløg: "1 stk purløg" med "fintsnittet" i notes feltet (IKKE "fintsnittet purløg")
- Andre krydderurter: "0,5 bundt timian", "0,25 bundt rosmarin"
- UNDGÅ duplikationer: Skriv kun "1 stk hvidløgsfed" ikke "1 stk hvidløgsfed" og "1 stk hvidløg"

MÆNGDER TIL 2 PERSONER - KRITISK:
Opskriften er ALTID til 2 personer. Brug REALISTISKE mængder - ikke for meget!
- Hakket oksekød/svinekød: 300-400 g (IKKE 500g eller mere - det er for meget!)
- Kyllingebryst/filet: 200-300 g (IKKE 400g eller mere)
- Fiskefilet: 200-300 g
- Kartofler: 400-500 g (ok, da de fylder meget)
- Ris/pasta (tør): 150-200 g (ikke mere end 200g)
- Grøntsager (broccoli, blomkål, etc.): 200-300 g
- Gulerødder: 2-3 stk (ikke 4-5 stk)
- Løg: 1 stk (ikke 2 stk)
- Tomater: 2-3 stk (ikke 4-5 stk)
- Æg: 2-3 stk (ikke 4 stk)
- Mælk/fløde: 200-300 ml (ikke 500 ml) - Brug ALTID "ml" i stedet for "dl" (1 dl = 100 ml)
- Smør/olie: 20-30 g (ikke 50g)
HUSK: Disse mængder er til 2 personer. Hvis du er i tvivl, vælg den mindre mængde.

Returnér kun valid JSON i det nøjagtige format herunder. Ingen ekstra tekst, ingen markdown.
Brug HTML i felterne summary, instructions_flat[].text og notes (enkle <p> eller <ul>/<ol> er nok).

Enheder: Brug gram, ml (IKKE dl - konverter dl til ml: 1 dl = 100 ml), tsk, spsk, stk, bundt.
Alle ingredienser i ingredients_flat skal have name, type, amount, unit, og notes (tom streng hvis ikke relevant).
VIKTIGT: amount skal være et positivt tal (f.eks. "2", "150", "0.5") - IKKE tom eller 0.
Brug grupper i både ingredienser og instruktioner, når det giver mening (fx "Kød", "Sauce", "Topping").

JSON-struktur (obligatorisk):
{
  "name": "string (opskriftens titel)",
  "summary": "string (HTML formateret beskrivelse)",
  "servings": "string (antal portioner)",
  "prep_time": "string (forberedelsestid i minutter)",
  "cook_time": "string (tilberedningstid i minutter)", 
  "total_time": "string (total tid i minutter)",
  "tags": {
    "course": ["string array (f.eks. 'Aftensmad')"],
    "cuisine": ["string array (f.eks. 'Familiemad')"]
  },
  "ingredients_flat": [
    {
      "name": "string (ingrediens navn eller gruppe navn)",
      "type": "string ('ingredient' eller 'group')",
      "amount": "string (mængde, kun for ingredienser)",
      "unit": "string (enhed, kun for ingredienser)", 
      "notes": "string (noter, kun for ingredienser)"
    }
  ],
  "instructions_flat": [
    {
      "name": "string (instruktion gruppe navn eller tom)",
      "text": "string (HTML formateret instruktion)",
      "type": "string ('instruction' eller 'group')"
    }
  ],
  "notes": "string (HTML formateret noter - SKAL inkludere 'Voksen-twist (valgfrit)' sektion)"
}`
      }
    ]

    // Generate recipe with retries to reduce transient JSON-format failures
    let recipe: any = null
    let lastGenerationError: Error | null = null

    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryHint =
        attempt > 1
          ? {
              role: 'system',
              content:
                'FORRIGE SVAR KUNNE IKKE PARSES. Returnér KUN gyldig JSON i præcis den ønskede struktur. Ingen ekstra tekst.',
            }
          : null

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: retryHint ? [...baseMessages, retryHint] : baseMessages,
          temperature: 1.2, // Increased to 1.2 for maximum variation and creativity
          max_tokens: 2500
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
      }

      const completion = await response.json()
      const recipeContent = completion.choices[0]?.message?.content

      if (!recipeContent) {
        lastGenerationError = new Error('No recipe content generated')
        continue
      }

      try {
        recipe = parseGeneratedRecipe(recipeContent)
        lastGenerationError = null
        break
      } catch (parseError) {
        lastGenerationError = parseError instanceof Error ? parseError : new Error('Failed to parse generated recipe')
        console.warn(`⚠️ Familiemad parse failed on attempt ${attempt}, retrying...`)
      }
    }

    if (!recipe) {
      throw lastGenerationError || new Error('Failed to generate valid Familiemad recipe')
    }
    
    // Validate that title doesn't already exist
    const normalizedNewTitle = recipe.title?.toLowerCase().trim()
    const isDuplicate = existingTitles.some(existingTitle => {
      const normalized = existingTitle.toLowerCase().trim()
      return normalized === normalizedNewTitle || 
             normalized.includes(normalizedNewTitle) || 
             normalizedNewTitle.includes(normalized)
    })
    
    if (isDuplicate) {
      console.warn(`⚠️ Generated recipe title "${recipe.title}" is too similar to existing recipes`)
      // Don't fail, but log warning - user can still edit and save
    }
    
    console.log(`✅ Generated Familiemad recipe: ${recipe.title}${isDuplicate ? ' (⚠️ Similar to existing)' : ''}`)

    // Generate Midjourney prompt using centralized function
    const midjourneyPrompt = await generateMidjourneyPrompt(recipe)
    console.log(`🎨 Generated Midjourney prompt: ${midjourneyPrompt.substring(0, 100)}...`)

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

    return NextResponse.json({
      success: true,
      recipe,
      midjourneyPrompt,
      aiTips
    })

  } catch (error) {
    console.error('Error generating Familiemad recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Familiemad recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}


// Removed local generateMidjourneyPrompt and translateTitleForMidjourney functions - now using centralized version

function buildParameterInstructions(params: FamiliemadParameters): string {
  const instructions: string[] = []
  
  // One-pot instructions (NB: Pasta-retter er ofte one-pot retter!)
  if (params.onePot === 3) {
    instructions.push('ONE-POT PRIORITET: Opskriften SKAL være så alt laves i én gryde/pande/ovnform. Minimal opvask er kritisk. VIGTIGT: Pasta-retter er ofte perfekte one-pot retter, da pastaen koges sammen med saucen og ingredienserne i samme gryde. Prioriter pasta-retter når one-pot er høj.')
  } else if (params.onePot === 0) {
    instructions.push('ONE-POT: Må gerne være klassisk med flere elementer og forskellige gryder/pander.')
  } else if (params.onePot >= 2) {
    instructions.push('ONE-POT: Prioriter retter hvor det meste laves i én gryde/pande/ovnform. Pasta-retter er ofte ideelle one-pot retter, da pastaen koges sammen med saucen.')
  }
  
  // Stivelses-klassiker instructions
  if (params.stivelsesKlassiker === 3) {
    instructions.push('STIVELSES-KLASSIKER: Tydelig klassiker med pasta/ris/kartofler som bærende element. Dette er hovedfokus i retten. Hvis kombineret med høj one-pot, prioriter pasta-retter (spaghetti, penne, lasagne, etc.) da de ofte er one-pot.')
  } else if (params.stivelsesKlassiker === 0) {
    instructions.push('STIVELSES-KLASSIKER: Undgå stivelses-base som hovedfokus. Lad grønt/protein bære retten, men stadig familiemad (ikke keto).')
  } else if (params.stivelsesKlassiker >= 2) {
    instructions.push('STIVELSES-KLASSIKER: Inkludér pasta/ris/kartofler som vigtig del af retten. Hvis kombineret med høj one-pot, overvej pasta-retter.')
  }
  
  // Mere grønt instructions
  if (params.mereGront === 3) {
    instructions.push('MERE GRØNT: Integrér ekstra grøntsager i sauce/fars/gryde. IKKE "lav en stor salat" - grøntsagerne skal være en naturlig del af retten.')
  } else if (params.mereGront === 0) {
    instructions.push('MERE GRØNT: HELT UDEN grøntsager eller minimalt med grøntsager. Fokusér på protein og kulhydrat (pasta/ris/kartofler). UNDGÅ at tilføje grøntsager som broccoli, løg, gulerødder, blomkål, etc. Kun brug grøntsager hvis de er absolut nødvendige for retten (fx. tomater i tomatsauce, men IKKE ekstra grøntsager).')
  } else if (params.mereGront === 1) {
    instructions.push('MERE GRØNT: Normalt niveau af grøntsager - brug kun de grøntsager der er traditionelt i retten.')
  } else if (params.mereGront >= 2) {
    instructions.push('MERE GRØNT: Inkludér flere grøntsager integreret i retten.')
  }
  
  // Børnefavorit instructions
  if (params.bornefavorit === 3) {
    instructions.push('BØRNEFAVORIT: "Sikker vinder"-profil - kendte smage, trygge teksturer, ofte højt accepteret af børn. Comfort-klassiker stil.')
  } else if (params.bornefavorit === 0) {
    instructions.push('BØRNEFAVORIT: Mere neutralt/varieret profil.')
  } else if (params.bornefavorit >= 2) {
    instructions.push('BØRNEFAVORIT: Prioriter retter som børn typisk vil spise.')
  }
  
  // Tid instructions
  if (params.maxTid === 15) {
    instructions.push('TID: Maksimalt 15 minutter total tid. Begræns antal steps og brug hurtige proteiner + simple grøntsager.')
  } else if (params.maxTid === 30) {
    instructions.push('TID: Maksimalt 30 minutter total tid. Balanceret mellem hastighed og kompleksitet.')
  } else if (params.maxTid === 45) {
    instructions.push('TID: Maksimalt 45 minutter total tid. Mere komplekse retter er tilladt.')
  } else {
    instructions.push('TID: Ingen maksimal tidsgrænse. Klassiske retter med længere tilberedningstid er tilladt (fx lasagne, simreretter og ovnretter).')
  }
  
  // Recipe type instructions
  if (params.recipeType && params.recipeType.trim() !== '') {
    const recipeTypeMap: Record<string, string> = {
      'burger': 'RET-TYPE: Generér en BØRNEVENLIG burger opskrift. Burgeren skal være nem at spise for børn, med bløde ingredienser og milde smage. Overvej mini-burgere eller burger wraps hvis det passer bedre.',
      'pizza': 'RET-TYPE: Generér en BØRNEVENLIG pizza opskrift. Pizzaen skal være nem at lave, med ingredienser børn kan lide. Overvej mini-pizzaer eller pizza wraps.',
      'taco': 'RET-TYPE: Generér en BØRNEVENLIG taco opskrift. Tacoen skal være nem at spise for børn, med milde smage og bløde ingredienser.',
      'lasagne': 'RET-TYPE: Generér en BØRNEVENLIG lasagne opskrift. Lasagnen skal være klassisk familiemad med milde smage.',
      'pasta-bolognese': 'RET-TYPE: Generér en BØRNEVENLIG pasta bolognese opskrift. Klassisk familiemad med kødsovs.',
      'pasta-carbonara': 'RET-TYPE: Generér en BØRNEVENLIG pasta carbonara opskrift. Børnevenlig version med milde smage.',
      'pasta-med-kylling': 'RET-TYPE: Generér en BØRNEVENLIG pasta med kylling opskrift.',
      'risotto': 'RET-TYPE: Generér en BØRNEVENLIG risotto opskrift. Børnevenlig version med milde smage.',
      'kylling-i-karry': 'RET-TYPE: Generér en BØRNEVENLIG kylling i karry opskrift. Klassisk børnevenlig familiemad.',
      'boller-i-karry': 'RET-TYPE: Generér en BØRNEVENLIG boller i karry opskrift. Klassisk børnevenlig familiemad.',
      'frikadeller': 'RET-TYPE: Generér en BØRNEVENLIG frikadeller opskrift. Klassisk børnevenlig familiemad.',
      'hakkebof': 'RET-TYPE: Generér en BØRNEVENLIG hakkebøf opskrift. Klassisk børnevenlig familiemad.',
      'fiskefilet': 'RET-TYPE: Generér en BØRNEVENLIG fiskefilet opskrift. Børnevenlig version med milde smage.',
      'ovnbagt-kylling': 'RET-TYPE: Generér en BØRNEVENLIG ovnbagt kylling opskrift.',
      'gryderet': 'RET-TYPE: Generér en BØRNEVENLIG gryderet opskrift. En simpel, velsmagende gryderet.',
      'one-pot': 'RET-TYPE: Generér en BØRNEVENLIG one-pot opskrift. Alt laves i én gryde/pande.',
      'wraps': 'RET-TYPE: Generér en BØRNEVENLIG wraps opskrift. Nemme at spise for børn.',
      'suppe': 'RET-TYPE: Generér en BØRNEVENLIG suppe opskrift. Velsmagende og nem at spise.',
      'bowl': 'RET-TYPE: Generér en BØRNEVENLIG bowl opskrift. Nem at spise med protein, kulhydrat og grønt.',
      'omelet': 'RET-TYPE: Generér en BØRNEVENLIG omelet opskrift. Kan bruges til både morgenmad og aftensmad.',
      'mac-and-cheese': 'RET-TYPE: Generér en BØRNEVENLIG mac and cheese opskrift. Klassisk børnefavorit.',
      'pastasalat': 'RET-TYPE: Generér en BØRNEVENLIG pastasalat opskrift. Lun salat med pasta.',
      'kyllingesalat': 'RET-TYPE: Generér en BØRNEVENLIG kyllingesalat opskrift. Lun salat med kylling.'
    }
    
    const instruction = recipeTypeMap[params.recipeType.toLowerCase()] || `RET-TYPE: Generér en BØRNEVENLIG ${params.recipeType} opskrift. Børnevenlig version med milde smage.`
    instructions.push(instruction)
  }
  
  // Inspiration instructions
  if (params.inspiration && params.inspiration.trim() !== '') {
    instructions.push(`INSPIRATION: Brugeren ønsker en opskrift inspireret af: "${params.inspiration}". Lav en BØRNEVENLIG version af denne inspiration. Opskriften skal være familievenlig, nem at lave, og med ingredienser børn kan lide.`)
  }
  
  return instructions.length > 0 
    ? `PARAMETRE-SPECIFIKKE INSTRUKTIONER:\n${instructions.map(i => `- ${i}`).join('\n')}\n\n`
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
    
    // Handle new format with ingredients_flat and instructions_flat
    if (recipe.ingredients_flat && recipe.instructions_flat) {
      // Convert from new format to old format for validation
      const ingredients = recipe.ingredients_flat
        .filter((item: any) => item.type === 'ingredient')
        .map((item: any) => {
          const amount = parseFloat(item.amount)
          if (isNaN(amount) || amount <= 0) {
            console.warn(`Invalid amount for ingredient ${item.name}: ${item.amount}, using 1 as default`)
          }
          // Konverter dl til ml (1 dl = 100 ml)
          let finalUnit = item.unit || 'stk'
          let finalAmount = isNaN(amount) || amount <= 0 ? 1 : amount
          
          if (finalUnit.toLowerCase() === 'dl') {
            finalUnit = 'ml'
            finalAmount = finalAmount * 100
          }
          
          // Rens ingrediensnavn - fjern mængde og enhed hvis de allerede er i navnet
          let cleanedName = (item.name || '').toLowerCase().trim()
          
          // Fjern mængde og enhed fra navnet hvis de allerede er der
          // Eksempel: "1 stk hvidløgsfed" -> "hvidløgsfed"
          // Eksempel: "2 fed hvidløg" -> "hvidløg"
          // Eksempel: "300 g hakket oksekød" -> "hakket oksekød"
          const amountStr = String(finalAmount).replace('.', ',')
          const unitStr = finalUnit.toLowerCase()
          
          // Fjern mængde + enhed fra starten af navnet
          cleanedName = cleanedName
            .replace(new RegExp(`^${amountStr}\\s*${unitStr}\\s+`, 'i'), '') // "300 g hakket oksekød" -> "hakket oksekød"
            .replace(new RegExp(`^${amountStr}\\s+`, 'i'), '') // "300 hakket oksekød" -> "hakket oksekød"
            .replace(new RegExp(`^${unitStr}\\s+`, 'i'), '') // "stk hvidløgsfed" -> "hvidløgsfed"
            .replace(new RegExp(`\\b${amountStr}\\s*${unitStr}\\b`, 'gi'), '') // Fjern hvis det er midt i navnet
            .replace(new RegExp(`\\b${amountStr}\\b`, 'gi'), '') // Fjern hvis mængde er alene
            .replace(new RegExp(`\\b${unitStr}\\b`, 'gi'), '') // Fjern hvis enhed er alene
            .replace(/\s+/g, ' ') // Fjern ekstra mellemrum
            .trim()
          
          return {
            name: cleanedName,
            amount: finalAmount,
            unit: finalUnit,
            notes: item.notes || ''
          }
        })
      
      const instructions = recipe.instructions_flat
        .filter((item: any) => item.type === 'instruction')
        .map((item: any, index: number) => ({
          stepNumber: index + 1,
          instruction: item.text.replace(/<[^>]*>/g, ''), // Remove HTML tags
          time: 0,
          tips: ''
        }))
      
      return {
        title: recipe.name,
        description: recipe.summary ? recipe.summary.replace(/<[^>]*>/g, '') : '',
        ingredients: ingredients,
        instructions: instructions,
        servings: 2, // Always 2 portions for familiemad
        prepTime: parseInt(recipe.prep_time) || 15,
        cookTime: parseInt(recipe.cook_time) || 30,
        difficulty: 'Nem',
        dietaryCategories: getDietaryCategories('familiemad'),
        nutritionalInfo: {
          calories: 400,
          protein: 25,
          carbs: 45,
          fat: 18,
          fiber: 6
        }
      }
    }
    
    // Handle old format
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Missing required recipe fields')
    }

    // Add category-specific dietary categories
    recipe.dietaryCategories = getDietaryCategories('familiemad')
    
    // Ensure all required fields exist
    return {
      title: normalizeDanishRecipeTitle(recipe.title),
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: 2, // Always 2 portions for familiemad
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Nem',
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('familiemad'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 400,
        protein: 25,
        carbs: 45,
        fat: 18,
        fiber: 6
      }
    }
  } catch (error) {
    console.error('Error parsing generated Familiemad recipe:', error)
    console.error('Content:', content.substring(0, 500))
    throw new Error('Failed to parse generated recipe')
  }
}

