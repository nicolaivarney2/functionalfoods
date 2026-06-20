import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import type { Recipe, Ingredient } from '@/types/recipe'

export const dynamic = 'force-dynamic'

/** Saml ingrediens-linjer fra en opskrift (grupperet eller flad liste). */
function getRecipeIngredientLines(recipe: Recipe): Ingredient[] {
  if (recipe.ingredientGroups?.length) {
    return recipe.ingredientGroups.flatMap((group) => group.ingredients)
  }
  return recipe.ingredients ?? []
}

function parseStoreIds(raw: string | null): number[] {
  if (!raw?.trim()) return [1]
  const ids = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0)
  return ids.length > 0 ? ids : [1]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const recipe = await databaseService.getPublishedRecipeBySlug(slug)
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const storeIds = parseStoreIds(request.nextUrl.searchParams.get('stores'))
    const targetServings = Math.max(
      1,
      Number(request.nextUrl.searchParams.get('servings')) || recipe.servings || 4
    )
    const scale = targetServings / Math.max(1, recipe.servings || 4)

    const shoppingListItems = getRecipeIngredientLines(recipe).map((ingredient) => ({
      name: ingredient.name,
      amount: Math.round((ingredient.amount ?? 0) * scale * 100) / 100,
      unit: ingredient.unit,
      ingredientId: (ingredient as { id?: string }).id,
    }))

    if (shoppingListItems.length === 0) {
      return NextResponse.json({ perPortionKr: null, totalKr: null })
    }

    const origin = request.nextUrl.origin
    const priceResponse = await fetch(`${origin}/api/madbudget/shopping-list-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shoppingListItems,
        selectedStoreIds: storeIds,
      }),
    })

    if (!priceResponse.ok) {
      return NextResponse.json({ perPortionKr: null, totalKr: null })
    }

    const priceData = await priceResponse.json()
    const storeResults = priceData?.data ?? {}

    let bestTotal = Infinity
    for (const storeItems of Object.values(storeResults) as Array<Record<string, { totalPrice?: number; price?: number }>>) {
      const storeTotal = Object.values(storeItems).reduce((sum, item) => {
        return sum + (item.totalPrice ?? item.price ?? 0)
      }, 0)
      if (storeTotal > 0 && storeTotal < bestTotal) {
        bestTotal = storeTotal
      }
    }

    if (!Number.isFinite(bestTotal) || bestTotal === Infinity) {
      return NextResponse.json({ perPortionKr: null, totalKr: null })
    }

    const perPortionKr = bestTotal / targetServings

    return NextResponse.json({
      totalKr: Math.round(bestTotal * 100) / 100,
      perPortionKr: Math.round(perPortionKr * 100) / 100,
      servings: targetServings,
    })
  } catch (error) {
    console.error('price-estimate error:', error)
    return NextResponse.json({ perPortionKr: null, totalKr: null }, { status: 500 })
  }
}
