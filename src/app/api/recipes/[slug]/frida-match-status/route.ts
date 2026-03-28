import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function isPersistentIngredientId(id: string | undefined): id is string {
  if (!id) return false
  const v = String(id).trim()
  if (!v) return false
  return !v.toLowerCase().startsWith('temp-')
}

function foodIdFromFridaRef(ref: string | null | undefined): number | null {
  if (ref == null || ref === '') return null
  const s = String(ref).trim()
  const num = parseInt(s.replace(/^frida-/i, ''), 10)
  return Number.isFinite(num) ? num : null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = createSupabaseServiceClient()

    let { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, title, slug, ingredients')
      .eq('slug', slug)
      .single()

    if (recipeError || !recipe) {
      const { data: recipeById, error: recipeByIdError } = await supabase
        .from('recipes')
        .select('id, title, slug, ingredients')
        .eq('id', slug)
        .single()

      if (!recipeByIdError && recipeById) {
        recipe = recipeById
        recipeError = null
      }
    }

    if (recipeError || !recipe) {
      return NextResponse.json({ success: false, message: 'Recipe not found' }, { status: 404 })
    }

    const flat: Array<{ id?: string; name: string; amount?: number; unit?: string }> = []
    const base = (recipe.ingredients as Array<{ id?: string; name: string; amount?: number; unit?: string }>) || []
    flat.push(...base)
    const groups = (recipe as { ingredientGroups?: Array<{ ingredients?: typeof base }> }).ingredientGroups
    if (groups?.length) {
      for (const g of groups) {
        if (g.ingredients?.length) flat.push(...g.ingredients)
      }
    }
    const seen = new Set<string>()
    const recipeIngredients = flat.filter((i) => {
      if (!isPersistentIngredientId(i.id)) return true
      if (seen.has(String(i.id))) return false
      seen.add(String(i.id))
      return true
    })
    const ids = recipeIngredients.map((i) => i.id).filter((id): id is string => isPersistentIngredientId(id))

    let matchRows: Array<{ recipe_ingredient_id: string; frida_ingredient_id: string }> = []
    if (ids.length > 0) {
      const { data, error: matchErr } = await supabase
        .from('ingredient_matches')
        .select('recipe_ingredient_id, frida_ingredient_id')
        .in('recipe_ingredient_id', ids)

      if (matchErr) {
        console.error('frida-match-status ingredient_matches:', matchErr)
        return NextResponse.json({ success: false, message: 'Failed to load Frida matches' }, { status: 500 })
      }
      matchRows = (data || []) as Array<{ recipe_ingredient_id: string; frida_ingredient_id: string }>
    }

    const byRecipeIngId = new Map<string, string>()
    for (const r of matchRows || []) {
      if (r.recipe_ingredient_id && r.frida_ingredient_id) {
        byRecipeIngId.set(String(r.recipe_ingredient_id), String(r.frida_ingredient_id))
      }
    }

    // Fallback for rows uden persistente IDs (fx temp-1): resolve via ingredients.name
    const cleanedToResolvedIngredientId = new Map<string, string>()
    const rowsWithoutPersistentId = recipeIngredients.filter((ing) => !isPersistentIngredientId(ing.id))
    const cleanedNames = [
      ...new Set(
        rowsWithoutPersistentId
          .map((ing) => String(ing.name || '').toLowerCase().trim())
          .filter((n) => n.length > 0)
      ),
    ]

    if (cleanedNames.length > 0) {
      const resolved = await Promise.all(
        cleanedNames.map(async (name) => {
          const { data: ingRow } = await supabase
            .from('ingredients')
            .select('id')
            .ilike('name', name)
            .limit(1)
            .maybeSingle()
          return { name, ingredientId: ingRow?.id as string | undefined }
        })
      )

      const fallbackIds = [...new Set(resolved.map((r) => r.ingredientId).filter(Boolean) as string[])]
      for (const r of resolved) {
        if (r.ingredientId) cleanedToResolvedIngredientId.set(r.name, r.ingredientId)
      }

      if (fallbackIds.length > 0) {
        const { data: fbRows } = await supabase
          .from('ingredient_matches')
          .select('recipe_ingredient_id, frida_ingredient_id')
          .in('recipe_ingredient_id', fallbackIds)

        for (const r of fbRows || []) {
          if (r.recipe_ingredient_id && r.frida_ingredient_id) {
            byRecipeIngId.set(String(r.recipe_ingredient_id), String(r.frida_ingredient_id))
          }
        }
      }
    }

    const foodIds = [...new Set([...byRecipeIngId.values()].map(foodIdFromFridaRef).filter((n): n is number => n != null))]

    let foodNames = new Map<number, string>()
    if (foodIds.length > 0) {
      const { data: foods } = await supabase
        .from('frida_foods')
        .select('food_id, food_name_da')
        .in('food_id', foodIds)

      for (const f of foods || []) {
        foodNames.set(f.food_id, f.food_name_da || '')
      }
    }

    const rows = recipeIngredients.map((ing) => {
      const rid = isPersistentIngredientId(ing.id)
        ? String(ing.id)
        : cleanedToResolvedIngredientId.get(String(ing.name || '').toLowerCase().trim()) || ''
      const fridaRef = rid ? byRecipeIngId.get(rid) : undefined
      const fid = fridaRef ? foodIdFromFridaRef(fridaRef) : null
      const fridaName = fid != null ? foodNames.get(fid) || null : null

      return {
        ingredientId: ing.id || null,
        name: ing.name,
        amount: ing.amount ?? null,
        unit: ing.unit ?? '',
        hasIngredientRowId: !!rid,
        hasFridaMatch: !!fridaRef,
        fridaIngredientId: fridaRef || null,
        fridaNameDa: fridaName,
      }
    })

    const matchedCount = rows.filter((r) => r.hasFridaMatch).length

    return NextResponse.json({
      success: true,
      data: {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        rows,
        matchedCount,
        totalCount: rows.length,
      },
    })
  } catch (e) {
    console.error('frida-match-status:', e)
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
