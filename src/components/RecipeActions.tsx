'use client'

import { useState, useEffect, useRef } from 'react'
import { Heart, Share2, CalendarPlus, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  isRecipeSaved,
  saveRecipe,
  unsaveRecipe,
  migrateLegacyFavoritesToDb,
} from '@/lib/saved-recipes'
import { authFetch } from '@/lib/auth-fetch'

interface RecipeActionsProps {
  recipeId: string
  recipeTitle: string
  recipeSlug: string
  recipeImage?: string
  recipeDescription?: string
}

const DAYS = [
  { key: 'monday', label: 'Mandag' },
  { key: 'tuesday', label: 'Tirsdag' },
  { key: 'wednesday', label: 'Onsdag' },
  { key: 'thursday', label: 'Torsdag' },
  { key: 'friday', label: 'Fredag' },
  { key: 'saturday', label: 'Lørdag' },
  { key: 'sunday', label: 'Søndag' },
] as const

const MEALS = [
  { key: 'breakfast', label: 'Morgenmad' },
  { key: 'lunch', label: 'Frokost' },
  { key: 'dinner', label: 'Aftensmad' },
] as const

export default function RecipeActions({
  recipeId,
  recipeTitle,
  recipeSlug,
}: RecipeActionsProps) {
  const { user } = useAuth()
  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [mealPlanOpen, setMealPlanOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string>('monday')
  const [selectedMeal, setSelectedMeal] = useState<string>('dinner')
  const [mealPlanLoading, setMealPlanLoading] = useState(false)
  const [mealPlanMessage, setMealPlanMessage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    migrateLegacyFavoritesToDb().then(() => {
      isRecipeSaved(recipeId).then(setIsSaved).catch(() => {})
    })
  }, [user, recipeId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMealPlanOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSave = async () => {
    if (!user) {
      alert('Du skal være logget ind for at gemme opskrifter')
      return
    }
    setSaveLoading(true)
    try {
      if (isSaved) {
        await unsaveRecipe(recipeId)
        setIsSaved(false)
      } else {
        await saveRecipe(recipeId)
        setIsSaved(true)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noget gik galt')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipeTitle,
          text: `Tjek denne lækre ${recipeTitle} opskrift!`,
          url: window.location.href,
        })
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link kopieret til udklipsholder!')
      } catch {
        // Ignore
      }
    }
  }

  const handleAddToMealPlan = async () => {
    if (!user) {
      alert('Du skal være logget ind for at tilføje til madplan')
      return
    }
    setMealPlanLoading(true)
    setMealPlanMessage(null)
    try {
      const res = await authFetch('/api/madbudget/meal-plan/add-recipe', {
        method: 'POST',
        body: JSON.stringify({
          slug: recipeSlug,
          day: selectedDay,
          meal: selectedMeal,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Kunne ikke tilføje til madplan')
      }
      setMealPlanMessage(data.message ?? 'Tilføjet til madplan')
      setTimeout(() => {
        setMealPlanMessage(null)
        setMealPlanOpen(false)
      }, 2500)
    } catch (err) {
      setMealPlanMessage(err instanceof Error ? err.message : 'Noget gik galt')
    } finally {
      setMealPlanLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={handleSave}
        disabled={saveLoading}
        className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
          isSaved
            ? 'text-red-500 bg-red-50'
            : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
        }`}
        title="Gem opskrift"
      >
        <Heart size={20} className={isSaved ? 'fill-current' : ''} />
        <span className="text-sm font-medium">Gem</span>
      </button>

      <button
        onClick={handleShare}
        className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        title="Del opskrift"
      >
        <Share2 size={20} />
        <span className="text-sm font-medium">Del</span>
      </button>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setMealPlanOpen(!mealPlanOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors"
          title="Sæt på madplan"
        >
          <CalendarPlus size={20} />
          <span className="text-sm font-medium">Sæt på madplan</span>
          <ChevronDown size={14} className={`transition-transform ${mealPlanOpen ? 'rotate-180' : ''}`} />
        </button>

        {mealPlanOpen && (
          <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <p className="text-sm font-medium text-gray-900 mb-3">Vælg dag og måltid</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ugedag</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {DAYS.map((d) => (
                    <option key={d.key} value={d.key}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Måltid</label>
                <select
                  value={selectedMeal}
                  onChange={(e) => setSelectedMeal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {MEALS.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddToMealPlan}
                disabled={mealPlanLoading}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {mealPlanLoading ? 'Tilføjer...' : 'Tilføj til madplan'}
              </button>

              {mealPlanMessage && (
                <p className={`text-sm flex items-center gap-1 ${mealPlanMessage.includes('tilføjet') || mealPlanMessage.includes('Tilføjet') ? 'text-green-600' : 'text-red-600'}`}>
                  {(mealPlanMessage.includes('tilføjet') || mealPlanMessage.includes('Tilføjet')) && <Check size={14} />}
                  {mealPlanMessage}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
