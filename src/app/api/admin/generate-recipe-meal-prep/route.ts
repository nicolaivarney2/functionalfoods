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

    console.log(`🍱 Generating Meal Prep recipe: ${categoryName}`)

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

    if (!openaiConfig.assistantIds?.['meal-prep']) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Meal Prep Assistant ID not configured',
          details: 'Please configure Meal Prep Assistant ID in admin settings'
        },
        { status: 500 }
      )
    }

    // Get existing recipe titles to avoid duplicates
    const existingTitles = existingRecipes.map(r => r.title.toLowerCase())
    
    // Create Meal Prep-specific system prompt
    const systemPrompt = createMealPrepSystemPrompt(existingTitles)
    
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
            content: `Generer en ny Meal Prep opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på retter der holder sig frisk i 3 dage.`
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
    const recipe = parseGeneratedRecipe(recipeContent, 'meal-prep')
    
    console.log(`✅ Generated Meal Prep recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
    })

  } catch (error) {
    console.error('Error generating Meal Prep recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Meal Prep recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createMealPrepSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i meal prep og holdbar madlavning. Generer en detaljeret Meal Prep opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

MEAL PREP PRINCIPPER:
- Skal holde sig frisk i køleskab i 3 dage
- Nem at opvarme uden at miste kvalitet
- Balanceret næring over flere dage
- Ingredienser der ikke bliver slatne
- Portioner der passer til meal prep containere
- Fokus på holdbarhed og nem opvarmning

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Meal Prep opskrift titel",
  "description": "Kort beskrivelse med fokus på meal prep fordele",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g",
      "notes": "valgfri note om meal prep fordele"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion med meal prep tips",
      "time": 10,
      "tips": "valgfri meal prep tip"
    }
  ],
  "servings": 3,
  "prepTime": 30,
  "cookTime": 45,
  "difficulty": "Medium|Hard",
  "dietaryCategories": ["meal-prep", "mealprep"],
  "nutritionalInfo": {
    "calories": 400,
    "protein": 25.0,
    "carbs": 35.0,
    "fat": 18.0,
    "fiber": 8.0
  }
}

MEAL PREP INGREDIENSER:
- Kød: kylling, oksekød, svinekød (godt til opvarmning)
- Fisk: laks, tun (holder sig godt)
- Grøntsager: broccoli, kål, zucchini, squash
- Bælgfrugter: kikærter, linser, bønner
- Fuldkorn: quinoa, bulgur, ris, pasta
- Nødder: mandler, valnødder (til sidst)
- Fedt: olivenolie, avocado (til sidst)

MEAL PREP TIPS:
- Kog grøntsager aldrig helt færdige
- Gem nødder og fedt til sidst
- Brug meal prep containere
- Opvarm ved lav varme
- Tilføj frisk urt ved servering
- Gem saucer separat`
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
    recipe.dietaryCategories = getDietaryCategories('meal-prep')
    
    // Ensure all required fields exist
    return {
      title: recipe.title,
      description: recipe.description || '',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      servings: recipe.servings || 3,
      prepTime: recipe.prepTime || 30,
      cookTime: recipe.cookTime || 45,
      difficulty: recipe.difficulty || 'Medium',
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('meal-prep'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 400,
        protein: 25,
        carbs: 35,
        fat: 18,
        fiber: 8
      }
    }
  } catch (error) {
    console.error('Error parsing generated Meal Prep recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

