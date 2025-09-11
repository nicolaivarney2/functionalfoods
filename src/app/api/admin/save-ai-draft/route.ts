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
}

export async function POST(request: NextRequest) {
  try {
    const { recipe, category }: SaveRecipeRequest = await request.json()
    
    if (!recipe || !recipe.title) {
      return NextResponse.json(
        { success: false, error: 'Recipe is required' },
        { status: 400 }
      )
    }

    console.log(`💾 Saving AI-kladde as real draft: ${recipe.title}`)

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
      ingredients: recipe.ingredients.map((ingredient, i) => ({
        id: `${crypto.randomUUID()}-${i + 1}`,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        notes: ingredient.notes || null
      })),
      instructions: recipe.instructions.map((instruction, i) => ({
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

    console.log(`✅ AI-kladde saved as real draft: ${recipe.title} (ID: ${recipeData.id})`)

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
    'meal-prep': 'Meal Prep'
  }
  
  return categoryMap[category] || 'Hovedretter'
}

