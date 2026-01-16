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

    console.log(`💪 Generating Proteinrig kost recipe: ${categoryName}`)

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
    
    // Create Proteinrig kost-specific system prompt
    const systemPrompt = createProteinrigKostSystemPrompt(existingTitles)
    
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
            content: `Generer en ny Proteinrig kost opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på retter med højt proteinindhold og optimal næring.`
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
    const recipe = parseGeneratedRecipe(recipeContent)
    
    console.log(`✅ Generated Proteinrig kost recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
    })

  } catch (error) {
    console.error('Error generating Proteinrig kost recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Proteinrig kost recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createProteinrigKostSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i proteinrig kost og optimal næring. Generer en detaljeret Proteinrig kost opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

PROTEINRIG KOST PRINCIPPER:
- Højt proteinindhold (minimum 20g protein per portion)
- Balanceret næring med fokus på protein
- Mættende og nærende
- Optimal for vægttab og muskelopbygning
- Fokus på kvalitetsprotein fra forskellige kilder
- Balanceret med sunde kulhydrater og fedtstoffer

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Proteinrig kost opskrift titel",
  "description": "Kort beskrivelse med fokus på proteinindhold og næring",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g",
      "notes": "valgfri note om proteinindhold"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion med meal prep tips",
      "time": 10,
      "tips": "valgfri tip om proteinindhold"
    }
  ],
  "servings": 3,
  "prepTime": 30,
  "cookTime": 45,
  "difficulty": "Medium|Hard",
  "dietaryCategories": ["Proteinrig kost"],
  "nutritionalInfo": {
    "calories": 400,
    "protein": 25.0,
    "carbs": 35.0,
    "fat": 18.0,
    "fiber": 8.0
  }
}

PROTEINRIGE INGREDIENSER:
- Kød: kylling, oksekød, svinekød, kalkun
- Fisk: laks, tun, torsk, sej
- Æg: hele æg, æggehvider
- Bælgfrugter: kikærter, linser, bønner, edamame
- Mælkeprodukter: græsk yoghurt, cottage cheese, kvark
- Nødder: mandler, valnødder, cashews
- Grøntsager: broccoli, spinat, asparges (til fyld og fibre)
- Fuldkorn: quinoa, bulgur, ris (til kulhydrater)

PROTEINRIG KOST TIPS:
- Sigte efter minimum 20-30g protein per måltid
- Kombiner forskellige proteinkilder for fuld næringsprofil
- Tilføj grøntsager for fibre og mæthed
- Brug sunde fedtstoffer for opfattelse
- Balance protein med kulhydrater efter aktivitetsniveau
- Vælg magre proteinkilder for vægttab`
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
    recipe.dietaryCategories = getDietaryCategories('proteinrig-kost')
    
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
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('proteinrig-kost'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 400,
        protein: 25,
        carbs: 35,
        fat: 18,
        fiber: 8
      }
    }
  } catch (error) {
    console.error('Error parsing generated Proteinrig kost recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

