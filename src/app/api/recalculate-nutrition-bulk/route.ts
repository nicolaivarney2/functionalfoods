import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { recalculateRecipeNutritionFromFrida } from '@/lib/recipe-frida-nutrition-recalc'

export const dynamic = 'force-dynamic'

type BatchDetail = {
  recipeId: string
  title: string
  status: 'success' | 'error'
  message: string
  matchedIngredients?: number
  totalIngredients?: number
  calories?: number
}

function clampBatchSize(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 25
  return Math.min(50, Math.max(1, Math.floor(n)))
}

function parseOffset(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

async function getRecipeBatch(limit: number, offset: number) {
  const supabase = createSupabaseServiceClient()
  const { data, error, count } = await supabase
    .from('recipes')
    .select('id, title', { count: 'exact' })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`Could not load recipe batch: ${error.message}`)
  return { recipes: data || [], total: count || 0 }
}

export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()
    const { count, error } = await supabase
      .from('recipes')
      .select('id', { count: 'exact', head: true })

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, totalRecipes: count || 0 })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const limit = clampBatchSize(body.limit)
    const offset = parseOffset(body.offset)

    console.log(`🔄 Starting nutrition batch recalculation: offset=${offset}, limit=${limit}`)

    const { recipes, total } = await getRecipeBatch(limit, offset)
    const details: BatchDetail[] = []
    let successCount = 0
    let errorCount = 0

    for (const recipe of recipes) {
      const title = String(recipe.title || recipe.id)
      try {
        const result = await recalculateRecipeNutritionFromFrida(String(recipe.id))
        if (!result.success) {
          errorCount += 1
          details.push({
            recipeId: String(recipe.id),
            title,
            status: 'error',
            message: result.error,
          })
          continue
        }

        successCount += 1
        details.push({
          recipeId: String(recipe.id),
          title,
          status: 'success',
          message: `Updated nutrition: ${result.matchedIngredients}/${result.totalIngredients} ingredients matched`,
          matchedIngredients: result.matchedIngredients,
          totalIngredients: result.totalIngredients,
          calories: Math.round(result.nutrition.calories),
        })
      } catch (error) {
        errorCount += 1
        details.push({
          recipeId: String(recipe.id),
          title,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const processed = recipes.length
    const nextOffset = offset + processed

    return NextResponse.json({
      success: true,
      message: `Nutrition batch recalculation completed for ${processed} recipes`,
      results: {
        totalRecipes: total,
        offset,
        limit,
        nextOffset,
        hasMore: nextOffset < total,
        processed,
        success: successCount,
        errors: errorCount,
        details,
      },
    })
  } catch (error) {
    console.error('Error in batch nutrition recalculation API:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
