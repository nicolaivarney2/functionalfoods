import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
import { generateMidjourneyPrompt } from '@/lib/midjourney-generator'

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

    console.log(`⏰ Generating 5:2 Faste recipe: ${categoryName}`)

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

    if (!openaiConfig.assistantIds?.['5-2']) {
      return NextResponse.json(
        { 
          success: false, 
          error: '5:2 Assistant ID not configured',
          details: 'Please configure 5:2 Assistant ID in admin settings'
        },
        { status: 500 }
      )
    }

    // Get existing recipe titles to avoid duplicates
    const existingTitles = existingRecipes.map(r => r.title.toLowerCase())
    
    // Create 5:2 Faste-specific system prompt
    const systemPrompt = create5_2SystemPrompt(existingTitles)
    
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
            content: `Generer en ny 5:2 Faste opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på mættende retter til faste dage.`
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
    const recipe = parseGeneratedRecipe(recipeContent, '5-2')
    
    console.log(`✅ Generated 5:2 Faste recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
    })

  } catch (error) {
    console.error('Error generating 5:2 Faste recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate 5:2 Faste recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function create5_2SystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i 5:2 faste og lav-kalorie madlavning. Generer en detaljeret 5:2 Faste opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

5:2 FASTE PRINCIPPER:
- Maksimalt 500-600 kalorier per portion
- Mættende ingredienser der holder sulten væk
- Høj protein for mæthed
- Grøntsager for volumen og næring
- Fedt for mæthed (men ikke for meget)
- Undgå store portioner
- Fokus på kvalitet over kvantitet

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "5:2 Faste opskrift titel",
  "description": "Kort beskrivelse med fokus på faste fordele",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g",
      "notes": "valgfri note om faste fordele"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion med faste tips",
      "time": 10,
      "tips": "valgfri faste tip"
    }
  ],
  "servings": 1,
  "prepTime": 10,
  "cookTime": 20,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["5-2", "faste", "lav-kalorie"],
  "nutritionalInfo": {
    "calories": 550,
    "protein": 35.0,
    "carbs": 25.0,
    "fat": 20.0,
    "fiber": 8.0
  }
}

5:2 FASTE INGREDIENSER:
- Magert kød: kylling, fisk, æg
- Grøntsager: broccoli, spinat, kål, zucchini
- Bælgfrugter: kikærter, linser, bønner
- Nødder: mandler, valnødder (små mængder)
- Fedt: olivenolie, avocado (små mængder)
- Fuldkorn: quinoa, bulgur (små mængder)
- Bær: jordbær, hindbær (små mængder)

FASTE-FOKUSEREDE TIPS:
- Brug magert kød for protein
- Tilføj grøntsager for volumen
- Inkluder bælgfrugter for mæthed
- Brug nødder sparsomt for fedt
- Vælg fuldkorn for kulhydrater
- Tilføj frisk urt for smag uden kalorier`
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
    recipe.dietaryCategories = getDietaryCategories('5-2')
    
    // Ensure all required fields exist
    return {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: recipe.servings || 1,
      prepTime: recipe.prepTime || 10,
      cookTime: recipe.cookTime || 20,
      difficulty: recipe.difficulty || 'Easy',
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('5-2'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 550,
        protein: 35,
        carbs: 25,
        fat: 20,
        fiber: 8
      }
    }
  } catch (error) {
    console.error('Error parsing generated 5:2 Faste recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

