import { NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { normalizeDiet, recipeMatchesDiet } from '@/lib/recipe-diet-matcher'

export const dynamic = 'force-dynamic'
export const revalidate = 0
const RECIPES_CACHE_CONTROL = 'public, s-maxage=900, stale-while-revalidate=43200'

function sanitizeDietFilter(value: string | null): string | null {
  if (!value) return null
  const normalized = normalizeDiet(value)
  if (!normalized || normalized.length > 48) return null
  if (!/^[a-z0-9\-\s:æøå]+$/.test(normalized)) return null
  return normalized
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const diet = sanitizeDietFilter(searchParams.get('diet'))

    const allRecipes = await databaseService.getRecipes()
    const recipes = diet
      ? allRecipes.filter((recipe) => recipeMatchesDiet(recipe, diet))
      : allRecipes

    const cacheControl = diet
      ? 'public, s-maxage=600, stale-while-revalidate=43200'
      : RECIPES_CACHE_CONTROL

    return NextResponse.json(
      { success: true, recipes },
      { headers: { 'Cache-Control': cacheControl } }
    )
  } catch (error) {
    console.error('❌ Error fetching recipes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recipes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
