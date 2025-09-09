import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const revalidate = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params
    const { slug } = resolvedParams

    console.log(`🔍 Getting ingredient matches for recipe: ${slug}`)

    const supabase = createSupabaseServiceClient()

    // Get recipe by slug
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, title, ingredients')
      .eq('slug', slug)
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({
        success: false,
        message: 'Recipe not found'
      }, { status: 404 })
    }

    // Get all ingredients for this recipe
    const recipeIngredients = recipe.ingredients || []
    const ingredientIds = recipeIngredients.map((ing: any) => ing.id).filter(Boolean)

    if (ingredientIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          ingredientMatches: [],
          totalIngredients: 0,
          matchedIngredients: 0,
          unmatchedIngredients: 0
        }
      })
    }

    // Get matches for these ingredients
    const { data: matches, error: matchesError } = await supabase
      .from('product_ingredient_matches')
      .select(`
        ingredient_id,
        product_external_id,
        confidence,
        match_type,
        supermarket_products!inner(
          external_id,
          name,
          category,
          store,
          price,
          original_price,
          is_on_sale,
          image_url
        )
      `)
      .in('ingredient_id', ingredientIds)

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch ingredient matches'
      }, { status: 500 })
    }

    // Group matches by ingredient
    const matchesByIngredient = new Map()
    
    matches?.forEach(match => {
      const ingredientId = match.ingredient_id
      if (!matchesByIngredient.has(ingredientId)) {
        matchesByIngredient.set(ingredientId, [])
      }
      matchesByIngredient.get(ingredientId).push({
        product: match.supermarket_products,
        confidence: match.confidence,
        matchType: match.match_type
      })
    })

    // Create ingredient match summary
    const ingredientMatches = recipeIngredients.map((ingredient: any) => {
      const matches = matchesByIngredient.get(ingredient.id) || []
      const isMatched = matches.length > 0
      
      return {
        ingredient: {
          id: ingredient.id,
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit
        },
        isMatched,
        matches: matches.slice(0, 3), // Show top 3 matches
        totalMatches: matches.length,
        bestMatch: matches.length > 0 ? matches[0] : null
      }
    })

    const matchedIngredients = ingredientMatches.filter(im => im.isMatched).length
    const unmatchedIngredients = ingredientMatches.length - matchedIngredients

    console.log(`✅ Found ${matchedIngredients}/${ingredientMatches.length} matched ingredients`)

    return NextResponse.json({
      success: true,
      data: {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        ingredientMatches,
        totalIngredients: ingredientMatches.length,
        matchedIngredients,
        unmatchedIngredients
      }
    })

  } catch (error) {
    console.error('❌ Error getting ingredient matches:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to get ingredient matches: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
