'use client'

import { useState, useEffect } from 'react'
import { format, addDays, subDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns'
import { da } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Edit, Trash2, Clock, CheckCircle, Brain, Calculator, Image, Star, AlertTriangle, Zap, RefreshCw } from 'lucide-react'
import { SlotScheduler, SlotSchedule } from '@/lib/slot-scheduler'

interface Recipe {
  id: string
  title: string
  status: 'draft' | 'scheduled' | 'published'
  scheduledDate?: string
  scheduledTime?: string
  // Additional fields for icons
  description?: string
  nutritionalInfo?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  imageUrl?: string
  personalTips?: string
  dietaryCategories?: string[]
  difficulty?: 'Nem' | 'Mellem' | 'Svær'
}

export default function PublishingCalendarPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [scheduledRecipes, setScheduledRecipes] = useState<SlotSchedule[]>([])
  const [recipeDetails, setRecipeDetails] = useState<Record<string, Recipe>>({})
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const SLOT_TIMES = ['07:00', '12:00', '15:30', '20:30']
  const SLOT_LABELS = ['Morgen', 'Middag', 'Eftermiddag', 'Aften']

  useEffect(() => {
    loadScheduledRecipes()
  }, [])

  const loadScheduledRecipes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/slots')
      const data = await response.json()
      
      if (data.success) {
        setScheduledRecipes(data.data.occupiedSlots || [])
        
        // Load detailed recipe data for each scheduled recipe
        const recipeIds = data.data.occupiedSlots?.map((slot: SlotSchedule) => slot.recipeId) || []
        if (recipeIds.length > 0) {
          await loadRecipeDetails(recipeIds)
        }
      }
    } catch (error) {
      console.error('Error loading scheduled recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRecipeDetails = async (recipeIds: string[]) => {
    try {
      const details: Record<string, Recipe> = {}
      
      for (const recipeId of recipeIds) {
        try {
          const response = await fetch(`/api/admin/recipes/${recipeId}`)
          if (response.ok) {
            const recipe = await response.json()
            details[recipeId] = recipe
          }
        } catch (error) {
          console.error(`Error loading recipe ${recipeId}:`, error)
        }
      }
      
      setRecipeDetails(details)
    } catch (error) {
      console.error('Error loading recipe details:', error)
    }
  }

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Start on Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }

  const getSlotsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    return SLOT_TIMES.map((time, index) => {
      const scheduledRecipe = scheduledRecipes.find(
        recipe => recipe.scheduledDate === dateString && recipe.scheduledTime === time
      )
      
      return {
        time,
        label: SLOT_LABELS[index],
        recipe: scheduledRecipe
      }
    })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subDays(prev, 7) : addDays(prev, 7))
  }

  const goToToday = () => {
    setCurrentWeek(new Date())
  }

  const handleSlotClick = (date: Date, time: string) => {
    const dateString = format(date, 'yyyy-MM-dd')
    setSelectedDate(dateString)
    setSelectedSlot(time)
  }

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!confirm('Er du sikker på at du vil fjerne denne opskrift fra slot?')) return

    try {
      // Update recipe status to draft and clear scheduled date/time
      const response = await fetch(`/api/recipes/${recipeId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'draft',
          scheduledDate: null,
          scheduledTime: null
        })
      })

      if (response.ok) {
        await loadScheduledRecipes()
        alert('Opskrift fjernet fra slot')
      } else {
        alert('Fejl ved fjernelse af opskrift')
      }
    } catch (error) {
      console.error('Error removing recipe:', error)
      alert('Fejl ved fjernelse af opskrift')
    }
  }

  const refreshCalendar = async () => {
    await loadScheduledRecipes()
  }

  const handlePublishNow = async (recipeId: string) => {
    if (!confirm('Er du sikker på at du vil udgive denne opskrift nu?')) return

    try {
      const response = await fetch(`/api/recipes/${recipeId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'published',
          scheduledDate: null,
          scheduledTime: null
        })
      })

      if (response.ok) {
        await loadScheduledRecipes()
        alert('Opskrift udgivet nu!')
      } else {
        alert('Fejl ved udgivelse af opskrift')
      }
    } catch (error) {
      console.error('Error publishing recipe:', error)
      alert('Fejl ved udgivelse af opskrift')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Publishing Kalender</h1>
          <p className="text-gray-600 mt-2">Se og administrer planlagte opskrifter</p>
        </div>

        {/* Week Navigation */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">
                {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'd. MMM', { locale: da })} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'd. MMM yyyy', { locale: da })}
              </h2>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                I dag
              </button>
              <button
                onClick={refreshCalendar}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Opdater
              </button>
            </div>
            
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header Row */}
          <div className="grid grid-cols-8 border-b border-gray-200">
            <div className="p-4 font-semibold text-gray-700">Tid</div>
            {getWeekDays().map((day, index) => (
              <div key={index} className="p-4 text-center border-l border-gray-200">
                <div className="font-semibold text-gray-900">
                  {format(day, 'EEE', { locale: da })}
                </div>
                <div className="text-sm text-gray-600">
                  {format(day, 'd. MMM', { locale: da })}
                </div>
                {isSameDay(day, new Date()) && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full mx-auto mt-1"></div>
                )}
              </div>
            ))}
          </div>

          {/* Slot Rows */}
          {SLOT_TIMES.map((time, timeIndex) => (
            <div key={time} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
              <div className="p-4 border-r border-gray-200">
                <div className="font-medium text-gray-900">{time}</div>
                <div className="text-sm text-gray-600">{SLOT_LABELS[timeIndex]}</div>
              </div>
              
              {getWeekDays().map((day, dayIndex) => {
                const slots = getSlotsForDate(day)
                const slot = slots[timeIndex]
                const isPast = day < new Date() && !isSameDay(day, new Date())
                
                return (
                  <div
                    key={dayIndex}
                    className={`p-2 border-l border-gray-200 min-h-[80px] ${
                      isPast ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    {slot.recipe ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 h-full">
                        <div className="text-sm font-medium text-blue-900 truncate">
                          {slot.recipe.recipeTitle}
                        </div>
                        
                        {/* Recipe Status Icons */}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(() => {
                            const recipe = recipeDetails[slot.recipe.recipeId]
                            if (!recipe) return null
                            
                            const icons = []
                            
                            // AI Description (if description is long and detailed)
                            if (recipe.description && recipe.description.length > 100) {
                              icons.push(
                                <div key="ai-desc" title="AI beskrivelse">
                                  <Brain size={12} className="text-purple-600" />
                                </div>
                              )
                            }
                            
                            // Nutrition calculated
                            if (recipe.nutritionalInfo?.calories) {
                              icons.push(
                                <div key="nutrition" title="Ernæring beregnet">
                                  <Calculator size={12} className="text-green-600" />
                                </div>
                              )
                            }
                            
                            // Has image
                            if (recipe.imageUrl) {
                              icons.push(
                                <div key="image" title="Har billede">
                                  <Image size={12} className="text-blue-600" />
                                </div>
                              )
                            }
                            
                            // Personal tips
                            if (recipe.personalTips) {
                              icons.push(
                                <div key="tips" title="Personlige tips">
                                  <Star size={12} className="text-yellow-600" />
                                </div>
                              )
                            }
                            
                            // Difficulty indicator
                            if (recipe.difficulty === 'Svær') {
                              icons.push(
                                <div key="difficulty" title="Svær opskrift">
                                  <AlertTriangle size={12} className="text-red-600" />
                                </div>
                              )
                            } else if (recipe.difficulty === 'Nem') {
                              icons.push(
                                <div key="easy" title="Nem opskrift">
                                  <Zap size={12} className="text-green-600" />
                                </div>
                              )
                            }
                            
                            return icons
                          })()}
                        </div>
                        
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => handlePublishNow(slot.recipe!.recipeId)}
                            className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            title="Udgiv nu"
                          >
                            <CheckCircle size={12} />
                          </button>
                          <button
                            onClick={() => handleRemoveRecipe(slot.recipe!.recipeId)}
                            className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            title="Fjern fra slot"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-sm py-4">
                        {isPast ? 'Passeret' : 'Ledig'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Forklaring</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span>Planlagt opskrift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
              <span>Ledig slot</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <span>Udgiv nu</span>
            </div>
            <div className="flex items-center gap-2">
              <Trash2 size={16} className="text-red-600" />
              <span>Fjern fra slot</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Opskrift Status Ikoner</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-purple-600" />
                <span>AI beskrivelse</span>
              </div>
              <div className="flex items-center gap-2">
                <Calculator size={16} className="text-green-600" />
                <span>Ernæring beregnet</span>
              </div>
              <div className="flex items-center gap-2">
                <Image size={16} className="text-blue-600" />
                <span>Har billede</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-600" />
                <span>Personlige tips</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-green-600" />
                <span>Nem opskrift</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600" />
                <span>Svær opskrift</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
