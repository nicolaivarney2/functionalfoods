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

    console.log(`🦕 Generating Paleo recipe: ${categoryName}`)

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

    if (!openaiConfig.assistantIds?.paleo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Paleo Assistant ID not configured',
          details: 'Please configure Paleo Assistant ID in admin settings'
        },
        { status: 500 }
      )
    }

    // Get existing recipe titles to avoid duplicates
    const existingTitles = existingRecipes.map(r => r.title.toLowerCase())
    
    // Create Paleo-specific system prompt
    const systemPrompt = createPaleoSystemPrompt(existingTitles)
    
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
            content: `Generer en ny Paleo/LCHF opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på naturlige ingredienser vores forfædre spiste.`
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
    const recipe = parseGeneratedRecipe(recipeContent, 'paleo')
    
    console.log(`✅ Generated Paleo recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
    })

  } catch (error) {
    console.error('Error generating Paleo recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Paleo recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createPaleoSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i Paleo kost og naturlig madlavning. Generer en detaljeret Paleo/LCHF opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

PALEO KOST PRINCIPPER:
- Kun naturlige ingredienser vores forfædre spiste
- Lav kulhydrat, høj fedt (LCHF)
- Ingen korn, bælgfrugter, mælkeprodukter eller sukker
- Fokus på: kød, fisk, æg, grøntsager, nødder, bær
- Naturlige fedtstoffer: kokosolie, olivenolie, smør, ghee
- Ingen processerede fødevarer

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Paleo opskrift titel",
  "description": "Kort beskrivelse med fokus på naturlige ingredienser",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g",
      "notes": "valgfri note om paleo fordele"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion med paleo tips",
      "time": 10,
      "tips": "valgfri paleo tip"
    }
  ],
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["paleo", "lchf"],
  "nutritionalInfo": {
    "calories": 320,
    "protein": 30.0,
    "carbs": 12.0,
    "fat": 22.0,
    "fiber": 6.0
  }
}

PALEO INGREDIENSER:
- Kød: oksekød, svinekød, lam, vildt
- Fisk: laks, makrel, sardiner, tun
- Æg: hele æg
- Grøntsager: broccoli, spinat, kål, zucchini, squash
- Nødder: mandler, valnødder, cashews, pecan
- Frø: chia, hør, solsikkefrø, græskarkerner
- Bær: jordbær, hindbær, blåbær
- Fedt: kokosolie, olivenolie, smør, ghee, avocado
- Krydderier: kurkuma, ingefær, kanel, chili

UNDGÅ:
- Korn: hvede, rug, havre, ris, majs
- Bælgfrugter: bønner, linser, kikærter, soja
- Mælkeprodukter: mælk, ost, yoghurt (undtagen ghee)
- Sukker: alle former for sukker
- Processerede fødevarer`
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
    recipe.dietaryCategories = ['paleo', 'lchf']
    
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
      dietaryCategories: recipe.dietaryCategories || ['paleo'],
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 320,
        protein: 30,
        carbs: 12,
        fat: 22,
        fiber: 6
      }
    }
  } catch (error) {
    console.error('Error parsing generated Paleo recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

