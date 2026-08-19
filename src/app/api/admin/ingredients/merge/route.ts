import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-route-auth'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { databaseService } from '@/lib/database-service'
import { revalidateRecipeCollectionPaths } from '@/lib/cache-revalidation'
import { mergeIngredientTags, parseIngredientTags } from '@/lib/dietary-exclusions'
import {
  rewriteIngredientList,
  rewriteRecipeIngredientFields,
  type IngredientIdentity,
} from '@/lib/ingredient-merge'
import {
  deleteIngredientTagsInFooddata,
  deleteMatchesForIngredientInFooddata,
  runFooddataPublish,
  upsertIngredientTagsInFooddata,
  upsertMatchesBatchInFooddata,
  type ProductIngredientMatchRow,
} from '@/lib/fooddata-publish'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 120

const PAGE = 1000
const PREVIEW_TITLE_LIMIT = 30

type IngredientRow = {
  id: string
  name: string
  exclusions?: unknown
  grams_per_unit?: number | null
}

type RecipeRow = {
  id: string
  slug?: string | null
  title?: string | null
  ingredients?: unknown
  ingredientGroups?: unknown
  mainCategory?: string | null
  dietaryCategories?: unknown
}

type ProductMatchRow = ProductIngredientMatchRow & {
  id?: string | number
  product_external_id: string
}

function chunkIds<T>(items: T[], size = 200): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  orderCol = 'id'
): Promise<T[]> {
  const out: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    out.push(...(data as T[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if (!admin) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const sourceId = typeof body?.sourceId === 'string' ? body.sourceId.trim() : ''
    const targetId = typeof body?.targetId === 'string' ? body.targetId.trim() : ''
    const dryRun = body?.dryRun === true

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { success: false, message: 'sourceId og targetId kræves' },
        { status: 400 }
      )
    }
    if (sourceId === targetId) {
      return NextResponse.json(
        { success: false, message: 'Kilde og mål skal være to forskellige ingredienser' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceClient()

    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('id, name, exclusions, grams_per_unit')
      .in('id', [sourceId, targetId])

    if (ingError) {
      throw new Error(`Kunne ikke hente ingredienser: ${ingError.message}`)
    }

    const source = (ingredients || []).find((row) => row.id === sourceId) as IngredientRow | undefined
    const target = (ingredients || []).find((row) => row.id === targetId) as IngredientRow | undefined

    if (!source) {
      return NextResponse.json(
        { success: false, message: 'Kilde-ingrediens blev ikke fundet' },
        { status: 404 }
      )
    }
    if (!target) {
      return NextResponse.json(
        { success: false, message: 'Mål-ingrediens blev ikke fundet' },
        { status: 404 }
      )
    }

    const sourceIdentity: IngredientIdentity = { id: source.id, name: source.name }
    const targetIdentity: IngredientIdentity = { id: target.id, name: target.name }

    const [sourceMatches, targetMatches, recipes, provisionalRecipes] = await Promise.all([
      supabase
        .from('product_ingredient_matches')
        .select(
          'id, ingredient_id, product_external_id, confidence, match_type, is_manual, product_name_snapshot, product_store_snapshot, last_known_price, created_at, updated_at'
        )
        .eq('ingredient_id', source.id)
        .then(({ data, error }) => {
          if (error) throw new Error(`product_ingredient_matches (kilde): ${error.message}`)
          return (data || []) as ProductMatchRow[]
        }),
      supabase
        .from('product_ingredient_matches')
        .select('product_external_id')
        .eq('ingredient_id', target.id)
        .then(({ data, error }) => {
          if (error) throw new Error(`product_ingredient_matches (mål): ${error.message}`)
          return (data || []) as Array<{ product_external_id: string }>
        }),
      fetchAllRows<RecipeRow>(
        supabase,
        'recipes',
        'id, slug, title, ingredients, ingredientGroups, mainCategory, dietaryCategories'
      ),
      fetchAllRows<{ id: string; title?: string | null; ingredients?: unknown }>(
        supabase,
        'provisional_recipes',
        'id, title, ingredients'
      ).catch((error) => {
        console.warn('⚠️ Could not load provisional_recipes for merge:', error)
        return [] as Array<{ id: string; title?: string | null; ingredients?: unknown }>
      }),
    ])

    const targetProductIds = new Set(
      targetMatches.map((row) => String(row.product_external_id || '').trim()).filter(Boolean)
    )
    const matchesToMove = sourceMatches.filter((row) => {
      const productId = String(row.product_external_id || '').trim()
      return productId.length > 0 && !targetProductIds.has(productId)
    })
    const matchesAlreadyOnTarget = sourceMatches.length - matchesToMove.length

    const affectedRecipes: Array<{ id: string; title: string; slug?: string | null; renamedCount: number }> =
      []
    for (const recipe of recipes) {
      const rewritten = rewriteRecipeIngredientFields(recipe, sourceIdentity, targetIdentity)
      if (!rewritten.changed) continue
      affectedRecipes.push({
        id: recipe.id,
        title: recipe.title || recipe.slug || recipe.id,
        slug: recipe.slug,
        renamedCount: rewritten.renamedCount,
      })
    }

    const affectedProvisional: Array<{ id: string; title: string; renamedCount: number }> = []
    for (const recipe of provisionalRecipes) {
      const rewritten = rewriteIngredientList(recipe.ingredients, sourceIdentity, targetIdentity)
      if (rewritten.renamedCount === 0) continue
      affectedProvisional.push({
        id: recipe.id,
        title: recipe.title || recipe.id,
        renamedCount: rewritten.renamedCount,
      })
    }

    const preview = {
      source: { id: source.id, name: source.name },
      target: { id: target.id, name: target.name },
      productMatchesToMove: matchesToMove.length,
      productMatchesAlreadyOnTarget: matchesAlreadyOnTarget,
      recipesToUpdate: affectedRecipes.length,
      recipeTitles: affectedRecipes.slice(0, PREVIEW_TITLE_LIMIT).map((row) => row.title),
      provisionalRecipesToUpdate: affectedProvisional.length,
    }

    if (dryRun) {
      return NextResponse.json({ success: true, dryRun: true, preview })
    }

    const now = new Date().toISOString()

    if (matchesToMove.length > 0) {
      const ids = matchesToMove.map((row) => row.id).filter((id): id is string | number => id != null)
      for (const idsChunk of chunkIds(ids)) {
        const { error } = await supabase
          .from('product_ingredient_matches')
          .update({ ingredient_id: target.id })
          .in('id', idsChunk)
        if (error) throw new Error(`Kunne ikke flytte produktmatches: ${error.message}`)
      }
    }

    const leftoverSourceMatchIds = sourceMatches
      .filter((row) => {
        const productId = String(row.product_external_id || '').trim()
        return row.id != null && targetProductIds.has(productId)
      })
      .map((row) => row.id)
      .filter((id): id is string | number => id != null)

    for (const idsChunk of chunkIds(leftoverSourceMatchIds)) {
      const { error } = await supabase.from('product_ingredient_matches').delete().in('id', idsChunk)
      if (error) throw new Error(`Kunne ikke slette duplikat-matches: ${error.message}`)
    }

    const { data: stillOnSource, error: stillErr } = await supabase
      .from('product_ingredient_matches')
      .select('id, product_external_id')
      .eq('ingredient_id', source.id)
    if (stillErr) {
      throw new Error(`Kunne ikke tjekke resterende matches: ${stillErr.message}`)
    }
    for (const row of stillOnSource || []) {
      const productId = String(row.product_external_id || '').trim()
      if (!productId) continue
      if (targetProductIds.has(productId)) {
        const { error } = await supabase.from('product_ingredient_matches').delete().eq('id', row.id)
        if (error) throw new Error(`Kunne ikke slette rest-duplikat: ${error.message}`)
      } else {
        const { error } = await supabase
          .from('product_ingredient_matches')
          .update({ ingredient_id: target.id })
          .eq('id', row.id)
        if (error) throw new Error(`Kunne ikke flytte rest-match: ${error.message}`)
        targetProductIds.add(productId)
        matchesToMove.push({
          ingredient_id: target.id,
          product_external_id: productId,
        })
      }
    }

    await transferFridaMatch(supabase, source.id, target.id)

    const sourceTags = parseIngredientTags(source.exclusions)
    const mergedExclusions = mergeIngredientTags(target.exclusions, {
      addFood: sourceTags.foodExclusions,
      addOrganic: sourceTags.organicTags,
    })
    const targetUpdate: {
      exclusions?: string[]
      grams_per_unit?: number
    } = {}
    if (mergedExclusions.length > 0) {
      targetUpdate.exclusions = mergedExclusions
    }
    if (
      (target.grams_per_unit === null || target.grams_per_unit === undefined) &&
      typeof source.grams_per_unit === 'number'
    ) {
      targetUpdate.grams_per_unit = source.grams_per_unit
    }
    if (Object.keys(targetUpdate).length > 0) {
      const { error } = await supabase.from('ingredients').update(targetUpdate).eq('id', target.id)
      if (error) {
        console.warn('⚠️ Could not copy metadata onto target ingredient:', error.message)
      }
    }

    let recipesUpdated = 0
    for (const recipe of recipes) {
      const rewritten = rewriteRecipeIngredientFields(recipe, sourceIdentity, targetIdentity)
      if (!rewritten.changed) continue
      const payload: Record<string, unknown> = {
        ingredients: rewritten.ingredients,
        updatedAt: now,
      }
      if (recipe.ingredientGroups !== undefined) {
        payload.ingredientGroups = rewritten.ingredientGroups
      }
      const { error } = await supabase.from('recipes').update(payload).eq('id', recipe.id)
      if (error) {
        throw new Error(`Kunne ikke opdatere opskrift ${recipe.title || recipe.id}: ${error.message}`)
      }
      recipesUpdated += 1
    }

    let provisionalUpdated = 0
    for (const recipe of provisionalRecipes) {
      const rewritten = rewriteIngredientList(recipe.ingredients, sourceIdentity, targetIdentity)
      if (rewritten.renamedCount === 0) continue
      const { error } = await supabase
        .from('provisional_recipes')
        .update({ ingredients: rewritten.next, updated_at: now })
        .eq('id', recipe.id)
      if (error) {
        console.warn(`⚠️ Could not update provisional recipe ${recipe.id}:`, error.message)
        continue
      }
      provisionalUpdated += 1
    }

    const { error: deleteSourceError } = await supabase.from('ingredients').delete().eq('id', source.id)
    if (deleteSourceError) {
      throw new Error(`Kunne ikke slette kilde-ingrediensen: ${deleteSourceError.message}`)
    }

    const movedForFooddata: ProductIngredientMatchRow[] = matchesToMove.map((row) => ({
      ...row,
      ingredient_id: target.id,
    }))
    const exclusionsForFooddata =
      targetUpdate.exclusions ??
      (Array.isArray(target.exclusions) ? (target.exclusions as string[]) : target.exclusions)

    const publishResult = await runFooddataPublish('merge-ingredients', async (client) => {
      if (movedForFooddata.length > 0) {
        await upsertMatchesBatchInFooddata(client, movedForFooddata)
      }
      await deleteMatchesForIngredientInFooddata(client, source.id)
      await deleteIngredientTagsInFooddata(client, source.id)
      await upsertIngredientTagsInFooddata(client, target.id, exclusionsForFooddata)
    })
    if (!publishResult.ok && !publishResult.skipped) {
      console.warn('⚠️ fooddata publish failed after local merge:', publishResult.error)
    }

    databaseService.clearRecipeCaches()
    for (const recipe of affectedRecipes) {
      if (typeof recipe.slug === 'string' && recipe.slug.length > 0) {
        revalidatePath(`/opskrift/${recipe.slug}`)
      }
    }
    const firstAffected = recipes.find((recipe) =>
      affectedRecipes.some((row) => row.id === recipe.id)
    )
    if (firstAffected) {
      revalidateRecipeCollectionPaths(firstAffected)
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      preview,
      result: {
        productMatchesMoved: matchesToMove.length,
        productMatchesDroppedAsDuplicates: leftoverSourceMatchIds.length,
        recipesUpdated,
        provisionalRecipesUpdated: provisionalUpdated,
        sourceDeleted: true,
        fooddata: publishResult,
      },
    })
  } catch (error) {
    console.error('❌ Error in /api/admin/ingredients/merge:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Kunne ikke merge ingredienser',
      },
      { status: 500 }
    )
  }
}

async function transferFridaMatch(
  supabase: SupabaseClient,
  sourceId: string,
  targetId: string
): Promise<void> {
  const { data: sourceRows, error: sourceError } = await supabase
    .from('ingredient_matches')
    .select('id, recipe_ingredient_id, frida_ingredient_id')
    .eq('recipe_ingredient_id', sourceId)
    .limit(1)

  if (sourceError) {
    console.warn('⚠️ Could not read Frida match for source:', sourceError.message)
    return
  }
  const sourceMatch = sourceRows?.[0]
  if (!sourceMatch) return

  const { data: targetRows, error: targetError } = await supabase
    .from('ingredient_matches')
    .select('id')
    .eq('recipe_ingredient_id', targetId)
    .limit(1)

  if (targetError) {
    console.warn('⚠️ Could not read Frida match for target:', targetError.message)
    return
  }
  const targetMatch = targetRows?.[0]

  if (targetMatch) {
    const { error } = await supabase.from('ingredient_matches').delete().eq('id', sourceMatch.id)
    if (error) console.warn('⚠️ Could not delete source Frida match:', error.message)
    return
  }

  const { error } = await supabase
    .from('ingredient_matches')
    .update({ recipe_ingredient_id: targetId })
    .eq('id', sourceMatch.id)
  if (error) console.warn('⚠️ Could not move Frida match:', error.message)
}
