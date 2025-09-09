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
    
    if (recipeIngredients.length === 0) {
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

    // Extract ingredient names from recipe ingredients
    const ingredientNames = recipeIngredients.map((ing: any) => ing.name.toLowerCase().trim()).filter(Boolean)
    
    if (ingredientNames.length === 0) {
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

    // Find matching ingredients in the ingredients table by name
    const { data: matchingIngredients, error: ingredientsError } = await supabase
      .from('ingredients')
      .select('id, name')
      .in('name', ingredientNames)

    if (ingredientsError) {
      console.error('Error fetching matching ingredients:', ingredientsError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch matching ingredients'
      }, { status: 500 })
    }

    const matchingIngredientIds = matchingIngredients?.map(ing => ing.id) || []
    
    if (matchingIngredientIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          recipeId: recipe.id,
          recipeTitle: recipe.title,
          ingredientMatches: recipeIngredients.map((ing: any) => ({
            ingredient: {
              id: ing.id,
              name: ing.name,
              amount: ing.amount,
              unit: ing.unit
            },
            isMatched: false,
            matches: [],
            totalMatches: 0,
            bestMatch: null
          })),
          totalIngredients: recipeIngredients.length,
          matchedIngredients: 0,
          unmatchedIngredients: recipeIngredients.length
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
      .in('ingredient_id', matchingIngredientIds)

    if (matchesError) {
      console.error('Error fetching matches:', matchesError)
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch ingredient matches'
      }, { status: 500 })
    }

    // Create a map of ingredient name to ingredient ID for matching
    const ingredientNameToId = new Map()
    matchingIngredients?.forEach(ing => {
      ingredientNameToId.set(ing.name.toLowerCase().trim(), ing.id)
    })

    // Group matches by ingredient name
    const matchesByIngredientName = new Map()
    
    matches?.forEach(match => {
      // Find the ingredient name that matches this ingredient_id
      const ingredientName = matchingIngredients?.find(ing => ing.id === match.ingredient_id)?.name
      if (ingredientName) {
        const normalizedName = ingredientName.toLowerCase().trim()
        if (!matchesByIngredientName.has(normalizedName)) {
          matchesByIngredientName.set(normalizedName, [])
        }
        matchesByIngredientName.get(normalizedName).push({
          product: match.supermarket_products,
          confidence: match.confidence,
          matchType: match.match_type
        })
      }
    })

    // Create ingredient match summary
    const ingredientMatches = recipeIngredients.map((ingredient: any) => {
      const normalizedName = ingredient.name.toLowerCase().trim()
      const matches = matchesByIngredientName.get(normalizedName) || []
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

    const matchedIngredients = ingredientMatches.filter((im: any) => im.isMatched).length
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
