import { NextRequest } from 'next/server'
import { generateFfNicheRecipe, nicheGenerationResponse } from '@/lib/ff-recipe-generation'
import type { SourceRecipePayload } from '@/lib/recipe-source-adaptation'

interface Glp1Parameters {
  maaltid?: string
  proteinKilde?: string
  recipeType?: string
  inspiration?: string
}

function namedWish(recipeType?: string, inspiration?: string): string {
  const type = (recipeType || '').trim().replace(/-/g, ' ')
  const text = (inspiration || '').trim()
  return [type, text].filter(Boolean).join('. ')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params: Glp1Parameters = body.parameters || {}
    const constraints: string[] = []
    const protein = (params.proteinKilde || '').trim()
    if (protein && protein !== 'frit-valg') constraints.push(`Proteinet skal primært være ${protein}.`)

    const result = await generateFfNicheRecipe({
      niche: 'glp1',
      existingRecipes: body.existingRecipes,
      sourceRecipe: body.sourceRecipe as SourceRecipePayload | null,
      wish: namedWish(params.recipeType, params.inspiration),
      mealType: params.maaltid,
      constraints,
    })
    return nicheGenerationResponse(result)
  } catch (error) {
    console.error('Error generating GLP-1 recipe:', error)
    return nicheGenerationResponse({
      ok: false,
      status: 500,
      error: 'Failed to generate recipe',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
