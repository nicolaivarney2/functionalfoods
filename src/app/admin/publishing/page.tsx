'use client'

import AdminLayout from '@/components/AdminLayout'
import { useState, useEffect, ChangeEvent } from 'react'
import { Recipe } from '@/types/recipe'
import AutoPublisher from '@/components/AutoPublisher'
import RecipeNutritionRecalculator from '@/components/RecipeNutritionRecalculator'
import IngredientMatchesBox from '@/components/IngredientMatchesBox'
import SlotScheduler from '@/components/SlotScheduler'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { Pencil, Plus, X } from 'lucide-react'

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
  const [editingDescription, setEditingDescription] = useState(false)
  const [editingCategories, setEditingCategories] = useState(false)
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('published')
  const [selectedDate, setSelectedDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [allowedCategories, setAllowedCategories] = useState<string[]>([])
  const [dietaryCategories, setDietaryCategories] = useState<string[]>([])
  const [editingIngredients, setEditingIngredients] = useState(false)
  const [editingInstructions, setEditingInstructions] = useState(false)
  const [editedIngredients, setEditedIngredients] = useState<any[]>([])
  const [editedInstructions, setEditedInstructions] = useState<any[]>([])

  useEffect(() => {
    loadRecipes()
    loadAllowedCategories()
    loadDietaryCategories()
  }, [])

  const loadAllowedCategories = async () => {
    try {
      const response = await fetch('/api/admin/recipe-categories')
      if (response.ok) {
        const data = await response.json()
        setAllowedCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error loading allowed categories:', error)
      // Fallback to default categories
      setAllowedCategories([
        'Aftensmad', 'Verden rundt', 'Frokost', 'Is og sommer', 'Salater',
        'Fisk', 'Morgenmad', 'God til to dage', 'Vegetar', 'Tilbehør',
        'Bagværk', 'Madpakke opskrifter', 'Desserter', 'Fatbombs',
        'Food prep', 'Simre retter', 'Dip og dressinger'
      ])
    }
  }

  const loadDietaryCategories = async () => {
    try {
      const response = await fetch('/api/admin/dietary-categories')
      if (response.ok) {
        const data = await response.json()
        setDietaryCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error loading dietary categories:', error)
      // Fallback to default dietary categories
      setDietaryCategories([
        'Keto', 'Sense', 'GLP-1 kost', 'Proteinrig kost', 'Anti-inflammatorisk',
        'Fleksitarisk', '5:2 diæt', 'Familiemad', 'Low carb',
        'Kombi-familiemad', 'Kombi-keto'
      ])
    }
  }

  const loadRecipes = async () => {
    try {
      setLoading(true)
      // Tilføj cache-busting for at sikre frisk data
      const response = await fetch(`/api/admin/recipes?t=${Date.now()}`, {
        cache: 'no-store'
      })
      if (!response.ok) {
        throw new Error('Kunne ikke hente opskrifter')
      }
      
      const data = await response.json()
      // API returns { recipes: [...] } format
      const recipesArray = data.recipes || []
      const recipesWithTips = recipesArray.map((recipe: any) => ({
        ...recipe,
        personalTips: recipe.personalTips || '',
        scheduledDate: recipe.scheduledDate ? new Date(recipe.scheduledDate) : undefined,
        scheduledTime: recipe.scheduledTime || '09:00'
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
    setEditingDescription(false)
    setEditingCategories(false)
    setEditingIngredients(false)
    setEditingInstructions(false)
    
    // Sæt de oprindelige værdier fra opskriften
    setDescription(recipe.description || '')
    // Kombiner mainCategory, subCategories og dietaryCategories til én liste
    const allCategories: string[] = []
    if (recipe.mainCategory) allCategories.push(recipe.mainCategory)
    if (recipe.subCategories && recipe.subCategories.length > 0) {
      allCategories.push(...recipe.subCategories)
    }
    if (recipe.dietaryCategories && recipe.dietaryCategories.length > 0) {
      allCategories.push(...recipe.dietaryCategories)
    }
    setCategories(allCategories)
    
    // Sæt ingredienser og instruktioner til redigering
    setEditedIngredients(recipe.ingredients || [])
    setEditedInstructions(recipe.instructions || [])
    
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

  const saveDescription = async () => {
    if (!selectedRecipe) return

    try {
      // Gem til database via API
      const response = await fetch(`/api/admin/recipes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          recipeId: selectedRecipe.id,
          description: description 
        }),
      })

      if (!response.ok) {
        throw new Error('Kunne ikke gemme beskrivelse')
      }

      // Opdater local state
      const updatedRecipes = recipes.map(recipe => 
        recipe.id === selectedRecipe.id 
          ? { ...recipe, description: description }
          : recipe
      )
      setRecipes(updatedRecipes)
      
      const updatedRecipe = { ...selectedRecipe, description: description }
      setSelectedRecipe(updatedRecipe)
      setEditingDescription(false)
      
      console.log('✅ Beskrivelse gemt for:', selectedRecipe.title)
      
    } catch (error) {
      console.error('❌ Error saving description:', error)
      alert('Kunne ikke gemme beskrivelse. Prøv igen.')
    }
  }

  const saveCategories = async () => {
    if (!selectedRecipe) return

    try {
      // Separer kategorier i mainCategory, subCategories og dietaryCategories
      // mainCategory skal være en af de tilladte kategorier (Aftensmad, Frokost, osv.)
      // dietaryCategories skal være fra dietary categories listen (Keto, Proteinrig kost, osv.)
      
      // Først: Find dietary categories - disse skal ALDRIG være mainCategory
      const selectedDietaryCategories = categories.filter(cat => 
        dietaryCategories.includes(cat)
      )
      
      // Find mainCategory - skal være en af de tilladte kategorier (IKKE dietary)
      const mainCategory = categories.find(cat => 
        allowedCategories.includes(cat) && 
        !dietaryCategories.includes(cat) // Sikrer at dietary categories ikke bliver mainCategory
      ) || selectedRecipe.mainCategory || 'Aftensmad'
      
      // subCategories er alle andre kategorier der ikke er dietary og ikke er mainCategory
      const subCategories = categories.filter(cat => 
        cat !== mainCategory && 
        !dietaryCategories.includes(cat) && // Ikke dietary
        allowedCategories.includes(cat) // Kun tilladte kategorier
      )

      // Gem til database via API
      const response = await fetch(`/api/admin/recipes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          recipeId: selectedRecipe.id,
          mainCategory,
          subCategories,
          dietaryCategories: selectedDietaryCategories
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API error response:', errorData)
        throw new Error(errorData.error || 'Kunne ikke gemme kategorier')
      }

      const result = await response.json()

      // Opdater local state med data fra serveren
      const serverRecipe = result.data || result
      const finalDietaryCategories = Array.isArray(serverRecipe.dietaryCategories) 
        ? serverRecipe.dietaryCategories 
        : selectedDietaryCategories
      const finalSubCategories = Array.isArray(serverRecipe.subCategories) 
        ? serverRecipe.subCategories 
        : subCategories
      const finalMainCategory = serverRecipe.mainCategory || mainCategory
      
      const updatedRecipes = recipes.map(recipe => 
        recipe.id === selectedRecipe.id 
          ? { 
              ...recipe, 
              mainCategory: finalMainCategory,
              subCategories: finalSubCategories,
              dietaryCategories: finalDietaryCategories
            }
          : recipe
      )
      setRecipes(updatedRecipes)
      
      const updatedRecipe = { 
        ...selectedRecipe, 
        mainCategory: finalMainCategory,
        subCategories: finalSubCategories,
        dietaryCategories: finalDietaryCategories
      }
      setSelectedRecipe(updatedRecipe)
      setEditingCategories(false)
      
      // Genindlæs opskrifter fra databasen for at sikre konsistens
      await loadRecipes()
      
      // Find den opdaterede opskrift igen efter reload
      const { data: reloadData } = await fetch(`/api/admin/recipes?t=${Date.now()}`, {
        cache: 'no-store'
      }).then(r => r.json())
      const reloadedRecipe = reloadData?.recipes?.find((r: any) => r.id === selectedRecipe.id)
      if (reloadedRecipe) {
        setSelectedRecipe(reloadedRecipe as RecipeWithTips)
      }
      
    } catch (error) {
      console.error('❌ Error saving categories:', error)
      alert('Kunne ikke gemme kategorier. Prøv igen.')
    }
  }

  const saveIngredients = async () => {
    if (!selectedRecipe) return

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/recipes?timestamp=${new Date().getTime()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({
          recipeId: selectedRecipe.id,
          ingredients: editedIngredients
        }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kunne ikke gemme ingredienser')
      }

      await response.json()
      
      // Update local state
      const updatedRecipe = { ...selectedRecipe, ingredients: editedIngredients }
      setSelectedRecipe(updatedRecipe)
      
      const updatedRecipes = recipes.map(recipe =>
        recipe.id === selectedRecipe.id ? updatedRecipe : recipe
      )
      setRecipes(updatedRecipes)
      
      setEditingIngredients(false)
      console.log('✅ Ingredienser gemt for:', selectedRecipe.title)
      alert('✅ Ingredienser gemt!')
      
    } catch (error) {
      console.error('❌ Error saving ingredients:', error)
      alert('Kunne ikke gemme ingredienser. Prøv igen.')
    } finally {
      setSaving(false)
    }
  }

  const saveInstructions = async () => {
    if (!selectedRecipe) return

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/recipes?timestamp=${new Date().getTime()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify({
          recipeId: selectedRecipe.id,
          instructions: editedInstructions
        }),
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Kunne ikke gemme instruktioner')
      }

      await response.json()
      
      // Update local state
      const updatedRecipe = { ...selectedRecipe, instructions: editedInstructions }
      setSelectedRecipe(updatedRecipe)
      
      const updatedRecipes = recipes.map(recipe =>
        recipe.id === selectedRecipe.id ? updatedRecipe : recipe
      )
      setRecipes(updatedRecipes)
      
      setEditingInstructions(false)
      console.log('✅ Instruktioner gemt for:', selectedRecipe.title)
      alert('✅ Instruktioner gemt!')
      
    } catch (error) {
      console.error('❌ Error saving instructions:', error)
      alert('Kunne ikke gemme instruktioner. Prøv igen.')
    } finally {
      setSaving(false)
    }
  }

  const addCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      setCategories([...categories, newCategory.trim()])
      setNewCategory('')
    }
  }

  const removeCategory = (categoryToRemove: string) => {
    setCategories(categories.filter(cat => cat !== categoryToRemove))
  }

  const deleteRecipe = async (recipeSlug: string) => {
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
      setIsScheduling(true)
      setScheduleSuccess(false)
      
      // Find recipe slug
      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe) return

      console.log('📅 Scheduling recipe:', { recipeId, date, time })

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
      
      // Opdater recipe status i recipes array
      const updatedRecipes = recipes.map(r => 
        r.id === recipeId ? { ...r, status: 'scheduled' as const } : r
      )
      setRecipes(updatedRecipes)
      
      setScheduleSuccess(true)
      console.log('✅ Status opdateret til scheduled for:', recipe.title, 'at', time)
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setScheduleSuccess(false)
      }, 3000)
      
    } catch (error) {
      console.error('❌ Error updating status:', error)
      alert('Kunne ikke opdatere status. Prøv igen.')
    } finally {
      setIsScheduling(false)
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
        r.id === recipeId ? { 
          ...r, 
          status: 'published' as const,
          scheduledDate: undefined,
          scheduledTime: undefined
        } : r
      )
      setRecipes(updatedRecipes)

      const updatedSchedules = schedules.map(schedule => 
        schedule.recipeId === recipeId 
          ? { ...schedule, status: 'published' as const }
          : schedule
      )
      setSchedules(updatedSchedules)
      
      // Update selected recipe if it's the one being published
      if (selectedRecipe && selectedRecipe.id === recipeId) {
        setSelectedRecipe({
          ...selectedRecipe,
          status: 'published' as const,
          scheduledDate: undefined,
          scheduledTime: undefined
        })
      }
      
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

  const handleBulkNutritionRecalculation = async () => {
    if (!confirm('⚠️ ADVARSEL: Denne handling vil genberegne mikro og makro ernæring for ALLE opskrifter på én gang. Dette kan tage flere minutter. Er du sikker på at du vil fortsætte?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/recalculate-nutrition-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Kunne ikke genberegne masse ernæring');
      }

      const data = await response.json();
      alert(`✅ Masse ernæring opdateret!\n\n${data.results.success} opskrifter opdateret\n${data.results.errors} fejl\n\nSe console for detaljer.`);
      loadRecipes(); // Refresh recipes to show updated nutrition
    } catch (error) {
      console.error('❌ Error bulk nutrition recalculation:', error);
      alert(`❌ Fejl ved masse ernæring opdatering: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedRecipe) return

    try {
      setSaving(true)
      
      // Upload image to the existing upload endpoint
      const formData = new FormData()
      formData.append('image', file)
      formData.append('recipeId', selectedRecipe.id)
      formData.append('recipeTitle', selectedRecipe.title)

      const response = await fetch('/api/admin/upload-recipe-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Kunne ikke uploade billede')
      }

      const data = await response.json()
      
      // Update the selected recipe with new image URL
      const updatedRecipe = {
        ...selectedRecipe,
        imageUrl: data.imageUrl,
        imageAlt: `${selectedRecipe.title} - Functional Foods`
      }
      
      setSelectedRecipe(updatedRecipe)
      
      // Update the recipes list
      const updatedRecipes = recipes.map(recipe => 
        recipe.id === selectedRecipe.id ? updatedRecipe : recipe
      )
      setRecipes(updatedRecipes)
      
      alert('✅ Billede opdateret!')
      
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('❌ Kunne ikke uploade billede. Prøv igen.')
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Publishing Administration</h1>
            <p className="mt-2 text-gray-600">
              Planlæg udgivelse af opskrifter, tilføj personlige tips og administrer publishing status.
            </p>
          </div>
          <div className="flex space-x-3">
            <a
              href="/admin/publishing/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Opret AI opskrift
            </a>
            <a
              href="/admin/publishing/create-manual"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Opret opskrift
            </a>
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
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
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({recipes.length})
            </button>
          </div>
          
          {/* Bulk Nutrition Recalculation */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">🧪 Masse Opdatering af Ernæring</h4>
            <p className="text-xs text-yellow-700 mb-3">
              Genberegn mikro og makro ernæring på ALLE opskrifter på én gang
            </p>
            <button
              onClick={handleBulkNutritionRecalculation}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md text-sm hover:bg-yellow-700"
            >
              🔄 Masse Opdater Ernæring (Alle {recipes.length} Opskrifter)
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
                        <div className="ml-2 flex items-center gap-2">
                          {recipe.personalTips && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              💡 Tips
                            </span>
                          )}
                          {/* Nutrition recalculation for drafts */}
                          {recipe.status === 'draft' && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <RecipeNutritionRecalculator
                                recipeId={recipe.id}
                                recipeName={recipe.title}
                              />
                            </div>
                          )}
                        </div>
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
                    
                    {/* Beskrivelse sektion */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-medium text-gray-900">Beskrivelse</h4>
                        {!editingDescription && (
                          <button
                            onClick={() => setEditingDescription(true)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Rediger
                          </button>
                        )}
                      </div>
                      
                      {editingDescription ? (
                        <div>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Skriv beskrivelsen af opskriften..."
                            className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="flex gap-3 mt-3">
                            <button
                              onClick={saveDescription}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                              Gem beskrivelse
                            </button>
                            <button
                              onClick={() => {
                                setEditingDescription(false)
                                setDescription(selectedRecipe.description || '')
                              }}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                            >
                              Annuller
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          {description || 'Ingen beskrivelse endnu. Klik "Rediger" for at tilføje.'}
                        </p>
                      )}
                    </div>

                    {/* Billede sektion */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-medium text-gray-900">Billede</h4>
                        <button
                          onClick={() => document.getElementById('image-upload')?.click()}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Skift billede
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <img
                          src={selectedRecipe.imageUrl || '/images/recipe-placeholder.jpg'}
                          alt={selectedRecipe.imageAlt || selectedRecipe.title}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">
                            <strong>URL:</strong> {selectedRecipe.imageUrl || 'Ingen billede'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Alt tekst:</strong> {selectedRecipe.imageAlt || 'Ingen alt tekst'}
                          </p>
                        </div>
                      </div>
                      
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>

                    {/* Kategorier/Tags sektion */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-medium text-gray-900">Kategorier/Tags</h4>
                        {!editingCategories && (
                          <button
                            onClick={() => setEditingCategories(true)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Rediger
                          </button>
                        )}
                      </div>
                      
                      {editingCategories ? (
                        <div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {categories.map((category, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {category}
                                <button
                                  onClick={() => removeCategory(category)}
                                  className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 mb-3">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                                placeholder="Søg eller tilføj kategori..."
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                list="allowed-categories"
                              />
                              <datalist id="allowed-categories">
                                {allowedCategories.map((cat) => (
                                  <option key={cat} value={cat} />
                                ))}
                                {dietaryCategories.map((cat) => (
                                  <option key={cat} value={cat} />
                                ))}
                              </datalist>
                            </div>
                            <button
                              onClick={addCategory}
                              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
                            >
                              Tilføj
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            Tilladte kategorier: {allowedCategories.join(', ')}
                            <br />
                            Dietary kategorier: {dietaryCategories.join(', ')}
                          </p>
                          <div className="flex gap-3">
                            <button
                              onClick={saveCategories}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                            >
                              Gem kategorier
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategories(false)
                                // Reset til original state
                                const allCategories = [
                                  selectedRecipe.mainCategory,
                                  ...(selectedRecipe.subCategories || []),
                                  ...(selectedRecipe.dietaryCategories || [])
                                ].filter(Boolean) as string[]
                                setCategories(allCategories)
                                setNewCategory('')
                              }}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                            >
                              Annuller
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {categories.length > 0 ? (
                            categories.map((category, index) => {
                              // Bestem farve baseret på kategori type
                              const mealCategories = ['Morgenmad', 'Frokost', 'Aftensmad', 'Snack']
                              
                              let bgColor = 'bg-blue-100 text-blue-800'
                              if (mealCategories.includes(category)) {
                                bgColor = 'bg-green-100 text-green-800'
                              } else if (dietaryCategories.includes(category)) {
                                bgColor = 'bg-purple-100 text-purple-800'
                              }
                              
                              return (
                                <span
                                  key={index}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}
                                >
                                  {category}
                                </span>
                              )
                            })
                          ) : (
                            <p className="text-sm text-gray-500 italic">Ingen kategorier endnu. Klik "Rediger" for at tilføje.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Ingredienser og Fremgangsmåde */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-medium text-gray-900">Ingredienser & Fremgangsmåde</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              // Sørg for at ingredienser er sat før modal åbnes
                              setEditedIngredients(selectedRecipe.ingredients || [])
                              setEditingIngredients(true)
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Rediger ingredienser
                          </button>
                          <button
                            onClick={() => {
                              // Sørg for at instruktioner er sat før modal åbnes
                              setEditedInstructions(selectedRecipe.instructions || [])
                              setEditingInstructions(true)
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Rediger fremgangsmåde
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Ingredienser: {selectedRecipe.ingredients?.length || 0} stk</p>
                        <p>Fremgangsmåde: {selectedRecipe.instructions?.length || 0} steps</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {(selectedRecipe.status === 'draft' || selectedRecipe.status === 'scheduled') && (
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => generateAITips(selectedRecipe)}
                          className="bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 text-sm"
                        >
                          🤖 AI Tips
                        </button>
                        {!editingTips && (
                          <button
                            onClick={() => setEditingTips(true)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Rediger
                          </button>
                        )}
                      </div>
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
                          <p className="text-gray-500 italic">Ingen personlige tips endnu. Klik "Rediger" for at tilføje eller "AI Tips" for at generere.</p>
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

                    {/* Nutrition Recalculator */}
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="text-sm font-medium text-yellow-900 mb-2">🧪 Ernæring</h4>
                      <p className="text-xs text-yellow-700 mb-3">
                        Genberegn mikro og makro ernæring baseret på ingredienser
                      </p>
                      <RecipeNutritionRecalculator 
                        recipeId={selectedRecipe.id} 
                        recipeName={selectedRecipe.title}
                      />
                      
                      {/* Ingredient Matches Box */}
                      <div className="mt-4">
                        <IngredientMatchesBox recipeSlug={selectedRecipe.slug} />
                      </div>
                    </div>

                    {/* Slot Scheduler */}
                    <div className="mt-4">
                      <SlotScheduler 
                        recipeId={selectedRecipe.id}
                        recipeTitle={selectedRecipe.title}
                        showNextSlotOnly={true}
                        onSlotAssigned={(slot) => {
                          // Update local state when slot is assigned
                          const updatedRecipes = recipes.map(r => 
                            r.id === selectedRecipe.id 
                              ? { ...r, status: 'scheduled' as const, scheduledDate: new Date(slot.date), scheduledTime: slot.time }
                              : r
                          )
                          setRecipes(updatedRecipes)
                          setSelectedRecipe({ ...selectedRecipe, status: 'scheduled' as const, scheduledDate: new Date(slot.date), scheduledTime: slot.time })
                        }}
                      />
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
                            deleteRecipe(selectedRecipe.slug)
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
                        disabled={!selectedDate || isScheduling}
                        className={`px-4 py-2 rounded-md flex items-center justify-center ${
                          selectedDate && !isScheduling
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isScheduling ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Gemmer...
                          </>
                        ) : scheduleSuccess ? (
                          <>
                            ✅ Gemet!
                          </>
                        ) : (
                          <>
                            💾 Gem planlægning
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedDate 
                          ? `Vil gemme: ${selectedDate} kl. ${selectedTime}`
                          : 'Vælg en dato først'
                        }
                      </p>
                      {scheduleSuccess && (
                        <p className="text-xs text-green-600 mt-1">
                          ✅ Planlægning gemt! Opskriften vil blive udgivet automatisk.
                        </p>
                      )}
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

        {/* Edit Ingredients Modal */}
        {editingIngredients && selectedRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Rediger Ingredienser - {selectedRecipe.title}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingIngredients(false)
                      setEditedIngredients(selectedRecipe.ingredients || [])
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {editedIngredients.map((ingredient, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border border-gray-200 rounded-lg">
                      <div className="col-span-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={(() => {
                            if (ingredient.amount === 0 || ingredient.amount === null || ingredient.amount === undefined) {
                              return ''
                            }
                            const str = String(ingredient.amount)
                            if (str.includes('.')) {
                              return str.replace('.', ',')
                            }
                            return str
                          })()}
                          onChange={(e) => {
                            let value = e.target.value
                            value = value.replace(/[^\d,.]/g, '')
                            const commaIndex = value.indexOf(',')
                            const dotIndex = value.indexOf('.')
                            if (commaIndex !== -1 && dotIndex !== -1) {
                              if (commaIndex < dotIndex) {
                                value = value.replace(/\./g, '')
                              } else {
                                value = value.replace(/,/g, '')
                              }
                            }
                            if (value === '' || value === ',') {
                              const updated = [...editedIngredients]
                              updated[index] = { ...ingredient, amount: 0 }
                              setEditedIngredients(updated)
                              return
                            }
                            const normalizedValue = value.replace(',', '.')
                            const numValue = parseFloat(normalizedValue)
                            if (!isNaN(numValue) && isFinite(numValue)) {
                              const updated = [...editedIngredients]
                              updated[index] = { ...ingredient, amount: numValue }
                              setEditedIngredients(updated)
                            }
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Antal"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={ingredient.unit || ''}
                          onChange={(e) => {
                            const updated = [...editedIngredients]
                            updated[index] = { ...ingredient, unit: e.target.value }
                            setEditedIngredients(updated)
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Enhed"
                        />
                      </div>
                      <div className="col-span-5">
                        <input
                          type="text"
                          value={ingredient.name || ''}
                          onChange={(e) => {
                            const updated = [...editedIngredients]
                            updated[index] = { ...ingredient, name: e.target.value }
                            setEditedIngredients(updated)
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Ingrediens navn"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          value={ingredient.notes || ''}
                          onChange={(e) => {
                            const updated = [...editedIngredients]
                            updated[index] = { ...ingredient, notes: e.target.value }
                            setEditedIngredients(updated)
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Note"
                        />
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => {
                            const updated = editedIngredients.filter((_, i) => i !== index)
                            setEditedIngredients(updated)
                          }}
                          className="w-full p-1 text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditedIngredients([...editedIngredients, { name: '', amount: 0, unit: '', notes: '' }])
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus size={16} />
                    Tilføj ingrediens
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      setEditingIngredients(false)
                      setEditedIngredients(selectedRecipe.ingredients || [])
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={saveIngredients}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Gemmer...' : 'Gem ingredienser'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Instructions Modal */}
        {editingInstructions && selectedRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Rediger Fremgangsmåde - {selectedRecipe.title}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingInstructions(false)
                      setEditedInstructions(selectedRecipe.instructions || [])
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {editedInstructions.map((instruction, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {instruction.stepNumber || index + 1}
                        </div>
                        <div className="flex-1">
                          <textarea
                            rows={3}
                            value={instruction.instruction || ''}
                            onChange={(e) => {
                              const updated = [...editedInstructions]
                              updated[index] = { ...instruction, instruction: e.target.value }
                              setEditedInstructions(updated)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Skriv instruktion..."
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updated = editedInstructions.filter((_, i) => i !== index)
                            // Re-number steps
                            updated.forEach((inst, i) => {
                              inst.stepNumber = i + 1
                            })
                            setEditedInstructions(updated)
                          }}
                          className="flex-shrink-0 p-1 text-red-600 hover:text-red-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const newStep = {
                        stepNumber: editedInstructions.length + 1,
                        instruction: '',
                        time: 0,
                        tips: ''
                      }
                      setEditedInstructions([...editedInstructions, newStep])
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus size={16} />
                    Tilføj step
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      setEditingInstructions(false)
                      setEditedInstructions(selectedRecipe.instructions || [])
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Annuller
                  </button>
                  <button
                    onClick={saveInstructions}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Gemmer...' : 'Gem fremgangsmåde'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  )
}
