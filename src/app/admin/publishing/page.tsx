'use client'

import AdminLayout from '@/components/AdminLayout'
import { useState, useEffect } from 'react'
import { Recipe } from '@/types/recipe'
import AutoPublisher from '@/components/AutoPublisher'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Calendar, Clock, CheckCircle, XCircle, Pencil, Save } from 'lucide-react'

interface RecipeWithTips extends Recipe {
  personalTips?: string
  scheduledDate?: Date
  scheduledTime?: string
}

interface Schedule {
  recipeId: string
  scheduledDate: Date
  status: 'scheduled' | 'published'
  scheduledTime?: string
}

export default function AdminPublishingPage() {
  const { isAdmin, checking } = useAdminAuth()
  const [recipes, setRecipes] = useState<RecipeWithTips[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithTips | null>(null)
  const [personalTips, setPersonalTips] = useState('')
  const [editingTips, setEditingTips] = useState(false)
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [autoPublishStatus, setAutoPublishStatus] = useState<string>('Tjekker...')

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadRecipes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/recipes')
      if (!response.ok) {
        throw new Error('Kunne ikke hente opskrifter')
      }
      
      const data = await response.json()
      // API returns recipes array directly, not wrapped in data.recipes
      const recipesArray = Array.isArray(data) ? data : []
      const recipesWithTips = recipesArray.map((recipe: any) => ({
        ...recipe,
        personalTips: recipe.personalTips || '',
        scheduledDate: recipe.scheduleddate ? new Date(recipe.scheduleddate) : undefined,
        scheduledTime: recipe.scheduledtime || '09:00'
      }))
      
      setRecipes(recipesWithTips)
      
      // Initialiser schedules baseret på database status
      const initialSchedules: Schedule[] = recipesWithTips
        .filter((recipe: RecipeWithTips) => recipe.status === 'scheduled' && recipe.scheduledDate)
        .map((recipe: RecipeWithTips) => ({
          recipeId: recipe.id,
          scheduledDate: recipe.scheduledDate!,
          status: 'scheduled' as const,
          scheduledTime: recipe.scheduledTime
        }))
      
      setSchedules(initialSchedules)
      
    } catch (error) {
      console.error('Error loading recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecipeSelect = async (recipe: RecipeWithTips) => {
    setSelectedRecipe(recipe)
    setEditingTips(false)
    
    // Sæt selectedDate og selectedTime baseret på eksisterende planlægning
    const existingSchedule = schedules.find(s => s.recipeId === recipe.id)
    if (existingSchedule?.scheduledDate) {
      setSelectedDate(existingSchedule.scheduledDate.toISOString().split('T')[0])
      setSelectedTime(existingSchedule.scheduledTime || '09:00')
    } else {
      setSelectedDate('')
      setSelectedTime('09:00')
    }
    
    try {
      // Hent personalTips fra database
      const response = await fetch(`/api/recipes/${recipe.slug}/personal-tips`)
      if (response.ok) {
        const data = await response.json()
        setPersonalTips(data.personalTips || '')
      } else {
        setPersonalTips(recipe.personalTips || '')
      }
    } catch (error) {
      console.error('Error fetching personal tips:', error)
      setPersonalTips(recipe.personalTips || '')
    }
  }

  const savePersonalTips = async () => {
    if (!selectedRecipe) return

    try {
      // Gem til database via API
      const response = await fetch(`/api/recipes/${selectedRecipe.slug}/personal-tips`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personalTips }),
      })

      if (!response.ok) {
        throw new Error('Kunne ikke gemme tips')
      }

      // Opdater local state
      const updatedRecipes = recipes.map(recipe => 
        recipe.id === selectedRecipe.id 
          ? { ...recipe, personalTips: personalTips }
          : recipe
      )
      setRecipes(updatedRecipes)
      
      const updatedRecipe = { ...selectedRecipe, personalTips: personalTips }
      setSelectedRecipe(updatedRecipe)
      setEditingTips(false)
      
      console.log('✅ Personal tips gemt for:', selectedRecipe.title)
      
    } catch (error) {
      console.error('❌ Error saving tips:', error)
      alert('Kunne ikke gemme tips. Prøv igen.')
    }
  }

  const deleteRecipe = async (recipeSlug: string, recipeName: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeSlug}/delete`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message}`)
        // Reload recipes and go back to list
        await loadRecipes()
        setSelectedRecipe(null)
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
      alert(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const generateAITips = async (recipe: RecipeWithTips) => {
    try {
      const response = await fetch('/api/ai/generate-tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: recipe.title,
          description: recipe.description,
          difficulty: recipe.difficulty,
          totalTime: recipe.totalTime,
          dietaryCategories: recipe.dietaryCategories || []
        }),
      })

      if (!response.ok) {
        throw new Error('Kunne ikke generere AI tips')
      }

      const data = await response.json()
      setPersonalTips(data.tips)
      setEditingTips(true) // Åbn redigering så brugeren kan tilpasse
      
      console.log('✅ AI tips genereret for:', recipe.title)
      
    } catch (error) {
      console.error('❌ Error generating AI tips:', error)
      alert('Kunne ikke generere AI tips. Prøv igen.')
    }
  }

  const scheduleRecipe = async (recipeId: string, date: string, time: string) => {
    try {
      // Find recipe slug
      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe) return

      // Opdater status i database via API
      const response = await fetch(`/api/recipes/${recipe.slug}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'scheduled',
          scheduledDate: date,
          scheduledTime: time
        }),
      })

      if (!response.ok) {
        throw new Error('Kunne ikke opdatere status')
      }

      // Opdater local state
      const newSchedules = schedules.map(schedule => 
        schedule.recipeId === recipeId 
          ? { ...schedule, scheduledDate: new Date(date), status: 'scheduled' as const }
          : schedule
      )
      setSchedules(newSchedules)
      
      console.log('✅ Status opdateret til scheduled for:', recipe.title, 'at', time)
      
    } catch (error) {
      console.error('❌ Error updating status:', error)
      alert('Kunne ikke opdatere status. Prøv igen.')
    }
  }

  const publishRecipeNow = async (recipeId: string) => {
    try {
      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe) return

      // Opdater status til published i database
      const response = await fetch(`/api/recipes/${recipe.slug}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'published',
          scheduledDate: null,
          scheduledTime: null
        }),
      })

      if (!response.ok) {
        throw new Error('Kunne ikke udgive opskrift')
      }

      // Opdater local state
      const updatedRecipes = recipes.map(r => 
        r.id === recipeId ? { ...r, status: 'published' as const } : r
      )
      setRecipes(updatedRecipes)

      const updatedSchedules = schedules.map(schedule => 
        schedule.recipeId === recipeId 
          ? { ...schedule, status: 'published' as const }
          : schedule
      )
      setSchedules(updatedSchedules)
      
      console.log('✅ Opskrift udgivet nu:', recipe.title)
      
    } catch (error) {
      console.error('❌ Error publishing recipe:', error)
      alert('Kunne ikke udgive opskrift. Prøv igen.')
    }
  }

  const filteredRecipes = recipes.filter(recipe => {
    if (statusFilter === 'all') return true
    return recipe.status === statusFilter
  })

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Tjekker admin rettigheder...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect via useAdminAuth
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Indlæser opskrifter...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Publishing Administration</h1>
          <p className="mt-2 text-gray-600">
            Planlæg udgivelse af opskrifter, tilføj personlige tips og administrer publishing status.
          </p>
        </div>

        {/* Status Filter */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({recipes.length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                statusFilter === 'draft'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Kladder ({recipes.filter(r => r.status === 'draft').length})
            </button>
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                statusFilter === 'scheduled'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Planlagte ({recipes.filter(r => r.status === 'scheduled').length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                statusFilter === 'published'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Udgivne ({recipes.filter(r => r.status === 'published').length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recipe List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Opskrifter ({filteredRecipes.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      onClick={() => handleRecipeSelect(recipe)}
                      className={`p-3 rounded-md cursor-pointer border transition-colors ${
                        selectedRecipe?.id === recipe.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {recipe.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            Status: {recipe.status === 'published' ? 'Udgivet' :
                                     recipe.status === 'scheduled' ? 'Planlagt' : 'Kladde'}
                          </p>
                        </div>
                        {recipe.personalTips && (
                          <div className="ml-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              💡 Tips
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recipe Details */}
          <div className="lg:col-span-2">
            {selectedRecipe ? (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {selectedRecipe.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {selectedRecipe.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {selectedRecipe.dietaryCategories?.map((category, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {category}
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => generateAITips(selectedRecipe)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                      >
                        🤖 AI-Assisted Tips
                      </button>
                      
                      {selectedRecipe.status === 'draft' && (
                        <button
                          onClick={() => publishRecipeNow(selectedRecipe.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                        >
                          🚀 Udgiv nu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Personal Tips Section */}
                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900">Mine tips til opskriften</h4>
                      {!editingTips && (
                        <button
                          onClick={() => setEditingTips(true)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Rediger
                        </button>
                      )}
                    </div>
                    
                    {editingTips ? (
                      <div>
                        <textarea
                          value={personalTips}
                          onChange={(e) => setPersonalTips(e.target.value)}
                          placeholder="Skriv dine personlige tips, erfaringer og variationer til denne opskrift..."
                          className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={savePersonalTips}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                          >
                            Gem tips
                          </button>
                          <button
                            onClick={() => {
                              setEditingTips(false)
                              setPersonalTips(selectedRecipe.personalTips || '')
                            }}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                          >
                            Annuller
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-md">
                        {personalTips ? (
                          <div className="whitespace-pre-wrap text-gray-700">{personalTips}</div>
                        ) : (
                          <p className="text-gray-500 italic">Ingen personlige tips endnu. Klik "Rediger" for at tilføje.</p>
                        )}
                      </div>
                    )}

                    {/* Go to Recipe Button */}
                    <div className="mt-4">
                      <a
                        href={`/opskrift/${selectedRecipe.slug}`}
                        target="_blank"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Gå til opskrift
                      </a>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Planlæg udgivelse</h3>
                    
                    {/* Delete Recipe Button */}
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="text-sm font-medium text-red-900 mb-2">⚠️ Slet Opskrift</h4>
                      <p className="text-xs text-red-700 mb-3">
                        Dette vil permanent slette opskriften og alle tilhørende data
                      </p>
                      <button
                        onClick={() => {
                          if (confirm(`⚠️ ADVARSEL: Dette vil permanent slette opskriften "${selectedRecipe.title}" og alle tilhørende ingredienser og matches!\n\nEr du sikker på at du vil fortsætte?`)) {
                            deleteRecipe(selectedRecipe.slug, selectedRecipe.title)
                          }
                        }}
                        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
                      >
                        Slet Opskrift Permanent
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vælg dato
                        </label>
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={selectedDate}
                          onChange={(e) => {
                            const newDate = e.target.value
                            setSelectedDate(newDate)
                            if (newDate) {
                              scheduleRecipe(selectedRecipe.id, newDate, selectedTime)
                            }
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vælg tidspunkt
                        </label>
                        <input
                          type="time"
                          value={selectedTime}
                          onChange={(e) => {
                            const newTime = e.target.value
                            setSelectedTime(newTime)
                            // Gem tidspunktet automatisk hvis der allerede er planlagt en dato
                            const existingSchedule = schedules.find(s => s.recipeId === selectedRecipe.id)
                            if (existingSchedule?.scheduledDate) {
                              scheduleRecipe(selectedRecipe.id, existingSchedule.scheduledDate.toISOString().split('T')[0], newTime)
                            }
                          }}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Gem planlægning knap */}
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          if (selectedRecipe && selectedDate) {
                            scheduleRecipe(selectedRecipe.id, selectedDate, selectedTime)
                          }
                        }}
                        disabled={!selectedDate}
                        className={`px-4 py-2 rounded-md ${
                          selectedDate 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        💾 Gem planlægning
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedDate 
                          ? `Vil gemme: ${selectedDate} kl. ${selectedTime}`
                          : 'Vælg en dato først'
                        }
                      </p>
                    </div>

                    {schedules.find(s => s.recipeId === selectedRecipe.id)?.scheduledDate && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          📅 Planlagt til: {schedules.find(s => s.recipeId === selectedRecipe.id)?.scheduledDate?.toLocaleDateString('da-DK')} kl. {schedules.find(s => s.recipeId === selectedRecipe.id)?.scheduledTime || '09:00'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Vælg en opskrift</h3>
                <p className="text-gray-600">Klik på en opskrift i venstre side for at redigere tips og planlægge udgivelse.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-green-900 mb-3">🎯 SEO Strategi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
            <div>
              <h3 className="font-medium mb-2">Udgivelsesfrekvens:</h3>
              <ul className="space-y-1">
                <li>• Maks 2 opskrifter om dagen</li>
                <li>• Jævne mellemrum mellem udgivelser</li>
                <li>• Undgå bulk-udgivelser</li>
                <li>• Weekend fri (mere naturlig)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Content Kvalitet:</h3>
              <ul className="space-y-1">
                <li>• Personlige tips og erfaringer</li>
                <li>• Unikke billeder (lokalt lagret)</li>
                <li>• Manuel review af hver opskrift</li>
                <li>• Fokus på danske ingredienser</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Langtids oversigt */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-3">📊 Langtids Oversigt</h2>
          <div className="text-sm text-blue-800">
            <p><strong>Total opskrifter:</strong> {recipes.length}</p>
            <p><strong>Planlagt over:</strong> {Math.ceil(recipes.length / 2)} dage</p>
            <p><strong>Første udgivelse:</strong> {schedules.length > 0 ? schedules[0]?.scheduledDate?.toLocaleDateString('da-DK') : 'Ikke planlagt'}</p>
            <p><strong>Sidste udgivelse:</strong> {schedules.length > 0 ? schedules[schedules.length - 1]?.scheduledDate?.toLocaleDateString('da-DK') : 'Ikke planlagt'}</p>
            <p className="mt-2 text-xs">
              💡 Med 400 opskrifter og 2 om dagen (weekend fri) vil det tage ca. 200+ hverdage at udgive alle.
            </p>
          </div>
        </div>
      </div>
      
      {/* Auto-Publisher komponent */}
      <AutoPublisher />
    </AdminLayout>
  )
}
