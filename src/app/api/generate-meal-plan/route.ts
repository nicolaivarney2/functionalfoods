import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Generer AI madplan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { familyProfile, selectedStores, preferences } = body
    
    if (!familyProfile || !selectedStores) {
      return NextResponse.json(
        { error: 'Family profile and selected stores are required' },
        { status: 400 }
      )
    }

    console.log('🍽️ Generating meal plan for:', { familyProfile, selectedStores, preferences })

    // Mock data for now - later this will come from real offers and recipes
    const mockOffers = [
      { item: 'kylling', price: 25.00, originalPrice: 35.00, store: 'REMA 1000', category: 'Kød' },
      { item: 'laks', price: 35.00, originalPrice: 45.00, store: 'Netto', category: 'Fisk' },
      { item: 'broccoli', price: 8.50, originalPrice: 12.00, store: 'REMA 1000', category: 'Grøntsager' },
      { item: 'bananer', price: 12.50, originalPrice: 18.00, store: 'Netto', category: 'Frugt' },
      { item: 'havregryn', price: 8.50, originalPrice: 12.00, store: 'REMA 1000', category: 'Morgenmad' },
      { item: 'mælk', price: 12.50, originalPrice: 15.00, store: 'Netto', category: 'Mejeri' }
    ]

    const mockRecipes = [
      {
        id: 1,
        title: 'Kylling med grøntsager',
        ingredients: ['kylling', 'broccoli', 'gulerødder', 'løg', 'hvidløg', 'olivenolie'],
        category: 'Kylling',
        mealType: 'dinner',
        servings: 4,
        basePrice: 45.50,
        prepTime: '25 min'
      },
      {
        id: 2,
        title: 'Laks med spinat og citron',
        ingredients: ['laks', 'spinat', 'citron', 'hvidløg', 'olivenolie', 'salt'],
        category: 'Fisk',
        mealType: 'dinner',
        servings: 4,
        basePrice: 52.80,
        prepTime: '20 min'
      },
      {
        id: 3,
        title: 'Havregrød med bær og honning',
        ingredients: ['havregryn', 'mælk', 'bær', 'honning', 'salt'],
        category: 'Morgenmad',
        mealType: 'breakfast',
        servings: 4,
        basePrice: 18.90,
        prepTime: '15 min'
      },
      {
        id: 4,
        title: 'Pasta med kylling og grøntsager',
        ingredients: ['pasta', 'kylling', 'broccoli', 'gulerødder', 'løg', 'hvidløg', 'olivenolie'],
        category: 'Pasta',
        mealType: 'dinner',
        servings: 4,
        basePrice: 38.50,
        prepTime: '30 min'
      },
      {
        id: 5,
        title: 'Frugtsalat med yoghurt',
        ingredients: ['bananer', 'æbler', 'yoghurt', 'honning'],
        category: 'Morgenmad',
        mealType: 'breakfast',
        servings: 4,
        basePrice: 22.00,
        prepTime: '10 min'
      }
    ]

    // AI Meal Plan Generation Logic
    const generatedMealPlan = generateAIMealPlan(
      familyProfile, 
      selectedStores, 
      mockOffers, 
      mockRecipes,
      preferences
    )

    console.log('✅ Meal plan generated successfully')

    return NextResponse.json({ 
      success: true, 
      data: generatedMealPlan 
    })

  } catch (error) {
    console.error('Error generating meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate meal plan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// AI Meal Plan Generation Algorithm
function generateAIMealPlan(
  familyProfile: any, 
  selectedStores: number[], 
  offers: any[], 
  recipes: any[],
  preferences: any
) {
  console.log('🧠 Running AI meal plan generation...')

  // 1. Calculate family size and meal requirements
  const totalFamilySize = familyProfile.adults + familyProfile.children
  const mealsPerDay = 3 // breakfast, lunch, dinner
  const daysInWeek = 7

  // 2. Score recipes based on offers and family preferences
  const scoredRecipes = recipes.map(recipe => {
    let score = 0
    
    // Base score
    score += 10
    
    // Offer-based scoring
    const offerIngredients = recipe.ingredients.filter(ing => 
      offers.some(offer => offer.item.toLowerCase().includes(ing.toLowerCase()))
    )
    score += offerIngredients.length * 15 // Bonus for offer ingredients
    
    // Family preference scoring
    if (familyProfile.prioritizeOrganic && recipe.category === 'Økologisk') {
      score += 20
    }
    
    // Budget scoring
    if (recipe.basePrice < 30) score += 10
    else if (recipe.basePrice < 50) score += 5
    
    // Variety scoring (avoid same category multiple times)
    score += Math.random() * 10 // Add some randomness for variety
    
    return { ...recipe, score, offerIngredients }
  })

  // 3. Sort recipes by score
  scoredRecipes.sort((a, b) => b.score - a.score)

  // 4. Generate weekly meal plan
  const weekPlan: any = {}
  const usedRecipes = new Set()
  const dailyBudgets = Array(daysInWeek).fill(0)
  const maxDailyBudget = preferences?.maxBudget ? preferences.maxBudget / daysInWeek : 100

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const mealTypes = ['breakfast', 'lunch', 'dinner']

  days.forEach((day, dayIndex) => {
    weekPlan[day] = {}
    
    mealTypes.forEach(mealType => {
      // Find best recipe for this meal that fits budget and variety
      const availableRecipes = scoredRecipes.filter(recipe => 
        recipe.mealType === mealType && 
        !usedRecipes.has(recipe.id) &&
        dailyBudgets[dayIndex] + recipe.basePrice <= maxDailyBudget
      )

      if (availableRecipes.length > 0) {
        const selectedRecipe = availableRecipes[0]
        weekPlan[day][mealType] = selectedRecipe
        usedRecipes.add(selectedRecipe.id)
        dailyBudgets[dayIndex] += selectedRecipe.basePrice
      } else {
        // Fallback: find any recipe for this meal type
        const fallbackRecipes = scoredRecipes.filter(recipe => 
          recipe.mealType === mealType && !usedRecipes.has(recipe.id)
        )
        if (fallbackRecipes.length > 0) {
          const fallbackRecipe = fallbackRecipes[0]
          weekPlan[day][mealType] = fallbackRecipe
          usedRecipes.add(fallbackRecipe.id)
          dailyBudgets[dayIndex] += fallbackRecipe.basePrice
        }
      }
    })
  })

  // 5. Calculate total cost and savings
  let totalCost = 0
  let totalOriginalCost = 0
  
  Object.values(weekPlan).forEach((day: any) => {
    Object.values(day).forEach((meal: any) => {
      if (meal) {
        totalCost += meal.basePrice
        
        // Calculate savings from offers
        const offerSavings = meal.offerIngredients.reduce((savings: number, ing: string) => {
          const offer = offers.find(o => o.item.toLowerCase().includes(ing.toLowerCase()))
          return savings + (offer ? offer.originalPrice - offer.price : 0)
        }, 0)
        
        totalOriginalCost += meal.basePrice + offerSavings
      }
    })
  })

  // 6. Generate shopping list
  const shoppingList = generateShoppingList(weekPlan, offers)

  console.log('🎯 AI meal plan generation complete!')
  console.log('💰 Total cost:', totalCost)
  console.log('💸 Total savings:', totalOriginalCost - totalCost)

  return {
    weekPlan,
    totalCost: Math.round(totalCost * 100) / 100,
    totalSavings: Math.round((totalOriginalCost - totalCost) * 100) / 100,
    shoppingList,
    offersUsed: offers.filter(offer => 
      shoppingList.some(item => item.name.toLowerCase().includes(offer.item.toLowerCase()))
    ),
    familyProfile,
    selectedStores
  }
}

// Generate shopping list from meal plan
function generateShoppingList(weekPlan: any, offers: any[]) {
  const ingredientCounts: Record<string, { quantity: number, unit: string, category: string }> = {}
  
  Object.values(weekPlan).forEach((day: any) => {
    Object.values(day).forEach((meal: any) => {
      if (meal && meal.ingredients) {
        meal.ingredients.forEach((ingredient: string) => {
          const key = ingredient.toLowerCase()
          if (ingredientCounts[key]) {
            ingredientCounts[key].quantity += 1
          } else {
            ingredientCounts[key] = {
              quantity: 1,
              unit: 'stk',
              category: 'Generelt'
            }
          }
        })
      }
    })
  })

  // Convert to array and add offer information
  return Object.entries(ingredientCounts).map(([name, details]) => {
    const offer = offers.find(o => o.item.toLowerCase().includes(name.toLowerCase()))
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: details.quantity,
      unit: details.unit,
      category: details.category,
      hasOffer: !!offer,
      offerPrice: offer?.price,
      originalPrice: offer?.originalPrice,
      savings: offer ? offer.originalPrice - offer.price : 0
    }
  })
}
