import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const { rating, userId } = await request.json()
    
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Invalid rating value' },
        { status: 400 }
      )
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      )
    }

    console.log(`⭐ Rating request: ${rating} stars for recipe ${slug} by user ${userId}`)

    // Create Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) {
          return undefined
        },
        set(name: string, value: string, options: any) {
          // Service role doesn't need cookies
        },
        remove(name: string, options: any) {
          // Service role doesn't need cookies
        },
      },
    })

    // First, get the recipe to check if it exists
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id, rating, reviewCount')
      .eq('slug', slug)
      .single()

    if (recipeError || !recipe) {
      console.error('❌ Recipe not found:', recipeError)
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Check if user has already rated this recipe
    const { data: existingRating, error: checkError } = await supabase
      .from('recipe_ratings')
      .select('id, rating')
      .eq('recipe_id', recipe.id)
      .eq('user_id', userId)
      .single()

    let newRating: number
    let newReviewCount: number

    if (existingRating) {
      // Update existing rating
      console.log(`🔄 Updating existing rating from ${existingRating.rating} to ${rating}`)
      
      const { error: updateError } = await supabase
        .from('recipe_ratings')
        .update({ rating, updated_at: new Date().toISOString() })
        .eq('id', existingRating.id)

      if (updateError) {
        console.error('❌ Error updating rating:', updateError)
        return NextResponse.json(
          { error: 'Failed to update rating' },
          { status: 500 }
        )
      }

      // Calculate new average rating
      const { data: allRatings, error: ratingsError } = await supabase
        .from('recipe_ratings')
        .select('rating')
        .eq('recipe_id', recipe.id)

      if (ratingsError) {
        console.error('❌ Error fetching ratings:', ratingsError)
        return NextResponse.json(
          { error: 'Failed to calculate new rating' },
          { status: 500 }
        )
      }

      const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0)
      newRating = totalRating / allRatings.length
      newReviewCount = allRatings.length

    } else {
      // Insert new rating
      console.log(`✨ Creating new rating: ${rating} stars`)
      
      const { error: insertError } = await supabase
        .from('recipe_ratings')
        .insert({
          recipe_id: recipe.id,
          user_id: userId,
          rating,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('❌ Error inserting rating:', insertError)
        return NextResponse.json(
          { error: 'Failed to save rating' },
          { status: 500 }
        )
      }

      // Calculate new average rating
      const { data: allRatings, error: ratingsError } = await supabase
        .from('recipe_ratings')
        .select('rating')
        .eq('recipe_id', recipe.id)

      if (ratingsError) {
        console.error('❌ Error fetching ratings:', ratingsError)
        return NextResponse.json(
          { error: 'Failed to calculate new rating' },
          { status: 500 }
        )
      }

      const totalRating = allRatings.reduce((sum, r) => sum + r.rating, 0)
      newRating = totalRating / allRatings.length
      newReviewCount = allRatings.length
    }

    // Update recipe with new average rating and review count
    const { error: updateRecipeError } = await supabase
      .from('recipes')
      .update({
        rating: Math.round(newRating * 10) / 10, // Round to 1 decimal
        reviewCount: newReviewCount,
        updatedAt: new Date().toISOString()
      })
      .eq('id', recipe.id)

    if (updateRecipeError) {
      console.error('❌ Error updating recipe rating:', updateRecipeError)
      return NextResponse.json(
        { error: 'Failed to update recipe rating' },
        { status: 500 }
      )
    }

    console.log(`✅ Rating saved successfully: ${newRating} stars, ${newReviewCount} reviews`)

    return NextResponse.json({
      success: true,
      newRating: Math.round(newRating * 10) / 10,
      newReviewCount: newReviewCount
    })

  } catch (error) {
    console.error('❌ Error in rating API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
