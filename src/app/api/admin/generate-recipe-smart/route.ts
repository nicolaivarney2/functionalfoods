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
  category: string
  categoryName: string
  existingRecipes: ExistingRecipe[]
}

export async function POST(request: NextRequest) {
  try {
    const { category, categoryName, existingRecipes }: GenerateRecipeRequest = await request.json()
    
    if (!category || !categoryName) {
      return NextResponse.json(
        { success: false, error: 'Category and categoryName are required' },
        { status: 400 }
      )
    }

    console.log(`🤖 Generating ${categoryName} recipe with existing OpenAI config...`)

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
    
    // Create system prompt based on category
    const systemPrompt = createSystemPrompt(category, existingTitles)
    
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
            content: `Generer en ny ${categoryName} opskrift der er unik og ikke ligner eksisterende opskrifter. Fokuser på danske ingredienser og traditioner.`
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
    const recipe = parseGeneratedRecipe(recipeContent, category)
    
    console.log(`✅ Generated recipe: ${recipe.title}`)

    // Generate Midjourney prompt
    const midjourneyPrompt = await generateMidjourneyPrompt(recipe)

    return NextResponse.json({
      success: true,
      recipe,
      midjourneyPrompt
    })

  } catch (error) {
    console.error('Error generating recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function createSystemPrompt(category: string, existingTitles: string[]): string {
  const basePrompt = `Du er en ekspert i dansk madlavning og ernæring. Generer en detaljeret opskrift i JSON format.

EKSISTERENDE OPSKRIFTER (undgå at duplikere disse):
${existingTitles.slice(0, 10).map(title => `- ${title}`).join('\n')}

OPPSKRIFT FORMAT (returner kun JSON):
{
  "title": "Opskrift titel",
  "description": "Kort beskrivelse af opskriften",
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
  "dietaryCategories": ["kategori1", "kategori2"],
  "nutritionalInfo": {
    "calories": 250,
    "protein": 15.5,
    "carbs": 20.0,
    "fat": 12.0,
    "fiber": 5.0
  }
}`

  // Add category-specific instructions
  switch (category) {
    case 'familiemad':
      return basePrompt + `

KATEGORI: FAMILIEMAD
- Klassiske, næringsrige retter der passer til hele familien
- Bør være nemme at lave og populære hos børn og voksne
- Fokus på danske traditioner og smag
- Brug almindelige ingredienser der er lette at få fat i`

    case 'keto':
      return basePrompt + `

KATEGORI: KETO
- Lav-kulhydrat, høj-fedt retter for ketose
- Maksimalt 20g netto kulhydrater per portion
- Fokus på fedtrige ingredienser: avocado, nødder, oliven, fedt kød
- Undgå: brød, pasta, ris, kartofler, sukker, frugt (undtagen bær)
- Brug: grøntsager, kød, fisk, æg, nødder, fedt`

    case 'sense':
      return basePrompt + `

KATEGORI: SENSE
- Sunde, balancerede retter med fokus på næring
- Fokus på omega-3, antioksidanter, og fuldkorn
- Brug: fisk, nødder, bær, grøntsager, fuldkorn
- Undgå: processerede fødevarer, for meget sukker`

    case 'paleo':
      return basePrompt + `

KATEGORI: PALEO/LCHF
- Præhistorisk kost med lav kulhydrat, høj fedt
- Kun naturlige ingredienser vores forfædre spiste
- Brug: kød, fisk, æg, grøntsager, nødder, bær
- Undgå: korn, bælgfrugter, mælkeprodukter, sukker`

    case 'antiinflammatorisk':
      return basePrompt + `

KATEGORI: ANTIINFLAMMATORISK
- Retter der bekæmper inflammation i kroppen
- Fokus på: omega-3, kurkuma, ingefær, grøntsager
- Brug: fisk, nødder, bær, grøntsager, krydderier
- Undgå: processerede fødevarer, for meget omega-6`

    case 'fleksitarisk':
      return basePrompt + `

KATEGORI: FLEKSITARISK
- Primært plantebaseret med mulighed for kød
- 80% planter, 20% kød/fisk
- Fokus på: grøntsager, bælgfrugter, nødder, kød som smagsgiver
- Brug: mange grøntsager, bælgfrugter, nødder, lidt kød`

    case '5-2':
      return basePrompt + `

KATEGORI: 5:2 FASTE
- Retter til 5:2 faste dage (500-600 kalorier)
- Maksimalt 500-600 kalorier per portion
- Fokus på: protein, grøntsager, mættende ingredienser
- Brug: magert kød, fisk, grøntsager, nødder
- Undgå: fedtrige ingredienser, store portioner`

    case 'proteinrig-kost':
    case 'meal-prep': // Legacy support
      return basePrompt + `

KATEGORI: PROTEINRIG KOST
- Proteinrige opskrifter til optimal næring
- Fokus på: højt proteinindhold, balanceret næring, mæthed
- Brug: magert kød, fisk, æg, bælgfrugter, nødder
- Undgå: for meget kulhydrater, for lidt protein`

    default:
      return basePrompt
  }
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
    recipe.dietaryCategories = getDietaryCategories(category)
    
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
      dietaryCategories: recipe.dietaryCategories || [],
      nutritionalInfo: recipe.nutritionalInfo || {
        calories: 250,
        protein: 15,
        carbs: 20,
        fat: 12,
        fiber: 5
      }
    }
  } catch (error) {
    console.error('Error parsing generated recipe:', error)
    throw new Error('Failed to parse generated recipe')
  }
}

// Removed local getDietaryCategories function - now using centralized version

