import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'

interface ExistingRecipe {
  id: string
  title: string
  description: string
  dietaryCategories?: string[]
}

interface GenerateRecipeRequest {
  categoryName: string
  existingRecipes: ExistingRecipe[]
}

export async function POST(request: NextRequest) {
  try {
    const { categoryName, existingRecipes }: GenerateRecipeRequest = await request.json()
    
    if (!categoryName) {
      return NextResponse.json(
        { success: false, error: 'categoryName is required' },
        { status: 400 }
      )
    }

    console.log(`🌿 Generating Antiinflammatorisk recipe: ${categoryName}`)

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
    
    // Create Antiinflammatorisk-specific system prompt
    const systemPrompt = createAntiinflammatoriskSystemPrompt(existingTitles)
    
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
            content: `Generer en ny Antiinflammatorisk opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på ingredienser der bekæmper inflammation.`
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
    const recipe = parseGeneratedRecipe(recipeContent, 'antiinflammatorisk')
    
    console.log(`✅ Generated Antiinflammatorisk recipe: ${recipe.title}`)

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
          title: recipe.title,
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
    const midjourneyPrompt = generateMidjourneyPrompt(recipe)

    return NextResponse.json({
      success: true,
      recipe,
      aiTips,
      midjourneyPrompt
    })

  } catch (error) {
    console.error('Error generating Antiinflammatorisk recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Antiinflammatorisk recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createAntiinflammatoriskSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i antiinflammatorisk kost og helbredsfremmende madlavning. Generer en detaljeret Antiinflammatorisk opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

ANTIINFLAMMATORISK KOST PRINCIPPER:
- Omega-3 fedtsyrer mod inflammation
- Antioksidanter fra bær og grøntsager
- Kurkuma og ingefær som naturlige antiinflammatoriske stoffer
- Mørke grøntsager for folat og vitaminer
- Fisk for DHA og EPA
- Nødder og frø for hjernefedt
- Undgå processerede fødevarer og for meget omega-6

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Antiinflammatorisk opskrift titel",
  "description": "Kort beskrivelse med fokus på helbredsfordele",
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
      "instruction": "Detaljeret instruktion med helbreds-tips",
      "time": 10
    }
  ],
  "servings": 2,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["antiinflammatorisk", "sund"],
  "nutritionalInfo": {
    "calories": 280,
    "protein": 22.0,
    "carbs": 25.0,
    "fat": 12.0,
    "fiber": 8.0
  }
}

INGREDIENS REGLER:
- ALT skal være i gram (g) - aldrig kg eller stk
- Kød: "500 g oksekød", "200 g kyllingebryst"
- Grøntsager: "300 g broccoli", "200 g spinat"
- Fedt: "30 g olivenolie", "50 g smør"
- Nødder: "30 g mandler", "20 g valnødder"
- Bær: "100 g jordbær", "50 g blåbær"
- Krydderier: "5 g kurkuma", "10 g ingefær"
- Æg: "200 g æg" (ca. 4 stk)
- Fisk: "400 g laks", "300 g makrel"
- Ingen notes felt på ingredienser
- Portioner: altid 2
- Titel: første bogstav stort, resten små bogstaver

ANTIINFLAMMATORISKE INGREDIENSER:
- Fisk: laks, makrel, sardiner, tun (omega-3)
- Bær: blåbær, jordbær, hindbær (antioksidanter)
- Grøntsager: broccoli, spinat, kål, rødbeder (folat)
- Krydderier: kurkuma, ingefær, kanel, chili (antiinflammatorisk)
- Nødder: valnødder, mandler (omega-3)
- Frø: chia, hør, solsikkefrø (omega-3)
- Mørk chokolade: 70%+ kakao (flavonoider)
- Olivenolie: ekstra virgin (mono-umættede fedtsyrer)

HELBREDS-FOKUSEREDE TIPS:
- Tilføj kurkuma for antiinflammatorisk effekt
- Brug ingefær mod inflammation
- Inkluder bær for antioksidanter
- Vælg fed fisk for omega-3
- Tilføj mørke grøntsager for folat
- Brug olivenolie i stedet for solsikkeolie`
}

function parseGeneratedRecipe(content: string, category: string): any {
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
    recipe.dietaryCategories = ['antiinflammatorisk', 'sund']
    
    // Ensure all required fields exist
    return {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: 2, // Always 2 portions
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Medium',
      dietaryCategories: recipe.dietaryCategories || ['antiinflammatorisk'],
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 280,
        protein: 22,
        carbs: 25,
        fat: 12,
        fiber: 8
      }
    }
  } catch (error) {
    console.error('Error parsing generated Antiinflammatorisk recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

function generateMidjourneyPrompt(recipe: any): string {
  const title = recipe.title?.toLowerCase() || 'opskrift'
  const mainIngredients = recipe.ingredients?.slice(0, 3).map((ing: any) => ing.name).join(', ') || ''
  
  return `top-down hyperrealistic photo of *${title}, featuring ${mainIngredients}, beautifully plated*, served on a white ceramic plate on a rustic dark wooden tabletop, garnished with fresh herbs, soft natural daylight, high detail --ar 4:3`
}

