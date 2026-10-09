import { NextRequest } from 'next/server'
import { generateFfNicheRecipe, nicheGenerationResponse } from '@/lib/ff-recipe-generation'
import type { SourceRecipePayload } from '@/lib/recipe-source-adaptation'

interface KetoParameters {
  hovedingrediens?: string
  recipeType?: string
  inspiration?: string
  maxTid?: 15 | 30 | 45 | null
  maaltid?: string
}

const PROTEIN: Record<string, string> = {
  'rodt-kod': 'Proteinet skal være okse- eller svinekød. Lam kun hvis ønsket udtrykkeligt siger lam.',
  fjaerkrae: 'Proteinet skal være kylling.',
  fisk: 'Proteinet skal være fisk.',
  vegetarisk: 'Retten skal være uden kød og fisk. Brug æg eller ost.',
  'non-dairy': 'Ingen mælkeprodukter. Fedtstoffet er olivenolie, nødder eller avocado.',
}

function namedWish(recipeType?: string, inspiration?: string): string {
  const type = (recipeType || '').trim().replace(/-/g, ' ')
  const text = (inspiration || '').trim()
  return [type, text].filter(Boolean).join('. ')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params: KetoParameters = body.parameters || {}
    const constraints: string[] = []
    const protein = PROTEIN[(params.hovedingrediens || '').toLowerCase()]
    if (protein) constraints.push(protein)
    if (params.maxTid) constraints.push(`Samlet tid højst ${params.maxTid} minutter.`)

    const result = await generateFfNicheRecipe({
      niche: 'keto',
      existingRecipes: body.existingRecipes,
      sourceRecipe: body.sourceRecipe as SourceRecipePayload | null,
      wish: namedWish(params.recipeType, params.inspiration),
      mealType: params.maaltid,
      constraints,
    })
    return nicheGenerationResponse(result)
  } catch (error) {
    console.error('Error generating Keto recipe:', error)
    return nicheGenerationResponse({
      ok: false,
      status: 500,
      error: 'Failed to generate recipe',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
