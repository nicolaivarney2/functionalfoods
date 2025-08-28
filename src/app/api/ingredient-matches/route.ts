import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export async function GET() {
  try {
    const supabase = createSupabaseClient()
    
    // Get all ingredient matches from the database (without joins)
    const { data: matches, error } = await supabase
      .from('ingredient_matches')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching ingredient matches:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ingredient matches' },
        { status: 500 }
      )
    }
    
    console.log(`📊 Found ${matches?.length || 0} ingredient matches`)
    
    return NextResponse.json(matches || [])
    
  } catch (error) {
    console.error('Error in ingredient-matches API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { matches } = await request.json()
    const supabase = createSupabaseClient()
    
    if (!Array.isArray(matches)) {
      return NextResponse.json(
        { error: 'Invalid matches data' },
        { status: 400 }
      )
    }
    
    // Convert camelCase to snake_case for database
    const convertedMatches = matches.map(match => ({
      recipe_ingredient_id: match.recipeIngredientId,
      frida_ingredient_id: match.fridaIngredientId,
      confidence: match.confidence || 100,
      is_manual: match.isManual || false,
      match_type: match.matchType || 'auto'
    }))
    
    // Insert matches into database
    const { data, error } = await supabase
      .from('ingredient_matches')
      .insert(convertedMatches)
      .select()
    
    if (error) {
      console.error('Error saving ingredient matches:', error)
      return NextResponse.json(
        { error: 'Failed to save ingredient matches' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Saved ${data?.length || 0} ingredient matches`)
    
    return NextResponse.json({ 
      message: 'Ingredient matches saved successfully',
      saved: data?.length || 0
    })
    
  } catch (error) {
    console.error('Error in ingredient-matches POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const supabase = createSupabaseClient()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing match ID' },
        { status: 400 }
      )
    }
    
    // Delete the match from database
    const { error } = await supabase
      .from('ingredient_matches')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting ingredient match:', error)
      return NextResponse.json(
        { error: 'Failed to delete ingredient match' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Deleted ingredient match with ID: ${id}`)
    
    return NextResponse.json({ 
      success: true,
      message: 'Ingredient match deleted successfully'
    })
    
  } catch (error) {
    console.error('Error in ingredient-matches DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
