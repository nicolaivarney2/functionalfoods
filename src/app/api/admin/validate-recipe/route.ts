import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { validateRecipeStructuralIntegrity } from '@/lib/recipe-structural-integrity'

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
  ingredientGroups?: Array<{
    name?: string
    ingredients?: Array<{
      name: string
      amount: number
      unit: string
      notes?: string
    }>
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
    const structural = validateRecipeStructuralIntegrity(recipe)
    const preAiValid = basicValidation.isValid && structural.isValid
    const preAiReasons = [...basicValidation.reasons, ...structural.issues]

    if (!preAiValid) {
      return NextResponse.json({
        success: true,
        isValid: false,
        reasons: preAiReasons,
        structuralIssues: structural.issues,
      })
    }

    // AI validation for content quality
    const aiValidation = await validateWithAI(recipe)
    
    const isValid = basicValidation.isValid && structural.isValid && aiValidation.isValid
    const allReasons = [...basicValidation.reasons, ...structural.issues, ...aiValidation.reasons]

    console.log(`✅ Recipe validation result: ${isValid ? 'VALID' : 'INVALID'}`)
    if (!isValid) {
      console.log(`❌ Validation reasons:`)
      allReasons.forEach((reason, index) => {
        console.log(`  ${index + 1}. ${reason}`)
      })
    }

    return NextResponse.json({
      success: true,
      isValid,
      reasons: allReasons,
      structuralIssues: structural.issues,
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

  if (!recipe.description || recipe.description.trim().length < 8) {
    reasons.push('Beskrivelse skal være mindst 8 tegn')
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

  // Validate ingredients (amount kan komme som streng fra JSON)
  if (recipe.ingredients) {
    for (const ingredient of recipe.ingredients) {
      if (!ingredient.name || ingredient.name.trim().length < 2) {
        reasons.push('Alle ingredienser skal have et navn')
        break
      }
      const amt = Number(ingredient.amount)
      if (!Number.isFinite(amt) || amt <= 0) {
        reasons.push('Alle ingredienser skal have et positivt antal')
        break
      }
      if (!ingredient.unit || String(ingredient.unit).trim().length === 0) {
        reasons.push('Alle ingredienser skal have en enhed')
        break
      }
    }
  }

  // Validate instructions (AI skriver ofte korte trin; 5 tegn min.)
  if (recipe.instructions) {
    for (const instruction of recipe.instructions) {
      const text = String(instruction.instruction || '').trim()
      if (text.length < 5) {
        reasons.push('Alle instruktioner skal være mindst 5 tegn')
        break
      }
    }
  }

  // Validate nutritional info (per portion — lidt slack til store måltider / model-skøn)
  if (recipe.nutritionalInfo) {
    const cal = Number(recipe.nutritionalInfo.calories)
    const prot = Number(recipe.nutritionalInfo.protein)
    const carbs = Number(recipe.nutritionalInfo.carbs)
    const fat = Number(recipe.nutritionalInfo.fat)
    const fiber = Number(recipe.nutritionalInfo.fiber)
    if (!Number.isFinite(cal) || cal < 0 || cal > 2500) {
      reasons.push('Kalorier skal være mellem 0 og 2500 per portion')
    }
    if (!Number.isFinite(prot) || prot < 0 || prot > 250) {
      reasons.push('Protein skal være mellem 0 og 250g')
    }
    if (!Number.isFinite(carbs) || carbs < 0 || carbs > 400) {
      reasons.push('Kulhydrater skal være mellem 0 og 400g')
    }
    if (!Number.isFinite(fat) || fat < 0 || fat > 250) {
      reasons.push('Fedt skal være mellem 0 og 250g')
    }
    if (!Number.isFinite(fiber) || fiber < 0 || fiber > 120) {
      reasons.push('Fiber skal være mellem 0 og 120g')
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

    const payload = {
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      difficulty: recipe.difficulty,
      dietaryCategories: recipe.dietaryCategories,
      ingredients: recipe.ingredients.map((ing) => ({
        amount: ing.amount,
        unit: ing.unit,
        name: ing.name,
        notes: ing.notes,
      })),
      instructions: recipe.instructions.map((inst) => ({
        stepNumber: inst.stepNumber,
        instruction: inst.instruction,
        time: inst.time,
        tips: inst.tips,
      })),
      nutritionalInfoPerPortion: recipe.nutritionalInfo,
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Du validerer AI-genererede opskrifter til et dansk website (kladde før et menneske retter til).
Returner KUN ét JSON-objekt med præcis disse nøgler:
{ "valid": boolean, "reasons": string[], "suggestions": string[] }

Vær tolerant over for AI-kladder:
- Sæt "valid" til true medmindre der er alvorlige problemer: umulige mængder, logiske brud (fx kog pasta uden vand), tydelig fare, eller at retten ikke kan laves som beskrevet.
- Små afvigelser i næringstal, korte trin, eller at Sense/almindelig mad har moderate kulhydrater = stadig valid true. Læg evt. forslag i "suggestions" i stedet for at afvise.
- Sense-opskrifter må gerne have brød, pasta, kartoffel osv. — det er ikke en fejl.
- Hvis titlen er en klassiker (fx lasagne, pizza, carbonara), skal ingredienserne matche almindelig forventning (lasagne → pasta/plader, pizza → bund, carbonara → pasta). Sæt valid false hvis det er et tydeligt logisk brud.`,
        },
        {
          role: 'user',
          content: `Vurder denne opskrift:\n${JSON.stringify(payload)}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    })

    const response = completion.choices[0]?.message?.content || ''
    let parsed: { valid?: boolean; reasons?: unknown; suggestions?: unknown }

    try {
      parsed = JSON.parse(response) as typeof parsed
    } catch {
      console.warn('validate-recipe: kunne ikke parse AI JSON, godkender kladde')
      return { isValid: true, reasons: [], suggestions: [] }
    }

    const isValid = parsed.valid !== false
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons.map((r) => String(r).trim()).filter(Boolean)
      : []
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s) => String(s).trim()).filter(Boolean)
      : []

    return {
      isValid,
      reasons: isValid ? [] : reasons,
      suggestions,
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
