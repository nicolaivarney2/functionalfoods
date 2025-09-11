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

    // Get existing recipe titles to avoid duplicates
    const existingTitles = existingRecipes.map(r => r.title.toLowerCase())
    
    // Create Familiemad-specific system prompt
    const systemPrompt = createFamiliemadSystemPrompt(existingTitles)
    
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
            content: `Generer en ny Familiemad opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på danske traditioner og klassiske retter der passer til hele familien.`
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
    const recipe = parseGeneratedRecipe(recipeContent, 'familiemad')
    
    console.log(`✅ Generated Familiemad recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
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

function createFamiliemadSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i dansk familiekost og traditionel madlavning. Generer en detaljeret Familiemad opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

FAMILIEMAD PRINCIPPER:
- Klassiske danske retter der passer til alle aldre
- Næringsrige ingredienser i balanceret mængde
- Nemme at lave og populære hos børn og voksne
- Brug almindelige ingredienser der er lette at få fat i
- Fokus på danske traditioner og smag
- Portioner der passer til 4-6 personer

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Familiemad opskrift titel",
  "description": "Kort beskrivelse der appellerer til familien",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g",
      "notes": "valgfri note"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion",
      "time": 10,
      "tips": "valgfri tip"
    }
  ],
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["familiemad"],
  "nutritionalInfo": {
    "calories": 400,
    "protein": 25.0,
    "carbs": 45.0,
    "fat": 18.0,
    "fiber": 6.0
  }
}

FAMILIEMAD INGREDIENSER:
- Kød: hakket oksekød, kylling, svinekoteletter
- Fisk: torsk, laks, makrel
- Grøntsager: kartofler, gulerødder, broccoli, kål
- Fuldkorn: rugbrød, havregryn, pasta
- Mælkeprodukter: mælk, fløde, ost
- Æg: hele æg til madlavning
- Krydderier: salt, peber, laurbær, timian

KLASSISKE DANSKE RETTER:
- Frikadeller med kartofler og brun sovs
- Kylling i karry med ris
- Fiskefilet med kartofler og remoulade
- Hakkebøf med løg og kartofler
- Pasta med kødsovs
- Ovnbagt kylling med grøntsager`
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
    recipe.dietaryCategories = ['familiemad']
    
    // Ensure all required fields exist
    return {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: recipe.servings || 4,
      prepTime: recipe.prepTime || 15,
      cookTime: recipe.cookTime || 30,
      difficulty: recipe.difficulty || 'Easy',
      dietaryCategories: recipe.dietaryCategories || ['familiemad'],
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
    throw new Error('Failed to parse generated recipe')
  }
}

