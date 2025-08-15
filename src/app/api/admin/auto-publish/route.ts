import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    console.log('🤖 Auto-publish check started')
    
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM format
    const currentDate = now.toISOString().split('T')[0] // YYYY-MM-DD format
    
    console.log(`⏰ Current time: ${currentTime}, date: ${currentDate}`)
    
    // Find alle planlagte opskrifter der skal udgives nu
    const { data: scheduledRecipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, slug, scheduleddate, scheduledtime')
      .eq('status', 'scheduled')
      .eq('scheduleddate', currentDate)
      .lte('scheduledtime', currentTime)
    
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint til at tjekke status
export async function GET() {
  try {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    const currentDate = now.toISOString().split('T')[0]
    
    // Find alle planlagte opskrifter for i dag
    const { data: todaysScheduled, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, slug, scheduleddate, scheduledtime, status')
      .eq('scheduleddate', currentDate)
      .order('scheduledtime')
    
    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch scheduled recipes' }, { status: 500 })
    }
    
    const upcoming = todaysScheduled?.filter(r => r.status === 'scheduled' && r.scheduledtime > currentTime) || []
    const overdue = todaysScheduled?.filter(r => r.status === 'scheduled' && r.scheduledtime <= currentTime) || []
    const published = todaysScheduled?.filter(r => r.status === 'published') || []
    
    return NextResponse.json({
      currentTime,
      currentDate,
      upcoming: upcoming.length,
      overdue: overdue.length,
      published: published.length,
      total: todaysScheduled?.length || 0
    })
    
  } catch (error) {
    console.error('❌ Error in auto-publish status check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

