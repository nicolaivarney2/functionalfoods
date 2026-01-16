import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { generateSlug } from '@/lib/utils'

interface GeneratedRecipe {
  title: string
  description: string
  ingredients: Array<{
    name: string
    amount: number
    unit: string
    notes?: string
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

    console.log(`💾 Saving generated recipe: ${recipe.title}`)

    const supabase = createSupabaseClient()
    const slug = generateSlug(recipe.title)
    
    // Check if recipe with same title or slug already exists
    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('id, title, slug')
      .or(`title.eq.${recipe.title},slug.eq.${slug}`)
      .single()

    if (existingRecipe) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Recipe already exists',
          details: `A recipe with title "${recipe.title}" or slug "${slug}" already exists`
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
      calories: recipe.nutritionalInfo?.calories || 0,
      protein: recipe.nutritionalInfo?.protein || 0,
      carbs: recipe.nutritionalInfo?.carbs || 0,
      fat: recipe.nutritionalInfo?.fat || 0,
      fiber: recipe.nutritionalInfo?.fiber || 0,
      imageUrl: recipe.imageUrl || '/images/recipe-placeholder.jpg',
      imageAlt: `${recipe.title} - Functional Foods`,
      metaTitle: `${recipe.title} - ${recipe.dietaryCategories?.[0] || 'Opskrift'} | Functional Foods`,
      metaDescription: recipe.description.substring(0, 160),
      keywords: recipe.dietaryCategories?.join(', ') || '',
      mainCategory: getMainCategory(category),
      subCategories: [getMainCategory(category)],
      dietaryCategories: recipe.dietaryCategories || [],
      ingredients: recipe.ingredients.map((ingredient, i) => ({
        id: `temp-${i + 1}`,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        notes: ingredient.notes || null
      })),
      instructions: recipe.instructions.map((instruction, i) => ({
        id: `temp-${i + 1}`,
        stepNumber: instruction.stepNumber,
        instruction: instruction.instruction,
        time: instruction.time || null,
        tips: instruction.tips || null
      })),
      author: category === 'manual' ? 'Ketoliv' : 'AI Generated',
      status: 'draft',
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
    const { data, error } = await supabase
      .from('recipes')
      .insert([recipeData])

    if (error) {
      console.error('Error saving recipe:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save recipe',
          details: error.message
        },
        { status: 500 }
      )
    }

    console.log(`✅ Recipe saved successfully: ${recipe.title} (ID: ${recipeData.id})`)

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
      message: 'Recipe saved successfully',
      recipeId: recipeData.id,
      slug: slug
    })

  } catch (error) {
    console.error('Error saving generated recipe:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to save recipe',
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
    'meal-prep': 'Proteinrig kost', // Legacy mapping
    'manual': 'Aftensmad' // Default for manually created recipes
  }
  
  return categoryMap[category] || 'Aftensmad'
}
