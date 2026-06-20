import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseRouteUser } from '@/lib/supabase-api-user'
import {
  PROVISIONAL_SELECT,
  sanitizeClarifyingQuestions,
  sanitizeIngredients,
  sanitizeInstructions,
  sanitizeNutrition,
  type ProvisionalStatus,
} from '@/lib/provisional-recipes'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('provisional_recipes')
      .select(PROVISIONAL_SELECT)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status && ['draft', 'pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      console.error('provisional GET', error)
      return NextResponse.json({ error: 'Kunne ikke hente', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (e) {
    console.error('provisional GET', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 150) : ''
    if (!title) return NextResponse.json({ error: 'Mangler titel' }, { status: 400 })

    const submit = body.submit === true

    const { data, error } = await supabase
      .from('provisional_recipes')
      .insert({
        user_id: user.id,
        status: submit ? 'pending' : 'draft',
        source: 'manual',
        title,
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 600) : null,
        image_url: typeof body.imageUrl === 'string' ? body.imageUrl : null,
        servings: Math.max(1, Number(body.servings) || 1),
        prep_time: body.prepTime != null ? Math.max(0, Number(body.prepTime) || 0) : null,
        cook_time: body.cookTime != null ? Math.max(0, Number(body.cookTime) || 0) : null,
        difficulty: typeof body.difficulty === 'string' ? body.difficulty : null,
        ingredients: sanitizeIngredients(body.ingredients),
        instructions: sanitizeInstructions(body.instructions),
        nutrition: sanitizeNutrition(body.nutrition),
        dietary_categories: Array.isArray(body.dietaryCategories)
          ? body.dietaryCategories.filter((c: unknown): c is string => typeof c === 'string').slice(0, 6)
          : [],
        clarifying_questions: sanitizeClarifyingQuestions(body.clarifyingQuestions),
      })
      .select(PROVISIONAL_SELECT)
      .single()

    if (error) {
      console.error('provisional POST', error)
      return NextResponse.json({ error: 'Kunne ikke gemme', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('provisional POST', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 })

    // Hent eksisterende — må kun redigeres hvis den tilhører brugeren og ikke er godkendt.
    const { data: existing, error: fetchErr } = await supabase
      .from('provisional_recipes')
      .select('id, user_id, status')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr) {
      return NextResponse.json({ error: 'Kunne ikke hente', details: fetchErr.message }, { status: 500 })
    }
    if (!existing) return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 })
    if (existing.status === 'approved') {
      return NextResponse.json({ error: 'Godkendte opskrifter kan ikke ændres' }, { status: 409 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim().slice(0, 150)
    if (typeof body.description === 'string') updates.description = body.description.trim().slice(0, 600)
    if (body.servings != null) updates.servings = Math.max(1, Number(body.servings) || 1)
    if (body.prepTime != null) updates.prep_time = Math.max(0, Number(body.prepTime) || 0)
    if (body.cookTime != null) updates.cook_time = Math.max(0, Number(body.cookTime) || 0)
    if (typeof body.difficulty === 'string') updates.difficulty = body.difficulty
    if (body.ingredients != null) updates.ingredients = sanitizeIngredients(body.ingredients)
    if (body.instructions != null) updates.instructions = sanitizeInstructions(body.instructions)
    if (body.nutrition != null) updates.nutrition = sanitizeNutrition(body.nutrition)
    if (body.clarifyingQuestions != null) {
      updates.clarifying_questions = sanitizeClarifyingQuestions(body.clarifyingQuestions)
    }
    if (Array.isArray(body.dietaryCategories)) {
      updates.dietary_categories = body.dietaryCategories
        .filter((c: unknown): c is string => typeof c === 'string')
        .slice(0, 6)
    }

    // Send til godkendelse (eller tilbage til kladde).
    if (body.submit === true) {
      updates.status = 'pending'
      updates.review_notes = null
    } else if (body.status === 'draft' && existing.status === 'rejected') {
      updates.status = 'draft' as ProvisionalStatus
    }

    const { data, error } = await supabase
      .from('provisional_recipes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(PROVISIONAL_SELECT)
      .single()

    if (error) {
      console.error('provisional PATCH', error)
      return NextResponse.json({ error: 'Kunne ikke gemme', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('provisional PATCH', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

    const user = await getSupabaseRouteUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Mangler id' }, { status: 400 })

    const { error } = await supabase
      .from('provisional_recipes')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)
      .neq('status', 'approved')

    if (error) {
      console.error('provisional DELETE', error)
      return NextResponse.json({ error: 'Kunne ikke slette', details: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('provisional DELETE', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
