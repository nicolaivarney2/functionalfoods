import { NextRequest, NextResponse } from 'next/server'
import { convertToGrams } from '@/lib/recipe-frida-nutrition-recalc'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function isPersistentIngredientId(id: string | undefined): id is string {
  if (!id) return false
  const v = String(id).trim()
  if (!v) return false
  return !v.toLowerCase().startsWith('temp-')
}

/** Samme som recalculate-nutrition — til opløsning mod ingredients.id */
function cleanRecipeIngredientName(raw: string): string {
  let s = String(raw || '').toLowerCase().trim()
  s = s
    .replace(/^\d+[.,]?\d*\s*(stk|st|styk|stykker|dl|ml|l|g|gram|kg|mg|tsk|tesk|spsk|bdt|bundt|håndfuld|håndfulde)\s+/i, '')
    .replace(/^\d+[.,]?\d*\s*/, '')
    .trim()
  return s
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
    const idsFromLines = recipeIngredients.map((i) => i.id).filter((id): id is string => isPersistentIngredientId(id))

    const uniqueCleaned = [
      ...new Set(
        recipeIngredients
          .map((ing) => cleanRecipeIngredientName(String(ing.name || '')))
          .filter((n) => n.length > 0)
      ),
    ]
    const cleanedToCatalogId = new Map<string, string>()
    for (const cleaned of uniqueCleaned) {
      const { data: ingRow } = await supabase
        .from('ingredients')
        .select('id')
        .ilike('name', cleaned)
        .limit(1)
        .maybeSingle()
      if (ingRow?.id) cleanedToCatalogId.set(cleaned, String(ingRow.id))
    }

    const allIdsForMatches = new Set<string>([...idsFromLines])
    for (const cid of cleanedToCatalogId.values()) {
      allIdsForMatches.add(cid)
    }

    let matchRows: Array<{ recipe_ingredient_id: string; frida_ingredient_id: string }> = []
    if (allIdsForMatches.size > 0) {
      const { data, error: matchErr } = await supabase
        .from('ingredient_matches')
        .select('recipe_ingredient_id, frida_ingredient_id')
        .in('recipe_ingredient_id', [...allIdsForMatches])

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

    const allIdsForGrams = new Set<string>([...idsFromLines, ...cleanedToCatalogId.values()])
    const gramsPerUnitByCatalogId = new Map<string, number>()
    if (allIdsForGrams.size > 0) {
      const { data: gramRows } = await supabase
        .from('ingredients')
        .select('id, grams_per_unit')
        .in('id', [...allIdsForGrams])
      for (const row of gramRows || []) {
        const id = String((row as { id?: string }).id || '')
        const g = (row as { grams_per_unit?: number | null }).grams_per_unit
        if (id && g != null && Number(g) > 0) {
          gramsPerUnitByCatalogId.set(id, Number(g))
        }
      }
    }

    // Visningsnavn skal komme fra samme tabel som matching-UI (`frida_ingredients.name` på id-strengen).
    // Tidligere slog vi numerisk del op i `frida_foods.food_id`, hvilket ofte ramte forkert vare (andet food_id).
    const fridaRefs = [...new Set([...byRecipeIngId.values()].filter(Boolean))]
    const fridaNameByRef = new Map<string, string>()
    const fridaMacrosPer100ByRef = new Map<
      string,
      { calories: number; protein: number; carbs: number; fat: number }
    >()
    if (fridaRefs.length > 0) {
      const { data: fiRows, error: fiErr } = await supabase
        .from('frida_ingredients')
        .select('id, name, calories, protein, carbs, fat')
        .in('id', fridaRefs)

      if (fiErr) {
        console.error('frida-match-status frida_ingredients:', fiErr)
      } else {
        for (const row of fiRows || []) {
          if (row.id) {
            const id = String(row.id)
            fridaNameByRef.set(id, String((row as { name?: string }).name || ''))
            fridaMacrosPer100ByRef.set(id, {
              calories: Number((row as { calories?: number }).calories) || 0,
              protein: Number((row as { protein?: number }).protein) || 0,
              carbs: Number((row as { carbs?: number }).carbs) || 0,
              fat: Number((row as { fat?: number }).fat) || 0,
            })
          }
        }
      }
    }

    const rows = recipeIngredients.map((ing) => {
      const cleaned = cleanRecipeIngredientName(String(ing.name || ''))
      const catalogId = cleanedToCatalogId.get(cleaned)
      const linePersisted = isPersistentIngredientId(ing.id) ? String(ing.id) : ''
      const rid = linePersisted || catalogId || ''
      const fridaRef = catalogId
        ? byRecipeIngId.get(catalogId) || undefined
        : (linePersisted && byRecipeIngId.get(linePersisted)) || undefined
      const fridaName = fridaRef ? fridaNameByRef.get(fridaRef) || null : null

      let contribution: {
        kcal: number
        protein: number
        carbs: number
        fat: number
        grams: number
      } | null = null
      if (fridaRef && fridaMacrosPer100ByRef.has(fridaRef)) {
        const per100 = fridaMacrosPer100ByRef.get(fridaRef)!
        const catalogForGrams = catalogId || linePersisted || ''
        const gramsPerPiece = catalogForGrams ? gramsPerUnitByCatalogId.get(catalogForGrams) : undefined
        const grams = convertToGrams(Number(ing.amount) || 0, String(ing.unit || ''), {
          gramsPerPiece,
        })
        const sf = grams / 100
        contribution = {
          grams: Math.round(grams * 10) / 10,
          kcal: Math.round(per100.calories * sf),
          protein: Math.round(per100.protein * sf * 10) / 10,
          carbs: Math.round(per100.carbs * sf * 10) / 10,
          fat: Math.round(per100.fat * sf * 10) / 10,
        }
      }

      return {
        ingredientId: ing.id || null,
        name: ing.name,
        amount: ing.amount ?? null,
        unit: ing.unit ?? '',
        hasIngredientRowId: !!rid,
        hasFridaMatch: !!fridaRef,
        fridaIngredientId: fridaRef || null,
        fridaNameDa: fridaName,
        contribution,
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
