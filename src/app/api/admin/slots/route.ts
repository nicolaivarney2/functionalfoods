import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { SlotScheduler, SlotSchedule } from '@/lib/slot-scheduler'

export const revalidate = 0

/**
 * GET - Get all occupied slots and next available slots
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const supabase = createSupabaseClient()
    
    // Get all scheduled recipes
    const { data: scheduledRecipes, error } = await supabase
      .from('recipes')
      .select('id, title, "scheduledDate", "scheduledTime", status')
      .eq('status', 'scheduled')
      .not('scheduledDate', 'is', null)
      .not('scheduledTime', 'is', null)
      .order('scheduledDate', { ascending: true })
      .order('scheduledTime', { ascending: true })
    
    if (error) {
      console.error('Error fetching scheduled recipes:', error)
      return NextResponse.json({ error: 'Failed to fetch scheduled recipes' }, { status: 500 })
    }
    
    console.log('📅 Raw scheduled recipes from DB:', scheduledRecipes)
    
    // Convert to SlotSchedule format (normalize time to HH:MM)
    const occupiedSlots: SlotSchedule[] = (scheduledRecipes || []).map(recipe => {
      const rawTime: string = (recipe as any).scheduledTime
      const normalizedTime = typeof rawTime === 'string' && rawTime.includes(':')
        ? rawTime.slice(0, 5)
        : rawTime
      const slotNumber = SlotScheduler.getSlotNumberFromTime(normalizedTime)

      return {
        recipeId: (recipe as any).id,
        recipeTitle: (recipe as any).title,
        scheduledDate: (recipe as any).scheduledDate,
        scheduledTime: normalizedTime,
        slotNumber,
        status: (recipe as any).status as 'scheduled' | 'published'
      }
    })
    
    console.log('📅 Converted occupied slots:', occupiedSlots)
    
    // Get next available slot
    const nextAvailableSlot = SlotScheduler.getNextAvailableSlot(occupiedSlots)
    
    let slots: any[] = []
    
    if (startDate && endDate) {
      // Get slots for date range
      slots = SlotScheduler.getSlotsForDateRange(startDate, endDate, occupiedSlots)
    } else {
      // Get slots for next 7 days
      const today = new Date()
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      
      slots = SlotScheduler.getSlotsForDateRange(
        today.toISOString().split('T')[0],
        nextWeek.toISOString().split('T')[0],
        occupiedSlots
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        occupiedSlots,
        nextAvailableSlot,
        slots,
        totalOccupiedSlots: occupiedSlots.length
      }
    })
    
  } catch (error) {
    console.error('Error in GET /api/admin/slots:', error)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  }
}

/**
 * POST - Assign recipe to next available slot
 */
export async function POST(request: NextRequest) {
  try {
    const { recipeId, recipeTitle, count = 1 } = await request.json()
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 })
    }
    
    const supabase = createSupabaseClient()
    
    // Get all scheduled recipes to find occupied slots
    const { data: scheduledRecipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, "scheduledDate", "scheduledTime", status')
      .eq('status', 'scheduled')
      .not('scheduledDate', 'is', null)
      .not('scheduledTime', 'is', null)
    
    if (fetchError) {
      console.error('Error fetching scheduled recipes:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch scheduled recipes' }, { status: 500 })
    }
    
    // Convert to SlotSchedule format
    const occupiedSlots: SlotSchedule[] = (scheduledRecipes || [])
      .filter(recipe => recipe.scheduledDate && recipe.scheduledTime) // Extra safety filter
      .map(recipe => {
        const rawTime: string = (recipe as any).scheduledTime
        const normalizedTime = typeof rawTime === 'string' && rawTime.includes(':')
          ? rawTime.slice(0, 5)
          : rawTime
        const slotNumber = SlotScheduler.getSlotNumberFromTime(normalizedTime)

        return {
          recipeId: (recipe as any).id,
          recipeTitle: (recipe as any).title,
          scheduledDate: (recipe as any).scheduledDate!,
          scheduledTime: normalizedTime,
          slotNumber,
          status: (recipe as any).status as 'scheduled' | 'published'
        }
      })
    
    // Get next available slots
    const nextSlots = SlotScheduler.getNextAvailableSlots(count, occupiedSlots)
    
    if (nextSlots.length === 0) {
      return NextResponse.json({ error: 'No available slots found' }, { status: 400 })
    }
    
    // If single recipe, assign to first slot
    if (count === 1) {
      const slot = nextSlots[0]
      
      // Update recipe with scheduled slot
      const { error: updateError } = await supabase
        .from('recipes')
        .update({
          status: 'scheduled',
          scheduledDate: slot.date,
          scheduledTime: slot.time
        })
        .eq('id', recipeId)
      
      if (updateError) {
        console.error('Error updating recipe:', updateError)
        console.error('Recipe ID:', recipeId)
        console.error('Slot data:', slot)
        return NextResponse.json({ error: 'Failed to schedule recipe' }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: `Recipe scheduled for ${slot.date} at ${SlotScheduler.formatSlotTime(slot.time)}`,
        data: {
          recipeId,
          scheduledDate: slot.date,
          scheduledTime: slot.time,
          slotNumber: slot.slotNumber
        }
      })
    }
    
    // For multiple recipes (batch import), return the slots without updating
    return NextResponse.json({
      success: true,
      message: `Found ${nextSlots.length} available slots`,
      data: {
        slots: nextSlots,
        count: nextSlots.length
      }
    })
    
  } catch (error) {
    console.error('Error in POST /api/admin/slots:', error)
    return NextResponse.json({ error: 'Failed to assign slot' }, { status: 500 })
  }
}
