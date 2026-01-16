import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Default dietary categories
const DEFAULT_DIETARY_CATEGORIES = [
  'Keto',
  'Sense',
  'GLP-1 kost',
  'Proteinrig kost',
  'Anti-inflammatorisk',
  'Fleksitarisk',
  '5:2 diæt',
  'Familiemad',
  'Low carb',
  'Kombi-familiemad', // Opskrift med kartofler/ris/pasta, kan bruges i keto-familie
  'Kombi-keto' // Keto opskrift, kan bruges i familiemad
]

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() { return undefined },
        set() {},
        remove() {},
      },
    })
    
    // Get categories from database
    const { data, error } = await supabase
      .from('dietary_categories_config')
      .select('categories')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error fetching dietary categories from database:', error)
      // Fallback to default categories
      return NextResponse.json({
        categories: DEFAULT_DIETARY_CATEGORIES,
        defaultCategories: DEFAULT_DIETARY_CATEGORIES
      })
    }
    
    if (data && data.categories && Array.isArray(data.categories)) {
      return NextResponse.json({
        categories: data.categories,
        defaultCategories: DEFAULT_DIETARY_CATEGORIES
      })
    }
    
    // If no data in database, return defaults
    return NextResponse.json({
      categories: DEFAULT_DIETARY_CATEGORIES,
      defaultCategories: DEFAULT_DIETARY_CATEGORIES
    })
    
  } catch (error) {
    console.error('❌ Error fetching dietary categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dietary categories', categories: DEFAULT_DIETARY_CATEGORIES },
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
        get() { return undefined },
        set() {},
        remove() {},
      },
    })
    
    // Validate categories (remove empty, trim, etc.)
    const validCategories = categories
      .map((cat: string) => (cat || '').trim())
      .filter((cat: string) => cat.length > 0)
      .filter((cat: string, index: number, arr: string[]) => arr.indexOf(cat) === index) // Remove duplicates
    
    // Check if config exists
    const { data: existing } = await supabase
      .from('dietary_categories_config')
      .select('id')
      .limit(1)
      .single()
    
    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('dietary_categories_config')
        .update({
          categories: validCategories,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      if (error) {
        console.error('❌ Error updating dietary categories:', error)
        return NextResponse.json({ error: 'Failed to update dietary categories' }, { status: 500 })
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('dietary_categories_config')
        .insert({
          categories: validCategories,
          updated_by: 'admin'
        })
      
      if (error) {
        console.error('❌ Error inserting dietary categories:', error)
        return NextResponse.json({ error: 'Failed to save dietary categories' }, { status: 500 })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Saved ${validCategories.length} dietary categories`,
      categories: validCategories
    })
    
  } catch (error) {
    console.error('❌ Error saving dietary categories:', error)
    return NextResponse.json(
      { error: 'Failed to save dietary categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


