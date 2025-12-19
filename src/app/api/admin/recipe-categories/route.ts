import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Default categories from Ketoliv
const DEFAULT_CATEGORIES = [
  'Aftensmad',
  'Verden rundt',
  'Frokost',
  'Is og sommer',
  'Salater',
  'Fisk',
  'Morgenmad',
  'God til to dage',
  'Vegetar',
  'Tilbehør',
  'Bagværk',
  'Madpakke opskrifter',
  'Desserter',
  'Fatbombs',
  'Food prep',
  'Simre retter',
  'Dip og dressinger'
]

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) { return undefined },
        set(name: string, value: string, options: any) {},
        remove(name: string, options: any) {},
      },
    })
    
    // Get categories from database
    const { data, error } = await supabase
      .from('recipe_categories_config')
      .select('categories')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching categories from database:', error)
      // Fallback to default categories
      return NextResponse.json({
        categories: DEFAULT_CATEGORIES,
        defaultCategories: DEFAULT_CATEGORIES
      })
    }
    
    if (data && data.categories && Array.isArray(data.categories)) {
      return NextResponse.json({
        categories: data.categories,
        defaultCategories: DEFAULT_CATEGORIES
      })
    }
    
    // If no data in database, return defaults
    return NextResponse.json({
      categories: DEFAULT_CATEGORIES,
      defaultCategories: DEFAULT_CATEGORIES
    })
    
  } catch (error) {
    console.error('❌ Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', categories: DEFAULT_CATEGORIES },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categories } = body
    
    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'Categories must be an array' }, { status: 400 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) { return undefined },
        set(name: string, value: string, options: any) {},
        remove(name: string, options: any) {},
      },
    })
    
    // Validate categories (remove empty, trim, etc.)
    const validCategories = categories
      .map((cat: string) => (cat || '').trim())
      .filter((cat: string) => cat.length > 0)
      .filter((cat: string, index: number, arr: string[]) => arr.indexOf(cat) === index) // Remove duplicates
    
    // Check if config exists
    const { data: existing } = await supabase
      .from('recipe_categories_config')
      .select('id')
      .limit(1)
      .single()
    
    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('recipe_categories_config')
        .update({
          categories: validCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (error) {
        console.error('❌ Error updating categories:', error)
        return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 })
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('recipe_categories_config')
        .insert({
          categories: validCategories,
          updated_by: 'admin'
        })
      
      if (error) {
        console.error('❌ Error inserting categories:', error)
        return NextResponse.json({ error: 'Failed to save categories' }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Saved ${validCategories.length} categories`,
      categories: validCategories
    })
    
  } catch (error) {
    console.error('❌ Error saving categories:', error)
    return NextResponse.json(
      { error: 'Failed to save categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
