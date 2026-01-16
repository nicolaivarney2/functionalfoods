'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Settings, Heart, ShoppingCart, TrendingUp, Share2, Plus, X, ChefHat, Coffee, Utensils, ChevronDown, ChevronLeft, ChevronRight, Minus, Search, CheckCircle } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { dietaryFactory, DietaryCalculator, UserProfile, ActivityLevel, WeightGoal } from '@/lib/dietary-system'
import { mealPlanGenerator } from '@/lib/meal-plan-system'

// Use the same Supabase client as the rest of the app
const supabase = createSupabaseClient()

// Types for basisvarer functionality (ingredient-based)
interface BasisvarerIngredient {
  id: number
  ingredient_name: string
  quantity: number
  unit: string
  notes?: string
  created_at: string
}

interface Product {
  id: number
  name: string
  category: string
  price: number
  unit: string
  image_url?: string
  store: string
  is_on_sale: boolean
  original_price?: number
}

interface Category {
  name: string
  slug: string
}

// Mock data for development
const mockStores = [
  { id: 1, name: 'REMA 1000', color: 'bg-blue-600', isSelected: true },
  { id: 2, name: 'Netto', color: 'bg-yellow-500', isSelected: true },
  { id: 3, name: 'Føtex', color: 'bg-blue-500', isSelected: false },
  { id: 4, name: 'Bilka', color: 'bg-blue-700', isSelected: false },
  { id: 5, name: 'Nemlig.com', color: 'bg-orange-500', isSelected: false },
  { id: 6, name: 'MENY', color: 'bg-red-600', isSelected: false },
  { id: 7, name: 'Spar', color: 'bg-red-500', isSelected: false },
  { id: 8, name: 'Løvbjerg', color: 'bg-green-600', isSelected: false }
]

// Enhanced mock recipes with images and detailed ingredients
const mockRecipes = [
  {
    id: 1,
    title: 'Kylling med grøntsager',
    image: '/images/recipes/kylling-groentsager.jpg',
    ingredients: [
      { name: 'kylling', amount: '400g', unit: 'g', price: 25.00 },
      { name: 'broccoli', amount: '1', unit: 'stk', price: 8.50 },
      { name: 'gulerødder', amount: '4', unit: 'stk', price: 6.00 },
      { name: 'løg', amount: '2', unit: 'stk', price: 3.00 },
      { name: 'hvidløg', amount: '3', unit: 'fed', price: 2.00 },
      { name: 'olivenolie', amount: '2', unit: 'spsk', price: 1.00 }
    ],
    totalPrice: 45.50,
    savings: 15.30,
    store: 'REMA 1000',
    mealType: 'dinner',
    prepTime: '25 min',
    servings: 4,
    category: 'Kylling',
    dietaryTags: ['Proteinrig', 'Grøntsager']
  },
  {
    id: 2,
    title: 'Laks med spinat og citron',
    image: '/images/recipes/laks-spinat.jpg',
    ingredients: [
      { name: 'laks', amount: '400g', unit: 'g', price: 35.00 },
      { name: 'spinat', amount: '200g', unit: 'g', price: 12.00 },
      { name: 'citron', amount: '1', unit: 'stk', price: 3.50 },
      { name: 'hvidløg', amount: '2', unit: 'fed', price: 1.33 },
      { name: 'olivenolie', amount: '1', unit: 'spsk', price: 0.50 },
      { name: 'salt', amount: '1', unit: 'knsp', price: 0.47 }
    ],
    totalPrice: 52.80,
    savings: 22.40,
    store: 'Netto',
    mealType: 'dinner',
    prepTime: '20 min',
    servings: 4,
    category: 'Fisk',
    dietaryTags: ['Omega-3', 'Proteinrig']
  },
  {
    id: 3,
    title: 'Havregrød med bær og honning',
    image: '/images/recipes/havregrod-baer.jpg',
    ingredients: [
      { name: 'havregryn', amount: '200g', unit: 'g', price: 4.00 },
      { name: 'mælk', amount: '400ml', unit: 'ml', price: 6.00 },
      { name: 'bær', amount: '150g', unit: 'g', price: 12.00 },
      { name: 'honning', amount: '2', unit: 'spsk', price: 3.00 },
      { name: 'salt', amount: '1', unit: 'knsp', price: 0.47 }
    ],
    totalPrice: 18.90,
    savings: 8.50,
    store: 'REMA 1000',
    mealType: 'breakfast',
    prepTime: '15 min',
    servings: 4,
    category: 'Morgenmad',
    dietaryTags: ['Fiberrig', 'Naturlig søde']
  },
  {
    id: 4,
    title: 'Pasta med tomater og pesto',
    image: '/images/recipes/pasta-tomater.jpg',
    ingredients: [
      { name: 'pasta', amount: '400g', unit: 'g', price: 8.00 },
      { name: 'tomater', amount: '6', unit: 'stk', price: 18.00 },
      { name: 'pesto', amount: '100g', unit: 'g', price: 15.00 },
      { name: 'hvidløg', amount: '2', unit: 'fed', price: 1.33 },
      { name: 'olivenolie', amount: '2', unit: 'spsk', price: 1.00 },
      { name: 'salt', amount: '1', unit: 'knsp', price: 0.47 }
    ],
    totalPrice: 43.80,
    savings: 12.20,
    store: 'Netto',
    mealType: 'dinner',
    prepTime: '20 min',
    servings: 4,
    category: 'Pasta',
    dietaryTags: ['Vegetar', 'Hurtig']
  },
  {
    id: 5,
    title: 'Omelet med grøntsager',
    image: '/images/recipes/omelet-groentsager.jpg',
    ingredients: [
      { name: 'æg', amount: '6', unit: 'stk', price: 18.00 },
      { name: 'spinat', amount: '100g', unit: 'g', price: 6.00 },
      { name: 'tomat', amount: '2', unit: 'stk', price: 6.00 },
      { name: 'ost', amount: '100g', unit: 'g', price: 12.00 },
      { name: 'olivenolie', amount: '1', unit: 'spsk', price: 0.50 },
      { name: 'salt', amount: '1', unit: 'knsp', price: 0.47 }
    ],
    totalPrice: 42.97,
    savings: 8.03,
    store: 'REMA 1000',
    mealType: 'breakfast',
    prepTime: '15 min',
    servings: 4,
    category: 'Morgenmad',
    dietaryTags: ['Proteinrig', 'Grøntsager']
  },
  {
    id: 6,
    title: 'Suppe med kylling og grøntsager',
    image: '/images/recipes/suppe-kylling.jpg',
    ingredients: [
      { name: 'kylling', amount: '300g', unit: 'g', price: 18.75 },
      { name: 'gulerødder', amount: '3', unit: 'stk', price: 4.50 },
      { name: 'løg', amount: '2', unit: 'stk', price: 3.00 },
      { name: 'hvidløg', amount: '2', unit: 'fed', price: 1.33 },
      { name: 'salt', amount: '1', unit: 'knsp', price: 0.47 },
      { name: 'peber', amount: '1', unit: 'knsp', price: 0.47 }
    ],
    totalPrice: 28.52,
    savings: 5.48,
    store: 'Føtex',
    mealType: 'lunch',
    prepTime: '30 min',
    servings: 4,
    category: 'Suppe',
    dietaryTags: ['Varmende', 'Nærende']
  }
]

interface AdultProfile {
  id: string
  gender?: 'male' | 'female'
  age?: number
  height?: number // cm
  weight?: number // kg
  activityLevel?: ActivityLevel
  dietaryApproach?: string // 'keto', 'sense', 'glp-1', etc.
  mealsPerDay: string[] // ['dinner', 'breakfast', 'lunch']
  weightGoal?: WeightGoal // 'weight-loss', 'maintenance', 'muscle-gain'
  isComplete: boolean
}

export default function MadbudgetPage() {
  const [familyProfile, setFamilyProfile] = useState({
    adults: 2,
    children: 2,
    childrenAges: ['4-8', '4-8'],
    prioritizeOrganic: true,
    prioritizeAnimalOrganic: false,
    excludedIngredients: [] as string[], // Changed from dislikedIngredients
    selectedStores: [1, 2, 8], // REMA 1000, Netto, Løvbjerg
    adultsProfiles: [] as AdultProfile[] // New: profiles for each adult
  })
  
  type MealType = 'breakfast' | 'lunch' | 'dinner'
  type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  
  const [mealPlan, setMealPlan] = useState<Record<DayKey, Record<MealType, any | null>>>({
    monday: { breakfast: null, lunch: null, dinner: null },
    tuesday: { breakfast: null, lunch: null, dinner: null },
    wednesday: { breakfast: null, lunch: null, dinner: null },
    thursday: { breakfast: null, lunch: null, dinner: null },
    friday: { breakfast: null, lunch: null, dinner: null },
    saturday: { breakfast: null, lunch: null, dinner: null },
    sunday: { breakfast: null, lunch: null, dinner: null }
  })
  
  const [savedMealPlans, setSavedMealPlans] = useState<any[]>([])
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null)
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(0)
  
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [selectedMealSlot, setSelectedMealSlot] = useState('')
  const [showFamilySettings, setShowFamilySettings] = useState(false)
  const [basicItemsOpen, setBasicItemsOpen] = useState(true)
  const [currentDayOffset, setCurrentDayOffset] = useState(0)
  const [showRecipeDetail, setShowRecipeDetail] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('all')
  const [showCostSavings, setShowCostSavings] = useState(true)
  
  // Vægttabsprofil state
  const [showWeightLossProfileModal, setShowWeightLossProfileModal] = useState(false)
  const [editingAdultIndex, setEditingAdultIndex] = useState<number | null>(null)
  const [weightLossProfileStep, setWeightLossProfileStep] = useState(0)
  const [currentWeightLossProfile, setCurrentWeightLossProfile] = useState<Partial<AdultProfile>>({
    mealsPerDay: ['dinner'],
    isComplete: false
  })
  
  // Loading state for meal plan generation
  const [isGeneratingMealPlan, setIsGeneratingMealPlan] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [generationSteps] = useState([
    'Matcher opskrifter med data og mål...',
    'Balancerer makro og mikro næring...',
    'Finder de bedste tilbud ud fra butikker...',
    'Tjekker familiefaktorer...',
    'Fjerner beslutningstræthed...',
    'Optimerer og validerer madplan...'
  ])
  
  // Variation parameter (0-3 scale)
  const [variationLevel, setVariationLevel] = useState(2) // Default: medium variation
  
  // Shopping list state
  const [shoppingList, setShoppingList] = useState<any>(null)
  
  // Basisvarer state
  const [basisvarer, setBasisvarer] = useState<BasisvarerIngredient[]>([])
  const [showBasisvarerModal, setShowBasisvarerModal] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('') // generisk ingrediensnavn
  const [basisTab, setBasisTab] = useState<'ingredient' | 'product'>('ingredient')
  const [productSearchText, setProductSearchText] = useState('') // søgning efter konkrete produkter
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([])
  const [loadingBasisvarer, setLoadingBasisvarer] = useState(false)
  const [loadingProductSearch, setLoadingProductSearch] = useState(false)

  // Load family profile from database on mount
  useEffect(() => {
    const loadFamilyProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (session) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
        const response = await fetch('/api/madbudget/family-profile', { headers })
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            if (result.data.familyProfile) {
              setFamilyProfile(prev => ({
                ...prev,
                adults: result.data.familyProfile.adults || prev.adults,
                children: result.data.familyProfile.children || prev.children,
                childrenAges: result.data.familyProfile.children_ages || prev.childrenAges,
                prioritizeOrganic: result.data.familyProfile.prioritize_organic ?? prev.prioritizeOrganic,
                prioritizeAnimalOrganic: result.data.familyProfile.prioritize_animal_organic ?? prev.prioritizeAnimalOrganic,
                excludedIngredients: result.data.familyProfile.excluded_ingredients || prev.excludedIngredients,
                selectedStores: result.data.familyProfile.selected_stores || prev.selectedStores
              }))
              setVariationLevel(result.data.familyProfile.variation_level || 2)
            }
            if (result.data.adultProfiles && result.data.adultProfiles.length > 0) {
              setFamilyProfile(prev => ({
                ...prev,
                adultsProfiles: result.data.adultProfiles.map((p: any) => ({
                  id: p.id,
                  gender: p.gender,
                  age: p.age,
                  height: p.height,
                  weight: p.weight,
                  activityLevel: p.activity_level,
                  dietaryApproach: p.dietary_approach,
                  mealsPerDay: p.meals_per_day || ['dinner'],
                  weightGoal: p.weight_goal,
                  isComplete: p.is_complete
                }))
              }))
            }
          }
        }
      } catch (error) {
        console.error('Error loading family profile:', error)
      }
    }
    loadFamilyProfile()
  }, [])

  // Save family profile to database when it changes (debounced)
  useEffect(() => {
    const saveFamilyProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Debounce saves
        const timeoutId = setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            await fetch('/api/madbudget/family-profile', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                familyProfile: {
                  adults: familyProfile.adults,
                  children: familyProfile.children,
                  childrenAges: familyProfile.childrenAges,
                  prioritizeOrganic: familyProfile.prioritizeOrganic,
                  prioritizeAnimalOrganic: familyProfile.prioritizeAnimalOrganic,
                  excludedIngredients: familyProfile.excludedIngredients,
                  selectedStores: familyProfile.selectedStores,
                  variationLevel
                },
                adultProfiles: familyProfile.adultsProfiles
              })
            })
          }
        }, 1000) // Wait 1 second after last change

        return () => clearTimeout(timeoutId)
      } catch (error) {
        console.error('Error saving family profile:', error)
      }
    }
    saveFamilyProfile()
  }, [familyProfile, variationLevel])

  // Load basisvarer on component mount
  useEffect(() => {
    loadBasisvarer()
  }, [])
  
  // Load saved meal plans and calculate current week number
  useEffect(() => {
    const loadMealPlans = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        headers['Authorization'] = `Bearer ${session.access_token}`
        
        const response = await fetch('/api/madbudget/meal-plan', { headers })
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const plans = Array.isArray(result.data) ? result.data : [result.data]
            setSavedMealPlans(plans)
            
            // Calculate current week number
            const now = new Date()
            const getWeekNumber = (date: Date): number => {
              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
              const dayNum = d.getUTCDay() || 7
              d.setUTCDate(d.getUTCDate() + 4 - dayNum)
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
              return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
            }
            setCurrentWeekNumber(getWeekNumber(now))
            
            // Load active meal plan if exists
            const activePlan = plans.find((p: any) => p.is_active)
            if (activePlan && activePlan.meal_plan_data) {
              setMealPlan(activePlan.meal_plan_data)
              setShoppingList(activePlan.shopping_list || [])
              setSelectedWeekNumber(activePlan.week_number || null)
            }
          }
        }
      } catch (error) {
        console.error('Error loading meal plans:', error)
      }
    }
    
    loadMealPlans()
  }, [])
  
  // Function to load a specific week's meal plan
  const loadWeekMealPlan = async (weekNumber: number) => {
    const plan = savedMealPlans.find((p: any) => p.week_number === weekNumber)
    if (plan && plan.meal_plan_data) {
      setMealPlan(plan.meal_plan_data)
      setShoppingList(plan.shopping_list || [])
      setSelectedWeekNumber(weekNumber)
    }
  }

  // No need to load categories or products for ingredient-based basisvarer

  // API functions
  const loadBasisvarer = async () => {
    setLoadingBasisvarer(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      // --- TEMPORARY LOGGING ---
      console.log('Supabase Session Data:', session)
      if (sessionError) {
        console.error('Error fetching session:', sessionError)
      }
      // --- END TEMPORARY LOGGING ---

      if (!session) {
        console.log('No session found - user not logged in')
        setBasisvarer([]) // Set empty array for non-logged in users
        return
      }

      const response = await fetch('/api/basisvarer', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setBasisvarer(data.basisvarer || [])
      }
    } catch (error) {
      console.error('Error loading basisvarer:', error)
    } finally {
      setLoadingBasisvarer(false)
    }
  }

  // Removed loadCategories and loadProducts - not needed for ingredient-based basisvarer

  // Søg efter konkrete produkter til basisvarer (GOMA / supermarket API)
  useEffect(() => {
    const search = async () => {
      if (!productSearchText || productSearchText.trim().length < 2) {
        setProductSearchResults([])
        return
      }

      setLoadingProductSearch(true)
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          search: productSearchText.trim()
        })
        const res = await fetch(`/api/supermarket/products?${params.toString()}`)
        const data = await res.json()
        if (data.success && Array.isArray(data.products)) {
          setProductSearchResults(data.products)
        } else {
          setProductSearchResults([])
        }
      } catch (error) {
        console.error('Error searching products for basisvarer:', error)
        setProductSearchResults([])
      } finally {
        setLoadingProductSearch(false)
      }
    }

    const timeout = setTimeout(search, 300)
    return () => clearTimeout(timeout)
  }, [productSearchText])

  const addToBasisvarer = async (ingredientName: string, notes?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Du skal være logget ind for at tilføje basisvarer')
        return
      }

      const response = await fetch('/api/basisvarer', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          ingredient_name: ingredientName,
          quantity: 1,
          unit: 'stk',
          notes
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setBasisvarer(prev => [data.basisvarer, ...prev])
        setShowBasisvarerModal(false)
        setProductSearchQuery('')
        setProductSearchText('')
        setProductSearchResults([])
      }
    } catch (error) {
      console.error('Error adding to basisvarer:', error)
    }
  }

  const updateBasisvarerQuantity = async (basisvarerId: number, newQuantity: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Du skal være logget ind for at opdatere basisvarer')
        return
      }

      const response = await fetch('/api/basisvarer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: basisvarerId,
          quantity: newQuantity
        })
      })
      
      if (response.ok) {
        setBasisvarer(prev => prev.map(item => 
          item.id === basisvarerId 
            ? { ...item, quantity: newQuantity }
            : item
        ))
      }
    } catch (error) {
      console.error('Error updating basisvarer quantity:', error)
    }
  }

  const removeFromBasisvarer = async (basisvarerId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Du skal være logget ind for at fjerne basisvarer')
        return
      }

      const response = await fetch(`/api/basisvarer?id=${basisvarerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (response.ok) {
        setBasisvarer(prev => prev.filter(item => item.id !== basisvarerId))
      }
    } catch (error) {
      console.error('Error removing from basisvarer:', error)
    }
  }

  // Calculate ingredient overlap and cost savings
  const calculateIngredientOverlap = (recipe: any, selectedDay: DayKey, selectedMeal: MealType) => {
    if (!mealPlan[selectedDay] || !mealPlan[selectedDay][selectedMeal]) {
      return { overlap: 0, savings: 0, sharedIngredients: [] }
    }

    const existingRecipe = mealPlan[selectedDay][selectedMeal]
    const existingIngredients = existingRecipe.ingredients.map((ing: any) => ing.name.toLowerCase())
    const newIngredients = recipe.ingredients.map((ing: any) => ing.name.toLowerCase())
    
    const sharedIngredients = existingIngredients.filter((ing: string) => newIngredients.includes(ing))
    const overlap = sharedIngredients.length
    const savings = sharedIngredients.reduce((total: number, ingName: string) => {
      const existingIng = existingRecipe.ingredients.find((ing: any) => ing.name.toLowerCase() === ingName)
      const newIng = recipe.ingredients.find((ing: any) => ing.name.toLowerCase() === ingName)
      if (existingIng && newIng) {
        // Calculate savings based on unused portions
        const existingAmount = parseFloat(existingIng.amount)
        const newAmount = parseFloat(newIng.amount)
        const maxAmount = Math.max(existingAmount, newAmount)
        const minAmount = Math.min(existingAmount, newAmount)
        return total + (minAmount * newIng.price / newAmount)
      }
      return total
    }, 0)

    return { overlap, savings, sharedIngredients }
  }

  // Get filtered recipes based on search, category, and cost savings
  const getFilteredRecipes = () => {
    let filtered = mockRecipes

    // Filter by search query
    if (recipeSearchQuery) {
      filtered = filtered.filter(recipe => 
        recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
        recipe.ingredients.some(ing => ing.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()))
      )
    }

    // Filter by category
    if (recipeCategoryFilter !== 'all') {
      filtered = filtered.filter(recipe => recipe.category === recipeCategoryFilter)
    }

    // Sort by cost savings if enabled
    if (showCostSavings && selectedMealSlot) {
      const [day, meal] = selectedMealSlot.split('-') as [DayKey, MealType]
      filtered = filtered.map(recipe => ({
        ...recipe,
        costSavings: calculateIngredientOverlap(recipe, day, meal)
      })).sort((a, b) => b.costSavings.savings - a.costSavings.savings)
    }

    return filtered
  }


  const addRecipeToMeal = (recipe: any) => {
    if (selectedMealSlot) {
      const [day, meal] = selectedMealSlot.split('-') as [DayKey, MealType]
      setMealPlan(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [meal]: recipe
        }
      }))
      setShowRecipeSelector(false)
      setSelectedMealSlot('')
    }
  }

  const openRecipeSelector = (day: DayKey, meal: MealType) => {
    setSelectedMealSlot(`${day}-${meal}`)
    setShowRecipeSelector(true)
    setRecipeSearchQuery('')
    setRecipeCategoryFilter('all')
  }

  const openRecipeDetail = (recipe: any) => {
    setSelectedRecipe(recipe)
    setShowRecipeDetail(true)
  }

  // Initialize adultsProfiles when adults count changes
  useEffect(() => {
    if (familyProfile.adultsProfiles.length < familyProfile.adults) {
      // Add missing profiles
      const newProfiles = Array.from({ length: familyProfile.adults - familyProfile.adultsProfiles.length }, (_, i) => ({
        id: `adult-${Date.now()}-${i}`,
        mealsPerDay: ['dinner'],
        isComplete: false
      }))
      setFamilyProfile(prev => ({
        ...prev,
        adultsProfiles: [...prev.adultsProfiles, ...newProfiles]
      }))
    } else if (familyProfile.adultsProfiles.length > familyProfile.adults) {
      // Remove excess profiles
      setFamilyProfile(prev => ({
        ...prev,
        adultsProfiles: prev.adultsProfiles.slice(0, prev.adults)
      }))
    }
  }, [familyProfile.adults])

  // Open weight loss profile modal
  const openWeightLossProfile = (adultIndex: number) => {
    setEditingAdultIndex(adultIndex)
    const existingProfile = familyProfile.adultsProfiles[adultIndex]
    if (existingProfile) {
      setCurrentWeightLossProfile(existingProfile)
    } else {
      setCurrentWeightLossProfile({
        id: `adult-${Date.now()}-${adultIndex}`,
        mealsPerDay: ['dinner'],
        isComplete: false
      })
    }
    setWeightLossProfileStep(0)
    setShowWeightLossProfileModal(true)
  }

  // Save weight loss profile
  const saveWeightLossProfile = async () => {
    if (editingAdultIndex === null) return
    
    const updatedProfiles = [...familyProfile.adultsProfiles]
    updatedProfiles[editingAdultIndex] = {
      ...currentWeightLossProfile,
      isComplete: true
    } as AdultProfile
    
    setFamilyProfile(prev => ({
      ...prev,
      adultsProfiles: updatedProfiles
    }))
    
    // Save to database immediately
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await fetch('/api/madbudget/family-profile', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            familyProfile: {
              adults: familyProfile.adults,
              children: familyProfile.children,
              childrenAges: familyProfile.childrenAges,
              prioritizeOrganic: familyProfile.prioritizeOrganic,
              prioritizeAnimalOrganic: familyProfile.prioritizeAnimalOrganic,
              excludedIngredients: familyProfile.excludedIngredients,
              selectedStores: familyProfile.selectedStores,
              variationLevel
            },
            adultProfiles: updatedProfiles
          })
        })
      }
    } catch (error) {
      console.error('Error saving weight loss profile to database:', error)
    }
    
    setShowWeightLossProfileModal(false)
    setEditingAdultIndex(null)
    setWeightLossProfileStep(0)
  }

  // Check if all adults have complete profiles
  const allAdultsHaveProfiles = () => {
    return familyProfile.adultsProfiles.length === familyProfile.adults &&
           familyProfile.adultsProfiles.every(p => p.isComplete)
  }

  // Validate dietary approaches - voksne skal have samme kostretning eller en på familiemad
  const validateDietaryApproaches = () => {
    if (familyProfile.adults === 0) return true
    
    const approaches = familyProfile.adultsProfiles
      .filter(p => p.isComplete && p.dietaryApproach)
      .map(p => p.dietaryApproach)
    
    if (approaches.length === 0) return false
    
    const uniqueApproaches = [...new Set(approaches)]
    
    // Hvis alle voksne har samme kostretning, er det altid ok (uanset om der er børn eller ej)
    if (uniqueApproaches.length === 1) {
      return true
    }
    
    // Hvis der er forskellige kostretninger:
    // - Hvis der er børn, skal mindst én være på familiemad
    if (familyProfile.children > 0) {
      const hasFamiliemad = uniqueApproaches.includes('familiemad')
      if (!hasFamiliemad) {
        return false // Mindst én voksen skal være på familiemad hvis der er børn og forskellige kostretninger
      }
    }
    
    // Hvis der ikke er børn, kan man have forskellige kostretninger (men ikke anbefalet)
    // Vi tillader det, men det er ikke optimalt
    return true
  }

  const generateMealPlan = async () => {
    // Validate before generating
    if (!allAdultsHaveProfiles()) {
      alert('Alle voksne skal have udfyldt deres vægttabsprofil først')
      return
    }
    
    if (!validateDietaryApproaches()) {
      alert('Voksne skal have samme kostretning, eller mindst én skal være på familiemad hvis der er børn')
      return
    }
    
    setIsGeneratingMealPlan(true)
    setGenerationProgress(generationSteps[0])
    
    try {
      // Step 1: Match recipes
      setGenerationProgress(generationSteps[0])
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Step 2: Balance nutrition
      setGenerationProgress(generationSteps[1])
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Step 3: Find deals (placeholder - will be implemented later)
      setGenerationProgress(generationSteps[2])
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Step 4: Check family factors
      setGenerationProgress(generationSteps[3])
      
      // Actually generate the meal plan
      const weekPlan = await mealPlanGenerator.generateOneWeekMealPlan(
        {
          adults: familyProfile.adults,
          children: familyProfile.children,
          childrenAges: familyProfile.childrenAges || [],
          adultsProfiles: familyProfile.adultsProfiles.map(p => ({
            dietaryApproach: p.dietaryApproach,
            mealsPerDay: p.mealsPerDay || ['dinner'],
            weightGoal: p.weightGoal
          })),
          excludedIngredients: familyProfile.excludedIngredients,
          selectedStores: familyProfile.selectedStores,
          prioritizeOrganic: familyProfile.prioritizeOrganic
        },
        variationLevel
      )
      
      // Step 5: Remove decision fatigue
      setGenerationProgress(generationSteps[4])
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Step 6: Optimize and validate
      setGenerationProgress(generationSteps[5])
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Convert weekPlan to UI format
      const newMealPlan: Record<DayKey, Record<MealType, any | null>> = {
        monday: { breakfast: null, lunch: null, dinner: null },
        tuesday: { breakfast: null, lunch: null, dinner: null },
        wednesday: { breakfast: null, lunch: null, dinner: null },
        thursday: { breakfast: null, lunch: null, dinner: null },
        friday: { breakfast: null, lunch: null, dinner: null },
        saturday: { breakfast: null, lunch: null, dinner: null },
        sunday: { breakfast: null, lunch: null, dinner: null }
      }
      
      const dayNames: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      
      weekPlan.days.forEach((dayPlan, dayIndex) => {
        const dayKey = dayNames[dayIndex]
        dayPlan.meals.forEach(meal => {
          const mealType = meal.mealType as MealType
          if (mealType && dayKey) {
            newMealPlan[dayKey][mealType] = {
              id: meal.recipe.id,
              title: meal.recipe.title,
              image: meal.recipe.imageUrl,
              ingredients: meal.recipe.ingredients.map((ing: any) => ({
                name: ing.name || ing.ingredientName,
                amount: ing.amount,
                unit: ing.unit
              })),
              servings: meal.servings,
              prepTime: meal.recipe.prepTime || '30 min',
              category: meal.recipe.category || 'Dinner',
              dietaryTags: meal.recipe.dietaryCategories || []
            }
          }
        })
      })
      
      setMealPlan(newMealPlan)
      
      // Generate shopping list
      setShoppingList(weekPlan.shoppingList)
      
      // Save meal plan to database
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error('No session found, cannot save meal plan')
        } else {
          const weekStart = new Date()
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
          weekStart.setHours(0, 0, 0, 0)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6) // Sunday
          weekEnd.setHours(23, 59, 59, 999)
          
          // Calculate week number (ISO week)
          const getWeekNumber = (date: Date): number => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
            const dayNum = d.getUTCDay() || 7
            d.setUTCDate(d.getUTCDate() + 4 - dayNum)
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
            return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
          }
          const weekNumber = getWeekNumber(weekStart)

          const response = await fetch('/api/madbudget/meal-plan', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              name: `Madplan Uge ${weekNumber} (${weekStart.toISOString().split('T')[0]})`,
              weekStartDate: weekStart.toISOString().split('T')[0],
              weekEndDate: weekEnd.toISOString().split('T')[0],
              weekNumber,
              variationLevel,
              familyProfileSnapshot: {
                adults: familyProfile.adults,
                children: familyProfile.children,
                childrenAges: familyProfile.childrenAges,
                adultsProfiles: familyProfile.adultsProfiles
              },
              mealPlanData: newMealPlan, // Save the UI format
              shoppingList: weekPlan.shoppingList,
              totalCost: null, // Will be calculated later with prices
              totalSavings: null, // Will be calculated later
              estimatedCaloriesPerDay: null // Will be calculated later
            })
          })
          
          if (response.ok) {
            console.log('Meal plan saved successfully')
          } else {
            console.error('Failed to save meal plan:', await response.text())
          }
        }
      } catch (error) {
        console.error('Error saving meal plan:', error)
        // Don't fail the whole operation if save fails
      }
      
      setIsGeneratingMealPlan(false)
      setGenerationProgress('')
    } catch (error) {
      console.error('Error generating meal plan:', error)
      setIsGeneratingMealPlan(false)
      setGenerationProgress('')
      alert('Der opstod en fejl ved generering af madplan. Prøv igen.')
    }
  }

  const calculateSavings = () => {
    // Calculate total savings logic will go here
    return { totalSavings: 156.80, percentageSavings: 18.5 }
  }

  const nextDays = () => {
    setCurrentDayOffset(prev => Math.min(prev + 3, 4)) // Max 4 (so we can show days 5-7)
  }

  const prevDays = () => {
    setCurrentDayOffset(prev => Math.max(prev - 3, 0))
  }

  const getVisibleDays = () => {
    return days.slice(currentDayOffset, currentDayOffset + 3)
  }

  const mealTypes = [
    { key: 'breakfast', label: 'Morgenmad', icon: Coffee, color: 'bg-yellow-100 text-yellow-800' },
    { key: 'lunch', label: 'Frokost', icon: ChefHat, color: 'bg-green-100 text-green-800' },
    { key: 'dinner', label: 'Aftensmad', icon: Utensils, color: 'bg-blue-100 text-blue-800' }
  ]

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayLabels = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Madbudget</h1>
              <p className="text-gray-600">Planlæg din madplan baseret på ugens tilbud</p>
              <p className="text-sm text-gray-400 mt-1">Butik/tilbuds-funktion er ikke aktiveret endnu. Kommer i 2026</p>
            </div>
            <button
              onClick={() => setShowFamilySettings(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Users size={20} />
              <span>Familieindstillinger</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Family Profile & Basic Items */}
          <div className="space-y-6">
            {/* Family Profile Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users size={20} className="mr-2" />
                Familieprofil
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Voksne:</span>
                  <span className="font-medium">{familyProfile.adults}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Børn:</span>
                  <span className="font-medium">
                    {familyProfile.children} ({familyProfile.childrenAges?.join(', ') || 'Ingen alder valgt'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Økologi prioriteret:</span>
                  <span className="font-medium">{familyProfile.prioritizeOrganic ? 'Ja' : 'Nej'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Butikker:</span>
                  <span className="font-medium">
                    {familyProfile.selectedStores.map((storeId, index) => {
                      const store = mockStores.find(s => s.id === storeId)
                      return store?.name
                    }).filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Basisvarer */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setBasicItemsOpen(!basicItemsOpen)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900">Basisvarer</h2>
                <ChevronDown 
                  size={20} 
                  className={`text-gray-500 transition-transform ${basicItemsOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {basicItemsOpen && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-600 text-sm">Produkter du altid køber</p>
                    <button
                      onClick={() => {
                        setBasisTab('ingredient')
                        setShowBasisvarerModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                    >
                      <Plus size={16} />
                      <span>Tilføj vare</span>
                    </button>
                  </div>
                  
                  {loadingBasisvarer ? (
                    <div className="text-center py-4">
                      <div className="text-gray-500">Indlæser basisvarer...</div>
                    </div>
                  ) : basisvarer.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Ingen basisvarer endnu</p>
                      <p className="text-xs">Klik på "Tilføj vare" for at tilføje produkter</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Split i generiske ingredienser vs. produkter (baseret på notes) */}
                      {(() => {
                        const productPrefix = 'Produkt:'
                        const productItems = basisvarer.filter(b => b.notes && b.notes.startsWith(productPrefix))
                        const ingredientItems = basisvarer.filter(b => !b.notes || !b.notes.startsWith(productPrefix))

                        return (
                          <>
                            {/* Ingredienser */}
                            {ingredientItems.length > 0 && (
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Ingredienser
                                </p>
                                {ingredientItems.slice(0, 4).map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">{item.ingredient_name}</div>
                                      <div className="text-xs text-gray-500 flex items-center space-x-2">
                                        <span>{item.quantity} {item.unit}</span>
                                        {item.notes && !item.notes.startsWith(productPrefix) && (
                                          <>
                                            <span>•</span>
                                            <span>{item.notes}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => updateBasisvarerQuantity(item.id, item.quantity + 1)}
                                        className="text-green-500 hover:text-green-700 p-1"
                                        title="Øg antal"
                                      >
                                        <Plus size={16} />
                                      </button>
                                      <button
                              onClick={() => {
                                if (item.quantity > 1) {
                                  updateBasisvarerQuantity(item.id, item.quantity - 1)
                                } else {
                                  removeFromBasisvarer(item.id)
                                }
                              }}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="Fjern fra basisvarer"
                                      >
                                        <Minus size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Produkter */}
                            {productItems.length > 0 && (
                              <div className="space-y-3 pt-3 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  Produkter
                                </p>
                                {productItems.slice(0, 4).map(item => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">{item.ingredient_name}</div>
                                      <div className="text-xs text-indigo-700">
                                        Antal: {item.quantity} {item.unit}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={() => updateBasisvarerQuantity(item.id, item.quantity + 1)}
                                        className="text-green-600 hover:text-green-800 p-1"
                                        title="Øg antal"
                                      >
                                        <Plus size={16} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (item.quantity > 1) {
                                            updateBasisvarerQuantity(item.id, item.quantity - 1)
                                          } else {
                                            removeFromBasisvarer(item.id)
                                          }
                                        }}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="Fjern fra basisvarer"
                                      >
                                        <Minus size={16} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )
                      })()}

                      {/* Show "show more" if there are more items */}
                      {basisvarer.length > 4 && (
                        <div className="text-center">
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Vis {basisvarer.length - 4} flere varer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold mr-1">(i)</span>
                      Basisvarer tilføjes altid til indkøbslisten
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Savings Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp size={20} className="mr-2" />
                Besparelser
              </h2>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {calculateSavings().totalSavings.toFixed(2)} kr
                </div>
                <div className="text-lg text-gray-600 mb-4">
                  {calculateSavings().percentageSavings}% besparelse
                </div>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                  Se detaljeret oversigt
                </button>
              </div>
            </div>
          </div>

          {/* Center Column - Meal Planner */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Calendar size={20} className="mr-2" />
                    Ugeplanlægger
                  </h2>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Week selector */}
                  {savedMealPlans.length > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Uge:</label>
                      <select
                        value={selectedWeekNumber || currentWeekNumber}
                        onChange={(e) => {
                          const weekNum = parseInt(e.target.value)
                          loadWeekMealPlan(weekNum)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {savedMealPlans
                          .map((p: any) => {
                            const weekNum = p.week_number || (() => {
                              const date = new Date(p.week_start_date)
                              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
                              const dayNum = d.getUTCDay() || 7
                              d.setUTCDate(d.getUTCDate() + 4 - dayNum)
                              const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
                              return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
                            })()
                            return { weekNum, plan: p }
                          })
                          .sort((a, b) => b.weekNum - a.weekNum)
                          .map(({ weekNum, plan }) => (
                            <option key={plan.id} value={weekNum}>
                              Uge {weekNum} {weekNum === currentWeekNumber ? '(Nuværende)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variation: {variationLevel === 0 ? 'Meget ensartet' : variationLevel === 1 ? 'Lidt variation' : variationLevel === 2 ? 'Moderat variation' : 'Meget variation'}
                    </label>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-500">Ensartet</span>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="1"
                        value={variationLevel}
                        onChange={(e) => setVariationLevel(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-500">Varieret</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {variationLevel === 0 && 'Samme retter flere dage i træk'}
                      {variationLevel === 1 && 'Lidt gentagelse, primært nye retter'}
                      {variationLevel === 2 && 'God balance mellem nyt og kendt'}
                      {variationLevel === 3 && 'Maksimal variation, undgår gentagelse'}
                    </p>
                  </div>
                  <button
                    onClick={generateMealPlan}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    Generer AI madplan
                  </button>
                </div>
              </div>

              {/* Desktop: 7 Days Grid */}
              <div className="hidden lg:grid lg:grid-cols-7 gap-4">
                {days.map((day, index) => (
                  <div key={day} className="text-center">
                    <div className="font-medium text-gray-900 mb-3">{dayLabels[index]}</div>
                    <div className="space-y-2">
                      {mealTypes.map(mealType => {
                        const dayKey = day as DayKey
                        const mealKey = mealType.key as MealType
                        const currentMeal = mealPlan[dayKey][mealKey]
                        
                                                    return (
                              <div
                                key={`${day}-${mealType.key}`}
                                className={`p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                                  currentMeal
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                                }`}
                                onClick={() => {
                                  const dayKey = day as DayKey
                                  const mealKey = mealType.key as MealType
                                  openRecipeSelector(dayKey, mealKey)
                                }}
                                title={currentMeal ? `${currentMeal.title} - ${currentMeal.store}${currentMeal.savings !== undefined && currentMeal.savings > 0 ? ` (Sparer ${currentMeal.savings.toFixed(0)} kr)` : ''}` : `Vælg ${mealType.label.toLowerCase()}`}
                              >
                                {currentMeal ? (
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {currentMeal.title}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">
                                      {currentMeal.store}
                                    </div>
                                    {currentMeal.savings !== undefined && currentMeal.savings > 0 && (
                                      <div className="text-xs text-green-600 font-medium">
                                        Sparer {currentMeal.savings.toFixed(0)} kr
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <mealType.icon size={20} className="mx-auto text-gray-400 mb-1" />
                                    <div className="text-xs text-gray-500">{mealType.label}</div>
                                  </div>
                                )}
                              </div>
                            )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile: 3-Day Slider */}
              <div className="lg:hidden relative">
                {/* Navigation Arrows */}
                <button
                  onClick={prevDays}
                  disabled={currentDayOffset === 0}
                  className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg border border-yellow-200 transition-colors ${
                    currentDayOffset === 0 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white hover:bg-yellow-50 text-yellow-600 border-yellow-300'
                  }`}
                >
                  <ChevronLeft size={20} />
                </button>
                
                <button
                  onClick={nextDays}
                  disabled={currentDayOffset >= 4}
                  className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg border border-yellow-200 transition-colors ${
                    currentDayOffset >= 4 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white hover:bg-yellow-50 text-yellow-600 border-yellow-300'
                  }`}
                >
                  <ChevronRight size={20} />
                </button>

                {/* Days Grid */}
                <div className="grid grid-cols-3 gap-4 px-12">
                  {getVisibleDays().map((day, index) => {
                    const actualIndex = currentDayOffset + index
                    return (
                      <div key={day} className="text-center">
                        <div className="font-medium text-gray-900 mb-3">{dayLabels[actualIndex]}</div>
                        <div className="space-y-2">
                          {mealTypes.map(mealType => {
                            const dayKey = day as DayKey
                            const mealKey = mealType.key as MealType
                            const currentMeal = mealPlan[dayKey][mealKey]
                            
                            return (
                              <div
                                key={`${day}-${mealType.key}`}
                                className={`p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                                  currentMeal
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                                }`}
                                onClick={() => {
                                  const dayKey = day as DayKey
                                  const mealKey = mealType.key as MealType
                                  openRecipeSelector(dayKey, mealKey)
                                }}
                                title={currentMeal ? `${currentMeal.title} - ${currentMeal.store}${currentMeal.savings !== undefined && currentMeal.savings > 0 ? ` (Sparer ${currentMeal.savings.toFixed(0)} kr)` : ''}` : `Vælg ${mealType.label.toLowerCase()}`}
                              >
                                {currentMeal ? (
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {currentMeal.title}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">
                                      {currentMeal.store}
                                    </div>
                                    {currentMeal.savings !== undefined && currentMeal.savings > 0 && (
                                      <div className="text-xs text-green-600 font-medium">
                                        Sparer {currentMeal.savings.toFixed(0)} kr
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <mealType.icon size={20} className="mx-auto text-gray-400 mb-1" />
                                    <div className="text-xs text-gray-500">{mealType.label}</div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mobile Day Indicator */}
              <div className="lg:hidden flex justify-center mt-4 space-x-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentDayOffset(index * 3)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      Math.floor(currentDayOffset / 3) === index ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Shopping List */}
            <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <ShoppingCart size={20} className="mr-2" />
                Indkøbsliste
              </h2>
              
              {!shoppingList ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Din indkøbsliste vil blive genereret når du har planlagt din madplan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Shopping list categories */}
                  {shoppingList.categories?.map((category: any, catIndex: number) => (
                    <div key={catIndex} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <h4 className="font-semibold text-gray-900 mb-3">{category.name}</h4>
                      <ul className="space-y-2">
                        {category.items?.map((item: any, itemIndex: number) => (
                          <li key={itemIndex} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2 flex-1">
                              {item.isOptional && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Kombi</span>
                              )}
                              <span className="text-gray-700">
                                {item.name}
                                {item.notes && (
                                  <span className="text-xs text-gray-500 ml-2">({item.notes})</span>
                                )}
                              </span>
                            </div>
                            <span className="text-gray-900 font-medium">
                              {item.amount} {item.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  
                  {/* Basisvarer section */}
                  {basisvarer.length > 0 && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Basisvarer</h4>
                      <ul className="space-y-2">
                        {basisvarer.map((item) => (
                          <li key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{item.ingredient_name}</span>
                            <span className="text-gray-900 font-medium">
                              {item.quantity} {item.unit}
                              {item.notes && (
                                <span className="text-xs text-gray-500 ml-2">({item.notes})</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">Vælg opskrift</h3>
              <button
                onClick={() => setShowRecipeSelector(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Søg efter opskrifter..."
                    value={recipeSearchQuery}
                    onChange={(e) => setRecipeSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={recipeCategoryFilter}
                    onChange={(e) => setRecipeCategoryFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">Alle kategorier</option>
                    <option value="Kylling">Kylling</option>
                    <option value="Fisk">Fisk</option>
                    <option value="Morgenmad">Morgenmad</option>
                    <option value="Pasta">Pasta</option>
                    <option value="Suppe">Suppe</option>
                  </select>
                  <label className="flex items-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCostSavings}
                      onChange={(e) => setShowCostSavings(e.target.checked)}
                      className="text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Vis pengebesparelser</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Recipe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getFilteredRecipes().map(recipe => (
                <div
                  key={recipe.id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-300 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => openRecipeDetail(recipe)}
                >
                  {/* Recipe Image */}
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-400/20 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <ChefHat size={48} className="mx-auto mb-2" />
                        <span className="text-sm">Billede kommer snart</span>
                      </div>
                    </div>
                    {/* Cost Savings Badge */}
                    {showCostSavings && selectedMealSlot && (recipe as any).costSavings && (recipe as any).costSavings.savings > 0 && (
                      <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Sparer {(recipe as any).costSavings.savings.toFixed(2)} kr
                      </div>
                    )}
                  </div>

                  {/* Recipe Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 text-lg group-hover:text-green-600 transition-colors">
                        {recipe.title}
                      </h4>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 text-lg">{recipe.totalPrice?.toFixed(2) || '0.00'} kr</div>
                        {recipe.savings !== undefined && recipe.savings > 0 && (
                          <div className="text-sm text-green-600">Sparer {recipe.savings.toFixed(2)} kr</div>
                        )}
                      </div>
                    </div>

                    {/* Recipe Details */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <span>{recipe.prepTime}</span>
                      <span>{recipe.servings} portioner</span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{recipe.category}</span>
                    </div>

                    {/* Ingredients Preview */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Ingredienser:</p>
                      <div className="flex flex-wrap gap-1">
                        {recipe.ingredients.slice(0, 4).map((ingredient, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {ingredient.name}
                          </span>
                        ))}
                        {recipe.ingredients.length > 4 && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            +{recipe.ingredients.length - 4} mere
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Store and Actions */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{recipe.store}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openRecipeDetail(recipe)
                          }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Se detaljer
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addRecipeToMeal(recipe)
                          }}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Tilføj til madplan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {showRecipeDetail && selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">Opskrift detaljer</h3>
              <button
                onClick={() => setShowRecipeDetail(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Recipe Header */}
            <div className="mb-6">
              <div className="h-64 bg-gray-100 rounded-lg relative overflow-hidden mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-400/20 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <ChefHat size={64} className="mx-auto mb-3" />
                    <span className="text-lg">Billede kommer snart</span>
                  </div>
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedRecipe.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span>{selectedRecipe.prepTime}</span>
                <span>•</span>
                <span>{selectedRecipe.servings} portioner</span>
                <span>•</span>
                <span className="bg-gray-100 px-2 py-1 rounded">{selectedRecipe.category}</span>
              </div>
            </div>

            {/* Recipe Info Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{selectedRecipe.totalPrice.toFixed(2)} kr</div>
                <div className="text-sm text-gray-600">Total pris</div>
              </div>
              {selectedRecipe.savings !== undefined && selectedRecipe.savings > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedRecipe.savings.toFixed(2)} kr</div>
                  <div className="text-sm text-gray-600">Besparer</div>
                </div>
              )}
            </div>

            {/* Ingredients */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Ingredienser</h4>
              <div className="space-y-2">
                {selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">{ingredient.name}</span>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        {ingredient.amount} {ingredient.unit}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{ingredient.price.toFixed(2)} kr</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dietary Tags */}
            {selectedRecipe.dietaryTags && selectedRecipe.dietaryTags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Kosthold</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRecipe.dietaryTags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Store Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Tilgængelig i</h4>
                  <p className="text-sm text-gray-600">{selectedRecipe.store}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Pris</div>
                  <div className="text-lg font-bold text-gray-900">{selectedRecipe.totalPrice.toFixed(2)} kr</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowRecipeDetail(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Luk
              </button>
              <button
                onClick={() => {
                  addRecipeToMeal(selectedRecipe)
                  setShowRecipeDetail(false)
                }}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Tilføj til madplan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family Settings Modal */}
      {showFamilySettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Familieindstillinger</h3>
              <button
                onClick={() => setShowFamilySettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Antal voksne i familien</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={familyProfile.adults}
                  onChange={(e) => setFamilyProfile(prev => ({ ...prev, adults: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Antal børn</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={familyProfile.children}
                  onChange={(e) => setFamilyProfile(prev => ({ ...prev, children: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Dynamic Age Fields */}
              {familyProfile.children > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Børnenes aldre</label>
                  <p className="text-xs text-gray-500 mb-3">Vi spørger om dit barns alder for at optimere madplanen efter det.</p>
                  <div className="space-y-2">
                    {Array.from({ length: familyProfile.children }, (_, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 w-16">Barn {index + 1}:</span>
                        <select
                          value={familyProfile.childrenAges?.[index] || '0-3'}
                          onChange={(e) => {
                            const newAges = [...(familyProfile.childrenAges || [])]
                            newAges[index] = e.target.value
                            setFamilyProfile(prev => ({ ...prev, childrenAges: newAges }))
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="0-3">0-3 år</option>
                          <option value="4-8">4-8 år</option>
                          <option value="8+">8+ år</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={familyProfile.prioritizeOrganic}
                    onChange={(e) => setFamilyProfile(prev => ({ ...prev, prioritizeOrganic: e.target.checked }))}
                    className="text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Prioriter økologi</span>
                </label>
                
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={familyProfile.prioritizeAnimalOrganic}
                    onChange={(e) => setFamilyProfile(prev => ({ ...prev, prioritizeAnimalOrganic: e.target.checked }))}
                    className="text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Prioriter animalsk økologi</span>
                </label>
              </div>
              
              {/* Store Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Vælg butikker tæt på dig</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {mockStores.map(store => (
                    <label key={store.id} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={familyProfile.selectedStores.includes(store.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFamilyProfile(prev => ({
                              ...prev,
                              selectedStores: [...prev.selectedStores, store.id]
                            }))
                          } else {
                            setFamilyProfile(prev => ({
                              ...prev,
                              selectedStores: prev.selectedStores.filter(id => id !== store.id)
                            }))
                          }
                        }}
                        className="text-blue-600 rounded"
                      />
                      <div className={`w-4 h-4 rounded-full ${store.color}`}></div>
                      <span className="text-sm text-gray-700">{store.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Disse butikker bruges til at beregne besparelser og generere madplaner
                </p>
              </div>
              
              {/* Vægttabsprofiler for voksne */}
              {familyProfile.adults > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Vægttabsprofiler for voksne
                  </label>
                  <div className="space-y-2">
                    {Array.from({ length: familyProfile.adults }, (_, index) => {
                      const profile = familyProfile.adultsProfiles[index]
                      const isComplete = profile?.isComplete || false
                      return (
                        <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700">Voksen {index + 1}</span>
                            {isComplete && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <button
                            onClick={() => openWeightLossProfile(index)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {isComplete ? 'Rediger profil' : 'Udfyld profil'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              
              {/* Ekskluderede ingredienser */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Madvarer vi ikke kan lide (ekskluder fra madplan)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { id: 'red-meat', label: 'Rødt kød' },
                    { id: 'poultry', label: 'Fjerkræ' },
                    { id: 'pork', label: 'Svinekød' },
                    { id: 'fish', label: 'Fisk' },
                    { id: 'eggs', label: 'Æg' },
                    { id: 'shellfish', label: 'Skaldyr' },
                    { id: 'nuts', label: 'Nødder' },
                    { id: 'dairy', label: 'Mælkeprodukter' },
                    { id: 'gluten', label: 'Gluten' },
                    { id: 'soy', label: 'Soja' }
                  ].map((food) => (
                    <label key={food.id} className="flex items-center p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={familyProfile.excludedIngredients.includes(food.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFamilyProfile(prev => ({
                              ...prev,
                              excludedIngredients: [...prev.excludedIngredients, food.id]
                            }))
                          } else {
                            setFamilyProfile(prev => ({
                              ...prev,
                              excludedIngredients: prev.excludedIngredients.filter(id => id !== food.id)
                            }))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">{food.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <button
                onClick={async () => {
                  // Save to database before closing
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session) {
                      const response = await fetch('/api/madbudget/family-profile', {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                          familyProfile: {
                            adults: familyProfile.adults,
                            children: familyProfile.children,
                            childrenAges: familyProfile.childrenAges,
                            prioritizeOrganic: familyProfile.prioritizeOrganic,
                            prioritizeAnimalOrganic: familyProfile.prioritizeAnimalOrganic,
                            excludedIngredients: familyProfile.excludedIngredients,
                            selectedStores: familyProfile.selectedStores,
                            variationLevel
                          },
                          adultProfiles: familyProfile.adultsProfiles
                        })
                      })
                      
                      if (response.ok) {
                        setShowFamilySettings(false)
                      } else {
                        alert('Der opstod en fejl ved gemning. Prøv igen.')
                      }
                    } else {
                      setShowFamilySettings(false)
                    }
                  } catch (error) {
                    console.error('Error saving family settings:', error)
                    alert('Der opstod en fejl ved gemning. Prøv igen.')
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Gem indstillinger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basisvarer Modal */}
      {showBasisvarerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">Tilføj til basisvarer</h3>
              <button
                onClick={() => {
                  setShowBasisvarerModal(false)
                  setProductSearchQuery('')
                  setProductSearchText('')
                  setProductSearchResults([])
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs: ingrediens vs. produkt */}
            <div className="mb-4 flex rounded-full bg-gray-100 p-1 text-sm">
              <button
                type="button"
                onClick={() => setBasisTab('ingredient')}
                className={`flex-1 px-3 py-1 rounded-full ${
                  basisTab === 'ingredient'
                    ? 'bg-white shadow text-gray-900 font-medium'
                    : 'text-gray-500'
                }`}
              >
                Ingrediens
              </button>
              <button
                type="button"
                onClick={() => setBasisTab('product')}
                className={`flex-1 px-3 py-1 rounded-full ${
                  basisTab === 'product'
                    ? 'bg-white shadow text-gray-900 font-medium'
                    : 'text-gray-500'
                }`}
              >
                Bestemt vare
              </button>
            </div>

            {/* Indhold for valgt tab */}
            {basisTab === 'ingredient' ? (
              <>
                <div className="mb-6">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Skriv ingrediens navn (fx. Skyr, Mælk, Brød)..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && productSearchQuery.trim()) {
                          addToBasisvarer(productSearchQuery.trim())
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Brug dette til generiske varer familien altid køber (fx. "Skyr", "Havregryn", "Toiletpapir").
                  </p>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => {
                      if (productSearchQuery.trim()) {
                        addToBasisvarer(productSearchQuery.trim())
                      }
                    }}
                    disabled={!productSearchQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg text-sm font-medium transition-colors"
                  >
                    Tilføj "{productSearchQuery || 'ingrediens'}" til basisvarer
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder='Søg efter et produkt (fx. "Cheasy vanilje skyr")...'
                      value={productSearchText}
                      onChange={(e) => setProductSearchText(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Her kan du vælge et helt specifikt produkt (mærke + variant), som altid skal med på indkøbslisten.
                  </p>
                </div>

                {/* Produkt-resultater */}
                <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg">
                  {loadingProductSearch ? (
                    <div className="py-6 text-center text-gray-500 text-sm">
                      Søger efter produkter...
                    </div>
                  ) : !productSearchText.trim() ? (
                    <div className="py-6 text-center text-gray-400 text-sm">
                      Skriv mindst 2–3 bogstaver for at søge efter et produkt.
                    </div>
                  ) : productSearchResults.length === 0 ? (
                    <div className="py-6 text-center text-gray-500 text-sm">
                      Ingen produkter fundet – prøv med et andet søgeord.
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {productSearchResults.map((p) => (
                        <li key={p.id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <span>{p.store}</span>
                              {typeof p.price === 'number' && (
                                <>
                                  <span>•</span>
                                  <span>{p.price.toFixed(2)} kr</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              addToBasisvarer(p.name, `Produkt: ${p.name}`)
                            }
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium"
                          >
                            Tilføj
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Vægttabsprofil Modal */}
      {showWeightLossProfileModal && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowWeightLossProfileModal(false)}
        >
          <motion.div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl sm:w-full max-h-[90vh] overflow-hidden flex flex-col"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  Vægttabsprofil - Voksen {editingAdultIndex !== null ? editingAdultIndex + 1 : ''}
                </h3>
                <button
                  onClick={() => {
                    setShowWeightLossProfileModal(false)
                    setWeightLossProfileStep(0)
                    setCurrentWeightLossProfile({
                      mealsPerDay: ['dinner'],
                      isComplete: false
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-center space-x-4 mb-2">
                  <span className="text-sm text-gray-500">
                    Trin {weightLossProfileStep + 1} af 5
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#1B365D] to-[#87A96B]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((weightLossProfileStep + 1) / 5) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Grundlæggende info */}
                {weightLossProfileStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Grundlæggende information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Køn</label>
                        <select
                          value={currentWeightLossProfile.gender || ''}
                          onChange={(e) => setCurrentWeightLossProfile(prev => ({
                            ...prev,
                            gender: e.target.value as 'male' | 'female'
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                        >
                          <option value="">Vælg køn</option>
                          <option value="male">Mand</option>
                          <option value="female">Kvinde</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Alder</label>
                        <input
                          type="number"
                          value={currentWeightLossProfile.age || ''}
                          onChange={(e) => setCurrentWeightLossProfile(prev => ({
                            ...prev,
                            age: parseInt(e.target.value)
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                          placeholder="År"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Højde (cm)</label>
                        <input
                          type="number"
                          value={currentWeightLossProfile.height || ''}
                          onChange={(e) => setCurrentWeightLossProfile(prev => ({
                            ...prev,
                            height: parseInt(e.target.value)
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                          placeholder="cm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vægt (kg)</label>
                        <input
                          type="number"
                          value={currentWeightLossProfile.weight || ''}
                          onChange={(e) => setCurrentWeightLossProfile(prev => ({
                            ...prev,
                            weight: parseFloat(e.target.value)
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                          placeholder="kg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aktivitetsniveau</label>
                      <select
                        value={currentWeightLossProfile.activityLevel || ''}
                        onChange={(e) => setCurrentWeightLossProfile(prev => ({
                          ...prev,
                          activityLevel: parseFloat(e.target.value) as ActivityLevel
                        }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-transparent"
                      >
                        <option value="">Vælg aktivitetsniveau</option>
                        <option value={ActivityLevel.Sedentary}>Stillesiddende - Lidt eller ingen motion</option>
                        <option value={ActivityLevel.LightlyActive}>Lidt aktiv - Let motion 1-3 dage/uge</option>
                        <option value={ActivityLevel.ModeratelyActive}>Moderat aktiv - Moderat motion 3-5 dage/uge</option>
                        <option value={ActivityLevel.VeryActive}>Meget aktiv - Hård motion 6-7 dage/uge</option>
                        <option value={ActivityLevel.ExtremelyActive}>Ekstremt aktiv - Meget hård motion, fysisk arbejde</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Energiberegning */}
                {weightLossProfileStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {(() => {
                      // Calculate energy needs if we have all required data
                      const hasAllData = currentWeightLossProfile.gender && 
                                        currentWeightLossProfile.age && 
                                        currentWeightLossProfile.height && 
                                        currentWeightLossProfile.weight && 
                                        currentWeightLossProfile.activityLevel
                      
                      let energyNeeds = null
                      if (hasAllData) {
                        const profile: UserProfile = {
                          gender: currentWeightLossProfile.gender!,
                          age: currentWeightLossProfile.age!,
                          height: currentWeightLossProfile.height!,
                          weight: currentWeightLossProfile.weight!,
                          activityLevel: currentWeightLossProfile.activityLevel!,
                          goal: currentWeightLossProfile.weightGoal || WeightGoal.WeightLoss
                        }
                        energyNeeds = DietaryCalculator.calculateTargetCalories(profile)
                      }
                      
                      return (
                        <>
                          <div className="text-center mb-6">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              Dine personlige energibehov
                            </h4>
                            <p className="text-sm text-gray-600">
                              Baseret på din profil, her er dine daglige kalorietargets:
                            </p>
                          </div>

                          {energyNeeds ? (
                            <>
                              <motion.div 
                                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                              >
                                <div className="text-center p-4 bg-[#1B365D]/10 rounded-xl border border-[#1B365D]/20">
                                  <div className="text-2xl font-bold text-[#1B365D] mb-1">
                                    {Math.round(energyNeeds.bmr)}
                                  </div>
                                  <p className="text-xs text-gray-600">Basal stofskifte</p>
                                </div>

                                <div className="text-center p-4 bg-[#87A96B]/10 rounded-xl border border-[#87A96B]/20">
                                  <div className="text-2xl font-bold text-[#87A96B] mb-1">
                                    {Math.round(energyNeeds.tdee)}
                                  </div>
                                  <p className="text-xs text-gray-600">Dagligt energiforbrug</p>
                                </div>

                                <div className="text-center p-4 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                                  <div className="text-2xl font-bold text-[#D4AF37] mb-1">
                                    {energyNeeds.targetCalories}
                                  </div>
                                  <p className="text-xs text-gray-600">Dagligt kalorietarget</p>
                                </div>
                              </motion.div>

                              <div className="text-center">
                                <p className="text-sm text-gray-500">
                                  Disse tal vil blive brugt til at tilpasse din madplan præcist til dine behov.
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p>Udfyld alle profiloplysninger for at se din energiberegning</p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </motion.div>
                )}

                {/* Step 3: Kostretning */}
                {weightLossProfileStep === 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Kostretning</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'keto', name: 'Keto', desc: 'Højt fedt, moderat protein, meget lavt kulhydrat' },
                        { id: 'sense', name: 'Sense', desc: 'Balanceret tilgang til sund mad og vægttab' },
                        { id: 'glp-1', name: 'GLP-1', desc: 'Tilpasset til GLP-1 medicin' },
                        { id: 'anti-inflammatory', name: 'Anti-inflammatorisk', desc: 'Fokuserer på anti-inflammatoriske fødevarer' },
                        { id: 'flexitarian', name: 'Fleksitarisk', desc: 'Primært plantebaseret med lejlighedsvis kød' },
                        { id: '5-2', name: '5:2 diæt', desc: '5 dage normal spisning, 2 dage med meget lavt kalorieindtag' },
                        { id: 'proteinrig-kost', name: 'Proteinrig kost', desc: 'Proteinrige opskrifter til optimal næring' },
                        { id: 'familiemad', name: 'Sund familiemad', desc: 'Klassiske, næringsrige retter der passer til hele familien' }
                      ].map((approach) => (
                        <label
                          key={approach.id}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            currentWeightLossProfile.dietaryApproach === approach.id
                              ? 'border-[#1B365D] bg-[#1B365D]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="dietaryApproach"
                            value={approach.id}
                            checked={currentWeightLossProfile.dietaryApproach === approach.id}
                            onChange={(e) => setCurrentWeightLossProfile(prev => ({
                              ...prev,
                              dietaryApproach: e.target.value
                            }))}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">{approach.name}</div>
                            <div className="text-sm text-gray-600">{approach.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Måltider om dagen */}
                {weightLossProfileStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Hvor mange måltider om dagen?</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'dinner', label: 'Aftensmad', desc: 'Altid inkluderet', required: true },
                        { id: 'breakfast', label: 'Morgenmad', desc: 'Valgfrit' },
                        { id: 'lunch', label: 'Frokost', desc: 'Valgfrit' }
                      ].map((meal) => (
                        <label
                          key={meal.id}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            currentWeightLossProfile.mealsPerDay?.includes(meal.id)
                              ? 'border-[#1B365D] bg-[#1B365D]/5'
                              : meal.required
                              ? 'border-gray-300 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={currentWeightLossProfile.mealsPerDay?.includes(meal.id) || meal.required}
                            disabled={meal.required}
                            onChange={(e) => {
                              if (meal.required) return
                              if (e.target.checked) {
                                setCurrentWeightLossProfile(prev => ({
                                  ...prev,
                                  mealsPerDay: [...(prev.mealsPerDay || []), meal.id]
                                }))
                              } else {
                                setCurrentWeightLossProfile(prev => ({
                                  ...prev,
                                  mealsPerDay: (prev.mealsPerDay || []).filter(id => id !== meal.id)
                                }))
                              }
                            }}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-semibold text-gray-900">{meal.label}</div>
                            <div className="text-sm text-gray-600">{meal.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Mål */}
                {weightLossProfileStep === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Mål</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { value: WeightGoal.WeightLoss, label: 'Ønsker at tabe sig', desc: 'Tabe vægt og forbedre kropssammensætning', icon: '📉' },
                        { value: WeightGoal.Maintenance, label: 'Ønsker at bibeholde vægt', desc: 'Vedligehold din nuværende vægt og forbedre sundhed', icon: '⚖️' },
                        { value: WeightGoal.MuscleGain, label: 'Ønsker at tage på i vægt', desc: 'Byg muskel og øge styrke', icon: '💪' }
                      ].map((goal) => (
                        <label
                          key={goal.value}
                          className={`flex items-center p-6 border-2 rounded-xl cursor-pointer transition-all ${
                            currentWeightLossProfile.weightGoal === goal.value
                              ? 'border-[#1B365D] bg-[#1B365D]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="weightGoal"
                            value={goal.value}
                            checked={currentWeightLossProfile.weightGoal === goal.value}
                            onChange={(e) => setCurrentWeightLossProfile(prev => ({
                              ...prev,
                              weightGoal: e.target.value as WeightGoal
                            }))}
                            className="mr-4"
                          />
                          <div className="flex items-center">
                            <span className="text-2xl mr-4">{goal.icon}</span>
                            <div>
                              <div className="font-semibold text-gray-900 text-lg">{goal.label}</div>
                              <div className="text-gray-600">{goal.desc}</div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  if (weightLossProfileStep > 0) {
                    setWeightLossProfileStep(prev => prev - 1)
                  } else {
                    setShowWeightLossProfileModal(false)
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
                <span>{weightLossProfileStep === 0 ? 'Luk' : 'Tilbage'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Trin {weightLossProfileStep + 1} af 5
                </span>
              </div>

              <button
                onClick={() => {
                  if (weightLossProfileStep < 4) {
                    setWeightLossProfileStep(prev => prev + 1)
                  } else {
                    saveWeightLossProfile()
                  }
                }}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-[#1B365D] to-[#87A96B] text-white rounded-lg hover:shadow-lg transition-all"
              >
                <span>{weightLossProfileStep === 4 ? 'Gem' : 'Næste'}</span>
                {weightLossProfileStep < 4 && <ChevronRight size={20} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Loading Screen for Meal Plan Generation */}
      {isGeneratingMealPlan && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            {/* Animated emoji */}
            <motion.div
              className="text-6xl mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              🍽️
            </motion.div>
            
            {/* Progress text */}
            <motion.p
              key={generationProgress}
              className="text-lg font-semibold text-gray-900 mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {generationProgress}
            </motion.p>
            
            {/* Loading dots */}
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-[#1B365D] rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
