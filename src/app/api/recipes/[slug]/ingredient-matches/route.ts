import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const revalidate = 0

/** Samme logik som ved opslag i ingredients — mængde/enhed fjernes, så vi kan matche række → basisnavn */
function cleanRecipeIngredientName(raw: string): string {
  let s = raw.toLowerCase().trim()
  s = s
    .replace(/^\d+[.,]?\d*\s*(stk|st|styk|stykker|dl|ml|l|g|gram|kg|mg|tsk|tesk|spsk|bdt|bundt|håndfuld|håndfulde)\s+/i, '')
    .replace(/^\d+[.,]?\d*\s*/, '')
    .trim()
  return s
}

function isPersistentIngredientId(id: string | undefined): id is string {
  if (!id) return false
  const v = String(id).trim()
  if (!v) return false
  return !v.toLowerCase().startsWith('temp-')
}

type SupabaseLike = ReturnType<typeof createSupabaseServiceClient>

/**
 * Henter product_ingredient_matches + supermarket_products i to trin.
 * Undgår PostgREST-embed (`supermarket_products!inner`), som kan fejle hvis relationen
 * ikke er synlig for API'et — så hele Dagligvarer-boksen fejlede med 500.
 */
async function loadProductMatchesWithProducts(
  supabase: SupabaseLike,
  ingredientIds: string[]
): Promise<
  Array<{
    ingredient_id: string
    confidence: number
    match_type: string
    supermarket_products: Record<string, unknown>
  }>
> {
  if (ingredientIds.length === 0) return []

  const { data: rows, error: mErr } = await supabase
    .from('product_ingredient_matches')
    .select('ingredient_id, product_external_id, confidence, match_type')
    .in('ingredient_id', ingredientIds)

  if (mErr) {
    throw new Error(`product_ingredient_matches: ${mErr.message}`)
  }
  if (!rows?.length) return []

  const externalIds = [...new Set(rows.map((r) => r.product_external_id).filter(Boolean) as string[])]
  if (externalIds.length === 0) return []

  const { data: products, error: pErr } = await supabase
    .from('supermarket_products')
    .select('external_id, name, category, store, price, original_price, is_on_sale, image_url')
    .in('external_id', externalIds)

  if (pErr) {
    throw new Error(`supermarket_products: ${pErr.message}`)
  }

  const productByExt = new Map((products || []).map((p) => [p.external_id, p]))

  const out: Array<{
    ingredient_id: string
    confidence: number
    match_type: string
    supermarket_products: Record<string, unknown>
  }> = []

  for (const r of rows) {
    const product = productByExt.get(r.product_external_id)
    if (!product) continue
    out.push({
      ingredient_id: String(r.ingredient_id),
      confidence: Number(r.confidence),
      match_type: String(r.match_type ?? ''),
      supermarket_products: product as Record<string, unknown>,
    })
  }

  return out
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams

    console.log(`🔍 Getting ingredient matches for recipe: ${slug}`)

    const supabase = createSupabaseServiceClient()

    // First try to get recipe by slug
    let { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, title, ingredients, slug')
      .eq('slug', slug)
      .single()

    // If not found by slug, try to find by ID (fallback for imported recipes)
    if (recipeError || !recipe) {
      console.log(`🔍 Recipe not found by slug "${slug}", trying to find by ID...`)

      const { data: recipeById, error: recipeByIdError } = await supabase
        .from('recipes')
        .select('id, title, ingredients, slug')
        .eq('id', slug)
        .single()

      if (!recipeByIdError && recipeById) {
        recipe = recipeById
        recipeError = null
        console.log(`✅ Found recipe by ID: ${recipe.title}`)
      }
    }

    if (recipeError || !recipe) {
      return NextResponse.json({
        success: false,
        message: 'Recipe not found'
      }, { status: 404 })
    }

    // Get all ingredients for this recipe
    const recipeIngredients = recipe.ingredients || []
    
    if (recipeIngredients.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          ingredientMatches: [],
          totalIngredients: 0,
          matchedIngredients: 0,
          unmatchedIngredients: 0
        }
      })
    }

    /**
     * Primær sti: opskriftslinjer har `id` = ingredients.id → vi henter produktmatch direkte på ingredient_id.
     * (Tidligere bug: opslag med fuld tekst "10 stk oksepølser" mod nøgle "oksepølser" → næsten alt fejlede.)
     */
    const idsFromRows = (recipeIngredients as { id?: string }[])
      .map((ing) => ing.id)
      .filter((id): id is string => isPersistentIngredientId(id))
    const ingredientIdsFromRecipe = [...new Set(idsFromRows)]

    let matches: Array<{
      ingredient_id: string
      confidence: number
      match_type: string
      supermarket_products: Record<string, unknown>
    }> = []

    if (ingredientIdsFromRecipe.length > 0) {
      try {
        matches = await loadProductMatchesWithProducts(supabase, ingredientIdsFromRecipe)
      } catch (e) {
        console.error('Error fetching product ingredient matches:', e)
        return NextResponse.json(
          {
            success: false,
            message: `Failed to fetch ingredient matches: ${e instanceof Error ? e.message : 'Unknown error'}`,
          },
          { status: 500 }
        )
      }
    }

    const matchesByIngredientId = new Map<
      string,
      Array<{ product: Record<string, unknown>; confidence: number; matchType: string }>
    >()

    for (const m of matches) {
      const iid = String(m.ingredient_id)
      if (!matchesByIngredientId.has(iid)) {
        matchesByIngredientId.set(iid, [])
      }
      matchesByIngredientId.get(iid)!.push({
        product: m.supermarket_products,
        confidence: m.confidence,
        matchType: m.match_type,
      })
    }

    /** Fallback: linjer uden `id` — find ingredients-række med ilike på renset navn */
    const matchesByCleanedName = new Map<
      string,
      Array<{ product: Record<string, unknown>; confidence: number; matchType: string }>
    >()

    type RecipeIng = { id?: string; name: string }
    const withoutId = (recipeIngredients as RecipeIng[]).filter((ing) => !isPersistentIngredientId(ing.id))
    const uniqueCleaned: string[] = [
      ...new Set(
        withoutId
          .map((ing) => cleanRecipeIngredientName(ing.name))
          .filter((n) => n.length > 0)
      ),
    ]

    if (uniqueCleaned.length > 0) {
      const resolvedIds = await Promise.all(
        uniqueCleaned.map(async (cleaned: string) => {
          const { data: ingRow } = await supabase
            .from('ingredients')
            .select('id')
            .ilike('name', cleaned)
            .limit(1)
            .maybeSingle()
          return { cleaned, ingredientId: ingRow?.id as string | undefined }
        })
      )

      const fallbackIds = [...new Set(resolvedIds.map((r) => r.ingredientId).filter(Boolean) as string[])]
      if (fallbackIds.length > 0) {
        let fbRows: Awaited<ReturnType<typeof loadProductMatchesWithProducts>> = []
        try {
          fbRows = await loadProductMatchesWithProducts(supabase, fallbackIds)
        } catch (e) {
          console.error('Error fetching fallback product matches:', e)
          return NextResponse.json(
            {
              success: false,
              message: `Failed to fetch ingredient matches: ${e instanceof Error ? e.message : 'Unknown error'}`,
            },
            { status: 500 }
          )
        }

        const byIngId = new Map<string, typeof fbRows>()
        for (const m of fbRows) {
          const iid = String(m.ingredient_id)
          if (!byIngId.has(iid)) byIngId.set(iid, [])
          byIngId.get(iid)!.push(m)
        }

        for (const { cleaned, ingredientId } of resolvedIds) {
          if (!ingredientId) continue
          const arr = (byIngId.get(String(ingredientId)) || []).map((x) => ({
            product: x.supermarket_products,
            confidence: x.confidence,
            matchType: x.match_type,
          }))
          matchesByCleanedName.set(cleaned, arr)
        }
      }
    }

    const ingredientMatches = recipeIngredients.map((ingredient: any) => {
      let rowMatches: Array<{ product: Record<string, unknown>; confidence: number; matchType: string }> = []

      if (ingredient.id) {
        if (isPersistentIngredientId(ingredient.id)) {
          rowMatches = matchesByIngredientId.get(String(ingredient.id)) || []
        } else {
          const cleaned = cleanRecipeIngredientName(ingredient.name)
          rowMatches = matchesByCleanedName.get(cleaned) || []
        }
      } else {
        const cleaned = cleanRecipeIngredientName(ingredient.name)
        rowMatches = matchesByCleanedName.get(cleaned) || []
      }

      const isMatched = rowMatches.length > 0

      return {
        ingredient: {
          id: ingredient.id,
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
        },
        isMatched,
        matches: rowMatches.slice(0, 3),
        totalMatches: rowMatches.length,
        bestMatch: rowMatches.length > 0 ? rowMatches[0] : null,
      }
    })

    const matchedIngredients = ingredientMatches.filter((im: any) => im.isMatched).length
    const unmatchedIngredients = ingredientMatches.length - matchedIngredients

    console.log(`✅ Found ${matchedIngredients}/${ingredientMatches.length} matched ingredients`)

    return NextResponse.json({
      success: true,
      data: {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        ingredientMatches,
        totalIngredients: ingredientMatches.length,
        matchedIngredients,
        unmatchedIngredients
      }
    })

  } catch (error) {
    console.error('❌ Error getting ingredient matches:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to get ingredient matches: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
