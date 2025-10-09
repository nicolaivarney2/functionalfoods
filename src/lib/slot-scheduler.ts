export interface PublishingSlot {
  date: string // YYYY-MM-DD format
  time: string // HH:MM format
  slotNumber: number // 1-4 for the day
  isOccupied: boolean
  recipeId?: string
  recipeTitle?: string
}

export interface SlotSchedule {
  recipeId: string
  recipeTitle: string
  scheduledDate: string
  scheduledTime: string
  slotNumber: number
  status: 'scheduled' | 'published'
}

export class SlotScheduler {
  // Define the 4 daily slots
  private static readonly DAILY_SLOTS = [
    { time: '07:00', slotNumber: 1 },
    { time: '12:00', slotNumber: 2 },
    { time: '15:30', slotNumber: 3 },
    { time: '20:30', slotNumber: 4 }
  ]

  /**
   * Get the next available slot for a recipe
   */
  static getNextAvailableSlot(occupiedSlots: SlotSchedule[]): { date: string; time: string; slotNumber: number } {
    const today = new Date()
    const maxDaysToCheck = 30 // Don't look more than 30 days ahead
    
    for (let dayOffset = 0; dayOffset < maxDaysToCheck; dayOffset++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + dayOffset)
      const dateString = checkDate.toISOString().split('T')[0]
      
      // Check each slot for this day
      for (const slot of this.DAILY_SLOTS) {
        const isOccupied = occupiedSlots.some(occupied => 
          occupied.scheduledDate === dateString && 
          occupied.scheduledTime === slot.time &&
          occupied.status === 'scheduled'
        )
        
        if (!isOccupied) {
          return {
            date: dateString,
            time: slot.time,
            slotNumber: slot.slotNumber
          }
        }
      }
    }
    
    // Fallback: if no slots available in 30 days, use tomorrow at 07:00
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return {
      date: tomorrow.toISOString().split('T')[0],
      time: '07:00',
      slotNumber: 1
    }
  }

  /**
   * Get multiple next available slots for batch imports
   */
  static getNextAvailableSlots(count: number, occupiedSlots: SlotSchedule[]): Array<{ date: string; time: string; slotNumber: number }> {
    const slots: Array<{ date: string; time: string; slotNumber: number }> = []
    const tempOccupiedSlots = [...occupiedSlots]
    
    for (let i = 0; i < count; i++) {
      const nextSlot = this.getNextAvailableSlot(tempOccupiedSlots)
      slots.push(nextSlot)
      
      // Add this slot to temp occupied slots to avoid duplicates
      tempOccupiedSlots.push({
        recipeId: `temp-${i}`,
        recipeTitle: `Temp Recipe ${i}`,
        scheduledDate: nextSlot.date,
        scheduledTime: nextSlot.time,
        slotNumber: nextSlot.slotNumber,
        status: 'scheduled'
      })
    }
    
    return slots
  }

  /**
   * Get all slots for a specific date
   */
  static getSlotsForDate(date: string, occupiedSlots: SlotSchedule[]): PublishingSlot[] {
    return this.DAILY_SLOTS.map(slot => {
      const isOccupied = occupiedSlots.some(occupied => 
        occupied.scheduledDate === date && 
        occupied.scheduledTime === slot.time &&
        occupied.status === 'scheduled'
      )
      
      const occupiedSlot = occupiedSlots.find(occupied => 
        occupied.scheduledDate === date && 
        occupied.scheduledTime === slot.time &&
        occupied.status === 'scheduled'
      )
      
      return {
        date,
        time: slot.time,
        slotNumber: slot.slotNumber,
        isOccupied,
        recipeId: occupiedSlot?.recipeId,
        recipeTitle: occupiedSlot?.recipeTitle
      }
    })
  }

  /**
   * Get slots for a date range
   */
  static getSlotsForDateRange(startDate: string, endDate: string, occupiedSlots: SlotSchedule[]): PublishingSlot[] {
    const slots: PublishingSlot[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0]
      const daySlots = this.getSlotsForDate(dateString, occupiedSlots)
      slots.push(...daySlots)
    }
    
    return slots
  }

  /**
   * Format slot time for display
   */
  static formatSlotTime(time: string): string {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const minute = parseInt(minutes)
    
    if (hour === 7) return '07:00 (Morgen)'
    if (hour === 12) return '12:00 (Middag)'
    if (hour === 15) return '15:30 (Eftermiddag)'
    if (hour === 20) return '20:30 (Aften)'
    
    return time
  }

  /**
   * Get slot number from time
   */
  static getSlotNumberFromTime(time: string): number {
    const slot = this.DAILY_SLOTS.find(s => s.time === time)
    return slot?.slotNumber || 1
  }

  /**
   * Check if a specific slot is available
   */
  static isSlotAvailable(date: string, time: string, occupiedSlots: SlotSchedule[]): boolean {
    return !occupiedSlots.some(occupied => 
      occupied.scheduledDate === date && 
      occupied.scheduledTime === time &&
      occupied.status === 'scheduled'
    )
  }
}
