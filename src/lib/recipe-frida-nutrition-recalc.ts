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

export type IngredientLineInput = {
  name: string
  amount?: number
  unit?: string
}

export type IngredientNutritionResult = {
  matchedIngredients: number
  totalIngredients: number
  unmatchedIngredients: Array<{ ingredient: string; query: string }>
  /** Samlet næring for alle ingredienser (før portionering). */
  totals: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  /** Næring pr. portion. */
  perPortion: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  vitamins: Record<string, number>
  minerals: Record<string, number>
}

/**
 * Beregn ernæring ud fra en ingrediensliste via Frida (samme logik som officielle opskrifter).
 * Bruges til daglog, AI-scan og foreløbige opskrifter.
 */
export async function calculateNutritionFromIngredientLines(
  ingredients: IngredientLineInput[],
  servings = 1
): Promise<IngredientNutritionResult> {
  const supabase = createSupabaseServiceClient()
  const matcher = new FridaDTUMatcher()
  const safeServings = Math.max(1, Number(servings) || 1)

  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0
  const totalVitamins: Record<string, number> = {}
  const totalMinerals: Record<string, number> = {}
  let matchedIngredients = 0
  const unmatchedIngredients: Array<{ ingredient: string; query: string }> = []
  const recipeIngredients: RecipeIngredient[] = ingredients.filter((i) => String(i.name || '').trim())
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

  const allCatalogIdsForIngredientLookup = new Set<string>([...cleanedToCatalogId.values()])
  const ingredientNameById = new Map<string, string>()
  const gramsPerUnitByCatalogId = new Map<string, number>()
  if (allCatalogIdsForIngredientLookup.size > 0) {
    const { data: ingredientRows } = await supabase
      .from('ingredients')
      .select('id, name, grams_per_unit')
      .in('id', [...allCatalogIdsForIngredientLookup])

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

  const fridaMatchByIngredientId = new Map<string, string>()
  const manualFridaMatchCatalogIds = new Set<string>()
  if (allCatalogIdsForIngredientLookup.size > 0) {
    const { data: fridaMatchRows } = await supabase
      .from('ingredient_matches')
      .select('recipe_ingredient_id, frida_ingredient_id, is_manual')
      .in('recipe_ingredient_id', [...allCatalogIdsForIngredientLookup])

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

  for (const ingredient of recipeIngredients) {
    try {
      const rawName = String(ingredient.name || '').trim()
      const cleanedRawName = cleanRecipeIngredientName(rawName)
      const catalogIdFromName = cleanedToCatalogId.get(cleanedRawName)
      const storedFridaRef = catalogIdFromName
        ? fridaMatchByIngredientId.get(catalogIdFromName) || undefined
        : undefined
      const nameLookupId = catalogIdFromName || ''
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
        const catalogForGrams = catalogIdFromName || ''
        const gramsPerPiece = catalogForGrams ? gramsPerUnitByCatalogId.get(catalogForGrams) : undefined
        const grams = convertToGrams(ingredient.amount || 0, ingredient.unit || '', { gramsPerPiece })
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

        const saveUnderCatalogId = catalogIdFromName || ''
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
          } catch {
            /* best effort */
          }
        }
      } else {
        unmatchedIngredients.push({ ingredient: rawName, query: matchQuery })
      }
    } catch (error) {
      console.error(`Error processing ingredient ${ingredient.name}:`, error)
    }
  }

  const perPortion = {
    calories: Math.round(totalCalories / safeServings),
    protein: Math.round((totalProtein / safeServings) * 10) / 10,
    carbs: Math.round((totalCarbs / safeServings) * 10) / 10,
    fat: Math.round((totalFat / safeServings) * 10) / 10,
    fiber: Math.round((totalFiber / safeServings) * 10) / 10,
  }

  const perPortionVitamins: Record<string, number> = {}
  const perPortionMinerals: Record<string, number> = {}
  for (const [vitamin, value] of Object.entries(totalVitamins)) {
    perPortionVitamins[vitamin] = Math.round((value / safeServings) * 100) / 100
  }
  for (const [mineral, value] of Object.entries(totalMinerals)) {
    perPortionMinerals[mineral] = Math.round((value / safeServings) * 100) / 100
  }

  return {
    matchedIngredients,
    totalIngredients,
    unmatchedIngredients,
    totals: {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10,
    },
    perPortion,
    vitamins: perPortionVitamins,
    minerals: perPortionMinerals,
  }
}

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

  const recipeIngredients: RecipeIngredient[] = Array.isArray(recipe.ingredients)
    ? (recipe.ingredients as RecipeIngredient[])
    : []

  const calc = await calculateNutritionFromIngredientLines(recipeIngredients, recipe.servings || 1)
  const servings = recipe.servings || 1
  const perPortionNutrition = calc.perPortion
  const matchedIngredients = calc.matchedIngredients
  const totalIngredients = calc.totalIngredients
  const unmatchedIngredients = calc.unmatchedIngredients

  console.log(`✅ [Frida recalc] Matched ${matchedIngredients}/${totalIngredients} ingredients`)

  const updateData = {
    calories: perPortionNutrition.calories,
    protein: perPortionNutrition.protein,
    carbs: perPortionNutrition.carbs,
    fat: perPortionNutrition.fat,
    fiber: perPortionNutrition.fiber,
    vitamins: calc.vitamins,
    minerals: calc.minerals,
    total_calories: calc.totals.calories,
    total_protein: calc.totals.protein,
    total_carbs: calc.totals.carbs,
    total_fat: calc.totals.fat,
    total_fiber: calc.totals.fiber,
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
    vitamins: calc.vitamins,
    minerals: calc.minerals,
  }
}
