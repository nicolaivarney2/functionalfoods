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

    console.log(`🥑 Generating Keto recipe: ${categoryName}`)

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
    
    console.log('🔍 OpenAI Config:', {
      apiKey: openaiConfig.apiKey ? 'Set' : 'Not set'
    })
    
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
            content: createKetoSystemPrompt(existingTitles)
          },
          {
            role: "user",
            content: `Generer en ny Keto opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på danske ingredienser og traditioner, men tilpasset til keto kost.`
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
    const recipe = parseGeneratedRecipe(recipeContent, 'keto')
    
    console.log(`✅ Generated Keto recipe: ${recipe.title}`)

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

    return NextResponse.json({
      success: true,
      recipe,
      aiTips
    })

  } catch (error) {
    console.error('Error generating Keto recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Keto recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createKetoSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i Keto kost og dansk madlavning. Generer en detaljeret Keto opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

KETO KOST REGLER:
- Maksimalt 20g netto kulhydrater per portion
- Høj fedtindhold (70-80% af kalorier)
- Moderat protein (20-25% af kalorier)
- Fokus på: fedt kød, fisk, æg, avocado, nødder, oliven, kokosolie, smør
- Undgå: brød, pasta, ris, kartofler, sukker, frugt (undtagen bær), bælgfrugter

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Keto opskrift titel",
  "description": "Kort beskrivelse med fokus på keto fordele",
  "ingredients": [
    {
      "name": "ingrediens navn",
      "amount": 100,
      "unit": "g",
      "notes": "valgfri note om keto fordele"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "instruction": "Detaljeret instruktion med keto tips",
      "time": 10,
      "tips": "valgfri keto tip"
    }
  ],
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["keto", "lav-kulhydrat"],
  "nutritionalInfo": {
    "calories": 350,
    "protein": 25.0,
    "carbs": 8.0,
    "fat": 28.0,
    "fiber": 5.0
  }
}

KETO INGREDIENSER AT FOKUSERE PÅ:
- Fedt kød: oksekød, svinekød, lam, kylling med skind
- Fisk: laks, makrel, sardiner, tun
- Æg: hele æg, ikke kun hvide
- Fedt: avocado, nødder, frø, oliven, kokosolie, smør, ghee
- Grøntsager: broccoli, spinat, kål, zucchini, blomkål
- Bær: jordbær, hindbær, blåbær (små mængder)
- Krydderier: kurkuma, ingefær, kanel, chili

UNDGÅ:
- Korn: hvede, rug, havre, ris
- Bælgfrugter: bønner, linser, kikærter
- Frugt: æbler, bananer, druer (undtagen bær)
- Sukker: alle former for sukker
- Kartofler og stivelsesrige grøntsager`
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
    recipe.dietaryCategories = ['keto', 'lav-kulhydrat']
    
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
      dietaryCategories: recipe.dietaryCategories || ['keto'],
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 350,
        protein: 25,
        carbs: 8,
        fat: 28,
        fiber: 5
      }
    }
  } catch (error) {
    console.error('Error parsing generated Keto recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

