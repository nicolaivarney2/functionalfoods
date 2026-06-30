import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { nutritionForProvisionalMeal } from '@/lib/provisional-nutrition'
import { sanitizeIngredients } from '@/lib/provisional-recipes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const ingredients = sanitizeIngredients(body.ingredients)
    const servings = Math.max(1, Number(body.servings) || 1)

    const result = await nutritionForProvisionalMeal(ingredients, servings, body.aiFallback ?? null)

    return NextResponse.json({
      success: true,
      data: {
        nutrition: result.nutrition,
        matchedIngredients: result.matchedIngredients,
        totalIngredients: result.totalIngredients,
        source: result.source,
      },
    })
  } catch (e) {
    console.error('calculate-nutrition POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
