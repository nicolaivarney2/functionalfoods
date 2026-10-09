import { NextRequest } from 'next/server'
import { generateFfNicheRecipe, nicheGenerationResponse } from '@/lib/ff-recipe-generation'
import type { SourceRecipePayload } from '@/lib/recipe-source-adaptation'

interface AntiParameters {
  inspiration?: string
  recipeType?: string
  maaltid?: string
}

function namedWish(recipeType?: string, inspiration?: string): string {
  const type = (recipeType || '').trim().replace(/-/g, ' ')
  const text = (inspiration || '').trim()
  return [type, text].filter(Boolean).join('. ')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params: AntiParameters = body.parameters || {}
    const result = await generateFfNicheRecipe({
      niche: 'antiinflammatorisk',
      existingRecipes: body.existingRecipes,
      sourceRecipe: body.sourceRecipe as SourceRecipePayload | null,
      wish: namedWish(params.recipeType, params.inspiration),
      mealType: params.maaltid,
    })
    return nicheGenerationResponse(result)
  } catch (error) {
    console.error('Error generating antiinflammatorisk recipe:', error)
    return nicheGenerationResponse({
      ok: false,
      status: 500,
      error: 'Failed to generate recipe',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
