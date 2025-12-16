export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { databaseService } from '@/lib/database-service'
import { FridaDTUMatcher } from '@/lib/frida-dtu-matcher'

interface BreakdownItem {
  name: string
  amount: number
  unit: string
  grams: number
  match?: string | null
  scaleFactor: number
  per100g: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  contribution: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
}

function gramsFromUnit(amount: number, unit: string, ingredientName?: string): number {
  const u = (unit || '').toLowerCase()
  const conversions: Record<string, number> = {
    g: 1,
    gram: 1,
    kg: 1000,
    kilo: 1000,
    stk: 80,
    st: 80,
    stykke: 80,
    spsk: 15,
    tesk: 5,
    tsk: 5,
    dl: 100,
    l: 1000,
    ml: 1,
  }
  const gramsPerUnit = conversions[u] ?? 100
  return amount * gramsPerUnit
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams
    
    const all = await databaseService.getRecipes()
    const recipe = all.find(r => r.slug === slug)
    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    const matcher = new FridaDTUMatcher()

    const items: BreakdownItem[] = []
    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }

    for (const ing of recipe.ingredients || []) {
      const grams = gramsFromUnit(ing.amount || 0, ing.unit || '', ing.name)
      const scaleFactor = grams / 100
      const result = await matcher.matchIngredient(ing.name)
      const per100g = {
        calories: result.nutrition?.calories ?? 0,
        protein: result.nutrition?.protein ?? 0,
        carbs: result.nutrition?.carbs ?? 0,
        fat: result.nutrition?.fat ?? 0,
        fiber: result.nutrition?.fiber ?? 0,
      }
      const contribution = {
        calories: per100g.calories * scaleFactor,
        protein: per100g.protein * scaleFactor,
        carbs: per100g.carbs * scaleFactor,
        fat: per100g.fat * scaleFactor,
        fiber: per100g.fiber * scaleFactor,
      }

      items.push({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        grams,
        match: result.match,
        scaleFactor,
        per100g,
        contribution,
      })

      totals.calories += contribution.calories
      totals.protein += contribution.protein
      totals.carbs += contribution.carbs
      totals.fat += contribution.fat
      totals.fiber += contribution.fiber
    }

    const servings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1
    const perServing = {
      calories: totals.calories / servings,
      protein: totals.protein / servings,
      carbs: totals.carbs / servings,
      fat: totals.fat / servings,
      fiber: totals.fiber / servings,
    }

    return NextResponse.json({
      recipe: { id: recipe.id, title: recipe.title, slug: recipe.slug, servings },
      totals,
      perServing,
      items: items.sort((a, b) => b.contribution.calories - a.contribution.calories),
    })
  } catch (error) {
    console.error('❌ Error creating nutrition breakdown:', error)
    return NextResponse.json({ error: 'Failed to create breakdown' }, { status: 500 })
  }
}


