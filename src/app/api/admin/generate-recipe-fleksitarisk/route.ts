import { NextRequest } from 'next/server'
import { generateFfNicheRecipe, nicheGenerationResponse } from '@/lib/ff-recipe-generation'
import { quickRecipeRangeInstruction } from '@/lib/quick-recipe-ranges'
import type { SourceRecipePayload } from '@/lib/recipe-source-adaptation'

interface FleksiParameters {
  inspiration?: string
  recipeType?: string
  maaltid?: string
  quickRecipe?: boolean
}

function namedWish(recipeType?: string, inspiration?: string): string {
  const type = (recipeType || '').trim().replace(/-/g, ' ')
  const text = (inspiration || '').trim()
  return [type, text].filter(Boolean).join('. ')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params: FleksiParameters = body.parameters || {}
    const constraints = params.quickRecipe ? [quickRecipeRangeInstruction('fleksitarisk')] : []
    const result = await generateFfNicheRecipe({
      niche: 'fleksitarisk',
      existingRecipes: body.existingRecipes,
      sourceRecipe: body.sourceRecipe as SourceRecipePayload | null,
      wish: params.quickRecipe ? '' : namedWish(params.recipeType, params.inspiration),
      mealType: params.maaltid,
      constraints,
    })
    return nicheGenerationResponse(result)
  } catch (error) {
    console.error('Error generating fleksitarisk recipe:', error)
    return nicheGenerationResponse({
      ok: false,
      status: 500,
      error: 'Failed to generate recipe',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
