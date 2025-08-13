import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

interface IngredientMatch {
  recipeIngredientId: string
  fridaIngredientId: string
  confidence: number
}

export async function POST(request: NextRequest) {
  try {
    const { matches }: { matches: IngredientMatch[] } = await request.json()
    
    console.log(`💾 Saving ${matches.length} ingredient matches...`)
    
    // Create or update ingredient matches in database
    const matchRecords = matches.map(match => ({
      recipe_ingredient_id: match.recipeIngredientId,
      frida_ingredient_id: match.fridaIngredientId,
      confidence: match.confidence,
      is_manual: true, // Since these are manually confirmed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    // Insert matches (upsert to handle duplicates)
    const { data, error } = await supabaseServer
      .from('ingredient_matches')
      .upsert(matchRecords, { 
        onConflict: 'recipe_ingredient_id',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) {
      console.error('❌ Error saving ingredient matches:', error)
      console.error('Details:', error.message)
      
      // For testing purposes, just log the matches that would be saved
      console.log('📋 Would save these matches (DB table might not exist):')
      matches.forEach(match => {
        console.log(`   ${match.recipeIngredientId} → ${match.fridaIngredientId} (${match.confidence}%)`)
      })
      
      return NextResponse.json({ 
        success: false, 
        error: 'Database table not ready',
        message: `Failed to save ${matches.length} matches. Please create database tables first.`,
        details: error.message,
        count: 0 
      })
    }
    
    console.log(`✅ Successfully saved ${data?.length || 0} ingredient matches`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Saved ${data?.length || 0} ingredient matches`,
      count: data?.length || 0 
    })
    
  } catch (error) {
    console.error('❌ Unexpected error in /api/ingredient-matches:', error)
    return NextResponse.json(
      { error: 'Failed to save ingredient matches', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    console.log('🔍 Fetching existing ingredient matches...')
    
    const { data: matches, error } = await supabaseServer
      .from('ingredient_matches')
      .select('*')
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching ingredient matches:', error)
      console.error('Error details:', error.message)
      return NextResponse.json([]) // Return empty array if table doesn't exist yet
    }
    
    console.log(`✅ Found ${matches?.length || 0} existing ingredient matches`)
    // Return only unique latest by recipe_ingredient_id
    const seen = new Set<string>()
    const uniqueLatest = (matches || []).filter(m => {
      if (seen.has(m.recipe_ingredient_id)) return false
      seen.add(m.recipe_ingredient_id)
      return true
    })
    return NextResponse.json(uniqueLatest)
    
  } catch (error) {
    console.error('❌ Unexpected error fetching matches:', error)
    return NextResponse.json([])
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, recipeIngredientId }: { id?: number; recipeIngredientId?: string } = await request.json()
    if (!id && !recipeIngredientId) {
      return NextResponse.json({ success: false, error: 'Missing id or recipeIngredientId' }, { status: 400 })
    }
    let q = supabaseServer.from('ingredient_matches').delete()
    if (id) q = q.eq('id', id)
    if (recipeIngredientId) q = q.eq('recipe_ingredient_id', recipeIngredientId)
    const { error } = await q
    if (error) {
      console.error('❌ Error deleting ingredient match:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Unexpected error deleting match:', error)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}