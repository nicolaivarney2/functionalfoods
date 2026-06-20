import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServiceClient()
    const { searchParams } = new URL(request.url)
    const recipeId = searchParams.get('recipeId')

    if (recipeId) {
      const { data } = await supabase
        .from('user_saved_recipes')
        .select('id')
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId)
        .maybeSingle()
      return NextResponse.json({ saved: Boolean(data) })
    }

    const { data, error } = await supabase
      .from('user_saved_recipes')
      .select(`
        id,
        recipe_id,
        created_at,
        recipes:recipe_id (
          id,
          title,
          slug,
          image_url,
          short_description
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('saved-recipes GET:', error)
      return NextResponse.json({ error: 'Failed to fetch saved recipes' }, { status: 500 })
    }

    const recipes = (data ?? []).map((row) => {
      const recipe = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes
      return {
        id: row.id,
        recipeId: row.recipe_id,
        title: recipe?.title ?? 'Ukendt opskrift',
        slug: recipe?.slug ?? row.recipe_id,
        imageUrl: recipe?.image_url ?? null,
        shortDescription: recipe?.short_description ?? null,
        savedAt: row.created_at,
      }
    })

    return NextResponse.json({ recipes })
  } catch (err) {
    console.error('GET /api/saved-recipes:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipeId } = await request.json()
    if (!recipeId || typeof recipeId !== 'string') {
      return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('user_saved_recipes')
      .upsert(
        { user_id: user.id, recipe_id: recipeId },
        { onConflict: 'user_id,recipe_id', ignoreDuplicates: true },
      )
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('saved-recipes POST:', error)
      return NextResponse.json({ error: 'Failed to save recipe' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('POST /api/saved-recipes:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recipeId = new URL(request.url).searchParams.get('recipeId')
    if (!recipeId) {
      return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { error } = await supabase
      .from('user_saved_recipes')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId)

    if (error) {
      console.error('saved-recipes DELETE:', error)
      return NextResponse.json({ error: 'Failed to remove recipe' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/saved-recipes:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
