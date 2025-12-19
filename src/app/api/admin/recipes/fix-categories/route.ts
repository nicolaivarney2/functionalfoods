import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Default categories from Ketoliv - fallback if database is not available
const DEFAULT_ALLOWED_CATEGORIES = [
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

async function getAllowedCategories(supabase: any): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_categories_config')
      .select('categories')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!error && data && data.categories && Array.isArray(data.categories)) {
      return data.categories
    }
  } catch (error) {
    console.error('Error fetching allowed categories:', error)
  }
  
  return DEFAULT_ALLOWED_CATEGORIES
}

// Mapping from old/incorrect categories to new categories
const CATEGORY_MAPPING: Record<string, string> = {
  // Meal types
  'Hovedret': 'Aftensmad',
  'Hovedretter': 'Aftensmad',
  'Main course': 'Aftensmad',
  'Lunch': 'Frokost',
  'Breakfast': 'Morgenmad',
  'Dinner': 'Aftensmad',
  'Snack': 'Tilbehør',
  
  // Common variations
  'Aftensmad': 'Aftensmad',
  'Frokost': 'Frokost',
  'Morgenmad': 'Morgenmad',
}

/**
 * Normalize mainCategory to one of the allowed categories
 * Maps based on title, description, current mainCategory, and subCategories
 */
function normalizeMainCategory(
  title: string,
  currentCategory: string, 
  description: string, 
  subCategories: string[] = [],
  allowedCategories: string[] = DEFAULT_ALLOWED_CATEGORIES
): string {
  const titleLower = (title || '').toLowerCase()
  const descLower = (description || '').toLowerCase()
  const currentLower = (currentCategory || '').toLowerCase()
  const subCatsLower = (subCategories || []).map(cat => (cat || '').toLowerCase()).join(' ')
  
  // Combine all text sources for checking
  const allText = `${titleLower} ${descLower} ${currentLower} ${subCatsLower}`
  
  // First, check if current category is already in allowed list
  if (allowedCategories.includes(currentCategory)) {
    return currentCategory
  }
  
  // Check if current category can be mapped
  if (currentCategory && CATEGORY_MAPPING[currentCategory]) {
    return CATEGORY_MAPPING[currentCategory]
  }
  
  // Check for specific category keywords in order of specificity
  
  // Frokost keywords
  if (
    allText.includes('frokost') || 
    allText.includes('lunch') ||
    allText.includes('til frokost') ||
    allText.includes('frokost opskrift') ||
    allText.includes('særlig smart til frokost') ||
    allText.includes('madpakke')
  ) {
    // Check if it's specifically "Madpakke opskrifter"
    if (allText.includes('madpakke')) {
      return 'Madpakke opskrifter'
    }
    return 'Frokost'
  }
  
  // Morgenmad keywords
  if (
    allText.includes('morgenmad') || 
    allText.includes('breakfast') ||
    allText.includes('til morgenmad') ||
    allText.includes('morgenmad opskrift') ||
    allText.includes('start på dagen') ||
    allText.includes('havregryn') ||
    allText.includes('yoghurt')
  ) {
    return 'Morgenmad'
  }
  
  // Specific category keywords
  if (allText.includes('salat') || allText.includes('salater')) {
    return 'Salater'
  }
  if (allText.includes('fisk') || allText.includes('laks') || allText.includes('tun')) {
    return 'Fisk'
  }
  if (allText.includes('is') || allText.includes('sommer')) {
    return 'Is og sommer'
  }
  if (allText.includes('dessert') || allText.includes('desserter')) {
    return 'Desserter'
  }
  if (allText.includes('bagværk') || allText.includes('brød') || allText.includes('kage')) {
    return 'Bagværk'
  }
  if (allText.includes('vegetar') || allText.includes('vegetarian')) {
    return 'Vegetar'
  }
  if (allText.includes('fatbomb') || allText.includes('fatbombs')) {
    return 'Fatbombs'
  }
  if (allText.includes('food prep') || allText.includes('meal prep')) {
    return 'Food prep'
  }
  if (allText.includes('simre') || allText.includes('simret')) {
    return 'Simre retter'
  }
  if (allText.includes('dip') || allText.includes('dressing')) {
    return 'Dip og dressinger'
  }
  if (allText.includes('tilbehør') || allText.includes('side dish')) {
    return 'Tilbehør'
  }
  if (allText.includes('verden rundt') || allText.includes('international') || allText.includes('asiatisk') || allText.includes('italiensk')) {
    return 'Verden rundt'
  }
  if (allText.includes('god til to dage') || allText.includes('meal prep') || allText.includes('batch')) {
    return 'God til to dage'
  }
  
  // Aftensmad keywords (default for dinner/main course)
  if (
    allText.includes('aftensmad') || 
    allText.includes('dinner') || 
    allText.includes('middag') ||
    allText.includes('hovedret') ||
    allText.includes('til aftensmad') ||
    allText.includes('hverdagsmiddag')
  ) {
    return 'Aftensmad'
  }
  
  // Default fallback
  return 'Aftensmad'
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting bulk category fix for recipes...')
    
    // Create Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) { return undefined },
        set(name: string, value: string, options: any) {},
        remove(name: string, options: any) {},
      },
    })
    
    // Fetch all recipes with subCategories and title too
    const { data: recipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, description, mainCategory, subCategories')
    
    if (fetchError) {
      console.error('❌ Error fetching recipes:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 })
    }
    
    if (!recipes || recipes.length === 0) {
      return NextResponse.json({ 
        message: 'No recipes found',
        fixed: 0,
        total: 0
      })
    }
    
    console.log(`📋 Found ${recipes.length} recipes to check`)
    
    // Get allowed categories from database
    const allowedCategories = await getAllowedCategories(supabase)
    console.log(`📋 Using ${allowedCategories.length} allowed categories`)
    
    // Process each recipe
    let fixedCount = 0
    const updates: Array<{ id: string; oldCategory: string; newCategory: string }> = []
    
    for (const recipe of recipes) {
      const currentCategory = recipe.mainCategory || ''
      const title = recipe.title || ''
      const description = recipe.description || ''
      const subCategories = Array.isArray(recipe.subCategories) 
        ? recipe.subCategories.filter(cat => typeof cat === 'string')
        : []
      
      const normalizedCategory = normalizeMainCategory(title, currentCategory, description, subCategories, allowedCategories)
      
      // Always update if:
      // 1. Category changed
      // 2. Current is empty/generic (Hovedret, Hovedretter, empty)
      // 3. Current is not in the allowed categories list
      const shouldUpdate = normalizedCategory !== currentCategory || 
                          !currentCategory || 
                          currentCategory === 'Hovedret' ||
                          currentCategory === 'Hovedretter' ||
                          currentCategory === '' ||
                          !allowedCategories.includes(currentCategory)
      
      if (shouldUpdate) {
        updates.push({
          id: recipe.id,
          oldCategory: currentCategory || '(none)',
          newCategory: normalizedCategory
        })
      }
    }
    
    console.log(`🔧 Found ${updates.length} recipes that need category fixes`)
    
    // Update recipes in batches using bulk operations
    const batchSize = 100
    let updated = 0
    const errors: string[] = []
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      // Group updates by category for more efficient bulk updates
      const updatesByCategory: Record<string, string[]> = {}
      batch.forEach(update => {
        if (!updatesByCategory[update.newCategory]) {
          updatesByCategory[update.newCategory] = []
        }
        updatesByCategory[update.newCategory].push(update.id)
      })
      
      // Perform bulk updates per category
      for (const [category, ids] of Object.entries(updatesByCategory)) {
        const { error: updateError } = await supabase
          .from('recipes')
          .update({ 
            mainCategory: category,
            updatedAt: new Date().toISOString()
          })
          .in('id', ids)
        
        if (updateError) {
          console.error(`❌ Error updating ${ids.length} recipes to ${category}:`, updateError)
          errors.push(`Failed to update ${ids.length} recipes to ${category}`)
        } else {
          updated += ids.length
          console.log(`✅ Fixed ${ids.length} recipes → ${category}`)
        }
      }
    }
    
    // Get summary of category distribution
    const { data: categoryStats } = await supabase
      .from('recipes')
      .select('mainCategory')
    
    const categoryCounts: Record<string, number> = {}
    categoryStats?.forEach(recipe => {
      const cat = recipe.mainCategory || 'Unknown'
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
    
    console.log('📊 Category distribution after fix:', categoryCounts)
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${updated} recipes`,
      total: recipes.length,
      fixed: updated,
      needsFixing: updates.length,
      categoryDistribution: categoryCounts,
      errors: errors.length > 0 ? errors : undefined,
      sampleUpdates: updates.slice(0, 20) // Show first 20 as examples
    })
    
  } catch (error) {
    console.error('❌ Error in fix-categories:', error)
    return NextResponse.json(
      { error: 'Failed to fix categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
