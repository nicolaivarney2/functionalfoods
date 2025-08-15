import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Create Supabase client dynamically
    const supabase = createSupabaseServerClient()
    
    const recipeSlug = params.slug

    // Først slet alle ingredient_matches for denne opskrift
    const { error: matchesError } = await supabase
      .from('ingredient_matches')
      .delete()
      .eq('recipe_slug', recipeSlug)

    if (matchesError) {
      console.error('Error deleting ingredient matches:', matchesError)
      // Fortsæt alligevel - måske er der ingen matches
    }

    // Slet alle ingredients for denne opskrift
    const { error: ingredientsError } = await supabase
      .from('ingredients')
      .delete()
      .eq('recipe_slug', recipeSlug)

    if (ingredientsError) {
      console.error('Error deleting ingredients:', ingredientsError)
      // Fortsæt alligevel - måske er der ingen ingredients
    }

    // Til sidst slet selve opskriften
    const { error: recipeError } = await supabase
      .from('recipes')
      .delete()
      .eq('slug', recipeSlug)

    if (recipeError) {
      console.error('Error deleting recipe:', recipeError)
      return NextResponse.json(
        { error: 'Kunne ikke slette opskrift' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Opskrift og alle tilhørende data slettet',
      recipeSlug
    })

  } catch (error) {
    console.error('Error in recipe delete API:', error)
    
    // Handle specific environment variable errors
    if (error instanceof Error && error.message.includes('Supabase server client missing env')) {
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
    return NextResponse.json(
      { error: 'Intern server fejl' },
      { status: 500 }
    )
  }
}


