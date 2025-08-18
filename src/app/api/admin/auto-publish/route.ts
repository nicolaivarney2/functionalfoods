import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client dynamically to avoid build-time issues
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    console.log('🤖 Auto-publish check started')
    
    // Create Supabase client
    const supabase = createSupabaseClient()
    
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log(`⏰ Current time: ${currentTime}, date: ${currentDate}`)
    
    // Find alle planlagte opskrifter der skal udgives nu
    const { data: scheduledRecipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, slug, "scheduledDate", "scheduledTime"')
      .eq('status', 'scheduled')
      .eq('scheduledDate', currentDate)
      .lte('scheduledTime', currentTime)
    
    if (fetchError) {
      console.error('❌ Error fetching scheduled recipes:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch scheduled recipes' }, { status: 500 })
    }
    
    if (!scheduledRecipes || scheduledRecipes.length === 0) {
      console.log('✅ No recipes to publish at this time')
      return NextResponse.json({ message: 'No recipes to publish', published: 0 })
    }
    
    console.log(`📅 Found ${scheduledRecipes.length} recipes to publish`)
    
    // Opdater status til 'published' for alle planlagte opskrifter
    const recipeIds = scheduledRecipes.map(recipe => recipe.id)
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ 
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .in('id', recipeIds)
    
    if (updateError) {
      console.error('❌ Error updating recipe status:', updateError)
      return NextResponse.json({ error: 'Failed to update recipe status' }, { status: 500 })
    }
    
    console.log(`✅ Successfully published ${scheduledRecipes.length} recipes:`)
    scheduledRecipes.forEach(recipe => {
      console.log(`   - ${recipe.title} (${recipe.slug})`)
    })
    
    return NextResponse.json({ 
      message: 'Auto-publish completed successfully',
      published: scheduledRecipes.length,
      recipes: scheduledRecipes.map(r => ({ id: r.id, title: r.title, slug: r.slug }))
    })
    
  } catch (error) {
    console.error('❌ Error in auto-publish:', error)
    
    // Handle specific environment variable errors
    if (error instanceof Error && error.message.includes('Missing required Supabase environment variables')) {
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint til at tjekke status
export async function GET() {
  try {
    // Create Supabase client
    const supabase = createSupabaseClient()
    
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    const currentDate = now.toISOString().split('T')[0]
    
    console.log(`🔍 Checking auto-publish status for ${currentDate} at ${currentTime}`)
    
    // Først tjek alle opskrifter for at se hvad der er i databasen
    const { data: allRecipes, error: allRecipesError } = await supabase
      .from('recipes')
      .select('id, title, status, "scheduledDate", "scheduledTime"')
      .limit(5)
    
    if (allRecipesError) {
      console.error('❌ Error fetching all recipes:', allRecipesError)
    } else {
      console.log('📊 Sample recipes from database:', allRecipes)
    }
    
    // Find alle planlagte opskrifter for i dag
    const { data: todaysScheduled, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, slug, "scheduledDate", "scheduledTime", status')
      .eq('scheduledDate', currentDate)
      .order('scheduledTime')
    
    if (fetchError) {
      console.error('❌ Error fetching scheduled recipes:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch scheduled recipes' }, { status: 500 })
    }
    
    console.log(`📊 Found ${todaysScheduled?.length || 0} recipes scheduled for today:`, todaysScheduled)
    
    const upcoming = todaysScheduled?.filter(r => r.status === 'scheduled' && r.scheduledTime > currentTime) || []
    const overdue = todaysScheduled?.filter(r => r.status === 'scheduled' && r.scheduledTime <= currentTime) || []
    const published = todaysScheduled?.filter(r => r.status === 'published') || []
    
    console.log(`📊 Filtered results:`, {
      upcoming: upcoming.length,
      overdue: overdue.length,
      published: published.length,
      total: todaysScheduled?.length || 0
    })
    
    const result = {
      currentTime,
      currentDate,
      upcoming: upcoming.length,
      overdue: overdue.length,
      published: published.length,
      total: todaysScheduled?.length || 0
    }
    
    console.log('📊 Auto-publish status result:', result)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error in auto-publish GET:', error)
    
    // Handle specific environment variable errors
    if (error instanceof Error && error.message.includes('Missing required Supabase environment variables')) {
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

