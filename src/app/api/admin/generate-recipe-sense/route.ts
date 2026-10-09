import { NextRequest } from 'next/server'
import { generateFfNicheRecipe, nicheGenerationResponse } from '@/lib/ff-recipe-generation'
import type { SourceRecipePayload } from '@/lib/recipe-source-adaptation'

interface SenseParameters {
  maaltid?: string
  stivelse?: 'ingen' | 'standard' | 'ekstra'
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
    const params: SenseParameters = body.parameters || {}
    const constraints: string[] = []
    if (params.stivelse === 'ingen') constraints.push('Ingen stivelse. Håndfuld 4 skal være tom.')
    if (params.stivelse === 'ekstra') {
      constraints.push('Stivelsen må ligge i den øvre ende af Sense-intervallet, stadig kun én slags.')
    }

    const result = await generateFfNicheRecipe({
      niche: 'sense',
      existingRecipes: body.existingRecipes,
      sourceRecipe: body.sourceRecipe as SourceRecipePayload | null,
      wish: namedWish(params.recipeType, params.inspiration),
      mealType: params.maaltid,
      constraints,
    })
    return nicheGenerationResponse(result)
  } catch (error) {
    console.error('Error generating Sense recipe:', error)
    return nicheGenerationResponse({
      ok: false,
      status: 500,
      error: 'Kunne ikke generere Sense-opskrift',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
