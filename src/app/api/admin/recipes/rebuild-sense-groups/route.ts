import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { normalizeAiRecipeIngredients } from '@/lib/ai-recipe-ingredient-normalize'
import { databaseService } from '@/lib/database-service'
import { revalidateRecipeCollectionPaths } from '@/lib/cache-revalidation'
import { inferSenseIngredientGroupsFromFlat } from '@/lib/sense-spisekasse'
import type { Ingredient } from '@/types/recipe'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isSenseRecipe(tags: unknown): boolean {
  if (!Array.isArray(tags)) return false
  return tags.some((t) => String(t).toLowerCase() === 'sense')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const recipeId = body?.recipeId as string | undefined
    if (!recipeId) {
      return NextResponse.json({ error: 'recipeId er påkrævet' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    })

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('id, slug, title, dietaryCategories, ingredients')
      .eq('id', recipeId)
      .single()

    if (error || !recipe) {
      return NextResponse.json({ error: 'Opskrift ikke fundet' }, { status: 404 })
    }

    if (!isSenseRecipe(recipe.dietaryCategories)) {
      return NextResponse.json(
        { error: 'Opskriften har ikke Sense i dietaryCategories' },
        { status: 400 }
      )
    }

    const rawIngs = Array.isArray(recipe.ingredients) ? recipe.ingredients : []
    const flatForNorm = rawIngs.map((ing: Record<string, unknown>) => ({
      name: String(ing?.name ?? ''),
      amount: Number(ing?.amount) || 0,
      unit: String(ing?.unit ?? ''),
      ...(ing?.notes != null && String(ing.notes).trim() !== ''
        ? { notes: String(ing.notes) }
        : {}),
    }))
    const normalized = normalizeAiRecipeIngredients(flatForNorm)
    const inferred = inferSenseIngredientGroupsFromFlat(normalized)
    if (!inferred || inferred.length === 0) {
      return NextResponse.json(
        {
          error:
            'Kunne ikke bygge grupper (tjek at ingredienslisten ikke er tom og at navne matcher heuristikken).',
        },
        { status: 422 }
      )
    }

    const ingredients: Ingredient[] = inferred.flatMap((g) => g.ingredients)

    const { error: upErr } = await supabase
      .from('recipes')
      .update({
        ingredients,
        ingredientGroups: inferred,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', recipeId)

    if (upErr) {
      console.error(upErr)
      return NextResponse.json(
        { error: 'Kunne ikke opdatere opskrift', details: upErr.message },
        { status: 500 }
      )
    }

    databaseService.clearRecipeCaches()
    if (recipe.slug) {
      revalidatePath(`/opskrift/${recipe.slug}`)
    }
    revalidateRecipeCollectionPaths(recipe)

    return NextResponse.json({
      success: true,
      recipeId,
      groups: inferred.map((g) => ({ name: g.name, count: g.ingredients.length })),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
