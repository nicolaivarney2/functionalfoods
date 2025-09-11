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

    if (!openaiConfig.assistantIds?.keto) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Keto Assistant ID not configured',
          details: 'Please configure Keto Assistant ID in admin settings'
        },
        { status: 500 }
      )
    }

    // Get existing recipe titles to avoid duplicates
    const existingTitles = existingRecipes.map(r => r.title.toLowerCase())
    
    // Create Keto-specific system prompt
    const systemPrompt = createKetoSystemPrompt(existingTitles)
    
    // Generate recipe using Assistant API
    const response = await fetch(`https://api.openai.com/v1/assistants/${openaiConfig.assistantIds.keto}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        additional_instructions: `Generer en ny Keto opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på danske ingredienser og traditioner, men tilpasset til keto kost. Eksisterende opskrifter: ${existingTitles.join(', ')}`,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const runData = await response.json()
    
    // Wait for the assistant run to complete
    let runStatus = runData.status
    let attempts = 0
    const maxAttempts = 30 // 30 seconds max wait
    
    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out')
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      
      const statusResponse = await fetch(`https://api.openai.com/v1/assistants/${openaiConfig.assistantIds.keto}/runs/${runData.id}`, {
        headers: {
          'Authorization': `Bearer ${openaiConfig.apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })
      
      const statusData = await statusResponse.json()
      runStatus = statusData.status
      attempts++
    }
    
    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`)
    }
    
    // Get the messages from the thread
    const messagesResponse = await fetch(`https://api.openai.com/v1/assistants/${openaiConfig.assistantIds.keto}/threads/${runData.thread_id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })
    
    const messagesData = await messagesResponse.json()
    const recipeContent = messagesData.data[0]?.content[0]?.text?.value
    
    if (!recipeContent) {
      throw new Error('No recipe content generated')
    }

    // Parse the generated recipe
    const recipe = parseGeneratedRecipe(recipeContent, 'keto')
    
    console.log(`✅ Generated Keto recipe: ${recipe.title}`)

    return NextResponse.json({
      success: true,
      recipe
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

