import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {
          // Service role doesn't need cookies
        },
        remove() {
          // Service role doesn't need cookies
        },
      },
    })
    
    // Get all scheduled recipes
    const { data: scheduledRecipes, error: scheduledError } = await supabase
      .from('recipes')
      .select('id, title, "scheduledDate", "scheduledTime", status')
      .eq('status', 'scheduled')
      .not('scheduledDate', 'is', null)
      .not('scheduledTime', 'is', null)
    
    if (scheduledError) {
      console.error('Error fetching scheduled recipes:', scheduledError)
      return NextResponse.json({ error: 'Failed to fetch scheduled recipes' }, { status: 500 })
    }
    
    console.log('📅 Found scheduled recipes:', scheduledRecipes?.length || 0)
    
    if (!scheduledRecipes || scheduledRecipes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled recipes found',
        cleaned: 0
      })
    }
    
    // Get all recipe IDs that actually exist
    const { data: existingRecipes, error: existingError } = await supabase
      .from('recipes')
      .select('id')
      .in('id', scheduledRecipes.map(r => r.id))
    
    if (existingError) {
      console.error('Error fetching existing recipes:', existingError)
      return NextResponse.json({ error: 'Failed to fetch existing recipes' }, { status: 500 })
    }
    
    const existingIds = new Set(existingRecipes?.map(r => r.id) || [])
    console.log('📅 Existing recipe IDs:', existingIds.size)
    
    // Find orphaned scheduled recipes
    const orphanedRecipes = scheduledRecipes.filter(recipe => !existingIds.has(recipe.id))
    console.log('📅 Orphaned scheduled recipes:', orphanedRecipes.length)
    
    if (orphanedRecipes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned scheduled recipes found',
        cleaned: 0
      })
    }
    
    // Clean up orphaned recipes by setting them to draft status and clearing schedule
    const orphanedIds = orphanedRecipes.map(r => r.id)
    console.log('📅 Cleaning up orphaned recipe IDs:', orphanedIds)
    
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        status: 'draft',
        scheduledDate: null,
        scheduledTime: null
      })
      .in('id', orphanedIds)
    
    if (updateError) {
      console.error('Error cleaning up orphaned recipes:', updateError)
      return NextResponse.json({ error: 'Failed to clean up orphaned recipes' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${orphanedRecipes.length} orphaned scheduled recipes`,
      cleaned: orphanedRecipes.length,
      orphanedRecipes: orphanedRecipes.map(r => ({
        id: r.id,
        title: r.title,
        scheduledDate: r.scheduledDate,
        scheduledTime: r.scheduledTime
      }))
    })
    
  } catch (error) {
    console.error('Error in cleanup slots API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
