import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
import { normalizeDanishRecipeTitle } from '@/lib/recipe-title-format'
import { generateMidjourneyPromptWithMeta } from '@/lib/midjourney-generator'

interface ExistingRecipe {
  id: string
  title: string
  description: string
  dietaryCategories?: string[]
}

/** dayType: '2' = fastedage (~500 kcal), '5' = spisedage (normal kost) */
interface FiveTwoParameters {
  dayType: '5' | '2'
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
  parameters?: FiveTwoParameters
}

export async function POST(request: NextRequest) {
  try {
    const { categoryName, existingRecipes, parameters }: GenerateRecipeRequest = await request.json()

    if (!categoryName) {
      return NextResponse.json({ success: false, error: 'categoryName is required' }, { status: 400 })
    }

    const dayType: '5' | '2' = parameters?.dayType === '5' ? '5' : '2'

    console.log(`⏰ Generating 5:2 recipe (${dayType === '2' ? "2'er fastedag" : "5'er spisedag"}): ${categoryName}`)

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

    const existingTitles = existingRecipes.map((r) => r.title.toLowerCase())
    const systemPrompt = create5_2SystemPrompt(existingTitles, dayType)
    const userMessage = create5_2UserMessage(dayType)

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
          { role: 'user', content: userMessage },
        ],
        temperature: 0.75,
        max_tokens: 2800,
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

    const recipe = parseGeneratedRecipe(recipeContent, dayType)

    console.log(`✅ Generated 5:2 (${dayType}) recipe: ${recipe.title}`)

    let aiTips = ''
    try {
      const tipsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/generate-tips`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: recipe.title,
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

    const midjourney = await generateMidjourneyPromptWithMeta(recipe)

    return NextResponse.json({
      success: true,
      recipe,
      aiTips,
      midjourneyPrompt: midjourney.prompt,
      midjourneyPromptSource: midjourney.source,
      midjourneyPromptError: midjourney.error || null,
    })
  } catch (error) {
    console.error('Error generating 5:2 Faste recipe:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate 5:2 Faste recipe',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function create5_2UserMessage(dayType: '5' | '2'): string {
  if (dayType === '2') {
    return `Generer én ny 5:2-opskrift til en FASTEDAG (2'er). Den skal være unik og ikke ligne eksisterende liste.

Krav: ét sammenhængende måltid (hovedret) med høj mæthed pr. kalorie. Tænk at dette måltid skal give plads til et lille morgenmåltid eller en lille snack på samme fastedag, så nutritionalInfo.calories per portion skal som udgangspunkt ligge ca. 250-380 kcal og helst aldrig over 400 kcal.

Skriv tydeligt i beskrivelsen at retten er til 5:2 fastedag.`
  }

  return `Generer én ny 5:2-opskrift til en SPISEDAG (5'er) — de dage hvor man ikke faster og spiser normalt/varieret sund kost.

Den skal være unik og ikke ligne eksisterende liste. Ingen kaloriecap som på fastedagen; fokus på balanceret, realistisk hverdagsmad med tilfredsstillende portion. Nævn i beskrivelsen at retten passer til 5:2-spisedage.`
}

function create5_2SystemPrompt(existingTitles: string[], dayType: '5' | '2'): string {
  const shared = `
EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 12).map((title) => `- ${title}`).join('\n')}

FÆLLES FOR 5:2 DIÆTEN (kontekst):
- Ugen er struktureret: typisk **5 dage** med normal/varieret kost og **2 dage** med meget lav energi (faste).
- 5:2 handler om **mønster** og ikke om at alle opskrifter er lavkalorie.

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "kort beskrivende titel (på dansk, sætningscase)",
  "description": "2-4 sætninger",
  "ingredients": [ { "name": "...", "amount": 100, "unit": "g" } ],
  "instructions": [ { "stepNumber": 1, "instruction": "...", "time": 10 } ],
  "servings": 2,
  "prepTime": 10,
  "cookTime": 20,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["5:2"],
  "nutritionalInfo": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0 }
}

TITEL: sætningscase på dansk — kun første bogstav stort, ikke Title Case På Hvert Ord.
INGREDIENSER: mængder i gram (g) hvor muligt.

SMAG: Krydderier og køkkenstil må gerne være internationale, så længe 5:2-kravene til den aktuelle dagstype overholdes.
`

  if (dayType === '2') {
    return `Du er en ekspert i 5:2-intermittent faste og lavenergi-måltider, der stadig mætter.

${shared}

---

OPGAVE: **2'ER / FASTEDAG** (én af de to ugentlige dage med stærkt begrænset energi)

ESSENS:
- Den klassiske 5:2-fast er **ca. 500 kcal om dagen** for mange kvinder (ca. 600 kcal for mange mænd). Denne opskrift er **ikke hele dagens energi alene**; den skal normalt give plads til et lille morgenmåltid, kaffe med lidt mælk eller en let snack tidligere/senere på dagen.
- Derfor skal **kalorier i nutritionalInfo være per portion** og for en 2'er som udgangspunkt ligge i intervallet **ca. 250–380 kcal**, og helst **ikke over 400 kcal per portion**.
- **Mæthed pr. kalorie**: høj protein-tæthed, masser af grøntsager (volumen), begrænset tilsat fedt og sukker, smart krydderi.
- Brug som udgangspunkt en **mager animalsk proteinkilde** som fisk, kylling, kalkun eller magert okse-/svinekød. Lav kun retten vegetarisk, hvis det er helt oplagt ud fra opgaven.
- Undgå tunge saucer, store mængder olie, og tomme kalorier.
- portionsstørrelse: realistisk for en **sulten** fastedag — ikke mini-dessert som eneste måltid.

KRAV TIL nutritionalInfo (per portion):
- **calories**: mål ca. **250–380**, hårdt loft **400**.
- protein: gerne højt ift. kalorier.
- fiber: gerne højt (grøntsager, bælgfrugter i små mængder).

Beskrivelsen skal indeholde at retten er til **5:2 fastedag / 2'er** (du må bruge formuleringer som "til en af dine fastedage i 5:2").`
  }

  return `Du er en ekspert i hverdagskost og balanceret madlavning i en 5:2-livsstil.

${shared}

---

OPGAVE: **5'ER / SPISEDAG** (de fem dage om ugen hvor man **ikke** faster)

ESSENS:
- På spisedage spiser man **normalt** — ikke med den skarpe 500-kcal grænse.
- Opskriften skal føles som **sund og tilfredsstillende** mad: varierede grøntsager, god proteinkilde, fuldkorn eller kartoffel/ris/pasta efter måltidstype, sunde fedt.
- **Ikke** designet som slanke- eller fastedagsret; kalorier må gerne ligge på et **normalt niveau** for et aftensmåltid (fx ofte ca. 450–900 kcal per portion afhængigt af ret — ikke kunstigt lavt).
- Fokus: næring, smag, mæthed, familievenlige råvarer hvor det giver mening.

KRAV TIL nutritionalInfo (per portion):
- **calories**: typisk mindst **450** og gerne **op til ca. 900** for et fuldt hovedmåltid (ikke fastedagsniveau).
- Fordeling af makroer: balanceret, ikke ekstremt lavt kulhydrat medmindre det passer naturligt til retten.

Beskrivelsen skal indeholde at retten er til **5:2 spisedag / 5'er** (fx "passer til dine spisedage i 5:2").`
}

function parseGeneratedRecipe(content: string, dayType: '5' | '2'): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in generated content')
    }

    const recipe = JSON.parse(jsonMatch[0])

    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new Error('Missing required recipe fields')
    }

    recipe.dietaryCategories = getDietaryCategories('5-2')

    const tag =
      dayType === '2'
        ? "Til 5:2 fastedag (2'er — lavkalorie)."
        : "Til 5:2 spisedag (5'er — normal kost)."
    const desc = String(recipe.description || '').trim()
    const lower = desc.toLowerCase()
    const alreadyTagged =
      lower.includes('fastedag') ||
      lower.includes("2'er") ||
      lower.includes('spisedag') ||
      lower.includes("5'er") ||
      lower.includes('5:2')
    recipe.description = alreadyTagged ? desc : `${tag} ${desc}`.trim()

    const defaultNut =
      dayType === '2'
        ? { calories: 340, protein: 36, carbs: 24, fat: 10, fiber: 9 }
        : { calories: 620, protein: 42, carbs: 55, fat: 22, fiber: 8 }

    return {
      title: normalizeDanishRecipeTitle(recipe.title),
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: recipe.servings ?? 2,
      prepTime: recipe.prepTime || 10,
      cookTime: recipe.cookTime || 25,
      difficulty: recipe.difficulty || 'Easy',
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('5-2'),
      nutritionalInfo: recipe.nutritionalInfo || defaultNut,
    }
  } catch (error) {
    console.error('Error parsing generated 5:2 recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}
