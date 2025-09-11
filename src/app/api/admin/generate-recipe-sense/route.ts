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

    console.log(`🧠 Generating Sense recipe: ${categoryName}`)

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
    
    // Create Sense-specific system prompt
    const systemPrompt = createSenseSystemPrompt(existingTitles)
    
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
            content: `Generer en ny Sense opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på danske ingredienser og traditioner, men optimeret for hjernefunktion og kognitiv sundhed.`
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
    const recipe = parseGeneratedRecipe(recipeContent, 'sense')
    
    console.log(`✅ Generated Sense recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
    })

  } catch (error) {
    console.error('Error generating Sense recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Sense recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createSenseSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i hjerne-sund madlavning og dansk køkken. Generer en detaljeret Sense opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

SENSE KOST PRINCIPPER:
- Omega-3 fedtsyrer for hjernefunktion
- Antioksidanter mod inflammation
- Fuldkorn for stabil blodsukker
- Bær og mørke grøntsager for hukommelse
- Nødder og frø for hjernefedt
- Fisk for DHA og EPA
- Kurkuma og ingefær mod inflammation

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Sense opskrift titel",
  "description": "Kort beskrivelse med fokus på hjernefordele",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g",
      "notes": "valgfri note om hjernefordele"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion med hjerne-tips",
      "time": 10,
      "tips": "valgfri hjerne-tip"
    }
  ],
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["sense", "sund"],
  "nutritionalInfo": {
    "calories": 300,
    "protein": 20.0,
    "carbs": 35.0,
    "fat": 15.0,
    "fiber": 8.0
  }
}

SENSE INGREDIENSER AT FOKUSERE PÅ:
- Fisk: laks, makrel, sardiner, tun (omega-3)
- Nødder: valnødder, mandler, cashews (hjernefedt)
- Bær: blåbær, jordbær, hindbær (antioksidanter)
- Grøntsager: broccoli, spinat, kål, rødbeder (folat)
- Fuldkorn: rug, havre, quinoa (B-vitaminer)
- Frø: chia, hør, solsikkefrø (omega-3)
- Krydderier: kurkuma, ingefær, kanel (antiinflammatorisk)
- Mørk chokolade: 70%+ kakao (flavonoider)

HJEJNE-FOKUSEREDE TIPS:
- Tilføj valnødder for omega-3
- Brug kurkuma for antiinflammatorisk effekt
- Inkluder bær for antioksidanter
- Vælg fed fisk for DHA
- Tilføj mørke grøntsager for folat
- Brug fuldkorn for stabil energi`
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
    recipe.dietaryCategories = ['sense', 'sund']
    
    // Ensure all required fields exist
    return {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: recipe.servings || 4,
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Medium',
      dietaryCategories: recipe.dietaryCategories || ['sense'],
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 300,
        protein: 20,
        carbs: 35,
        fat: 15,
        fiber: 8
      }
    }
  } catch (error) {
    console.error('Error parsing generated Sense recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

