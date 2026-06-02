import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { databaseService } from '@/lib/database-service'
import { revalidateRecipeCollectionPaths } from '@/lib/cache-revalidation'
import { revalidatePath } from 'next/cache'
import { normalizeAiRecipeIngredients } from '@/lib/ai-recipe-ingredient-normalize'
import {
  SENSE_SPISEKASSE_GROUP_TITLES,
  inferSenseIngredientGroupsFromFlat,
} from '@/lib/sense-spisekasse'
import type { Ingredient } from '@/types/recipe'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MAX_RECIPES_PER_REQUEST = 500

type ArrayField = 'subCategories' | 'dietaryCategories'
type ScalarField = 'mainCategory'
type Field = ArrayField | ScalarField
type Operation = 'add' | 'remove' | 'set' | 'clear'

interface BulkUpdateRequest {
  recipeIds: string[]
  field: Field
  operation: Operation
  // For array fields, the list of tag values to apply.
  values?: string[]
  // For scalar fields (mainCategory), the single value to set.
  value?: string | null
  // When true (default), recipes that end up with the "Sense" tag will have their
  // ingredientGroups auto-built using the standard heuristic. Set to false to disable.
  autoBuildSenseSpisekasse?: boolean
}

interface SenseAutoBuildSummary {
  built: number
  skipped: number
  failed: number
  details: Array<{ recipeId: string; status: 'built' | 'skipped' | 'failed'; reason?: string }>
}

function isSenseTag(value: string): boolean {
  return value.trim().toLowerCase() === 'sense'
}

function hasCanonicalSenseGroups(groups: unknown): boolean {
  if (!Array.isArray(groups) || groups.length === 0) return false
  const canonical = new Set<string>(SENSE_SPISEKASSE_GROUP_TITLES as unknown as string[])
  let nonEmptyCount = 0
  for (const g of groups) {
    if (!g || typeof g !== 'object') return false
    const name = (g as { name?: unknown }).name
    if (typeof name !== 'string' || !canonical.has(name)) return false
    const ings = (g as { ingredients?: unknown }).ingredients
    if (Array.isArray(ings) && ings.length > 0) nonEmptyCount += 1
  }
  return nonEmptyCount >= 2
}

async function autoBuildSenseSpisekasse(
  supabase: ReturnType<typeof createServerClient>,
  recipeIds: string[],
): Promise<SenseAutoBuildSummary> {
  const summary: SenseAutoBuildSummary = { built: 0, skipped: 0, failed: 0, details: [] }
  if (recipeIds.length === 0) return summary

  const { data, error } = await supabase
    .from('recipes')
    .select('id, slug, dietaryCategories, ingredients, ingredientGroups, mainCategory')
    .in('id', recipeIds)

  if (error) {
    console.error('❌ Failed fetching recipes for Sense auto-build:', error)
    for (const id of recipeIds) {
      summary.failed += 1
      summary.details.push({ recipeId: id, status: 'failed', reason: error.message })
    }
    return summary
  }

  for (const row of data ?? []) {
    const recipeId = String((row as any).id)
    try {
      if (hasCanonicalSenseGroups((row as any).ingredientGroups)) {
        summary.skipped += 1
        summary.details.push({ recipeId, status: 'skipped', reason: 'already has spisekasse groups' })
        continue
      }
      const rawIngs = Array.isArray((row as any).ingredients) ? ((row as any).ingredients as unknown[]) : []
      if (rawIngs.length === 0) {
        summary.skipped += 1
        summary.details.push({ recipeId, status: 'skipped', reason: 'no ingredients' })
        continue
      }
      const flat = rawIngs.map((ing: any) => ({
        name: String(ing?.name ?? ''),
        amount: Number(ing?.amount) || 0,
        unit: String(ing?.unit ?? ''),
        ...(ing?.notes != null && String(ing.notes).trim() !== ''
          ? { notes: String(ing.notes) }
          : {}),
      }))
      const normalized = normalizeAiRecipeIngredients(flat)
      const inferred = inferSenseIngredientGroupsFromFlat(normalized)
      if (!inferred || inferred.length === 0) {
        summary.failed += 1
        summary.details.push({
          recipeId,
          status: 'failed',
          reason: 'could not classify ingredients',
        })
        continue
      }
      const ingredients: Ingredient[] = inferred.flatMap((g) => g.ingredients)

      const { error: updErr } = await supabase
        .from('recipes')
        .update({
          ingredients,
          ingredientGroups: inferred,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', recipeId)

      if (updErr) {
        summary.failed += 1
        summary.details.push({ recipeId, status: 'failed', reason: updErr.message })
        continue
      }

      summary.built += 1
      summary.details.push({ recipeId, status: 'built' })

      if (typeof (row as any).slug === 'string') {
        revalidatePath(`/opskrift/${(row as any).slug}`)
      }
      revalidateRecipeCollectionPaths(row as any)
    } catch (err) {
      summary.failed += 1
      summary.details.push({
        recipeId,
        status: 'failed',
        reason: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return summary
}

function uniqueOrderedStrings(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
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

    const body = (await request.json()) as BulkUpdateRequest

    if (!body || !Array.isArray(body.recipeIds) || body.recipeIds.length === 0) {
      return NextResponse.json({ error: 'recipeIds is required and must be non-empty' }, { status: 400 })
    }

    const recipeIds = Array.from(
      new Set(body.recipeIds.filter((id): id is string => typeof id === 'string' && id.length > 0)),
    )

    if (recipeIds.length === 0) {
      return NextResponse.json({ error: 'No valid recipeIds provided' }, { status: 400 })
    }

    if (recipeIds.length > MAX_RECIPES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_RECIPES_PER_REQUEST} recipes per request` },
        { status: 400 },
      )
    }

    const field = body.field
    if (field !== 'mainCategory' && field !== 'subCategories' && field !== 'dietaryCategories') {
      return NextResponse.json({ error: 'field must be mainCategory, subCategories or dietaryCategories' }, { status: 400 })
    }

    const operation = body.operation
    if (operation !== 'add' && operation !== 'remove' && operation !== 'set' && operation !== 'clear') {
      return NextResponse.json({ error: 'operation must be add, remove, set or clear' }, { status: 400 })
    }

    // Handle the scalar `mainCategory` field separately – it's a single string.
    if (field === 'mainCategory') {
      if (operation === 'add' || operation === 'remove') {
        return NextResponse.json(
          { error: 'mainCategory only supports the set or clear operations' },
          { status: 400 },
        )
      }
      const newValue = operation === 'clear' ? null : (body.value || '').trim() || null
      const updatedAt = new Date().toISOString()

      const { data: updated, error } = await supabase
        .from('recipes')
        .update({ mainCategory: newValue, updatedAt })
        .in('id', recipeIds)
        .select('id, slug, mainCategory, dietaryCategories')

      if (error) {
        console.error('❌ Error bulk-updating mainCategory:', error)
        return NextResponse.json({ error: 'Failed to update recipes', details: error.message }, { status: 500 })
      }

      databaseService.clearRecipeCaches()
      for (const recipe of updated ?? []) {
        if (typeof recipe?.slug === 'string') {
          revalidatePath(`/opskrift/${recipe.slug}`)
        }
        revalidateRecipeCollectionPaths(recipe || {})
      }

      return NextResponse.json({
        success: true,
        updatedCount: updated?.length ?? 0,
        field,
        operation,
      })
    }

    // Array field branch (subCategories / dietaryCategories)
    const incomingValues = uniqueOrderedStrings(body.values ?? [])
    const autoBuildSense = body.autoBuildSenseSpisekasse !== false

    if (operation !== 'clear' && incomingValues.length === 0) {
      return NextResponse.json({ error: 'values must contain at least one tag' }, { status: 400 })
    }

    // Fetch current state so we can compute the new array per recipe.
    const { data: currentRows, error: fetchError } = await supabase
      .from('recipes')
      .select(`id, slug, mainCategory, ${field}`)
      .in('id', recipeIds)

    if (fetchError) {
      console.error('❌ Error fetching recipes for bulk update:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }

    const updatedAt = new Date().toISOString()
    let updatedCount = 0
    const affectedForRevalidation: Array<{ slug?: string | null; mainCategory?: string | null; dietaryCategories?: unknown }> = []
    const senseTargetIds: string[] = []

    // Update one-by-one to keep array changes atomic per row.
    // For 500 recipes max this is acceptable; can be parallelised in batches if needed.
    const lowerIncoming = new Set(incomingValues.map((v) => v.toLowerCase()))
    const incomingHasSense = incomingValues.some(isSenseTag)

    for (const row of currentRows ?? []) {
      const current: string[] = Array.isArray((row as any)?.[field])
        ? ((row as any)[field] as unknown[]).filter((v): v is string => typeof v === 'string')
        : []

      let next: string[]
      if (operation === 'clear') {
        next = []
      } else if (operation === 'set') {
        next = incomingValues.slice()
      } else if (operation === 'add') {
        const merged = [...current]
        const seen = new Set(current.map((v) => v.toLowerCase()))
        for (const v of incomingValues) {
          if (!seen.has(v.toLowerCase())) {
            merged.push(v)
            seen.add(v.toLowerCase())
          }
        }
        next = merged
      } else {
        // remove
        next = current.filter((v) => !lowerIncoming.has(v.toLowerCase()))
      }

      // Skip when nothing actually changed to save writes.
      const currentNormalised = JSON.stringify(current.map((v) => v.toLowerCase()).sort())
      const nextNormalised = JSON.stringify(next.map((v) => v.toLowerCase()).sort())
      if (currentNormalised === nextNormalised) continue

      // Workaround mirroring the single-recipe PUT route: when the array shrinks,
      // null it first to force Supabase to update the JSONB column reliably.
      if (next.length < current.length) {
        await supabase.from('recipes').update({ [field]: null }).eq('id', (row as any).id)
        await new Promise((resolve) => setTimeout(resolve, 25))
      }

      const { error: updateError } = await supabase
        .from('recipes')
        .update({ [field]: next, updatedAt })
        .eq('id', (row as any).id)

      if (updateError) {
        console.error(`❌ Failed updating recipe ${(row as any).id}:`, updateError)
        continue
      }

      updatedCount += 1
      affectedForRevalidation.push({
        slug: (row as any).slug,
        mainCategory: (row as any).mainCategory ?? null,
        dietaryCategories: field === 'dietaryCategories' ? next : (row as any).dietaryCategories,
      })

      // Track recipes that now (after this update) carry the Sense tag for auto-build.
      if (
        autoBuildSense &&
        field === 'dietaryCategories' &&
        (operation === 'add' || operation === 'set') &&
        incomingHasSense &&
        next.some(isSenseTag)
      ) {
        senseTargetIds.push(String((row as any).id))
      }
    }

    databaseService.clearRecipeCaches()
    for (const recipe of affectedForRevalidation) {
      if (typeof recipe.slug === 'string') {
        revalidatePath(`/opskrift/${recipe.slug}`)
      }
      revalidateRecipeCollectionPaths(recipe)
    }

    let senseAutoBuild: SenseAutoBuildSummary | null = null
    if (senseTargetIds.length > 0) {
      senseAutoBuild = await autoBuildSenseSpisekasse(supabase, senseTargetIds)
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      field,
      operation,
      senseAutoBuild,
    })
  } catch (error) {
    console.error('❌ Error in /api/admin/tags/bulk-update:', error)
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 })
  }
}
