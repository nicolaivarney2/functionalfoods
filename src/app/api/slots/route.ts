import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SlotScheduler, SlotSchedule } from '@/lib/slot-scheduler'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        get(name: string) {
          return undefined
        },
        set(name: string, value: string, options: any) {
          // Service role doesn't need cookies
        },
        remove(name: string, options: any) {
          // Service role doesn't need cookies
        },
      },
    })
    
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
    console.log('📅 Recipe IDs found:', scheduledRecipes?.map(r => r.id))
    
    // Convert to SlotSchedule format
    const occupiedSlots: SlotSchedule[] = (scheduledRecipes || []).map(recipe => ({
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      scheduledDate: recipe.scheduledDate,
      scheduledTime: recipe.scheduledTime,
      slotNumber: SlotScheduler.getSlotNumberFromTime(recipe.scheduledTime),
      status: recipe.status as 'scheduled' | 'published'
    }))
    
    console.log('📅 Converted occupied slots:', occupiedSlots)
    
    // Get next available slot
    const nextAvailableSlot = SlotScheduler.getNextAvailableSlot(occupiedSlots)
    
    let slots: any[] = []
    
    if (startDate && endDate) {
      // Get slots for date range
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0]
        
        for (const slot of SlotScheduler.DAILY_SLOTS) {
          const isOccupied = occupiedSlots.some(occupied => 
            occupied.scheduledDate === dateString && 
            occupied.scheduledTime === slot.time &&
            occupied.status === 'scheduled'
          )
          
          const occupiedSlot = occupiedSlots.find(occupied => 
            occupied.scheduledDate === dateString && 
            occupied.scheduledTime === slot.time &&
            occupied.status === 'scheduled'
          )
          
          slots.push({
            date: dateString,
            time: slot.time,
            slotNumber: slot.slotNumber,
            isOccupied,
            recipe: occupiedSlot || null
          })
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        occupiedSlots,
        nextAvailableSlot,
        slots
      }
    })
    
  } catch (error) {
    console.error('Error in slots API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
