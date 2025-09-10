import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

interface Recipe {
  title: string
  description: string
  ingredients: Array<{
    name: string
    amount: number
    unit: string
    notes?: string
  }>
  instructions: Array<{
    stepNumber: number
    instruction: string
    time?: number
    tips?: string
  }>
  servings: number
  prepTime: number
  cookTime: number
  difficulty: string
  dietaryCategories: string[]
  nutritionalInfo: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

interface ValidateRecipeRequest {
  recipe: Recipe
}

export async function POST(request: NextRequest) {
  try {
    const { recipe }: ValidateRecipeRequest = await request.json()
    
    if (!recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Validating recipe: ${recipe.title}`)

    // Basic validation
    const basicValidation = validateBasicFields(recipe)
    if (!basicValidation.isValid) {
      return NextResponse.json({
        success: true,
        isValid: false,
        reasons: basicValidation.reasons
      })
    }

    // AI validation for content quality
    const aiValidation = await validateWithAI(recipe)
    
    const isValid = basicValidation.isValid && aiValidation.isValid
    const allReasons = [...basicValidation.reasons, ...aiValidation.reasons]

    console.log(`✅ Recipe validation result: ${isValid ? 'VALID' : 'INVALID'}`)
    if (!isValid) {
      console.log(`❌ Validation reasons: ${allReasons.join(', ')}`)
    }

    return NextResponse.json({
      success: true,
      isValid,
      reasons: allReasons,
      suggestions: aiValidation.suggestions || []
    })

  } catch (error) {
    console.error('Error validating recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to validate recipe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function validateBasicFields(recipe: Recipe): { isValid: boolean, reasons: string[] } {
  const reasons: string[] = []

  // Required fields
  if (!recipe.title || recipe.title.trim().length < 3) {
    reasons.push('Titel skal være mindst 3 tegn')
  }

  if (!recipe.description || recipe.description.trim().length < 10) {
    reasons.push('Beskrivelse skal være mindst 10 tegn')
  }

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    reasons.push('Opskrift skal have mindst én ingrediens')
  }

  if (!recipe.instructions || recipe.instructions.length === 0) {
    reasons.push('Opskrift skal have mindst én instruktion')
  }

  if (recipe.servings < 1 || recipe.servings > 20) {
    reasons.push('Antal portioner skal være mellem 1 og 20')
  }

  if (recipe.prepTime < 0 || recipe.prepTime > 480) {
    reasons.push('Forberedelsestid skal være mellem 0 og 480 minutter')
  }

  if (recipe.cookTime < 0 || recipe.cookTime > 480) {
    reasons.push('Tilberedningstid skal være mellem 0 og 480 minutter')
  }

  // Validate ingredients
  if (recipe.ingredients) {
    for (const ingredient of recipe.ingredients) {
      if (!ingredient.name || ingredient.name.trim().length < 2) {
        reasons.push('Alle ingredienser skal have et navn')
        break
      }
      if (ingredient.amount <= 0) {
        reasons.push('Alle ingredienser skal have et positivt antal')
        break
      }
      if (!ingredient.unit || ingredient.unit.trim().length === 0) {
        reasons.push('Alle ingredienser skal have en enhed')
        break
      }
    }
  }

  // Validate instructions
  if (recipe.instructions) {
    for (const instruction of recipe.instructions) {
      if (!instruction.instruction || instruction.instruction.trim().length < 10) {
        reasons.push('Alle instruktioner skal være mindst 10 tegn')
        break
      }
    }
  }

  // Validate nutritional info
  if (recipe.nutritionalInfo) {
    if (recipe.nutritionalInfo.calories < 0 || recipe.nutritionalInfo.calories > 2000) {
      reasons.push('Kalorier skal være mellem 0 og 2000')
    }
    if (recipe.nutritionalInfo.protein < 0 || recipe.nutritionalInfo.protein > 200) {
      reasons.push('Protein skal være mellem 0 og 200g')
    }
    if (recipe.nutritionalInfo.carbs < 0 || recipe.nutritionalInfo.carbs > 300) {
      reasons.push('Kulhydrater skal være mellem 0 og 300g')
    }
    if (recipe.nutritionalInfo.fat < 0 || recipe.nutritionalInfo.fat > 200) {
      reasons.push('Fedt skal være mellem 0 og 200g')
    }
    if (recipe.nutritionalInfo.fiber < 0 || recipe.nutritionalInfo.fiber > 100) {
      reasons.push('Fiber skal være mellem 0 og 100g')
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons
  }
}

async function validateWithAI(recipe: Recipe): Promise<{ isValid: boolean, reasons: string[], suggestions?: string[] }> {
  try {
    if (!openai) {
      // If OpenAI is not available, consider it valid
      return {
        isValid: true,
        reasons: [],
        suggestions: []
      }
    }

    const prompt = `Valider denne opskrift og giv feedback på kvalitet, nøjagtighed og brugbarhed:

OPSKRIFT:
Titel: ${recipe.title}
Beskrivelse: ${recipe.description}
Portioner: ${recipe.servings}
Forberedelse: ${recipe.prepTime} min
Tilberedning: ${recipe.cookTime} min
Sværhedsgrad: ${recipe.difficulty}

INGREDIENSER:
${recipe.ingredients.map(ing => `- ${ing.amount} ${ing.unit} ${ing.name}${ing.notes ? ` (${ing.notes})` : ''}`).join('\n')}

INSTRUKTIONER:
${recipe.instructions.map(inst => `${inst.stepNumber}. ${inst.instruction}${inst.time ? ` (${inst.time} min)` : ''}${inst.tips ? ` - Tip: ${inst.tips}` : ''}`).join('\n')}

NÆRINGSINDHOLD (per portion):
Kalorier: ${recipe.nutritionalInfo.calories}
Protein: ${recipe.nutritionalInfo.protein}g
Kulhydrater: ${recipe.nutritionalInfo.carbs}g
Fedt: ${recipe.nutritionalInfo.fat}g
Fiber: ${recipe.nutritionalInfo.fiber}g

Valider og giv feedback i dette format:
VALID: true/false
REASONS: [liste af problemer, hvis nogen]
SUGGESTIONS: [liste af forbedringsforslag, hvis nogen]

Fokus på:
1. Er ingredienserne realistiske og tilgængelige?
2. Er instruktionerne klare og følger de logisk?
3. Er næringsindholdet realistisk for ingredienserne?
4. Er tidsangivelserne realistiske?
5. Er opskriften brugbar for målgruppen?`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Du er en ekspert i madlavning og opskriftvalidering. Vurder opskrifter objektivt og giv konstruktiv feedback."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const response = completion.choices[0]?.message?.content || ''
    
    // Parse AI response
    const validMatch = response.match(/VALID:\s*(true|false)/i)
    const reasonsMatch = response.match(/REASONS:\s*\[(.*?)\]/i)
    const suggestionsMatch = response.match(/SUGGESTIONS:\s*\[(.*?)\]/i)

    const isValid = validMatch ? validMatch[1].toLowerCase() === 'true' : true
    const reasons = reasonsMatch ? 
      reasonsMatch[1].split(',').map(r => r.trim()).filter(Boolean) : []
    const suggestions = suggestionsMatch ? 
      suggestionsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : []

    return {
      isValid,
      reasons,
      suggestions
    }

  } catch (error) {
    console.error('Error in AI validation:', error)
    // If AI validation fails, consider it valid but log the error
    return {
      isValid: true,
      reasons: [],
      suggestions: []
    }
  }
}
