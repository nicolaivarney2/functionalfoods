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
    
    // Get all Frida ingredients from the database
    const { data: fridaIngredients, error } = await supabase
      .from('frida_ingredients')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching Frida ingredients:', error)
      return NextResponse.json(
        { error: 'Failed to fetch Frida ingredients' },
        { status: 500 }
      )
    }
    
    console.log(`📊 Found ${fridaIngredients?.length || 0} Frida ingredients`)
    
    return NextResponse.json(fridaIngredients || [])
    
  } catch (error) {
    console.error('Error in frida-ingredients API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
