import { NextRequest, NextResponse } from 'next/server'
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

/**
 * Fjern mængde/enhed fra linjer som "10 stk oksepølser" -> "oksepølser".
 * Bruges som fallback når ingredient.id ikke kan opløses til ingredients-tabellen.
 */
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

export async function POST(request: NextRequest) {
  try {
    const { recipeId } = await request.json()
    
    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Starting nutrition recalculation for recipe ID: ${recipeId}`)

    const supabase = createSupabaseServiceClient()

    // Get the recipe directly by id (including drafts)
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', recipeId)
      .maybeSingle()
    
    if (recipeError || !recipe) {
      return NextResponse.json(
        { success: false, error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // ingredient_matches gemmer mapping recipe_ingredient_id -> frida_ingredient_id (ingen recipe_id-kolonne)
    // Initialize nutrition calculator and Supabase service client
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

    // Primær sti: slå ingredient.id op i ingredients-tabellen og brug canonical navn til Frida-match.
    const ingredientIds = [
      ...new Set(
        recipeIngredients
          .map((ing) => ing.id)
          .filter((id): id is string => isPersistentIngredientId(id))
      ),
    ]
    const ingredientNameById = new Map<string, string>()
    if (ingredientIds.length > 0) {
      const { data: ingredientRows, error: ingredientRowsError } = await supabase
        .from('ingredients')
        .select('id, name')
        .in('id', ingredientIds)

      if (ingredientRowsError) {
        console.warn('⚠️ Could not resolve ingredient IDs to names:', ingredientRowsError.message)
      } else {
        for (const row of ingredientRows || []) {
          const rowId = String((row as { id?: string }).id || '')
          const rowName = String((row as { name?: string }).name || '').trim()
          if (rowId && rowName) ingredientNameById.set(rowId, rowName)
        }
      }
    }

    // Brug gemte Frida-match direkte når de findes (samme datakilde som admin "Matched med Frida")
    const fridaMatchByIngredientId = new Map<string, string>()
    if (ingredientIds.length > 0) {
      const { data: fridaMatchRows, error: fridaMatchError } = await supabase
        .from('ingredient_matches')
        .select('recipe_ingredient_id, frida_ingredient_id')
        .in('recipe_ingredient_id', ingredientIds)

      if (fridaMatchError) {
        console.warn('⚠️ Could not load ingredient_matches:', fridaMatchError.message)
      } else {
        for (const row of fridaMatchRows || []) {
          const recipeIngredientId = String((row as { recipe_ingredient_id?: string }).recipe_ingredient_id || '')
          const fridaIngredientId = String((row as { frida_ingredient_id?: string }).frida_ingredient_id || '')
          if (recipeIngredientId && fridaIngredientId) {
            fridaMatchByIngredientId.set(recipeIngredientId, fridaIngredientId)
          }
        }
      }
    }

    // Fallback for opskriftslinjer uden ingredient.id:
    // slå op i ingredients på renset navn og brug evt. gemt Frida-match dérfra.
    const resolvedIngredientIdByCleanedName = new Map<string, string>()
    const missingIdCleanedNames = [
      ...new Set(
        recipeIngredients
          .filter((ing) => !isPersistentIngredientId(ing.id))
          .map((ing) => cleanRecipeIngredientName(String(ing.name || '')))
          .filter((n) => n.length > 0)
      ),
    ]
    if (missingIdCleanedNames.length > 0) {
      const resolvedRows = await Promise.all(
        missingIdCleanedNames.map(async (cleaned) => {
          const { data } = await supabase
            .from('ingredients')
            .select('id')
            .ilike('name', cleaned)
            .limit(1)
            .maybeSingle()
          return { cleaned, ingredientId: data?.id as string | undefined }
        })
      )

      const fallbackIngredientIds = [
        ...new Set(
          resolvedRows
            .map((r) => r.ingredientId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        ),
      ]

      for (const row of resolvedRows) {
        if (row.ingredientId) resolvedIngredientIdByCleanedName.set(row.cleaned, row.ingredientId)
      }

      if (fallbackIngredientIds.length > 0) {
        const { data: fallbackFridaRows, error: fallbackFridaError } = await supabase
          .from('ingredient_matches')
          .select('recipe_ingredient_id, frida_ingredient_id')
          .in('recipe_ingredient_id', fallbackIngredientIds)

        if (fallbackFridaError) {
          console.warn('⚠️ Could not load fallback ingredient_matches:', fallbackFridaError.message)
        } else {
          for (const row of fallbackFridaRows || []) {
            const recipeIngredientId = String((row as { recipe_ingredient_id?: string }).recipe_ingredient_id || '')
            const fridaIngredientId = String((row as { frida_ingredient_id?: string }).frida_ingredient_id || '')
            if (recipeIngredientId && fridaIngredientId && !fridaMatchByIngredientId.has(recipeIngredientId)) {
              fridaMatchByIngredientId.set(recipeIngredientId, fridaIngredientId)
            }
          }
        }
      }
    }

    console.log(`📊 Processing ${totalIngredients} ingredients for recipe: ${recipe.title}`)

    // Calculate nutrition for each ingredient using canonical ingredient name when possible
    for (const ingredient of recipeIngredients) {
      try {
        const rawName = String(ingredient.name || '').trim()
        const cleanedRawName = cleanRecipeIngredientName(rawName)
        const persistedId = isPersistentIngredientId(ingredient.id) ? String(ingredient.id) : ''
        const resolvedFallbackId = !persistedId ? resolvedIngredientIdByCleanedName.get(cleanedRawName) : undefined
        const ingredientId = persistedId || resolvedFallbackId || ''
        const fridaIngredientId = ingredientId ? fridaMatchByIngredientId.get(ingredientId) : undefined
        const canonicalName =
          (ingredientId && ingredientNameById.get(ingredientId)) || cleanRecipeIngredientName(rawName)
        const matchQuery = canonicalName || rawName

        // 1) Primær: brug gemt Frida-id match når tilgængelig
        // 2) Fallback: tekstmatch på canonical navn
        let result: { nutrition: any | null; match: string | null; score: number }
        if (fridaIngredientId) {
          const nutritionByRef = await getNutritionFromFridaRef(supabase, fridaIngredientId)
          result = {
            nutrition: nutritionByRef,
            match: nutritionByRef ? fridaIngredientId : null,
            score: nutritionByRef ? 1 : 0,
          }
        } else {
          result = await matcher.matchIngredient(matchQuery)
        }
        if (result.nutrition) {
          const grams = convertToGrams(ingredient.amount || 0, ingredient.unit || '')
          const scaleFactor = grams / 100

          // Macro nutrients (per 100g basis, scaled by actual amount)
          totalCalories += result.nutrition.calories * scaleFactor
          totalProtein += result.nutrition.protein * scaleFactor
          totalCarbs += result.nutrition.carbs * scaleFactor
          totalFat += result.nutrition.fat * scaleFactor
          totalFiber += result.nutrition.fiber * scaleFactor
          
          // Micro nutrients (vitamins and minerals)
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

    // Calculate per portion nutrition
    const servings = recipe.servings || 1
    const perPortionNutrition = {
      calories: Math.round(totalCalories / servings),
      protein: Math.round((totalProtein / servings) * 10) / 10,
      carbs: Math.round((totalCarbs / servings) * 10) / 10,
      fat: Math.round((totalFat / servings) * 10) / 10,
      fiber: Math.round((totalFiber / servings) * 10) / 10
    }

    // Calculate per portion micro nutrients
    const perPortionVitamins: Record<string, number> = {}
    const perPortionMinerals: Record<string, number> = {}
    
    for (const [vitamin, value] of Object.entries(totalVitamins)) {
      perPortionVitamins[vitamin] = Math.round((value / servings) * 100) / 100
    }
    
    for (const [mineral, value] of Object.entries(totalMinerals)) {
      perPortionMinerals[mineral] = Math.round((value / servings) * 100) / 100
    }

    console.log(`✅ Matched ${matchedIngredients}/${totalIngredients} ingredients`)

    // Update the recipe in the database with both total and per-portion nutrition
    const updateData = {
      calories: perPortionNutrition.calories,
      protein: perPortionNutrition.protein,
      carbs: perPortionNutrition.carbs,
      fat: perPortionNutrition.fat,
      fiber: perPortionNutrition.fiber,
      // Store micro nutrients as JSONB
      vitamins: perPortionVitamins,
      minerals: perPortionMinerals,
      // Store total nutrition (for reference) - use snake_case
      total_calories: Math.round(totalCalories),
      total_protein: Math.round(totalProtein * 10) / 10,
      total_carbs: Math.round(totalCarbs * 10) / 10,
      total_fat: Math.round(totalFat * 10) / 10,
      total_fiber: Math.round(totalFiber * 10) / 10,
      updatedAt: new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('recipes')
      .update(updateData)
      .eq('id', recipeId)

    if (updateError) {
      console.error('❌ Error updating recipe nutrition:', updateError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update recipe nutrition', 
          details: updateError.message 
        },
        { status: 500 }
      )
    }

    console.log(`✅ Database update successful for recipe: ${recipe.title}`)
    databaseService.clearRecipeCaches()

    // Invalidate cached public pages for this recipe after nutrition updates
    if (recipe.slug) {
      revalidatePath(`/opskrift/${recipe.slug}`)
    }
    revalidateRecipeCollectionPaths(recipe)
    
    // Verify the update by fetching the recipe again
    const { data: updatedRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select('calories, protein, carbs, fat, fiber, vitamins, minerals')
      .eq('id', recipeId)
      .single()
    
    if (fetchError) {
      console.error('❌ Error fetching updated recipe:', fetchError)
    } else {
      console.log(`🔍 Verification - Updated recipe data:`, updatedRecipe)
    }

    return NextResponse.json({
      success: true,
      message: `Nutrition recalculated successfully for "${recipe.title}"`,
      matchedIngredients,
      totalIngredients,
      unmatchedIngredients,
      servings,
      nutrition: perPortionNutrition,
      vitamins: perPortionVitamins,
      minerals: perPortionMinerals
    })

  } catch (error) {
    console.error('Error in recalculate-nutrition API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function convertToGrams(amount: number, unit: string): number {
  const u = (unit || '').toLowerCase()
  const conversions: Record<string, number> = {
    g: 1,
    gram: 1,
    kg: 1000,
    kilo: 1000,
    stk: 80,
    st: 80,
    stykke: 80,
    spsk: 13,  // 1 spsk = 13g (mere præcis dansk mål)
    tesk: 4,   // 1 tsk = 4g (mere præcis dansk mål)
    tsk: 4,    // 1 tsk = 4g (mere præcis dansk mål)
    dl: 100,
    l: 1000,
    ml: 1,
  }
  const gramsPerUnit = conversions[u] ?? 100
  return amount * gramsPerUnit
}
