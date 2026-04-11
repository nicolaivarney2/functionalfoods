/**
 * Frida-baseret ernæringsberegning (samme logik som /api/recalculate-nutrition).
 * Bruges efter gem af AI-opskrifter så DB ikke kun har LLM-gæt.
 */

import { revalidatePath } from 'next/cache'
import { databaseService } from '@/lib/database-service'
import { revalidateRecipeCollectionPaths } from '@/lib/cache-revalidation'
import { FridaDTUMatcher } from '@/lib/frida-dtu-matcher'
import { createSupabaseServiceClient } from '@/lib/supabase'

type RecipeIngredient = {
  id?: string
  name: string
  amount?: number
  unit?: string
}

function isPersistentIngredientId(id: string | undefined): id is string {
  if (!id) return false
  const v = String(id).trim()
  if (!v) return false
  return !v.toLowerCase().startsWith('temp-')
}

function cleanRecipeIngredientName(raw: string): string {
  let s = String(raw || '').toLowerCase().trim()
  s = s
    .replace(/^\d+[.,]?\d*\s*(stk|st|styk|stykker|dl|ml|l|g|gram|kg|mg|tsk|tesk|spsk|bdt|bundt|håndfuld|håndfulde)\s+/i, '')
    .replace(/^\d+[.,]?\d*\s*/, '')
    .trim()
  return s
}

function parseFridaFoodId(ref: string | undefined): number | null {
  if (!ref) return null
  const n = parseInt(String(ref).trim().replace(/^frida-/i, ''), 10)
  return Number.isFinite(n) ? n : null
}

export type ConvertToGramsOptions = {
  /** Fra `ingredients.grams_per_unit` — vægt i gram for præcis én stk (fx hvidløgsfed 3 g). */
  gramsPerPiece?: number | null
}

/**
 * Konverterer mængde + enhed til gram. For stk/st/stykke: brug `gramsPerPiece` fra ingrediens-kataloget når sat;
 * ellers falder vi tilbage til 80 g/stk (grovt gennemsnit for fx mellemstore løg).
 */
export function convertToGrams(amount: number, unit: string, options?: ConvertToGramsOptions): number {
  const u = (unit || '').toLowerCase().trim()
  const pieceUnits = new Set(['stk', 'st', 'stykke', 'stykker', 'styk'])
  const perPiece =
    options?.gramsPerPiece != null && Number.isFinite(Number(options.gramsPerPiece)) && Number(options.gramsPerPiece) > 0
      ? Number(options.gramsPerPiece)
      : null

  if (pieceUnits.has(u) && perPiece != null) {
    return amount * perPiece
  }

  const conversions: Record<string, number> = {
    g: 1,
    gram: 1,
    kg: 1000,
    kilo: 1000,
    stk: 80,
    st: 80,
    stykke: 80,
    stykker: 80,
    styk: 80,
    spsk: 13,
    tesk: 4,
    tsk: 4,
    dl: 100,
    l: 1000,
    ml: 1,
  }
  const gramsPerUnit = conversions[u] ?? 100
  return amount * gramsPerUnit
}

async function upsertIngredientMatchFromRecalc(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  recipeIngredientId: string,
  fridaIngredientId: string,
  confidence: number
) {
  const { data: existing } = await supabase
    .from('ingredient_matches')
    .select('id, is_manual')
    .eq('recipe_ingredient_id', recipeIngredientId)
    .maybeSingle()

  const base = {
    frida_ingredient_id: fridaIngredientId,
    confidence,
    is_manual: false,
    match_type: 'auto_recalc',
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    if ((existing as { is_manual?: boolean }).is_manual) {
      return
    }
    const { error } = await supabase.from('ingredient_matches').update(base).eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('ingredient_matches').insert({
      recipe_ingredient_id: recipeIngredientId,
      ...base,
    })
    if (error) throw error
  }
}

async function getNutritionFromFridaRef(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  fridaRef: string
): Promise<{
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  vitamins: Record<string, number>
  minerals: Record<string, number>
} | null> {
  const fid = parseFridaFoodId(fridaRef)
  if (fid == null) return null

  const { data, error } = await supabase
    .from('frida_ingredients')
    .select('calories, protein, carbs, fat, fiber, vitamins, minerals')
    .eq('id', `frida-${fid}`)
    .maybeSingle()

  if (error || !data) return null

  return {
    calories: data.calories || 0,
    protein: data.protein || 0,
    carbs: data.carbs || 0,
    fat: data.fat || 0,
    fiber: data.fiber || 0,
    vitamins: (data.vitamins as Record<string, number>) || {},
    minerals: (data.minerals as Record<string, number>) || {},
  }
}

export type FridaNutritionRecalcResult =
  | {
      success: true
      matchedIngredients: number
      totalIngredients: number
      unmatchedIngredients: Array<{ ingredient: string; query: string }>
      servings: number
      nutrition: {
        calories: number
        protein: number
        carbs: number
        fat: number
        fiber: number
      }
      vitamins: Record<string, number>
      minerals: Record<string, number>
    }
  | { success: false; error: string }

/**
 * Genberegn og gem ernæring for én opskrift ud fra Frida + ingrediensmængder.
 */
export async function recalculateRecipeNutritionFromFrida(recipeId: string): Promise<FridaNutritionRecalcResult> {
  const supabase = createSupabaseServiceClient()

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .maybeSingle()

  if (recipeError || !recipe) {
    return { success: false, error: 'Recipe not found' }
  }

  const matcher = new FridaDTUMatcher()

  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0
  const totalVitamins: Record<string, number> = {}
  const totalMinerals: Record<string, number> = {}
  let matchedIngredients = 0
  const unmatchedIngredients: Array<{ ingredient: string; query: string }> = []
  const recipeIngredients: RecipeIngredient[] = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as RecipeIngredient[])
    : []
  const totalIngredients = recipeIngredients.length

  const uniqueCleanedNames = [
    ...new Set(
      recipeIngredients
        .map((ing) => cleanRecipeIngredientName(String(ing.name || '')))
        .filter((n) => n.length > 0)
    ),
  ]
  const cleanedToCatalogId = new Map<string, string>()
  for (const cleaned of uniqueCleanedNames) {
    const { data } = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', cleaned)
      .limit(1)
      .maybeSingle()
    if (data?.id) cleanedToCatalogId.set(cleaned, String(data.id))
  }

  const ingredientIdsFromRecipeLines = [
    ...new Set(
      recipeIngredients.map((ing) => ing.id).filter((id): id is string => isPersistentIngredientId(id))
    ),
  ]

  const allCatalogIdsForIngredientLookup = new Set<string>([...ingredientIdsFromRecipeLines])
  for (const cid of cleanedToCatalogId.values()) {
    allCatalogIdsForIngredientLookup.add(cid)
  }

  const ingredientNameById = new Map<string, string>()
  const gramsPerUnitByCatalogId = new Map<string, number>()
  if (allCatalogIdsForIngredientLookup.size > 0) {
    const { data: ingredientRows, error: ingredientRowsError } = await supabase
      .from('ingredients')
      .select('id, name, grams_per_unit')
      .in('id', [...allCatalogIdsForIngredientLookup])

    if (ingredientRowsError) {
      console.warn('⚠️ Could not resolve ingredient IDs to names:', ingredientRowsError.message)
    } else {
      for (const row of ingredientRows || []) {
        const rowId = String((row as { id?: string }).id || '')
        const rowName = String((row as { name?: string }).name || '').trim()
        if (rowId && rowName) ingredientNameById.set(rowId, rowName)
        const gpu = (row as { grams_per_unit?: number | null }).grams_per_unit
        if (rowId && gpu != null && Number(gpu) > 0) {
          gramsPerUnitByCatalogId.set(rowId, Number(gpu))
        }
      }
    }
  }

  const fridaMatchByIngredientId = new Map<string, string>()
  const manualFridaMatchCatalogIds = new Set<string>()
  if (allCatalogIdsForIngredientLookup.size > 0) {
    const { data: fridaMatchRows, error: fridaMatchError } = await supabase
      .from('ingredient_matches')
      .select('recipe_ingredient_id, frida_ingredient_id, is_manual')
      .in('recipe_ingredient_id', [...allCatalogIdsForIngredientLookup])

    if (fridaMatchError) {
      console.warn('⚠️ Could not load ingredient_matches:', fridaMatchError.message)
    } else {
      for (const row of fridaMatchRows || []) {
        const recipeIngredientId = String((row as { recipe_ingredient_id?: string }).recipe_ingredient_id || '')
        const fridaIngredientId = String((row as { frida_ingredient_id?: string }).frida_ingredient_id || '')
        const isManual = Boolean((row as { is_manual?: boolean }).is_manual)
        if (recipeIngredientId && fridaIngredientId) {
          fridaMatchByIngredientId.set(recipeIngredientId, fridaIngredientId)
          if (isManual) manualFridaMatchCatalogIds.add(recipeIngredientId)
        }
      }
    }
  }

  console.log(`📊 [Frida recalc] ${totalIngredients} ingredients for: ${recipe.title}`)

  for (const ingredient of recipeIngredients) {
    try {
      const rawName = String(ingredient.name || '').trim()
      const cleanedRawName = cleanRecipeIngredientName(rawName)
      const persistedId = isPersistentIngredientId(ingredient.id) ? String(ingredient.id) : ''
      const catalogIdFromName = cleanedToCatalogId.get(cleanedRawName)
      const storedFridaRef = catalogIdFromName
        ? fridaMatchByIngredientId.get(catalogIdFromName) || undefined
        : (persistedId && fridaMatchByIngredientId.get(persistedId)) || undefined
      const nameLookupId = catalogIdFromName || persistedId || ''
      const canonicalName =
        (nameLookupId && ingredientNameById.get(nameLookupId)) || cleanRecipeIngredientName(rawName)
      const matchQuery = canonicalName || rawName

      let result: {
        nutrition: any | null
        match: string | null
        score: number
        fridaIngredientId: string | null
      }
      if (storedFridaRef) {
        const nutritionByRef = await getNutritionFromFridaRef(supabase, storedFridaRef)
        result = {
          nutrition: nutritionByRef,
          match: nutritionByRef ? storedFridaRef : null,
          score: nutritionByRef ? 1 : 0,
          fridaIngredientId: null,
        }
      } else {
        result = await matcher.matchIngredient(matchQuery)
      }
      if (result.nutrition) {
        const catalogForGrams = catalogIdFromName || persistedId || ''
        const gramsPerPiece = catalogForGrams ? gramsPerUnitByCatalogId.get(catalogForGrams) : undefined
        const grams = convertToGrams(ingredient.amount || 0, ingredient.unit || '', {
          gramsPerPiece,
        })
        const scaleFactor = grams / 100

        totalCalories += result.nutrition.calories * scaleFactor
        totalProtein += result.nutrition.protein * scaleFactor
        totalCarbs += result.nutrition.carbs * scaleFactor
        totalFat += result.nutrition.fat * scaleFactor
        totalFiber += result.nutrition.fiber * scaleFactor

        if (result.nutrition.vitamins) {
          for (const [vitamin, value] of Object.entries(result.nutrition.vitamins)) {
            const numericValue = Number(value) || 0
            totalVitamins[vitamin] = (totalVitamins[vitamin] || 0) + numericValue * scaleFactor
          }
        }

        if (result.nutrition.minerals) {
          for (const [mineral, value] of Object.entries(result.nutrition.minerals)) {
            const numericValue = Number(value) || 0
            totalMinerals[mineral] = (totalMinerals[mineral] || 0) + numericValue * scaleFactor
          }
        }

        matchedIngredients++

        const saveUnderCatalogId = catalogIdFromName || persistedId || ''
        if (
          saveUnderCatalogId &&
          !storedFridaRef &&
          result.fridaIngredientId &&
          !manualFridaMatchCatalogIds.has(saveUnderCatalogId)
        ) {
          try {
            await upsertIngredientMatchFromRecalc(
              supabase,
              saveUnderCatalogId,
              result.fridaIngredientId,
              Math.min(100, Math.max(30, Math.round(result.score * 100)))
            )
          } catch (persistErr) {
            console.warn(
              `⚠️ Kunne ikke gemme ingredient_matches for ${saveUnderCatalogId}:`,
              persistErr instanceof Error ? persistErr.message : persistErr
            )
          }
        }
      } else {
        unmatchedIngredients.push({
          ingredient: rawName,
          query: matchQuery,
        })
      }
    } catch (error) {
      console.error(`Error processing ingredient ${ingredient.name}:`, error)
    }
  }

  const servings = recipe.servings || 1
  const perPortionNutrition = {
    calories: Math.round(totalCalories / servings),
    protein: Math.round((totalProtein / servings) * 10) / 10,
    carbs: Math.round((totalCarbs / servings) * 10) / 10,
    fat: Math.round((totalFat / servings) * 10) / 10,
    fiber: Math.round((totalFiber / servings) * 10) / 10,
  }

  const perPortionVitamins: Record<string, number> = {}
  const perPortionMinerals: Record<string, number> = {}

  for (const [vitamin, value] of Object.entries(totalVitamins)) {
    perPortionVitamins[vitamin] = Math.round((value / servings) * 100) / 100
  }

  for (const [mineral, value] of Object.entries(totalMinerals)) {
    perPortionMinerals[mineral] = Math.round((value / servings) * 100) / 100
  }

  console.log(`✅ [Frida recalc] Matched ${matchedIngredients}/${totalIngredients} ingredients`)

  const updateData = {
    calories: perPortionNutrition.calories,
    protein: perPortionNutrition.protein,
    carbs: perPortionNutrition.carbs,
    fat: perPortionNutrition.fat,
    fiber: perPortionNutrition.fiber,
    vitamins: perPortionVitamins,
    minerals: perPortionMinerals,
    total_calories: Math.round(totalCalories),
    total_protein: Math.round(totalProtein * 10) / 10,
    total_carbs: Math.round(totalCarbs * 10) / 10,
    total_fat: Math.round(totalFat * 10) / 10,
    total_fiber: Math.round(totalFiber * 10) / 10,
    updatedAt: new Date().toISOString(),
  }

  const { error: updateError } = await supabase.from('recipes').update(updateData).eq('id', recipeId)

  if (updateError) {
    console.error('❌ Error updating recipe nutrition:', updateError)
    return { success: false, error: updateError.message || 'Failed to update recipe nutrition' }
  }

  databaseService.clearRecipeCaches()
  if (recipe.slug) {
    revalidatePath(`/opskrift/${recipe.slug}`)
  }
  revalidateRecipeCollectionPaths(recipe)

  return {
    success: true,
    matchedIngredients,
    totalIngredients,
    unmatchedIngredients,
    servings,
    nutrition: perPortionNutrition,
    vitamins: perPortionVitamins,
    minerals: perPortionMinerals,
  }
}
