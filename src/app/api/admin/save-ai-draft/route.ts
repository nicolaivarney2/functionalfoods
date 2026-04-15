import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { generateSlug } from '@/lib/utils'
import type { Ingredient, IngredientGroup } from '@/types/recipe'
import {
  normalizeAiRecipeIngredients,
  normalizeAiRecipeInstructions,
} from '@/lib/ai-recipe-ingredient-normalize'
import { syncIngredientsToRegistry } from '@/lib/ingredient-registry-sync'
import {
  buildIngredientGroupsWithIds,
  inferSenseIngredientGroupsFromFlat,
  orderSenseGroupsFromAi,
  senseGroupSizesMatchFlatLength,
  type SenseGroupFromAi,
} from '@/lib/sense-spisekasse'

interface GeneratedRecipe {
  title: string
  description: string
  ingredients: Array<{
    name: string
    amount: number
    unit: string
    notes?: string
  }>
  /** Sense: gruppeinddeling — antal linjer pr. gruppe skal matche den flade ingrediensliste. */
  ingredientGroups?: Array<{
    name: string
    ingredients: Array<{ name: string; amount: number; unit: string; notes?: string }>
  }>
  instructions: Array<{
    stepNumber: number
    instruction: string
    time?: number
    tips?: string
  }>
  servings: number
  prepTime: number
  cookTime: number
  difficulty: string
  dietaryCategories: string[]
  nutritionalInfo: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  imageUrl?: string
}

interface SaveRecipeRequest {
  recipe: GeneratedRecipe
  category: string
  aiTips?: string
}

export async function POST(request: NextRequest) {
  try {
    const { recipe, category, aiTips }: SaveRecipeRequest = await request.json()
    
    if (!recipe || !recipe.title) {
      return NextResponse.json(
        { success: false, error: 'Recipe is required' },
        { status: 400 }
      )
    }

    console.log(`💾 Saving AI-kladde as real draft: ${recipe.title}`)

    const ingredientsNormalized = normalizeAiRecipeIngredients(recipe.ingredients || [])
    const instructionsNormalized = normalizeAiRecipeInstructions(recipe.instructions || [])

    let ingredientsForDb: Ingredient[] = ingredientsNormalized.map((ingredient) => ({
      id: crypto.randomUUID(),
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      ...(ingredient.notes != null && ingredient.notes !== ''
        ? { notes: ingredient.notes }
        : {}),
    }))
    let ingredientGroupsForDb: IngredientGroup[] | null = null

    if (category === 'sense') {
      let senseGroupsResolved = false
      if (Array.isArray(recipe.ingredientGroups) && recipe.ingredientGroups.length > 0) {
        const ordered = orderSenseGroupsFromAi(recipe.ingredientGroups as SenseGroupFromAi[])
        const sizes = ordered.map((g) => ({
          name: g.name,
          count: Array.isArray(g.ingredients) ? g.ingredients.length : 0,
        }))
        if (senseGroupSizesMatchFlatLength(ordered, ingredientsNormalized.length)) {
          const withIds: Ingredient[] = ingredientsNormalized.map((ingredient) => ({
            id: crypto.randomUUID(),
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            ...(ingredient.notes != null && ingredient.notes !== ''
              ? { notes: ingredient.notes }
              : {}),
          }))
          const built = buildIngredientGroupsWithIds(withIds, sizes)
          if (built.length > 0) {
            ingredientsForDb = built.flatMap((g) => g.ingredients)
            ingredientGroupsForDb = built
            senseGroupsResolved = true
          }
        } else {
          console.warn(
            '⚠️ Sense: ingredientGroups matcher ikke antal ingredienser — forsøger heuristisk fordeling'
          )
        }
      }
      if (!senseGroupsResolved && ingredientsNormalized.length > 0) {
        const inferred = inferSenseIngredientGroupsFromFlat(ingredientsNormalized)
        if (inferred && inferred.length > 0) {
          ingredientsForDb = inferred.flatMap((g) => g.ingredients)
          ingredientGroupsForDb = inferred
          console.log('Sense: gemt med heuristisk spisekasse-fordeling (ingredientGroups)')
        }
      }
    }

    const supabase = createSupabaseClient()
    const slug = generateSlug(recipe.title)

    try {
      await syncIngredientsToRegistry(supabase, ingredientsNormalized)
      console.log(`🧂 Synced ${ingredientsNormalized.length} ingredients to ingredients registry`)
    } catch (syncError) {
      console.warn('⚠️ Ingredient registry sync failed:', syncError)
    }
    
    // Undgå dubletter: to separate opslag (stabilt ved 0/1 række) — .single() på .or() fejler let ved 0 eller 2+ rækker
    const { data: existingByTitle } = await supabase
      .from('recipes')
      .select('id')
      .eq('title', recipe.title)
      .maybeSingle()
    const { data: existingBySlug } = await supabase
      .from('recipes')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existingByTitle?.id || existingBySlug?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Opskrift findes allerede',
          details: `Der findes allerede en opskrift med samme titel eller slug («${slug}»).`,
        },
        { status: 409 }
      )
    }

    // Prepare recipe data for database
    const recipeData = {
      id: crypto.randomUUID(),
      title: recipe.title,
      slug: slug,
      description: recipe.description,
      shortDescription: recipe.description.substring(0, 150) + (recipe.description.length > 150 ? '...' : ''),
      preparationTime: recipe.prepTime,
      cookingTime: recipe.cookTime,
      totalTime: recipe.prepTime + recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty.toLowerCase(),
      calories: recipe.nutritionalInfo.calories,
      protein: recipe.nutritionalInfo.protein,
      carbs: recipe.nutritionalInfo.carbs,
      fat: recipe.nutritionalInfo.fat,
      fiber: recipe.nutritionalInfo.fiber,
      imageUrl: recipe.imageUrl || '/images/recipe-placeholder.jpg',
      imageAlt: `${recipe.title} - Functional Foods`,
      metaTitle: `${recipe.title} - ${recipe.dietaryCategories[0] || 'Opskrift'} | Functional Foods`,
      metaDescription: recipe.description.substring(0, 160),
      keywords: recipe.dietaryCategories.join(', '),
      mainCategory: getMainCategory(category),
      subCategories: null,
      dietaryCategories: recipe.dietaryCategories,
      ingredients: ingredientsForDb,
      ...(ingredientGroupsForDb && ingredientGroupsForDb.length > 0
        ? { ingredientGroups: ingredientGroupsForDb }
        : {}),
      instructions: instructionsNormalized.map((instruction, i) => ({
        id: `${crypto.randomUUID()}-${i + 1}`,
        stepNumber: instruction.stepNumber,
        instruction: instruction.instruction,
        time: instruction.time || null,
        tips: instruction.tips || null
      })),
      author: 'AI Generated',
      status: 'draft', // Save as draft
      publishedAt: null,
      updatedAt: new Date().toISOString(),
      personalTips: aiTips || null,
      rating: null,
      reviewCount: null,
      prepTimeISO: `PT${recipe.prepTime}M`,
      cookTimeISO: `PT${recipe.cookTime}M`,
      totalTimeISO: `PT${recipe.prepTime + recipe.cookTime}M`
    }

    // Insert recipe into database
    const { error } = await supabase
      .from('recipes')
      .insert([recipeData])

    if (error) {
      console.error('Error saving recipe:', error)
      const msg = error.message || ''
      const code = (error as { code?: string }).code
      const isDup =
        code === '23505' ||
        /duplicate key|unique constraint|already exists/i.test(msg)
      if (isDup) {
        return NextResponse.json(
          {
            success: false,
            error: 'Opskrift findes allerede (samtidig gemning?)',
            details: msg,
          },
          { status: 409 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Kunne ikke gemme opskriften',
          details: msg,
        },
        { status: 500 }
      )
    }

    console.log(`✅ AI-kladde saved as real draft: ${recipe.title} (ID: ${recipeData.id})`)

    try {
      const { recalculateRecipeNutritionFromFrida } = await import('@/lib/recipe-frida-nutrition-recalc')
      const frida = await recalculateRecipeNutritionFromFrida(recipeData.id)
      if (frida.success) {
        console.log(
          `🥗 Frida-ernæring sat: ${frida.matchedIngredients}/${frida.totalIngredients} ingredienser`
        )
      } else {
        console.warn('⚠️ Frida-ernæring efter gem fejlede:', frida.error)
      }
    } catch (recalcErr) {
      console.warn('⚠️ Frida-ernæring efter gem (exception):', recalcErr)
    }

    // Auto-assign slot to the new recipe
    try {
      const { SlotScheduler } = await import('@/lib/slot-scheduler')
      
      // Get all scheduled recipes to find occupied slots
      const { data: scheduledRecipes } = await supabase
        .from('recipes')
        .select('id, title, "scheduledDate", "scheduledTime", status')
        .eq('status', 'scheduled')
        .not('scheduledDate', 'is', null)
        .not('scheduledTime', 'is', null)
      
      const occupiedSlots = (scheduledRecipes || []).map(recipe => ({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        scheduledDate: recipe.scheduledDate,
        scheduledTime: recipe.scheduledTime,
        slotNumber: SlotScheduler.getSlotNumberFromTime(recipe.scheduledTime),
        status: recipe.status as 'scheduled' | 'published'
      }))
      
      // Get next available slot
      const nextSlot = SlotScheduler.getNextAvailableSlot(occupiedSlots)
      
      // Update recipe with assigned slot
        await supabase
          .from('recipes')
          .update({
            status: 'scheduled',
            scheduledDate: nextSlot.date,
            scheduledTime: nextSlot.time
          })
          .eq('id', recipeData.id)
      
      console.log(`📅 Auto-assigned slot ${nextSlot.date} ${nextSlot.time} to: ${recipe.title}`)
    } catch (slotError) {
      console.error('⚠️ Error auto-assigning slot:', slotError)
      // Don't fail the save if slot assignment fails
    }

    return NextResponse.json({
      success: true,
      message: 'AI-kladde saved as real draft successfully',
      recipeId: recipeData.id,
      slug: slug
    })

  } catch (error) {
    console.error('Error saving AI-kladde:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save AI-kladde',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getMainCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'familiemad': 'Hovedretter',
    'keto': 'Sund mad',
    'sense': 'Sund mad',
    'paleo': 'Sund mad',
    'antiinflammatorisk': 'Sund mad',
    'fleksitarisk': 'Sund mad',
    '5-2': 'Sund mad',
    'proteinrig-kost': 'Proteinrig kost',
    'meal-prep': 'Proteinrig kost' // Legacy mapping
  }
  
  return categoryMap[category] || 'Hovedretter'
}

