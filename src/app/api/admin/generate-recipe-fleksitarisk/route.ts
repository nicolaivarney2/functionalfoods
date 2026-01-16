import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIConfig } from '@/lib/openai-config'
import { getDietaryCategories } from '@/lib/recipe-tag-mapper'
// import { generateMidjourneyPrompt } from '@/lib/midjourney-generator' // Not used

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

    console.log(`🌱 Generating Fleksitarisk recipe: ${categoryName}`)

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
    
    // Create Fleksitarisk-specific system prompt
    const systemPrompt = createFleksitariskSystemPrompt(existingTitles)
    
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
            content: `Generer en ny Fleksitarisk opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på plantebaseret kost med mulighed for kød.`
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
    
    console.log(`✅ Generated Fleksitarisk recipe: ${recipe.title}`)

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

    // Generate Midjourney prompt using centralized function
    const midjourneyPrompt = await generateMidjourneyPrompt(recipe)

    return NextResponse.json({
      success: true,
      recipe,
      aiTips,
      midjourneyPrompt
    })

  } catch (error) {
    console.error('Error generating Fleksitarisk recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate Fleksitarisk recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createFleksitariskSystemPrompt(existingTitles: string[]): string {
  return `Du er en ekspert i fleksitarisk kost og plantebaseret madlavning. Generer en detaljeret Fleksitarisk opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

FLEKSITARISK KOST PRINCIPPER:
- Primært plantebaseret (80% planter, 20% kød/fisk)
- Fokus på grøntsager, bælgfrugter, nødder og frø
- Kød som smagsgiver, ikke hovedingrediens
- Bælgfrugter som proteinkilde
- Fuldkorn for kulhydrater
- Nødder og frø for fedt
- Mange forskellige grøntsager

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Fleksitarisk opskrift titel",
  "description": "Kort beskrivelse med fokus på plantebaseret kost",
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
      "instruction": "Detaljeret instruktion med plantebaseret tips",
      "time": 10
    }
  ],
  "servings": 2,
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Easy|Medium|Hard",
  "dietaryCategories": ["fleksitarisk", "plantebaseret"],
  "nutritionalInfo": {
    "calories": 350,
    "protein": 20.0,
    "carbs": 40.0,
    "fat": 15.0,
    "fiber": 10.0
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

FLEKSITARISKE INGREDIENSER:
- Grøntsager: broccoli, spinat, kål, zucchini, squash
- Bælgfrugter: kikærter, linser, bønner, tofu
- Nødder: mandler, valnødder, cashews, pecan
- Frø: chia, hør, solsikkefrø, græskarkerner
- Fuldkorn: quinoa, bulgur, fuldkornspasta, ris
- Kød: kylling, fisk, oksekød (små mængder)
- Æg: hele æg
- Fedt: olivenolie, avocado, nødder

PLANTEBASERET FOKUS:
- Brug bælgfrugter som proteinkilde
- Inkluder mange forskellige grøntsager
- Tilføj nødder og frø for fedt
- Vælg fuldkorn for kulhydrater
- Brug kød som smagsgiver, ikke hovedingrediens
- Tilføj frisk urt for smag`
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
    recipe.dietaryCategories = getDietaryCategories('fleksitarisk')
    
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
      dietaryCategories: recipe.dietaryCategories || getDietaryCategories('fleksitarisk'),
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 350,
        protein: 20,
        carbs: 40,
        fat: 15,
        fiber: 10
      }
    }
  } catch (error) {
    console.error('Error parsing generated Fleksitarisk recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

// Removed local generateMidjourneyPrompt function - now using centralized version

// Removed local translateTitleForMidjourney function - now using centralized version

