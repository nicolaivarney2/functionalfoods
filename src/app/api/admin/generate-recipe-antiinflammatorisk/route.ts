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
            content: systemPrompt
          },
          {
            role: "user",
            content: `Generer en ny Antiinflammatorisk opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på danske ingredienser og traditioner, men tilpasset til antiinflammatorisk kost.`
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

    const data = await response.json()
    const recipeContent = data.choices[0]?.message?.content
    
    if (!recipeContent) {
      throw new Error('No recipe content generated')
    }

    // Parse the generated recipe
    const recipe = parseGeneratedRecipe(recipeContent)
    
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
  return `Du er en ekspert i Antiinflammatorisk kost og dansk madlavning. Generer en detaljeret Antiinflammatorisk opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

ANTIINFLAMMATORISK KOST REGLER:
- Fokus på omega-3 fedtsyrer (fisk, nødder, frø)
- Antioksidanter (bær, grøntsager, krydderier)
- Kurkuma, ingefær, kanel, chili
- Undgå: processerede fødevarer, for meget omega-6
- Brug: fisk, nødder, bær, grøntsager, krydderier

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Antiinflammatorisk opskrift titel",
  "description": "Kort beskrivelse med fokus på antiinflammatoriske fordele",
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
      "instruction": "Detaljeret instruktion med antiinflammatoriske tips",
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
- Titel: første bogstav stort, resten små bogstaver

ANTIINFLAMMATORISKE INGREDIENSER AT FOKUSERE PÅ:
- Fisk: laks, makrel, sardiner, tun (omega-3)
- Nødder: valnødder, mandler, hørfrø (omega-3)
- Bær: jordbær, hindbær, blåbær (antioksidanter)
- Grøntsager: broccoli, spinat, kål, zucchini
- Krydderier: kurkuma, ingefær, kanel, chili
- Olivenolie: ekstra virgin olivenolie

UNDGÅ:
- Processerede fødevarer
- For meget omega-6 (solsikkeolie, majsolie)
- Sukker og sødemidler
- Transfedt
- For meget rødt kød`
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
    recipe.dietaryCategories = getDietaryCategories('antiinflammatorisk')
    
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
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('antiinflammatorisk'),
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
