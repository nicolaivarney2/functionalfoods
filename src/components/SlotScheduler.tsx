'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, CheckCircle, XCircle } from 'lucide-react'

interface PublishingSlot {
  date: string
  time: string
  slotNumber: number
  isOccupied: boolean
  recipeId?: string
  recipeTitle?: string
}

interface SlotSchedulerProps {
  recipeId?: string
  recipeTitle?: string
  onSlotAssigned?: (slot: { date: string; time: string; slotNumber: number }) => void
  showNextSlotOnly?: boolean
}

export default function SlotScheduler({ 
  recipeId, 
  recipeTitle, 
  onSlotAssigned, 
  showNextSlotOnly = false 
}: SlotSchedulerProps) {
  const [slots, setSlots] = useState<PublishingSlot[]>([])
  const [nextAvailableSlot, setNextAvailableSlot] = useState<{ date: string; time: string; slotNumber: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSlots()
  }, [])

  const loadSlots = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/slots')
      const data = await response.json()
      
      if (data.success) {
        setSlots(data.data.slots)
        setNextAvailableSlot(data.data.nextAvailableSlot)
      } else {
        setError('Kunne ikke hente slots')
      }
    } catch (err) {
      setError('Fejl ved indlæsning af slots')
      console.error('Error loading slots:', err)
    } finally {
      setLoading(false)
    }
  }

  const assignToNextSlot = async () => {
    if (!recipeId) {
      setError('Ingen opskrift valgt')
      return
    }

    try {
      setAssigning(true)
      setError(null)
      
      const response = await fetch('/api/admin/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipeId,
          recipeTitle,
          count: 1
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Reload slots to show updated state
        await loadSlots()
        
        // Call callback if provided
        if (onSlotAssigned) {
          onSlotAssigned({
            date: data.data.scheduledDate,
            time: data.data.scheduledTime,
            slotNumber: data.data.slotNumber
          })
        }
        
        alert(`✅ ${data.message}`)
      } else {
        setError(data.error || 'Kunne ikke tildele slot')
      }
    } catch (err) {
      setError('Fejl ved tildeling af slot')
      console.error('Error assigning slot:', err)
    } finally {
      setAssigning(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('da-DK', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const formatSlotTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    
    if (hour === 7) return '07:00 (Morgen)'
    if (hour === 12) return '12:00 (Middag)'
    if (hour === 15) return '15:30 (Eftermiddag)'
    if (hour === 20) return '20:30 (Aften)'
    
    return time
  }

  if (loading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center space-x-2 mb-3">
          <Calendar size={16} className="text-blue-500" />
          <h3 className="text-sm font-medium text-blue-900">PUBLIKATION SLOTS</h3>
        </div>
        <div className="text-sm text-blue-700">Indlæser slots...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <div className="flex items-center space-x-2 mb-3">
          <XCircle size={16} className="text-red-500" />
          <h3 className="text-sm font-medium text-red-900">PUBLIKATION SLOTS</h3>
        </div>
        <div className="text-sm text-red-700">Fejl: {error}</div>
      </div>
    )
  }

  if (showNextSlotOnly && nextAvailableSlot) {
    return (
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center space-x-2 mb-3">
          <Calendar size={16} className="text-green-500" />
          <h3 className="text-sm font-medium text-green-900">NÆSTE LEDIGE SLOT</h3>
        </div>
        
        <div className="text-sm text-green-700 mb-3">
          <div className="font-medium">
            {formatDate(nextAvailableSlot.date)} kl. {formatSlotTime(nextAvailableSlot.time)}
          </div>
        </div>
        
        {recipeId && (
          <button
            onClick={assignToNextSlot}
            disabled={assigning}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              assigning
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {assigning ? 'Tildeler...' : 'Tilføj til næste slot'}
          </button>
        )}
      </div>
    )
  }

  // Group slots by date
  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) {
      acc[slot.date] = []
    }
    acc[slot.date].push(slot)
    return acc
  }, {} as Record<string, PublishingSlot[]>)

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar size={16} className="text-blue-500" />
          <h3 className="text-sm font-medium text-blue-900">PUBLIKATION SLOTS</h3>
        </div>
        
        {recipeId && nextAvailableSlot && (
          <button
            onClick={assignToNextSlot}
            disabled={assigning}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              assigning
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {assigning ? 'Tildeler...' : 'Tilføj til næste slot'}
          </button>
        )}
      </div>

      {nextAvailableSlot && (
        <div className="mb-4 p-2 bg-green-100 rounded border border-green-300">
          <div className="text-xs text-green-800">
            <strong>Næste ledige slot:</strong> {formatDate(nextAvailableSlot.date)} kl. {formatSlotTime(nextAvailableSlot.time)}
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {Object.entries(slotsByDate).map(([date, daySlots]) => (
          <div key={date} className="bg-white rounded p-3 border border-blue-100">
            <div className="text-sm font-medium text-gray-900 mb-2">
              {formatDate(date)}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {daySlots.map((slot) => (
                <div
                  key={`${slot.date}-${slot.time}`}
                  className={`flex items-center justify-between p-2 rounded text-xs ${
                    slot.isOccupied
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    {slot.isOccupied ? (
                      <XCircle size={12} className="text-red-500" />
                    ) : (
                      <CheckCircle size={12} className="text-green-500" />
                    )}
                    <span className={slot.isOccupied ? 'text-red-700' : 'text-green-700'}>
                      {formatSlotTime(slot.time)}
                    </span>
                  </div>
                  
                  {slot.isOccupied && slot.recipeTitle && (
                    <div className="text-xs text-red-600 truncate max-w-20" title={slot.recipeTitle}>
                      {slot.recipeTitle}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
