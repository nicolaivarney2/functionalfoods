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
    
    // Get all Frida ingredients from the frida_foods table (which has the complete Frida database)
    // Use a high limit to get all data, or implement pagination if needed
    const { data: fridaIngredients, error } = await supabase
      .from('frida_foods')
      .select('food_id, food_name_da, food_name_en')
      .order('food_name_da')
      .limit(10000) // Increase limit to get more than 1000 rows
    
    if (error) {
      console.error('Error fetching Frida ingredients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Frida ingredients' },
        { status: 500 }
      )
    }
    
    console.log(`📊 Found ${fridaIngredients?.length || 0} Frida ingredients from frida_foods table`)
    console.log(`🔍 Supabase limit applied: 10000 rows`)
    console.log(`🔍 First few ingredients:`, fridaIngredients?.slice(0, 3).map(item => ({ id: item.food_id, name: item.food_name_da })))
    
    // Transform data to match the expected FridaIngredient interface
    const transformedIngredients = (fridaIngredients || []).map(item => ({
      id: `frida-${item.food_id}`,
      name: item.food_name_da || item.food_name_en || 'Unknown',
      category: 'Frida Foods',
      description: `${item.food_name_da || item.food_name_en} fra Frida DTU database`,
      calories: null, // Will be fetched separately if needed
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      vitamins: {},
      minerals: {},
      source: 'frida_dtu',
      frida_id: item.food_id.toString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    return NextResponse.json(transformedIngredients || [])
    
  } catch (error) {
    console.error('Error in frida-ingredients API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
