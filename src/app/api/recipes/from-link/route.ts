import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import { PROVISIONAL_SELECT } from '@/lib/provisional-recipes'
import { nutritionForProvisionalMeal } from '@/lib/provisional-nutrition'
import { fetchStructuredRecipeFromUrl } from '@/lib/recipe-url-fetch'
import { parseRecipeFromPageContent } from '@/lib/recipe-from-link-parse'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
    if (!rawUrl) return NextResponse.json({ error: 'Mangler link' }, { status: 400 })

    let fetched
    try {
      fetched = await fetchStructuredRecipeFromUrl(rawUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunne ikke hente linket'
      const status = message.includes('Ugyldigt') || message.includes('mangler') ? 400 : 502
      return NextResponse.json({ error: message }, { status })
    }

    let parsed
    try {
      parsed = parseRecipeFromPageContent(fetched.html, fetched.structured)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kunne ikke læse opskriften'
      return NextResponse.json({ error: message }, { status: 422 })
    }

    const fridaNutrition = await nutritionForProvisionalMeal(
      parsed.ingredients,
      parsed.servings,
      {}
    )

    const { data, error } = await supabase
      .from('provisional_recipes')
      .insert({
        user_id: user.id,
        status: 'draft',
        source: 'from-link',
        title: parsed.title,
        description: parsed.description,
        image_url: null,
        servings: parsed.servings,
        prep_time: null,
        cook_time: null,
        difficulty: null,
        ingredients: parsed.ingredients,
        instructions: parsed.instructions,
        nutrition: fridaNutrition.nutrition,
        dietary_categories: [],
        clarifying_questions: [],
        ai_notes: `Importeret fra ${parsed.sourceUrl}. Ernæring: ${fridaNutrition.source} (${fridaNutrition.matchedIngredients}/${fridaNutrition.totalIngredients} ingredienser matchet).`,
      })
      .select(PROVISIONAL_SELECT)
      .single()

    if (error) {
      console.error('from-link insert', error)
      return NextResponse.json({ error: 'Kunne ikke gemme', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('recipes/from-link POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
