'use client'

import { useState } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import {
  normalizeAiRecipeIngredients,
  normalizeAiRecipeInstructions,
} from '@/lib/ai-recipe-ingredient-normalize'
import { flattenRecipeIngredientsForMj } from '@/lib/recipe-ingredients-flatten'

interface RecipeCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

const RECIPE_CATEGORIES: RecipeCategory[] = [
  {
    id: 'familiemad',
    name: 'Kalorietælling',
    description: 'Almindelig familiemad med planlagte kalorier — hele familien',
    icon: '👨‍👩‍👧‍👦',
    color: 'bg-blue-500',
    difficulty: 'Easy'
  },
  {
    id: 'keto',
    name: 'Keto',
    description: 'Lav-kulhydrat, høj-fedt retter for ketose',
    icon: '🥑',
    color: 'bg-green-500',
    difficulty: 'Medium'
  },
  {
    id: 'sense',
    name: 'Sense',
    description: 'Spisekasse med håndfulde: grønt, protein, stivelse/frugt og fedt — uden kalorietælling',
    icon: '✋',
    color: 'bg-purple-500',
    difficulty: 'Easy'
  },
  {
    id: 'glp1',
    name: 'GLP-1 kost',
    description: 'Mættende retter med protein, fibre og sunde fedtstoffer',
    icon: '🧠',
    color: 'bg-cyan-500',
    difficulty: 'Medium'
  },
  {
    id: 'antiinflammatorisk',
    name: 'Antiinflammatorisk',
    description: 'Retter der bekæmper inflammation i kroppen',
    icon: '🌿',
    color: 'bg-emerald-500',
    difficulty: 'Medium'
  },
  {
    id: 'fleksitarisk',
    name: 'Fleksitarisk',
    description: 'Primært plantebaseret med mulighed for kød',
    icon: '🌱',
    color: 'bg-teal-500',
    difficulty: 'Easy'
  },
  {
    id: '5-2',
    name: '5:2 Faste',
    description: 'Vælg fastedag (2\'er, ~500 kcal) eller spisedag (5\'er)',
    icon: '⏰',
    color: 'bg-indigo-500',
    difficulty: 'Hard'
  },
  {
    id: 'proteinrig-kost',
    name: 'Proteinrig kost',
    description: 'Proteinrige opskrifter til optimal næring',
    icon: '💪',
    color: 'bg-red-500',
    difficulty: 'Hard'
  }
]

interface GeneratedRecipe {
  title: string
  description: string
  ingredients: Array<{
    name: string
    amount: number
    unit: string
    notes?: string
  }>
  /** Sense: gruppeoversigt — skal have samme antal linjer som den flade ingrediensliste. */
  ingredientGroups?: Array<{
    id?: string
    name: string
    ingredients: Array<{ id?: string; name: string; amount: number; unit: string; notes?: string }>
  }>
  instructions: Array<{
    stepNumber: number
    instruction: string
    time?: number
    tips?: string
  }>
  servings: number
  prepTime: number
  cookTime: number
  difficulty: string
  dietaryCategories: string[]
  nutritionalInfo: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  imageUrl?: string
}

interface FamiliemadParameters {
  onePot: number // 0-3
  stivelsesKlassiker: number // 0-3
  mereGront: number // 0-3
  bornefavorit: number // 0-3
  maxTid: 15 | 30 | 45 | null // minutes
  recipeType?: string // Predefined recipe type (burger, pizza, etc.)
  inspiration?: string // Free text inspiration (e.g., "børneversion af burger")
}

interface KetoParameters {
  proteinFokus: number // 0-3
  fedtIndhold: number // 0-3
  kulhydratStrikthed: number // 0-3
  hovedingrediens?: string // 'rodt-kod', 'fjaerkrae', 'fisk', 'vegetarisk', 'non-dairy'
  recipeType?: string // Predefined recipe type (burger, pizza, etc.)
  inspiration?: string // Free text inspiration
  maxTid?: 15 | 30 | 45 | null // minutes
  kompleksitet: number // 0-3
  maaltid: string // 'morgenmad', 'frokost', 'aftensmad', 'dessert', 'snacks'
}

interface ProteinrigParameters {
  maaltid: 'morgenmad' | 'frokost' | 'aftensmad' | 'snacks'
  proteinKilde: 'frit-valg' | 'kylling' | 'kalkun' | 'fisk' | 'æg' | 'oksekød' | 'svinekød' | 'vegetarisk'
  recipeType?: string
  inspiration?: string
}

interface Glp1Parameters {
  maaltid: 'morgenmad' | 'frokost' | 'aftensmad' | 'snacks'
  proteinKilde: 'frit-valg' | 'kylling' | 'fisk' | 'æg' | 'vegetarisk'
  fiberFokus: 0 | 1 | 2 | 3
  maethedsProfil: 0 | 1 | 2 | 3
  recipeType?: string
  inspiration?: string
}

/** Matcher `generate-recipe-sense` API (stivelse = 0–1 håndfuld i prompten). */
interface SenseParameters {
  maaltid: 'morgenmad' | 'frokost' | 'aftensmad' | 'snacks'
  stivelse: 'ingen' | 'standard' | 'ekstra'
  recipeType?: string
  inspiration?: string
}

/** 5:2 diæt — 2'er = fastedage (~500 kcal), 5'er = spisedage (normal/varieret kost) */
interface FiveTwoParameters {
  dayType: '5' | '2'
}

export default function CreateRecipePage() {
  const { isAdmin, checking } = useAdminAuth()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editableRecipe, setEditableRecipe] = useState<GeneratedRecipe | null>(null)
  const [recipeStatus, setRecipeStatus] = useState<'ai-preview' | 'ready-to-save' | 'saved'>('ai-preview')
  const [midjourneyPrompt, setMidjourneyPrompt] = useState<string>('')
  const [midjourneyPromptSource, setMidjourneyPromptSource] = useState<string>('')
  const [midjourneyPromptError, setMidjourneyPromptError] = useState<string>('')
  const [midjourneyLoading, setMidjourneyLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [aiTips, setAiTips] = useState<string>('')
  const [ingredientAmountDrafts, setIngredientAmountDrafts] = useState<Record<number, string>>({})
  const [isDragging, setIsDragging] = useState(false)
  
  // Familiemad parameter state
  const [showFamiliemadModal, setShowFamiliemadModal] = useState(false)
  const [familiemadParams, setFamiliemadParams] = useState<FamiliemadParameters>({
    onePot: 1,
    stivelsesKlassiker: 2,
    mereGront: 1,
    bornefavorit: 2,
    maxTid: null,
    recipeType: '',
    inspiration: ''
  })

  // Keto parameter state
  const [showKetoModal, setShowKetoModal] = useState(false)
  const [ketoParams, setKetoParams] = useState<KetoParameters>({
    proteinFokus: 1,
    fedtIndhold: 2,
    kulhydratStrikthed: 1,
    hovedingrediens: '',
    recipeType: '',
    inspiration: '',
    maxTid: null,
    kompleksitet: 1,
    maaltid: 'aftensmad'
  })

  const [show52Modal, setShow52Modal] = useState(false)
  const [showProteinrigModal, setShowProteinrigModal] = useState(false)
  const [showSenseModal, setShowSenseModal] = useState(false)
  const [showGlp1Modal, setShowGlp1Modal] = useState(false)
  const [fiveTwoParams, setFiveTwoParams] = useState<FiveTwoParameters>({ dayType: '2' })
  const [proteinrigParams, setProteinrigParams] = useState<ProteinrigParameters>({
    maaltid: 'aftensmad',
    proteinKilde: 'frit-valg',
    recipeType: '',
    inspiration: '',
  })
  const [glp1Params, setGlp1Params] = useState<Glp1Parameters>({
    maaltid: 'aftensmad',
    proteinKilde: 'frit-valg',
    fiberFokus: 2,
    maethedsProfil: 2,
    recipeType: '',
    inspiration: '',
  })
  const [senseParams, setSenseParams] = useState<SenseParameters>({
    maaltid: 'aftensmad',
    stivelse: 'standard',
    recipeType: '',
    inspiration: '',
  })

  // Redirect if not admin
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Tjekker admin adgang...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Adgang nægtet</h1>
          <p className="text-gray-600">Du har ikke adgang til denne side.</p>
        </div>
      </div>
    )
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setGeneratedRecipe(null)
    setError(null)
    
    // Show parameter modal for familiemad
    if (categoryId === 'familiemad') {
      setShowFamiliemadModal(true)
    }
    
    // Show parameter modal for keto
    if (categoryId === 'keto') {
      setShowKetoModal(true)
    }

    if (categoryId === '5-2') {
      setShow52Modal(true)
    }

    if (categoryId === 'proteinrig-kost') {
      setShowProteinrigModal(true)
    }

    if (categoryId === 'glp1') {
      setShowGlp1Modal(true)
    }

    if (categoryId === 'sense') {
      setShowSenseModal(true)
    }
  }
  
  const handleFamiliemadGenerate = () => {
    setShowFamiliemadModal(false)
    handleGenerateRecipe()
  }

  const handleKetoGenerate = () => {
    setShowKetoModal(false)
    handleGenerateRecipe()
  }

  const handle52Generate = () => {
    setShow52Modal(false)
    handleGenerateRecipe()
  }

  const handleProteinrigGenerate = () => {
    setShowProteinrigModal(false)
    handleGenerateRecipe()
  }

  const handleGlp1Generate = () => {
    setShowGlp1Modal(false)
    handleGenerateRecipe()
  }

  const handleSenseGenerate = () => {
    setShowSenseModal(false)
    handleGenerateRecipe()
  }

  const handleGenerateRecipe = async () => {
    if (!selectedCategory) return

    setIsGenerating(true)
    setError(null)
    setProgress('Initialiserer...')
    setMidjourneyPrompt('') // Clear previous prompt
    setMidjourneyPromptSource('')
    setMidjourneyPromptError('')

    try {
      const category = RECIPE_CATEGORIES.find(c => c.id === selectedCategory)
      if (!category) throw new Error('Kategori ikke fundet')

      setProgress('Tjekker eksisterende opskrifter...')
      
      // Check existing recipes in batches to respect Supabase limit
      const existingRecipes = await loadExistingRecipes()
      
      setProgress(`Genererer ${category.name} opskrift med dedikeret AI assistent...`)
      
      // Prepare request body
      const requestBody: any = {
        categoryName: category.name,
        existingRecipes: existingRecipes
      }
      
      // Add parameters for familiemad
      if (selectedCategory === 'familiemad') {
        requestBody.parameters = familiemadParams
      }
      
      // Add parameters for keto
      if (selectedCategory === 'keto') {
        requestBody.parameters = ketoParams
      }

      if (selectedCategory === '5-2') {
        requestBody.parameters = fiveTwoParams
      }

      if (selectedCategory === 'proteinrig-kost') {
        requestBody.parameters = proteinrigParams
      }

      if (selectedCategory === 'glp1') {
        requestBody.parameters = glp1Params
      }

      if (selectedCategory === 'sense') {
        requestBody.parameters = senseParams
      }
      
      // Generate new recipe using category-specific ChatGPT assistant
      const generateResponse = await fetch(`/api/admin/generate-recipe-${selectedCategory}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json()
        const genMsg = errorData.error || 'Fejl ved generering af opskrift'
        const genDet = typeof errorData.details === 'string' ? errorData.details : ''
        throw new Error(
          genDet && genDet !== genMsg ? `${genMsg} (${genDet})` : genMsg
        )
      }

      const recipeData = await generateResponse.json()

      setMidjourneyPrompt(
        typeof recipeData.midjourneyPrompt === 'string' ? recipeData.midjourneyPrompt : ''
      )
      setMidjourneyPromptSource(
        typeof recipeData.midjourneyPromptSource === 'string' ? recipeData.midjourneyPromptSource : ''
      )
      setMidjourneyPromptError(
        typeof recipeData.midjourneyPromptError === 'string' ? recipeData.midjourneyPromptError : ''
      )

      // Store AI tips if available
      if (recipeData.aiTips) {
        setAiTips(recipeData.aiTips)
      }
      
      setProgress('Validerer opskrift...')

      const mergedForNormalize = flattenRecipeIngredientsForMj(recipeData.recipe)
      const rawIngredients = Array.isArray(mergedForNormalize.ingredients)
        ? (mergedForNormalize.ingredients as GeneratedRecipe['ingredients'])
        : []

      const normalizedRecipe = {
        ...recipeData.recipe,
        ingredients: normalizeAiRecipeIngredients(rawIngredients),
        instructions: normalizeAiRecipeInstructions(recipeData.recipe?.instructions || []),
      }

      if (!String(recipeData.midjourneyPrompt || '').trim()) {
        setProgress('Henter Midjourney-prompt...')
        try {
          const mjRes = await fetch('/api/admin/recipe-midjourney-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipe: normalizedRecipe }),
          })
          if (mjRes.ok) {
            const mj = await mjRes.json()
            if (typeof mj.midjourneyPrompt === 'string' && mj.midjourneyPrompt.trim()) {
              setMidjourneyPrompt(mj.midjourneyPrompt)
              setMidjourneyPromptSource(
                typeof mj.midjourneyPromptSource === 'string' ? mj.midjourneyPromptSource : ''
              )
              setMidjourneyPromptError(
                typeof mj.midjourneyPromptError === 'string' ? mj.midjourneyPromptError : ''
              )
            }
          }
        } catch (mjFetchErr) {
          console.warn('Midjourney fallback fetch fejlede:', mjFetchErr)
        }
        setProgress('Validerer opskrift...')
      }

      // Validate recipe
      const validateResponse = await fetch('/api/admin/validate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe: normalizedRecipe
        })
      })

      if (!validateResponse.ok) {
        const errorData = await validateResponse.json()
        throw new Error(errorData.error || 'Validering fejlede')
      }

      const validationData = await validateResponse.json()
      
      if (!validationData.isValid) {
        const r = Array.isArray(validationData.reasons) ? validationData.reasons.filter(Boolean) : []
        const s = Array.isArray(validationData.suggestions) ? validationData.suggestions.filter(Boolean) : []
        const reasonPart = r.length ? r.join('; ') : 'ingen detaljer fra validering'
        const sugPart = s.length ? ` Forslag: ${s.join('; ')}.` : ''
        throw new Error(`Validering fejlede: ${reasonPart}.${sugPart}`)
      }

      setProgress('Opskrift genereret!')
      
      const finalRecipe = {
        ...normalizedRecipe,
        imageUrl: '/images/recipe-placeholder.jpg' // Placeholder - upload billede manuelt
      }

      // Set as AI-kladde for editing
      setGeneratedRecipe(finalRecipe)
      setEditableRecipe({ ...finalRecipe })
      setIngredientAmountDrafts({})
      setIsEditing(true)

      setProgress('Færdig! AI-kladde klar til redigering')
      
    } catch (error) {
      console.error('Error generating recipe:', error)
      setError(error instanceof Error ? error.message : 'Ukendt fejl')
    } finally {
      setIsGenerating(false)
      setProgress('')
    }
  }

  const handleRefreshMidjourneyPrompt = async () => {
    const source = editableRecipe ?? generatedRecipe
    if (!source) return
    setMidjourneyLoading(true)
    setMidjourneyPromptError('')
    try {
      const merged = flattenRecipeIngredientsForMj(source)
      const raw = Array.isArray(merged.ingredients)
        ? (merged.ingredients as GeneratedRecipe['ingredients'])
        : []
      const payload = {
        ...source,
        ingredients: normalizeAiRecipeIngredients(raw),
        instructions: normalizeAiRecipeInstructions(source.instructions || []),
      }
      const mjRes = await fetch('/api/admin/recipe-midjourney-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe: payload }),
      })
      if (!mjRes.ok) {
        const err = await mjRes.json().catch(() => ({}))
        throw new Error(err.error || 'Kunne ikke generere Midjourney-prompt')
      }
      const mj = await mjRes.json()
      setMidjourneyPrompt(typeof mj.midjourneyPrompt === 'string' ? mj.midjourneyPrompt : '')
      setMidjourneyPromptSource(
        typeof mj.midjourneyPromptSource === 'string' ? mj.midjourneyPromptSource : ''
      )
      setMidjourneyPromptError(
        typeof mj.midjourneyPromptError === 'string' ? mj.midjourneyPromptError : ''
      )
    } catch (e) {
      setMidjourneyPromptError(e instanceof Error ? e.message : 'Midjourney-prompt fejlede')
    } finally {
      setMidjourneyLoading(false)
    }
  }

  const loadExistingRecipes = async () => {
    const allRecipes = []
    let page = 0
    const limit = 1000 // Supabase limit
    
    while (true) {
      const response = await fetch(`/api/admin/recipes?page=${page}&limit=${limit}`)
      const data = await response.json()
      
      if (!data.recipes || data.recipes.length === 0) break
      
      allRecipes.push(...data.recipes)
      page++
      
      if (data.recipes.length < limit) break // No more data
    }
    
    return allRecipes
  }

  const handleSaveRecipe = async () => {
    if (!editableRecipe) return
    if (savingDraft) return

    // Check if image is uploaded
    if (recipeStatus !== 'ready-to-save') {
      alert('⚠️ Du skal uploade et billede før opskriften kan gemmes som kladde')
      return
    }

    try {
      setSavingDraft(true)
      setProgress('Gemmer AI-kladde som rigtig kladde...')
      
      const response = await fetch('/api/admin/save-ai-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipe: editableRecipe,
          category: selectedCategory,
          aiTips: aiTips
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = errorData.error || 'Fejl ved gemning'
        const det = typeof errorData.details === 'string' ? errorData.details : ''
        throw new Error(det && det !== msg ? `${msg} — ${det}` : msg)
      }

      alert(
        '✅ Opskriften er gemt og sat i udgivelseskøen (planlagt).\n\n' +
          'På Publishing-siden: vælg fanen «Planlagte» eller «Alle» — standardfilter er «Udgivne», så nye opskrifter skjules dér.'
      )
      setGeneratedRecipe(null)
      setEditableRecipe(null)
      setIsEditing(false)
      setSelectedCategory(null)
      setRecipeStatus('saved')
      
    } catch (error) {
      console.error('Error saving recipe:', error)
      setError(error instanceof Error ? error.message : 'Fejl ved gemning')
    } finally {
      setSavingDraft(false)
      setProgress('')
    }
  }

  const handleEditRecipe = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditableRecipe(generatedRecipe)
    setIngredientAmountDrafts({})
  }

  const handleUpdateEditableRecipe = (field: string, value: any) => {
    if (!editableRecipe) return
    
    setEditableRecipe(prev => {
      if (!prev) return null
      
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        const parentValue = prev[parent as keyof GeneratedRecipe] as any
        return {
          ...prev,
          [parent]: {
            ...(parentValue || {}),
            [child]: value
          }
        }
      }
      
      return {
        ...prev,
        [field]: value
      }
    })
  }

  const handleUpdateIngredient = (index: number, field: string, value: any) => {
    if (!editableRecipe) return
    
    setEditableRecipe(prev => {
      if (!prev) return null
      
      const newIngredients = [...prev.ingredients]
      newIngredients[index] = {
        ...newIngredients[index],
        [field]: value
      }
      
      return {
        ...prev,
        ingredients: newIngredients
      }
    })
  }

  const handleAddIngredient = () => {
    if (!editableRecipe) return

    setEditableRecipe(prev => {
      if (!prev) return null

      return {
        ...prev,
        ingredients: [
          ...(prev.ingredients || []),
          {
            name: '',
            amount: 1,
            unit: 'stk',
            notes: ''
          }
        ]
      }
    })
  }

  const handleUpdateInstruction = (index: number, field: string, value: any) => {
    if (!editableRecipe) return
    
    setEditableRecipe(prev => {
      if (!prev) return null
      
      const newInstructions = [...prev.instructions]
      newInstructions[index] = {
        ...newInstructions[index],
        [field]: value
      }
      
      return {
        ...prev,
        instructions: newInstructions
      }
    })
  }

  const handleAddInstruction = () => {
    if (!editableRecipe) return

    setEditableRecipe(prev => {
      if (!prev) return null

      const nextStepNumber =
        (prev.instructions || []).reduce((max, step) => Math.max(max, step?.stepNumber || 0), 0) + 1

      return {
        ...prev,
        instructions: [
          ...(prev.instructions || []),
          {
            stepNumber: nextStepNumber,
            instruction: '',
            time: undefined,
            tips: ''
          }
        ]
      }
    })
  }

  const processImageFile = async (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Filen skal være et billede')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Filen er for stor (max 5MB)')
      return
    }

    try {
      setProgress('Uploader billede...')
      
      const formData = new FormData()
      formData.append('image', file)
      formData.append('recipeId', 'temp-' + Date.now()) // Temporary ID for upload

      const response = await fetch('/api/admin/upload-recipe-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload fejlede')
      }

      const data = await response.json()
      
      // Update editable recipe with new image URL
      setEditableRecipe(prev => prev ? {
        ...prev,
        imageUrl: data.imageUrl
      } : null)

      // Update status to ready-to-save when image is uploaded
      setRecipeStatus('ready-to-save')

      setProgress('Billede uploadet! Opskrift klar til at gemmes')
      setTimeout(() => setProgress(''), 3000)

    } catch (error: any) {
      console.error('Image upload error:', error)
      alert(`Fejl ved upload: ${error.message}`)
      setProgress('')
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processImageFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processImageFile(file)
    }
  }

  return (
    <>
      {/* Familiemad Parameter Modal */}
      {showFamiliemadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  👨‍👩‍👧‍👦 Tilpas kalorietælling-opskrift
                </h2>
                <button
                  onClick={() => {
                    setShowFamiliemadModal(false)
                    setSelectedCategory(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-gray-600 mb-6">
                Juster parametrene for at styre hvilken type familiemad/kalorietælling-opskrift der genereres (samme motor som før). 
                Du kan også ignorere dette og bruge standardværdier.
              </p>
              
              <div className="space-y-6">
                {/* One-pot / Gryde-agtigt */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      One-pot / Gryde-agtigt
                    </label>
                    <span className="text-sm text-gray-500">{familiemadParams.onePot}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={familiemadParams.onePot}
                    onChange={(e) => setFamiliemadParams(prev => ({ ...prev, onePot: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0: Klassisk med flere elementer</span>
                    <span>3: Alt i én gryde/pande</span>
                  </div>
                </div>
                
                {/* Pasta/Ris/Kartoffel-klassiker */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Pasta/Ris/Kartoffel-klassiker
                    </label>
                    <span className="text-sm text-gray-500">{familiemadParams.stivelsesKlassiker}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={familiemadParams.stivelsesKlassiker}
                    onChange={(e) => setFamiliemadParams(prev => ({ ...prev, stivelsesKlassiker: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0: Undgå stivelses-base</span>
                    <span>3: Tydelig klassiker med pasta/ris/kartofler</span>
                  </div>
                </div>
                
                {/* Mere grønt */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Mere grønt (uden at blive salat)
                    </label>
                    <span className="text-sm text-gray-500">{familiemadParams.mereGront}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={familiemadParams.mereGront}
                    onChange={(e) => setFamiliemadParams(prev => ({ ...prev, mereGront: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1 text-xs text-gray-500 mt-1">
                    <span className="text-center">0: Helt uden</span>
                    <span className="text-center">1: Normalt</span>
                    <span className="text-center">2: Mere</span>
                    <span className="text-center">3: Meget mere</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {familiemadParams.mereGront === 0 && 'Ingen grøntsager - kun protein og kulhydrat (pasta/ris/kartofler)'}
                    {familiemadParams.mereGront === 1 && 'Kun traditionelle grøntsager for retten'}
                    {familiemadParams.mereGront === 2 && 'Flere grøntsager integreret i retten'}
                    {familiemadParams.mereGront === 3 && 'Ekstra grøntsager integreret i sauce/fars/gryde'}
                  </p>
                </div>
                
                {/* Børnefavorit / Comfort-klassiker */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Børnefavorit / Comfort-klassiker
                    </label>
                    <span className="text-sm text-gray-500">{familiemadParams.bornefavorit}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={familiemadParams.bornefavorit}
                    onChange={(e) => setFamiliemadParams(prev => ({ ...prev, bornefavorit: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0: Mere neutralt/varieret</span>
                    <span>3: Sikker vinder-profil</span>
                  </div>
                </div>
                
                {/* Tid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimal tid
                  </label>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setFamiliemadParams(prev => ({ ...prev, maxTid: null }))}
                      className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                        familiemadParams.maxTid == null
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Ingen maks
                    </button>
                    {[15, 30, 45].map((time) => (
                      <button
                        key={time}
                        onClick={() => setFamiliemadParams(prev => ({ ...prev, maxTid: time as 15 | 30 | 45 }))}
                        className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                          familiemadParams.maxTid === time
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {time} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ret-type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ret-type (valgfrit)
                  </label>
                  <select
                    value={familiemadParams.recipeType || ''}
                    onChange={(e) => setFamiliemadParams(prev => ({ ...prev, recipeType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Frit valg</option>
                    <option value="burger">Burger</option>
                    <option value="pizza">Pizza</option>
                    <option value="taco">Taco</option>
                    <option value="lasagne">Lasagne</option>
                    <option value="pasta-bolognese">Pasta bolognese</option>
                    <option value="pasta-carbonara">Pasta carbonara</option>
                    <option value="pasta-med-kylling">Pasta med kylling</option>
                    <option value="risotto">Risotto</option>
                    <option value="kylling-i-karry">Kylling i karry</option>
                    <option value="boller-i-karry">Boller i karry</option>
                    <option value="frikadeller">Frikadeller</option>
                    <option value="hakkebof">Hakkebøf</option>
                    <option value="fiskefilet">Fiskefilet</option>
                    <option value="ovnbagt-kylling">Ovnbagt kylling</option>
                    <option value="gryderet">Gryderet</option>
                    <option value="one-pot">One-pot ret</option>
                    <option value="wraps">Wraps</option>
                    <option value="suppe">Suppe</option>
                    <option value="bowl">Bowl</option>
                    <option value="omelet">Omelet</option>
                    <option value="mac-and-cheese">Mac and cheese</option>
                    <option value="pastasalat">Pastasalat</option>
                    <option value="kyllingesalat">Kyllingesalat</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Vælg en specifik ret-type, eller lad stå tomt for frit valg
                  </p>
                </div>

                {/* Inspiration (fritekst) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspiration (valgfrit)
                  </label>
                  <input
                    type="text"
                    value={familiemadParams.inspiration || ''}
                    onChange={(e) => setFamiliemadParams(prev => ({ ...prev, inspiration: e.target.value }))}
                    placeholder="fx. 'børneversion af burger' eller 'børnevenlig pizza'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Skriv fritekst inspiration for opskriften (fx. "børneversion af burger")
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowFamiliemadModal(false)
                    setSelectedCategory(null)
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={handleFamiliemadGenerate}
                  disabled={isGenerating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Genererer...' : '🤖 Generer Opskrift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keto Parameter Modal */}
      {showKetoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  🥑 Tilpas Keto Opskrift
                </h2>
                <button
                  onClick={() => {
                    setShowKetoModal(false)
                    setSelectedCategory(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-gray-600 mb-6">
                Juster parametrene for at styre hvilken type keto opskrift der genereres. 
                Du kan også ignorere dette og bruge standardværdier.
              </p>
              
              <div className="space-y-6">
                {/* Protein-fokus */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Protein-fokus
                    </label>
                    <span className="text-sm text-gray-500">{ketoParams.proteinFokus}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={ketoParams.proteinFokus}
                    onChange={(e) => setKetoParams(prev => ({ ...prev, proteinFokus: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1 text-xs text-gray-500 mt-1">
                    <span className="text-center">0: Lav</span>
                    <span className="text-center">1: Moderat</span>
                    <span className="text-center">2: Høj</span>
                    <span className="text-center">3: Meget høj</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {ketoParams.proteinFokus === 0 && 'Fokus på fedt som primær energikilde'}
                    {ketoParams.proteinFokus === 1 && 'Standard keto balance (20-25% protein)'}
                    {ketoParams.proteinFokus === 2 && 'Moderat til høj protein'}
                    {ketoParams.proteinFokus === 3 && 'Protein-rig keto ret'}
                  </p>
                </div>

                {/* Fedt-indhold */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Fedt-indhold
                    </label>
                    <span className="text-sm text-gray-500">{ketoParams.fedtIndhold}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={ketoParams.fedtIndhold}
                    onChange={(e) => setKetoParams(prev => ({ ...prev, fedtIndhold: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1 text-xs text-gray-500 mt-1">
                    <span className="text-center">0: Moderat</span>
                    <span className="text-center">1: Høj</span>
                    <span className="text-center">2: Meget høj</span>
                    <span className="text-center">3: Fat-bomb</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {ketoParams.fedtIndhold === 0 && 'Standard keto (70-75% fedt)'}
                    {ketoParams.fedtIndhold === 1 && 'Moderat til høj fedt'}
                    {ketoParams.fedtIndhold === 2 && 'Klassisk keto (75-80% fedt)'}
                    {ketoParams.fedtIndhold === 3 && 'Fat-bomb stil - meget høj fedt'}
                  </p>
                </div>

                {/* Kulhydrat-strikthed */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Kulhydrat-strikthed
                    </label>
                    <span className="text-sm text-gray-500">{ketoParams.kulhydratStrikthed}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={ketoParams.kulhydratStrikthed}
                    onChange={(e) => setKetoParams(prev => ({ ...prev, kulhydratStrikthed: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1 text-xs text-gray-500 mt-1">
                    <span className="text-center">0: Meget strikt</span>
                    <span className="text-center">1: Standard</span>
                    <span className="text-center">2: Standard</span>
                    <span className="text-center">3: Fleksibel</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {ketoParams.kulhydratStrikthed === 0 && 'Maks 10g netto kulhydrater'}
                    {ketoParams.kulhydratStrikthed === 1 && 'Maks 20g netto kulhydrater (standard keto)'}
                    {ketoParams.kulhydratStrikthed === 2 && 'Maks 20g netto kulhydrater (standard keto)'}
                    {ketoParams.kulhydratStrikthed === 3 && 'Op til 25g netto kulhydrater'}
                  </p>
                </div>

                {/* Hovedingrediens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hovedingrediens
                  </label>
                  <select
                    value={ketoParams.hovedingrediens || ''}
                    onChange={(e) => setKetoParams(prev => ({ ...prev, hovedingrediens: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Frit valg</option>
                    <option value="rodt-kod">Rødt kød (okse/svin — lam kun sjældent)</option>
                    <option value="fjaerkrae">Fjerkræ (80% kylling, kalkun, and)</option>
                    <option value="fisk">Fisk (laks, makrel, tun)</option>
                    <option value="vegetarisk">Vegetarisk</option>
                    <option value="non-dairy">Non-dairy (ingen mælkeprodukter)</option>
                  </select>
                </div>

                {/* Ret-type Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ret-type (valgfrit)
                  </label>
                  <select
                    value={ketoParams.recipeType || ''}
                    onChange={(e) => setKetoParams(prev => ({ ...prev, recipeType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Frit valg</option>
                    <option value="burger">Burger</option>
                    <option value="pizza">Pizza</option>
                    <option value="taco">Taco</option>
                    <option value="lasagne">Lasagne</option>
                    <option value="pasta-bolognese">Pasta bolognese</option>
                    <option value="pasta-carbonara">Pasta carbonara</option>
                    <option value="pasta-med-kylling">Pasta med kylling</option>
                    <option value="risotto">Risotto</option>
                    <option value="kylling-i-karry">Kylling i karry</option>
                    <option value="boller-i-karry">Boller i karry</option>
                    <option value="frikadeller">Frikadeller</option>
                    <option value="hakkebof">Hakkebøf</option>
                    <option value="fiskefilet">Fiskefilet</option>
                    <option value="ovnbagt-kylling">Ovnbagt kylling</option>
                    <option value="gryderet">Gryderet</option>
                    <option value="one-pot">One-pot ret</option>
                    <option value="wraps">Wraps</option>
                    <option value="suppe">Suppe</option>
                    <option value="bowl">Bowl</option>
                    <option value="omelet">Omelet</option>
                    <option value="mac-and-cheese">Mac and cheese</option>
                    <option value="pastasalat">Pastasalat</option>
                    <option value="kyllingesalat">Kyllingesalat</option>
                  </select>
                </div>

                {/* Inspiration (fritekst) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inspiration (valgfrit)
                  </label>
                  <input
                    type="text"
                    value={ketoParams.inspiration || ''}
                    onChange={(e) => setKetoParams(prev => ({ ...prev, inspiration: e.target.value }))}
                    placeholder="fx. 'keto version af burger' eller 'keto dessert'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Tid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimal tid
                  </label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <button
                      onClick={() => setKetoParams(prev => ({ ...prev, maxTid: null }))}
                      className={`py-2 px-4 rounded-lg transition-colors ${
                        ketoParams.maxTid == null
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Ingen maks
                    </button>
                    {[15, 30, 45].map((time) => (
                      <button
                        key={time}
                        onClick={() => setKetoParams(prev => ({ ...prev, maxTid: time as 15 | 30 | 45 }))}
                        className={`py-2 px-4 rounded-lg transition-colors ${
                          ketoParams.maxTid === time
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {time} min
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Vælg kun tid hvis opskriften skal holdes inden for en bestemt ramme. Ellers kan AI gerne foreslå retter, der tager længere tid.
                  </p>
                </div>

                {/* Kompleksitet */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Kompleksitet
                    </label>
                    <span className="text-sm text-gray-500">{ketoParams.kompleksitet}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={ketoParams.kompleksitet}
                    onChange={(e) => setKetoParams(prev => ({ ...prev, kompleksitet: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1 text-xs text-gray-500 mt-1">
                    <span className="text-center">0: Enkel</span>
                    <span className="text-center">1: Mellem</span>
                    <span className="text-center">2: Kompleks</span>
                    <span className="text-center">3: Meget kompleks</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {ketoParams.kompleksitet === 0 && 'Få ingredienser (5-7), simple steps (4-5)'}
                    {ketoParams.kompleksitet === 1 && 'Standard (7-9 ingredienser, 5-7 steps)'}
                    {ketoParams.kompleksitet === 2 && 'Flere ingredienser (8-10, 6-8 steps)'}
                    {ketoParams.kompleksitet === 3 && 'Mange ingredienser (10+, 7-10 steps)'}
                  </p>
                </div>

                {/* Måltid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Måltid
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['morgenmad', 'frokost', 'aftensmad', 'dessert', 'snacks'].map((maaltid) => (
                      <button
                        key={maaltid}
                        onClick={() => setKetoParams(prev => ({ ...prev, maaltid }))}
                        className={`py-2 px-3 rounded-lg transition-colors text-sm ${
                          ketoParams.maaltid === maaltid
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {maaltid.charAt(0).toUpperCase() + maaltid.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowKetoModal(false)
                    setSelectedCategory(null)
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={handleKetoGenerate}
                  disabled={isGenerating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Genererer...' : '🤖 Generer Opskrift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proteinrig Parameter Modal */}
      {showProteinrigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">💪 Tilpas Proteinrig kost</h2>
                <button
                  onClick={() => {
                    setShowProteinrigModal(false)
                    setSelectedCategory(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Vælg retning for den proteinrige opskrift, fx måltidstype, primær proteinkilde og ret-type.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Måltid</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['morgenmad', 'frokost', 'aftensmad', 'snacks'].map((maaltid) => (
                      <button
                        key={maaltid}
                        onClick={() => setProteinrigParams((prev) => ({ ...prev, maaltid: maaltid as ProteinrigParameters['maaltid'] }))}
                        className={`py-2 px-3 rounded-lg transition-colors text-sm ${
                          proteinrigParams.maaltid === maaltid
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {maaltid.charAt(0).toUpperCase() + maaltid.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primær proteinkilde</label>
                  <select
                    value={proteinrigParams.proteinKilde}
                    onChange={(e) => setProteinrigParams((prev) => ({ ...prev, proteinKilde: e.target.value as ProteinrigParameters['proteinKilde'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="frit-valg">Frit valg</option>
                    <option value="kylling">Kylling</option>
                    <option value="kalkun">Kalkun</option>
                    <option value="fisk">Fisk/skaldyr</option>
                    <option value="æg">Æg</option>
                    <option value="oksekød">Oksekød</option>
                    <option value="svinekød">Svinekød</option>
                    <option value="vegetarisk">Vegetarisk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ret-type (valgfrit)</label>
                  <select
                    value={proteinrigParams.recipeType || ''}
                    onChange={(e) => setProteinrigParams((prev) => ({ ...prev, recipeType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Frit valg</option>
                    <option value="lasagne">Lasagne</option>
                    <option value="gryderet">Gryderet</option>
                    <option value="suppe">Suppe</option>
                    <option value="bowl">Bowl</option>
                    <option value="ovnret">Ovnret</option>
                    <option value="salat">Salat</option>
                    <option value="wraps">Wraps</option>
                    <option value="frikadeller">Frikadeller</option>
                    <option value="pastasalat">Pastasalat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inspiration (valgfrit)</label>
                  <input
                    type="text"
                    value={proteinrigParams.inspiration || ''}
                    onChange={(e) => setProteinrigParams((prev) => ({ ...prev, inspiration: e.target.value }))}
                    placeholder="fx. 'proteinrig lasagne med grønt' eller 'hurtig frokost bowl'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowProteinrigModal(false)
                    setSelectedCategory(null)
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={handleProteinrigGenerate}
                  disabled={isGenerating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Genererer...' : '🤖 Generer Opskrift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sense Parameter Modal */}
      {showSenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">✋ Tilpas Sense</h2>
                <button
                  onClick={() => {
                    setShowSenseModal(false)
                    setSelectedCategory(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Sense handler om spisekassen (håndfulde), mæthed og 2–3 måltider — ikke kalorietælling. Vælg måltid og hvor
                &quot;tung&quot; stivelsesdelen skal være i prompten.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Måltid</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['morgenmad', 'frokost', 'aftensmad', 'snacks'] as const).map((maaltid) => (
                      <button
                        key={maaltid}
                        type="button"
                        onClick={() => setSenseParams((prev) => ({ ...prev, maaltid }))}
                        className={`py-2 px-3 rounded-lg transition-colors text-sm ${
                          senseParams.maaltid === maaltid
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {maaltid.charAt(0).toUpperCase() + maaltid.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stivelse i retten (prompt)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'ingen' as const, label: 'Minimal / ingen', sub: 'Ekstra grønt, evt. bælgfrugt' },
                        { id: 'standard' as const, label: 'Standard Sense', sub: '0–1 håndfuld som passer' },
                        { id: 'ekstra' as const, label: 'Mere stivelse', sub: 'Sultne dage / motion' },
                      ] as const
                    ).map(({ id, label, sub }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSenseParams((prev) => ({ ...prev, stivelse: id }))}
                        className={`py-3 px-3 rounded-lg text-left text-sm transition-colors ${
                          senseParams.stivelse === id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="font-medium block">{label}</span>
                        <span className={`block text-xs mt-1 ${senseParams.stivelse === id ? 'text-white/90' : 'text-gray-500'}`}>
                          {sub}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ret-type (valgfrit)</label>
                  <select
                    value={senseParams.recipeType || ''}
                    onChange={(e) => setSenseParams((prev) => ({ ...prev, recipeType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Frit valg</option>
                    <option value="tallerken med kød/fisk, kartoffel/korn og grønt">Klassisk tallerken</option>
                    <option value="one-pan ovnret">One-pan ovnret</option>
                    <option value="gryderet">Gryderet</option>
                    <option value="wok med lidt ris eller nudler">Wok</option>
                    <option value="pastaret med salat til">Pastaret + salat</option>
                    <option value="suppe med brød">Suppe med brød</option>
                    <option value="taco eller wraps med fyld og salat">Taco/wraps</option>
                    <option value="fiskefrikadeller med kartofler">Fiskefrikadeller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inspiration (valgfrit)</label>
                  <input
                    type="text"
                    value={senseParams.inspiration || ''}
                    onChange={(e) => setSenseParams((prev) => ({ ...prev, inspiration: e.target.value }))}
                    placeholder="fx. 'hverdags lasagne' eller 'hurtig frokost rugbrød'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSenseModal(false)
                    setSelectedCategory(null)
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={handleSenseGenerate}
                  disabled={isGenerating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Genererer...' : '🤖 Generer Opskrift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLP-1 Parameter Modal */}
      {showGlp1Modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">🧠 Tilpas GLP-1 kost</h2>
                <button
                  onClick={() => {
                    setShowGlp1Modal(false)
                    setSelectedCategory(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Juster mæthedsprofilen: måltidstype, proteinvalg, fiberfokus og ret-type.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Måltid</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['morgenmad', 'frokost', 'aftensmad', 'snacks'].map((maaltid) => (
                      <button
                        key={maaltid}
                        onClick={() => setGlp1Params((prev) => ({ ...prev, maaltid: maaltid as Glp1Parameters['maaltid'] }))}
                        className={`py-2 px-3 rounded-lg transition-colors text-sm ${
                          glp1Params.maaltid === maaltid
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {maaltid.charAt(0).toUpperCase() + maaltid.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primær proteinkilde</label>
                  <select
                    value={glp1Params.proteinKilde}
                    onChange={(e) => setGlp1Params((prev) => ({ ...prev, proteinKilde: e.target.value as Glp1Parameters['proteinKilde'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="frit-valg">Frit valg</option>
                    <option value="kylling">Kylling/kalkun</option>
                    <option value="fisk">Fisk/skaldyr</option>
                    <option value="æg">Æg</option>
                    <option value="vegetarisk">Vegetarisk</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Fiber-fokus</label>
                    <span className="text-sm text-gray-500">{glp1Params.fiberFokus}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={glp1Params.fiberFokus}
                    onChange={(e) => setGlp1Params((prev) => ({ ...prev, fiberFokus: parseInt(e.target.value) as 0 | 1 | 2 | 3 }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">Mæthedsprofil</label>
                    <span className="text-sm text-gray-500">{glp1Params.maethedsProfil}/3</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    value={glp1Params.maethedsProfil}
                    onChange={(e) => setGlp1Params((prev) => ({ ...prev, maethedsProfil: parseInt(e.target.value) as 0 | 1 | 2 | 3 }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ret-type (valgfrit)</label>
                  <select
                    value={glp1Params.recipeType || ''}
                    onChange={(e) => setGlp1Params((prev) => ({ ...prev, recipeType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Frit valg</option>
                    <option value="lasagne">Lasagne</option>
                    <option value="gryderet">Gryderet</option>
                    <option value="suppe">Suppe</option>
                    <option value="bowl">Bowl</option>
                    <option value="ovnret">Ovnret</option>
                    <option value="salat">Salat</option>
                    <option value="wraps">Wraps</option>
                    <option value="æggeret">Æggeret</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inspiration (valgfrit)</label>
                  <input
                    type="text"
                    value={glp1Params.inspiration || ''}
                    onChange={(e) => setGlp1Params((prev) => ({ ...prev, inspiration: e.target.value }))}
                    placeholder="fx. 'mættende frokost-bowl' eller 'GLP-1 venlig lasagne'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowGlp1Modal(false)
                    setSelectedCategory(null)
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuller
                </button>
                <button
                  onClick={handleGlp1Generate}
                  disabled={isGenerating}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Genererer...' : '🤖 Generer Opskrift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5:2 — vælg fastedag (2'er) eller spisedag (5'er) */}
      {show52Modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">⏰ 5:2 — hvilken type opskrift?</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShow52Modal(false)
                    setSelectedCategory(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                I 5:2 faster man typisk <strong>2 dage</strong> om ugen (lav energi) og spiser <strong>normalt de andre 5 dage</strong>.
                Vælg hvilken situation opskriften skal passe til — så får AI de rigtige kalorie- og stilmæssige rammer.
              </p>
              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    fiveTwoParams.dayType === '2'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="fiveTwoDayType"
                    checked={fiveTwoParams.dayType === '2'}
                    onChange={() => setFiveTwoParams({ dayType: '2' })}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-semibold text-gray-900">2&apos;er — fastedag</span>
                    <span className="block text-sm text-gray-600 mt-1">
                      Opskrift til de to ugentlige fastedage: <strong>ca. 500 kcal per portion</strong> (kvinder; mænd kan ligge omkring 600).
                      Mættende, voluminøse grøntsager, magert protein — høj mæthed pr. kalorie.
                    </span>
                  </span>
                </label>
                <label
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    fiveTwoParams.dayType === '5'
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="fiveTwoDayType"
                    checked={fiveTwoParams.dayType === '5'}
                    onChange={() => setFiveTwoParams({ dayType: '5' })}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-semibold text-gray-900">5&apos;er — spisedag</span>
                    <span className="block text-sm text-gray-600 mt-1">
                      Opskrift til de <strong>fem dage</strong> hvor man spiser normalt: balanceret, næringsrig hverdagsmad uden den skarpe fastedags-grænse.
                      Ikke &quot;kalorieslank&quot; som på 2&apos;eren — fokus på variation og tilfredsstillende måltider.
                    </span>
                  </span>
                </label>
              </div>
              <div className="flex gap-3 mt-8 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShow52Modal(false)
                    setSelectedCategory(null)
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuller
                </button>
                <button
                  type="button"
                  onClick={handle52Generate}
                  disabled={isGenerating}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Genererer...' : '🤖 Generer opskrift'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Opret Opskrift</h1>
          <p className="text-gray-600">Generer nye opskrifter med AI baseret på valgt kategori</p>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-800 font-medium">{progress}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">❌ {error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Selection */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vælg Kategori & Generer Opskrift</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RECIPE_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedCategory === category.id
                        ? `${category.color} text-white border-transparent`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3 mb-3">
                      <span className="text-2xl">{category.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{category.name}</h3>
                        <p className={`text-sm mt-1 ${
                          selectedCategory === category.id ? 'text-white/90' : 'text-gray-600'
                        }`}>
                          {category.description}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            selectedCategory === category.id 
                              ? 'bg-white/20 text-white' 
                              : category.difficulty === 'Easy' 
                                ? 'bg-green-100 text-green-800'
                                : category.difficulty === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                          }`}>
                            {category.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (category.id === 'familiemad') {
                          handleCategorySelect(category.id)
                        } else if (category.id === 'keto') {
                          handleCategorySelect(category.id)
                        } else if (category.id === '5-2') {
                          handleCategorySelect(category.id)
                        } else if (category.id === 'proteinrig-kost') {
                          handleCategorySelect(category.id)
                        } else if (category.id === 'glp1') {
                          handleCategorySelect(category.id)
                        } else if (category.id === 'sense') {
                          handleCategorySelect(category.id)
                        } else {
                          setSelectedCategory(category.id)
                          handleGenerateRecipe()
                        }
                      }}
                      disabled={isGenerating}
                      className={`w-full py-2 px-3 rounded-lg transition-colors text-sm font-medium ${
                        selectedCategory === category.id
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isGenerating && selectedCategory === category.id ? 'Genererer...' : `🤖 Generer ${category.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Generated Recipe Preview */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {isEditing ? 'Rediger AI-kladde' : 'AI-kladde Forhåndsvisning'}
                </h2>
                {generatedRecipe && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      recipeStatus === 'ai-preview' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : recipeStatus === 'ready-to-save'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {recipeStatus === 'ai-preview' 
                        ? '🤖 AI-Preview (venter på billede)' 
                        : recipeStatus === 'ready-to-save'
                        ? '✅ Klar til at gemmes'
                        : '💾 Gemt som kladde'
                      }
                    </span>
                  </div>
                )}
              </div>
              {generatedRecipe && !isEditing && (
                <button
                  onClick={handleEditRecipe}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ✏️ Rediger
                </button>
              )}
            </div>
            
            {!generatedRecipe ? (
              <div className="p-8 text-center bg-gray-100 rounded-lg">
                <p className="text-gray-500">Vælg en kategori og generer en opskrift for at se AI-kladde</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                {/* Recipe Header */}
                <div>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                        <input
                          type="text"
                          value={editableRecipe?.title || ''}
                          onChange={(e) => handleUpdateEditableRecipe('title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                        <textarea
                          value={editableRecipe?.description || ''}
                          onChange={(e) => handleUpdateEditableRecipe('description', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{generatedRecipe.title}</h3>
                      <p className="text-gray-600 mb-4">{generatedRecipe.description}</p>
                    </>
                  )}
                  
                  {/* Recipe Image */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Billede 
                      {recipeStatus === 'ai-preview' && (
                        <span className="ml-2 text-yellow-600 text-sm font-normal">(Påkrævet for at gemme)</span>
                      )}
                    </h4>
                    {isEditing ? (
                      <div className="space-y-3">
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`flex items-center space-x-4 p-4 rounded-lg border-2 border-dashed transition-colors ${
                            isDragging
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <img 
                            src={editableRecipe?.imageUrl || '/images/recipe-placeholder.jpg'} 
                            alt="Recipe" 
                            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                              <label
                                htmlFor="image-upload"
                                className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Vælg arkiv
                              </label>
                              <span className="text-sm text-gray-500">
                                {isDragging ? 'Slip billedet her...' : 'eller træk et billede her'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">Max 5MB, JPG/PNG/WebP</p>
                            {recipeStatus === 'ai-preview' && (
                              <p className="text-xs text-yellow-600 mt-1">⚠️ Upload et billede for at kunne gemme opskriften</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={generatedRecipe.imageUrl} 
                        alt={generatedRecipe.title} 
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                    )}
                  </div>
                  
                  {/* Midjourney Prompt — vises altid; Sense m.fl. kan få prompt via fallback-endpoint */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">
                      🎨 Midjourney-prompt
                      <span className="ml-2 text-gray-500 text-sm font-normal">(kopier til Midjourney)</span>
                    </h4>
                    {(midjourneyPromptSource || midjourneyPromptError) && (
                      <div className="mb-2 text-xs text-gray-600">
                        {midjourneyPromptSource && (
                          <span>
                            Kilde: {midjourneyPromptSource === 'openai' ? 'model' : 'fallback'}
                          </span>
                        )}
                        {midjourneyPromptError && (
                          <span className="ml-2 text-amber-700">({midjourneyPromptError})</span>
                        )}
                      </div>
                    )}
                    {midjourneyLoading && (
                      <p className="text-sm text-gray-500 mb-2">Genererer Midjourney-prompt…</p>
                    )}
                    {!midjourneyLoading && !midjourneyPrompt.trim() && (
                      <p className="text-sm text-amber-800 mb-2">
                        Ingen prompt endnu. Klik knappen for at bygge den ud fra titel, beskrivelse og ingredienser
                        (inkl. Sense-grupper).
                      </p>
                    )}
                    {midjourneyPrompt.trim() ? (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <textarea
                          value={midjourneyPrompt}
                          readOnly
                          rows={4}
                          className="w-full bg-transparent border-none resize-y min-h-[5rem] text-sm text-gray-700 font-mono"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(midjourneyPrompt)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            📋 Kopier
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleRefreshMidjourneyPrompt()}
                      disabled={midjourneyLoading || (!editableRecipe && !generatedRecipe)}
                      className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {midjourneyLoading ? 'Arbejder…' : 'Generér / opdatér Midjourney-prompt'}
                    </button>
                  </div>
                  
                  {/* Recipe Meta */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Portioner:</span>
                      <p className="text-gray-600">{generatedRecipe.servings}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Forberedelse:</span>
                      <p className="text-gray-600">{generatedRecipe.prepTime} min</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tilberedning:</span>
                      <p className="text-gray-600">{generatedRecipe.cookTime} min</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Sværhedsgrad:</span>
                      <p className="text-gray-600">{generatedRecipe.difficulty}</p>
                    </div>
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Ingredienser</h4>
                  {isEditing ? (
                    <div className="space-y-3">
                      {editableRecipe?.ingredients.map((ingredient, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={(() => {
                                const draft = ingredientAmountDrafts[index]
                                if (draft !== undefined) {
                                  return draft
                                }
                                if (ingredient.amount === 0 || ingredient.amount === null || ingredient.amount === undefined) {
                                  return ''
                                }
                                const str = String(ingredient.amount)
                                // Hvis det er et helt tal, vis det som det er
                                if (str.includes('.')) {
                                  return str.replace('.', ',')
                                }
                                return str
                              })()}
                              onChange={(e) => {
                                let value = e.target.value
                                // Tillad kun tal, komma og punktum
                                value = value.replace(/[^\d,.]/g, '')
                                
                                // Tillad kun ét komma eller ét punktum
                                const commaIndex = value.indexOf(',')
                                const dotIndex = value.indexOf('.')
                                if (commaIndex !== -1 && dotIndex !== -1) {
                                  // Hvis begge er til stede, behold kun det første
                                  if (commaIndex < dotIndex) {
                                    value = value.replace(/\./g, '')
                                  } else {
                                    value = value.replace(/,/g, '')
                                  }
                                }
                                
                                // Opdater input-værdien direkte
                                e.target.value = value
                                setIngredientAmountDrafts((prev) => ({
                                  ...prev,
                                  [index]: value,
                                }))
                                
                                // Hvis tom eller kun komma, sæt til 0
                                if (value === '' || value === ',' || value === '.') {
                                  return
                                }

                                // Lad brugeren færdigskrive decimaler som "0," eller "1."
                                if (value.endsWith(',') || value.endsWith('.')) {
                                  return
                                }
                                
                                // Konverter komma til punktum for parsing
                                const normalizedValue = value.replace(',', '.')
                                const numValue = parseFloat(normalizedValue)
                                
                                if (!isNaN(numValue) && isFinite(numValue)) {
                                  handleUpdateIngredient(index, 'amount', numValue)
                                }
                              }}
                              onBlur={(e) => {
                                // Ved blur, sørg for at værdien er korrekt formateret
                                const value = e.target.value.trim()
                                if (value === '' || value === ',' || value === '.') {
                                  handleUpdateIngredient(index, 'amount', 0)
                                  setIngredientAmountDrafts((prev) => {
                                    const next = { ...prev }
                                    delete next[index]
                                    return next
                                  })
                                  return
                                }
                                const normalizedValue = value.replace(',', '.')
                                const numValue = parseFloat(normalizedValue)
                                if (!isNaN(numValue) && isFinite(numValue)) {
                                  handleUpdateIngredient(index, 'amount', numValue)
                                  setIngredientAmountDrafts((prev) => ({
                                    ...prev,
                                    [index]: String(numValue).replace('.', ','),
                                  }))
                                } else {
                                  handleUpdateIngredient(index, 'amount', 0)
                                  setIngredientAmountDrafts((prev) => {
                                    const next = { ...prev }
                                    delete next[index]
                                    return next
                                  })
                                }
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Antal"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={ingredient.unit}
                              onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Enhed"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={ingredient.name}
                              onChange={(e) => handleUpdateIngredient(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Ingrediens navn"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={ingredient.notes || ''}
                              onChange={(e) => handleUpdateIngredient(index, 'notes', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Note"
                            />
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleAddIngredient}
                          className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
                        >
                          + Tilføj ingrediens
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {generatedRecipe.ingredients.map((ingredient, index) => {
                        // Vis mængde og enhed kun hvis de ikke allerede er i navnet
                        const nameLower = (ingredient.name || '').toLowerCase()
                        const amountStr = String(ingredient.amount).replace('.', ',')
                        const unitStr = (ingredient.unit || '').toLowerCase()
                        const hasAmountInName = nameLower.includes(amountStr) || nameLower.match(/^\d+/)
                        const hasUnitInName = nameLower.includes(unitStr) && unitStr !== ''
                        
                        return (
                          <li key={index} className="flex justify-between">
                            <span className="text-gray-700">
                              {!hasAmountInName && !hasUnitInName ? (
                                `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`
                              ) : (
                                ingredient.name
                              )}
                            </span>
                            {ingredient.notes && (
                              <span className="text-gray-500 text-sm">({ingredient.notes})</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Fremgangsmåde</h4>
                  {isEditing ? (
                    <div className="space-y-4">
                      {editableRecipe?.instructions.map((step, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                              {step.stepNumber}
                            </span>
                            <span className="text-sm font-medium text-gray-700">Trin {step.stepNumber}</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Instruktion</label>
                              <textarea
                                value={step.instruction}
                                onChange={(e) => handleUpdateInstruction(index, 'instruction', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tid (min)</label>
                                <input
                                  type="number"
                                  value={step.time || ''}
                                  onChange={(e) => handleUpdateInstruction(index, 'time', parseInt(e.target.value) || null)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Tid"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                                <input
                                  type="text"
                                  value={step.tips || ''}
                                  onChange={(e) => handleUpdateInstruction(index, 'tips', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Tip"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleAddInstruction}
                          className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 text-sm"
                        >
                          + Tilføj trin
                        </button>
                      </div>
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {generatedRecipe.instructions.map((step, index) => (
                        <li key={index} className="flex">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {step.stepNumber}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-700">{step.instruction}</p>
                            {step.time && (
                              <p className="text-sm text-gray-500 mt-1">⏱️ {step.time} minutter</p>
                            )}
                            {step.tips && (
                              <p className="text-sm text-blue-600 mt-1">💡 {step.tips}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Nutrition Info */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Næringsindhold (per portion)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Kalorier</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.calories}</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Protein</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.protein}g</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Kulhydrater</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.carbs}g</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Fedt</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.fat}g</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-medium text-gray-700">Fiber</p>
                      <p className="text-gray-600">{generatedRecipe.nutritionalInfo.fiber}g</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4 pt-4 border-t border-gray-200">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleSaveRecipe()}
                        disabled={recipeStatus !== 'ready-to-save' || savingDraft}
                        className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                          recipeStatus === 'ready-to-save' && !savingDraft
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : recipeStatus === 'ai-preview'
                            ? 'bg-yellow-500 text-white cursor-not-allowed'
                            : 'bg-gray-400 text-white cursor-not-allowed'
                        }`}
                      >
                        {savingDraft
                          ? '⏳ Gemmer…'
                          : recipeStatus === 'ai-preview'
                          ? '📸 Upload billede først'
                          : recipeStatus === 'ready-to-save'
                          ? '💾 Gem som Rigtig Kladde'
                          : '✅ Gemt'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        ❌ Annuller
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleEditRecipe}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        ✏️ Rediger AI-kladde
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedRecipe(null)
                          setEditableRecipe(null)
                          setIsEditing(false)
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        🔄 Generer Ny
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
