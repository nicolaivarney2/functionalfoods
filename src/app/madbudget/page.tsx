'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import MadbudgetShopSurveyModal from '@/components/MadbudgetShopSurveyModal'
import { Calendar, Users, ShoppingCart, X, ChefHat, Coffee, Utensils, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search, CheckCircle, LayoutGrid, Eye, PieChart, Share2, Scale, Smartphone, ListChecks, Copy, Check, Lock, HelpCircle } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { DietaryCalculator, UserProfile, ActivityLevel, WeightGoal, dietaryFactory } from '@/lib/dietary-system'
import { mealPlanGenerator, getPeoplePerMealFromAdultsProfiles } from '@/lib/meal-plan-system'
import { mergeVitaminsAgainstRda } from '@/lib/nutrition-reference-values'

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

interface PlannerIngredient {
  name: string
  amount: string | number
  unit: string
  price?: number
}

interface PlannerRecipe {
  id: string | number
  slug?: string
  title: string
  image?: string
  imageUrl?: string
  ingredients: PlannerIngredient[]
  totalPrice?: number
  savings?: number
  store?: string
  mealType?: 'breakfast' | 'lunch' | 'dinner'
  prepTime: string
  servings: number
  category: string
  dietaryTags: string[]
  mealTypeMatch?: boolean
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  vitamins?: Record<string, number>
}

// Mock data for development
const STORE_KEY_BY_ID: Record<number, string> = {
  1: 'rema-1000',
  2: 'netto',
  3: 'føtex',
  4: 'bilka',
  5: 'nemlig',
  6: 'meny',
  7: 'spar',
  8: 'løvbjerg',
}

function storeIdFromTabKey(tab: string): number | null {
  const found = Object.entries(STORE_KEY_BY_ID).find(([, k]) => k === tab)
  return found ? Number(found[0]) : null
}

type DayKeyPlanner = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
type MealTypePlanner = 'breakfast' | 'lunch' | 'dinner'

function emptyMealPlanGrid(): Record<DayKeyPlanner, Record<MealTypePlanner, any | null>> {
  return {
    monday: { breakfast: null, lunch: null, dinner: null },
    tuesday: { breakfast: null, lunch: null, dinner: null },
    wednesday: { breakfast: null, lunch: null, dinner: null },
    thursday: { breakfast: null, lunch: null, dinner: null },
    friday: { breakfast: null, lunch: null, dinner: null },
    saturday: { breakfast: null, lunch: null, dinner: null },
    sunday: { breakfast: null, lunch: null, dinner: null },
  }
}

/** meal_plan_data er enten legacy (kun grid) eller { v, grid, slotLocks }. */
function parseMealPlanData(raw: unknown): {
  grid: Record<DayKeyPlanner, Record<MealTypePlanner, any | null>>
  slotLocks: Record<string, boolean>
} {
  if (!raw || typeof raw !== 'object') {
    return { grid: emptyMealPlanGrid(), slotLocks: {} }
  }
  const o = raw as Record<string, unknown>
  if ('grid' in o && o.grid && typeof o.grid === 'object') {
    const g = o.grid as Record<string, unknown>
    if (g.monday) {
      const locks = (o.slotLocks as Record<string, boolean>) || {}
      return { grid: o.grid as Record<DayKeyPlanner, Record<MealTypePlanner, any | null>>, slotLocks: locks }
    }
  }
  if ('monday' in o) {
    return { grid: raw as Record<DayKeyPlanner, Record<MealTypePlanner, any | null>>, slotLocks: {} }
  }
  return { grid: emptyMealPlanGrid(), slotLocks: {} }
}

function wrapMealPlanForSave(
  grid: Record<DayKeyPlanner, Record<MealTypePlanner, any | null>>,
  slotLocks: Record<string, boolean>
) {
  return { v: 2 as const, grid, slotLocks }
}

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

/** Sand hvis alle felter til madgenerering er sat (uafhængigt af DB-flaget is_complete, som historisk kan være forkert). */
function adultProfileHasRequiredFieldsForMealPlan(p: Partial<AdultProfile>): boolean {
  const age = Number(p.age)
  const h = Number(p.height)
  const w = Number(p.weight)
  return Boolean(
    p.gender &&
    Number.isFinite(age) &&
    age > 0 &&
    age < 130 &&
    Number.isFinite(h) &&
    h > 40 &&
    h < 260 &&
    Number.isFinite(w) &&
    w > 25 &&
    w < 400 &&
    p.activityLevel != null &&
    String(p.activityLevel) !== '' &&
    p.dietaryApproach &&
    String(p.dietaryApproach).trim() !== '' &&
    p.weightGoal != null &&
    String(p.weightGoal).trim() !== ''
  )
}

export default function MadbudgetPage() {
  const [familyProfile, setFamilyProfile] = useState({
    adults: 1,
    children: 0,
    childrenAges: [] as string[],
    prioritizeOrganic: true,
    prioritizeAnimalOrganic: false,
    excludedIngredients: [] as string[], // Changed from dislikedIngredients
    selectedStores: [1, 2, 8], // REMA 1000, Netto, Løvbjerg
    adultsProfiles: [] as AdultProfile[], // New: profiles for each adult
    /** Valgfrit max-indkøb pr. uge (kr); null = intet loft */
    weeklyBudgetKr: null as number | null
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

  /** Låste felter bevares ved «Generer ny madplan» (nøgle: `${dayKey}_${mealKey}`). */
  const [slotLocks, setSlotLocks] = useState<Record<string, boolean>>({})
  const [lockDishesMode, setLockDishesMode] = useState(false)
  const [mealInfoKind, setMealInfoKind] = useState<'breakfast' | 'lunch' | null>(null)

  const smartShoppingWeekMeta: { dayKey: DayKey; dayLabel: string }[] = [
    { dayKey: 'monday', dayLabel: 'Mandag' },
    { dayKey: 'tuesday', dayLabel: 'Tirsdag' },
    { dayKey: 'wednesday', dayLabel: 'Onsdag' },
    { dayKey: 'thursday', dayLabel: 'Torsdag' },
    { dayKey: 'friday', dayLabel: 'Fredag' },
    { dayKey: 'saturday', dayLabel: 'Lørdag' },
    { dayKey: 'sunday', dayLabel: 'Søndag' },
  ]
  const smartShoppingMealSlots: { mealKey: MealType; label: string }[] = [
    { mealKey: 'breakfast', label: 'Morgenmad' },
    { mealKey: 'lunch', label: 'Frokost' },
    { mealKey: 'dinner', label: 'Aftensmad' },
  ]
  
  const [savedMealPlans, setSavedMealPlans] = useState<any[]>([])
  const [activePlanRef, setActivePlanRef] = useState<any>(null)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(null)
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(0)
  
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [selectedMealSlot, setSelectedMealSlot] = useState('')
  const [showFamilySettings, setShowFamilySettings] = useState(false)
  const [currentDayOffset, setCurrentDayOffset] = useState(0)
  const [showRecipeDetail, setShowRecipeDetail] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [availableRecipes, setAvailableRecipes] = useState<PlannerRecipe[]>([])
  const [loadingAvailableRecipes, setLoadingAvailableRecipes] = useState(false)
  const [availableRecipesError, setAvailableRecipesError] = useState<string | null>(null)
  const [recipeViewSlugOrId, setRecipeViewSlugOrId] = useState<string | null>(null)
  const [recipeViewSlot, setRecipeViewSlot] = useState<{ dayKey: DayKey; mealKey: MealType } | null>(null)
  const [recipeViewData, setRecipeViewData] = useState<any>(null)
  const [recipeViewLoading, setRecipeViewLoading] = useState(false)
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('all')
  const [showNutritionDetails, setShowNutritionDetails] = useState(false)
  const [selectedNutritionAdultIndex, setSelectedNutritionAdultIndex] = useState(0)
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const router = useRouter()
  const [shopSurveyOpen, setShopSurveyOpen] = useState(false)
  const [shopSurveyStores, setShopSurveyStores] = useState<{ id: number; name: string }[]>([])
  const [shopSurveyToken, setShopSurveyToken] = useState('')

  const getMealTypeFromRecipe = (recipe: any): MealType | undefined => {
    const labelPool = [
      recipe?.mainCategory,
      ...(Array.isArray(recipe?.subCategories) ? recipe.subCategories : []),
      ...(Array.isArray(recipe?.categories) ? recipe.categories : [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (!labelPool) return undefined
    if (labelPool.includes('morgenmad') || labelPool.includes('breakfast') || labelPool.includes('brunch')) return 'breakfast'
    if (labelPool.includes('frokost') || labelPool.includes('lunch')) return 'lunch'
    if (
      labelPool.includes('aftensmad') ||
      labelPool.includes('middag') ||
      labelPool.includes('dinner')
    ) return 'dinner'

    return undefined
  }

  const normalizeRecipeForPlanner = (recipe: any): PlannerRecipe => {
    const mappedIngredients: PlannerIngredient[] = Array.isArray(recipe?.ingredients)
      ? recipe.ingredients.map((ing: any) => ({
          name: ing?.name || ing?.ingredient_name || 'Ukendt ingrediens',
          amount: ing?.amount ?? '',
          unit: ing?.unit ?? ''
        }))
      : []

    const ni = recipe?.nutritionalInfo
    const calories = recipe?.calories ?? ni?.calories
    const protein = recipe?.protein ?? ni?.protein
    const carbs = recipe?.carbs ?? ni?.carbs
    const fat = recipe?.fat ?? ni?.fat
    const fiber = recipe?.fiber ?? ni?.fiber

    return {
      id: recipe?.id,
      slug: recipe?.slug || '',
      title: recipe?.title || 'Ukendt opskrift',
      image: recipe?.image || recipe?.imageUrl || recipe?.image_url || '',
      imageUrl: recipe?.imageUrl || recipe?.image_url || recipe?.image || '',
      ingredients: mappedIngredients,
      prepTime: recipe?.totalTime ? `${recipe.totalTime} min` : (recipe?.preparationTime ? `${recipe.preparationTime} min` : '30 min'),
      servings: recipe?.servings ?? 4,
      category: recipe?.mainCategory || recipe?.categories?.[0] || 'Andet',
      dietaryTags: Array.isArray(recipe?.dietaryCategories)
        ? recipe.dietaryCategories
        : (Array.isArray(recipe?.dietaryApproaches) ? recipe.dietaryApproaches : []),
      mealType: getMealTypeFromRecipe(recipe),
      calories: typeof calories === 'number' ? calories : undefined,
      protein: typeof protein === 'number' ? protein : undefined,
      carbs: typeof carbs === 'number' ? carbs : undefined,
      fat: typeof fat === 'number' ? fat : undefined,
      fiber: typeof fiber === 'number' ? fiber : undefined,
      vitamins: recipe?.vitamins
    }
  }

  useEffect(() => {
    if (!showRecipeSelector) {
      setAvailableRecipes([])
      return
    }
    if (availableRecipes.length > 0) return

    let cancelled = false

    const loadRecipes = async () => {
      setLoadingAvailableRecipes(true)
      setAvailableRecipesError(null)
      try {
        const response = await fetch('/api/recipes')
        const data = await response.json()
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Kunne ikke hente opskrifter')
        }

        const normalized = (Array.isArray(data.recipes) ? data.recipes : []).map(normalizeRecipeForPlanner)
        if (!cancelled) {
          setAvailableRecipes(normalized)
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableRecipesError(error instanceof Error ? error.message : 'Kunne ikke hente opskrifter')
        }
      } finally {
        if (!cancelled) {
          setLoadingAvailableRecipes(false)
        }
      }
    }

    loadRecipes()

    return () => {
      cancelled = true
    }
  }, [showRecipeSelector, availableRecipes.length])
  
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

  // View mode: week grid vs day view (Skift visning)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  // Selected day in day view (0 = Monday, 6 = Sunday)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    return day === 0 ? 6 : day - 1
  })

  // Shopping list state
  const [shoppingList, setShoppingList] = useState<any>(null)
  const [storePrices, setStorePrices] = useState<Record<string, Record<string, any>>>({})
  const [selectedStoreTab, setSelectedStoreTab] = useState<string>('all')
  const [loadingPrices, setLoadingPrices] = useState(false)

  const [shoppingMode, setShoppingMode] = useState(false)
  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({})
  const [showSmsModal, setShowSmsModal] = useState(false)
  const [smsPhoneDigits, setSmsPhoneDigits] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsError, setSmsError] = useState('')
  const [pendingSmartToken, setPendingSmartToken] = useState<string | null>(null)
  const [pendingSmartUrl, setPendingSmartUrl] = useState<string | null>(null)
  const [smartLinkCopied, setSmartLinkCopied] = useState(false)
  const [creatingSmartLink, setCreatingSmartLink] = useState(false)
  const [smartShareError, setSmartShareError] = useState('')

  const shoppingCheckStorageKey = `ff_madbudget_shop_${activePlanRef?.id || 'draft'}`

  useEffect(() => {
    try {
      const p = localStorage.getItem('ff_smart_shopping_phone_digits')
      if (p) setSmsPhoneDigits(p)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(shoppingCheckStorageKey)
      if (raw) setShoppingChecked(JSON.parse(raw))
    } catch {
      setShoppingChecked({})
    }
  }, [shoppingCheckStorageKey])

  useEffect(() => {
    try {
      localStorage.setItem(shoppingCheckStorageKey, JSON.stringify(shoppingChecked))
    } catch {
      /* ignore */
    }
  }, [shoppingChecked, shoppingCheckStorageKey])

  // Removed excessive debug logging
  
  const formatQuantity = (value: any) => {
    const num = typeof value === 'number' ? value : parseFloat(value)
    if (!Number.isFinite(num)) return value
    const rounded = parseFloat(Number(num).toFixed(2))
    const formatted = rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1)
    return formatted.replace('.', ',')
  }

  // Fetch prices for shopping list items per store
  const fetchStorePrices = async () => {
    if (!shoppingList || !familyProfile.selectedStores || familyProfile.selectedStores.length === 0) {
      console.log('⚠️ Cannot fetch prices: missing shoppingList or selectedStores')
      return
    }

    setLoadingPrices(true)
    try {
      // Flatten shopping list items - include ingredientId if available
      const items: any[] = []
      let itemsWithId = 0
        shoppingList.categories?.forEach((category: any) => {
          category.items?.forEach((item: any) => {
            if (item.ingredientId) itemsWithId++
            items.push({
              name: item.name,
              amount: item.amount,
              unit: item.unit,
              ingredientId: item.ingredientId, // Include ingredientId for direct matching
              isBasis: item.isBasis || false // Include isBasis flag
            })
          })
        })

      // Reduced logging - only log summary
      if (itemsWithId < items.length) {
        console.log(`📦 Fetching prices: ${items.length} items (${itemsWithId} with ingredientId)`)
      }

      const response = await fetch('/api/madbudget/shopping-list-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoppingListItems: items,
          selectedStoreIds: familyProfile.selectedStores
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API error:', response.status, errorText)
        return
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        const storeKeys = Object.keys(data.data)
        const totalItems = Object.values(data.data).reduce((sum: number, store: any) => sum + Object.keys(store).length, 0)
        
        if (totalItems === 0 && data.debug) {
          console.warn('⚠️ No prices found. Debug info:', data.debug)
        } else {
          console.log(`✅ Prices loaded: ${totalItems} items across ${storeKeys.length} stores`)
        }
        
        setStorePrices(data.data)
      } else {
        console.warn('⚠️ API returned success but no data')
        if (data.debug) {
          console.warn('Debug info:', data.debug)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching store prices:', error)
    } finally {
      setLoadingPrices(false)
    }
  }

  // Fetch prices when shopping list changes
  useEffect(() => {
    if (shoppingList && familyProfile.selectedStores && familyProfile.selectedStores.length > 0) {
      fetchStorePrices()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shoppingList])

  // Debug: log what frontend received for shopping list (categories + ingredientId/isBasis per item)
  useEffect(() => {
    if (!shoppingList?.categories) return
    console.log('🧾 ShoppingList from API (debug):', shoppingList.categories.map((cat: any) => ({
      name: cat.name,
      items: cat.items?.map((i: any) => ({
        name: i.name,
        ingredientId: i.ingredientId ?? null,
        isBasis: i.isBasis ?? false,
      })) ?? [],
    })))
  }, [shoppingList])

  const toggleShoppingItem = (key: string) => {
    setShoppingChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const openSmartShoppingFlow = async () => {
    if (!shoppingList) return
    setSmartShareError('')
    if (selectedStoreTab === 'all') {
      setSmartShareError('Vælg en butik-fane (fx Netto eller REMA) først – så ved vi hvilken butik du handler i.')
      return
    }
    const sid = storeIdFromTabKey(selectedStoreTab)
    if (!sid) {
      setSmartShareError('Ukendt butik.')
      return
    }
    const store = mockStores.find((s) => s.id === sid)
    if (!store) return
    setCreatingSmartLink(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setSmartShareError('Log ind for at sende link til mobil.')
        return
      }
      const pricesSlice = storePrices[selectedStoreTab]
        ? { [selectedStoreTab]: storePrices[selectedStoreTab], _fetchedAt: new Date().toISOString() }
        : null
      const res = await fetch('/api/smart-shopping/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mealPlanId: activePlanRef?.id ?? null,
          storeId: sid,
          storeKey: selectedStoreTab,
          storeName: store.name,
          shoppingList,
          shoppingListPrices: pricesSlice,
          mealSummary: {
            title: `Madplan uge ${selectedWeekNumber ?? currentWeekNumber}`,
            days: smartShoppingWeekMeta.map(({ dayKey, dayLabel }) => ({
              dayLabel,
              meals: smartShoppingMealSlots.map(({ mealKey, label }) => ({
                slot: label,
                title: mealPlan[dayKey][mealKey]?.title ?? null,
              })),
            })),
          },
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSmartShareError(json.error || 'Kunne ikke oprette link')
        return
      }
      const shareUrl =
        typeof json.url === 'string' && json.url.length > 0
          ? json.url
          : `${typeof window !== 'undefined' ? window.location.origin : ''}/indkob/${json.token}`
      setPendingSmartToken(json.token)
      setPendingSmartUrl(shareUrl)
      setSmsError('')
      setShowSmsModal(true)
    } finally {
      setCreatingSmartLink(false)
    }
  }

  const copyPendingSmartLink = async () => {
    if (!pendingSmartUrl) return
    try {
      await navigator.clipboard.writeText(pendingSmartUrl)
      setSmartLinkCopied(true)
      window.setTimeout(() => setSmartLinkCopied(false), 2000)
    } catch {
      setSmsError('Kunne ikke kopiere – vælg linket manuelt.')
    }
  }

  const sendSmartSms = async () => {
    const digits = smsPhoneDigits.replace(/\D/g, '')
    if (!pendingSmartToken || digits.length !== 8) {
      setSmsError('Skriv 8 cifre (dansk mobil)')
      return
    }
    if (pendingSmartUrl) {
      try {
        await navigator.clipboard.writeText(pendingSmartUrl)
        setSmartLinkCopied(true)
        window.setTimeout(() => setSmartLinkCopied(false), 2000)
      } catch {
        /* SMS forsøges alligevel */
      }
    }
    setSmsSending(true)
    setSmsError('')
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        setSmsError('Log ind igen.')
        return
      }
      const res = await fetch('/api/smart-shopping/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token: pendingSmartToken,
          phoneDigits: digits,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSmsError(json.error || 'SMS fejlede')
        return
      }
      try {
        localStorage.setItem('ff_smart_shopping_phone_digits', digits)
      } catch {
        /* ignore */
      }
      setShowSmsModal(false)
      setPendingSmartToken(null)
      setPendingSmartUrl(null)
      alert('SMS sendt – tjek din telefon.')
    } finally {
      setSmsSending(false)
    }
  }

  // Basisvarer state
  const [basisvarer, setBasisvarer] = useState<BasisvarerIngredient[]>([])
  const [showBasisvarerModal, setShowBasisvarerModal] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('') // generisk ingrediensnavn
  const [basisTab, setBasisTab] = useState<'ingredient' | 'product'>('ingredient')
  const [productSearchText, setProductSearchText] = useState('') // søgning efter konkrete produkter
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([])
  const [, setLoadingBasisvarer] = useState(false)
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
                adults: result.data.familyProfile.adults ?? prev.adults,
                children: result.data.familyProfile.children ?? prev.children,
                childrenAges: result.data.familyProfile.children_ages || prev.childrenAges,
                prioritizeOrganic: result.data.familyProfile.prioritize_organic ?? prev.prioritizeOrganic,
                prioritizeAnimalOrganic: result.data.familyProfile.prioritize_animal_organic ?? prev.prioritizeAnimalOrganic,
                excludedIngredients: result.data.familyProfile.excluded_ingredients || prev.excludedIngredients,
                selectedStores: result.data.familyProfile.selected_stores || prev.selectedStores,
                weeklyBudgetKr:
                  result.data.familyProfile.weekly_budget_kr != null
                    ? result.data.familyProfile.weekly_budget_kr
                    : prev.weeklyBudgetKr
              }))
              setVariationLevel(result.data.familyProfile.variation_level || 2)
            }
            if (result.data.adultProfiles && result.data.adultProfiles.length > 0) {
              setFamilyProfile(prev => ({
                ...prev,
                adultsProfiles: result.data.adultProfiles.map((p: any) => {
                  const row: AdultProfile = {
                    id: String(p.id ?? `adult-${p.adult_index ?? 0}`),
                    gender: p.gender,
                    age: p.age,
                    height: p.height,
                    weight: p.weight,
                    activityLevel: p.activity_level,
                    dietaryApproach: p.dietary_approach,
                    mealsPerDay: Array.isArray(p.meals_per_day) ? p.meals_per_day : ['dinner'],
                    weightGoal: p.weight_goal,
                    isComplete: Boolean(p.is_complete),
                  }
                  return {
                    ...row,
                    isComplete: row.isComplete || adultProfileHasRequiredFieldsForMealPlan(row),
                  }
                }),
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
    const timeoutId = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

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
              variationLevel,
              weeklyBudgetKr: familyProfile.weeklyBudgetKr
            },
            adultProfiles: familyProfile.adultsProfiles
          })
        })

        if (!response.ok) {
          console.error('Autosave family profile failed:', await response.text())
        }
      } catch (error) {
        console.error('Error saving family profile:', error)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [familyProfile, variationLevel])

  // Load basisvarer on component mount
  useEffect(() => {
    loadBasisvarer()
  }, [])

  // Fetch full recipe when opening recipe view modal
  useEffect(() => {
    if (!recipeViewSlugOrId) {
      setRecipeViewData(null)
      return
    }
    let cancelled = false
    setRecipeViewLoading(true)
    setRecipeViewData(null)
    fetch(`/api/recipes/${encodeURIComponent(recipeViewSlugOrId)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled) {
          setRecipeViewData(data)
        }
      })
      .catch(() => {
        if (!cancelled) setRecipeViewData(null)
      })
      .finally(() => {
        if (!cancelled) setRecipeViewLoading(false)
      })
    return () => { cancelled = true }
  }, [recipeViewSlugOrId])
  
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
              const parsed = parseMealPlanData(activePlan.meal_plan_data)
              setMealPlan(parsed.grid)
              setSlotLocks(parsed.slotLocks)
              setShoppingList(activePlan.shopping_list || [])
              setSelectedWeekNumber(activePlan.week_number || null)
              setActivePlanRef(activePlan)
            } else {
              setActivePlanRef(null)
            }
          }
        }
      } catch (error) {
        console.error('Error loading meal plans:', error)
      }
    }
    
    loadMealPlans()
  }, [])

  // Ugentlig indkøbsundersøgelse: ny uge + madplan sidste uge, eller ?shopSurvey=1 til test
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || cancelled) {
          if (!session) setShopSurveyOpen(false)
          return
        }
        const force =
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('shopSurvey') === '1'
        const url = force ? '/api/madbudget/shop-survey/status?force=1' : '/api/madbudget/shop-survey/status'
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok || cancelled) return
        const j = await res.json()
        if (!j.success || cancelled || !j.showSurvey) return
        setShopSurveyStores(Array.isArray(j.storeOptions) ? j.storeOptions : [])
        setShopSurveyToken(session.access_token)
        setShopSurveyOpen(true)
      } catch {
        // fx. manglende SQL-migration — ignorer stille
      }
    }
    run()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) run()
      else setShopSurveyOpen(false)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])
  
  // Function to load a specific week's meal plan
  const loadWeekMealPlan = async (weekNumber: number) => {
    const plan = savedMealPlans.find((p: any) => p.week_number === weekNumber)
    if (plan && plan.meal_plan_data) {
      const parsed = parseMealPlanData(plan.meal_plan_data)
      setMealPlan(parsed.grid)
      setSlotLocks(parsed.slotLocks)
      setShoppingList(plan.shopping_list || [])
      setSelectedWeekNumber(weekNumber)
      setActivePlanRef(plan)
    }
  }

  const getWeekDatesForSave = () => {
    const now = new Date()
    const dayNum = now.getDay()
    const mondayOffset = dayNum === 0 ? -6 : 1 - dayNum
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    const getWeekNumber = (date: Date): number => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
      const dayNum = d.getUTCDay() || 7
      d.setUTCDate(d.getUTCDate() + 4 - dayNum)
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    }
    return {
      weekStartDate: weekStart.toISOString().split('T')[0],
      weekEndDate: weekEnd.toISOString().split('T')[0],
      weekNumber: getWeekNumber(weekStart)
    }
  }

  const saveMealPlanToDb = async (mealPlanData: Record<DayKey, Record<MealType, any | null>>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const weekInfo = activePlanRef
        ? {
            weekStartDate: activePlanRef.week_start_date,
            weekEndDate: activePlanRef.week_end_date,
            weekNumber: activePlanRef.week_number || getWeekDatesForSave().weekNumber
          }
        : getWeekDatesForSave()

      const response = await fetch('/api/madbudget/meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: `Madplan Uge ${weekInfo.weekNumber} (${weekInfo.weekStartDate})`,
          weekStartDate: weekInfo.weekStartDate,
          weekEndDate: weekInfo.weekEndDate,
          weekNumber: weekInfo.weekNumber,
          variationLevel: activePlanRef?.variation_level ?? variationLevel,
          familyProfileSnapshot: activePlanRef?.family_profile_snapshot ?? null,
          mealPlanData: wrapMealPlanForSave(mealPlanData, slotLocks),
          shoppingList: activePlanRef?.shopping_list ?? shoppingList,
          totalCost: activePlanRef?.total_cost ?? null,
          totalSavings: activePlanRef?.total_savings ?? null,
          estimatedCaloriesPerDay: activePlanRef?.estimated_calories_per_day ?? null
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setActivePlanRef(result.data)
          setSavedMealPlans(prev => {
            const existing = prev.find((p: any) => p.week_number === result.data.week_number)
            if (existing) {
              return prev.map((p: any) => p.week_number === result.data.week_number ? result.data : p)
            }
            return [result.data, ...prev]
          })
        }
      }
    } catch (error) {
      console.error('Error saving meal plan:', error)
    }
  }

  // Del madplan – opret delbart link
  const handleSharePlan = async () => {
    const planId = activePlanRef?.id
    if (!planId) return
    setShareLoading(true)
    setShareCopied(false)
    setShareUrl(null)
    const startTime = Date.now()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Log ind for at dele din madplan')
        setShareLoading(false)
        return
      }
      const res = await fetch('/api/madbudget/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ mealPlanId: planId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Kunne ikke dele')
      const url = data.shareUrl
      if (url) {
        try {
          await navigator.clipboard.writeText(url)
          setShareCopied(true)
          setTimeout(() => setShareCopied(false), 3000)
        } catch {
          // Fallback: vis link så bruger kan kopiere manuelt (fx. når clipboard er blokeret)
          setShareUrl(url)
        }
      }
    } catch (e) {
      console.error('Share error:', e)
      alert('Kunne ikke dele madplan. Prøv igen.')
    } finally {
      const elapsed = Date.now() - startTime
      if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed))
      setShareLoading(false)
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

  const _updateBasisvarerQuantity = async (basisvarerId: number, newQuantity: number) => {
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

  const _removeFromBasisvarer = async (basisvarerId: number) => {
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
  void [_updateBasisvarerQuantity, _removeFromBasisvarer]

  const primaryDietForRecipePicker = useMemo(() => {
    const complete = familyProfile.adultsProfiles.filter(
      (p) => adultProfileHasRequiredFieldsForMealPlan(p)
    )
    const idx = Math.min(selectedNutritionAdultIndex, Math.max(0, complete.length - 1))
    return (
      complete[idx]?.dietaryApproach ||
      complete[0]?.dietaryApproach ||
      familyProfile.adultsProfiles[0]?.dietaryApproach ||
      ''
    )
  }, [familyProfile.adultsProfiles, selectedNutritionAdultIndex])

  const peoplePerMealForNutrition = useMemo(
    () =>
      getPeoplePerMealFromAdultsProfiles(familyProfile.adultsProfiles, familyProfile.adults),
    [familyProfile.adultsProfiles, familyProfile.adults]
  )

  const recipeMatchesMealSlot = (recipe: PlannerRecipe, meal: MealType): boolean => {
    const blob = `${recipe.category || ''} ${recipe.title || ''} ${(recipe.dietaryTags || []).join(' ')}`.toLowerCase()
    if (recipe.mealType === meal) return true
    if (meal === 'breakfast') {
      return /morgenmad|breakfast|brunch/.test(blob)
    }
    if (meal === 'lunch') {
      return /frokost|lunch/.test(blob)
    }
    if (meal === 'dinner') {
      if (recipe.mealType === 'breakfast' || recipe.mealType === 'lunch') return false
      if (recipe.mealType === 'dinner') return true
      return /aftensmad|middag|dinner|hovedret|one.?pot|gryde|ovn/.test(blob) || !recipe.mealType
    }
    return false
  }

  const recipeMatchesProfileDiet = (recipe: PlannerRecipe, dietId: string): boolean => {
    if (!dietId) return true
    const d = dietId.toLowerCase()
    const blob = `${(recipe.dietaryTags || []).join(' ')} ${recipe.category || ''}`.toLowerCase()
    if (d.includes('keto')) return blob.includes('keto')
    if (d.includes('sense')) return blob.includes('sense')
    if (d.includes('glp')) return blob.includes('glp') || blob.includes('glp-1')
    if (d.includes('familie')) return true
    if (d.includes('anti')) return blob.includes('anti') || blob.includes('inflamm')
    if (d.includes('flex')) return blob.includes('flex') || blob.includes('plante')
    if (d.includes('5-2') || d.includes('5:2')) return true
    if (d.includes('protein')) return blob.includes('protein')
    return blob.includes(d)
  }

  // Get filtered recipes based on search, category, måltidsslots og valgt kostprofil
  const getFilteredRecipes = () => {
    let filtered: PlannerRecipe[] = [...availableRecipes]
    if (!selectedMealSlot || !selectedMealSlot.includes('-')) return filtered
    const [, selectedMeal] = selectedMealSlot.split('-') as [DayKey, MealType]

    filtered = filtered.filter((recipe) => recipeMatchesMealSlot(recipe, selectedMeal))
    filtered = filtered.filter((recipe) => recipeMatchesProfileDiet(recipe, primaryDietForRecipePicker))

    if (recipeSearchQuery) {
      filtered = filtered.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
          recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()))
      )
    }

    if (recipeCategoryFilter !== 'all') {
      filtered = filtered.filter((recipe) => recipe.category === recipeCategoryFilter)
    }

    return filtered.map((recipe) => ({
      ...recipe,
      mealTypeMatch: recipe.mealType === selectedMeal,
    }))
  }


  const addRecipeToMeal = (recipe: any) => {
    if (selectedMealSlot) {
      const [day, meal] = selectedMealSlot.split('-') as [DayKey, MealType]
      const updatedPlan = {
        ...mealPlan,
        [day]: {
          ...mealPlan[day],
          [meal]: recipe
        }
      }
      setMealPlan(updatedPlan)
      setShowRecipeSelector(false)
      setSelectedMealSlot('')
      saveMealPlanToDb(updatedPlan)
    }
  }

  const slotKey = (d: DayKey, m: MealType) => `${d}_${m}`

  const openRecipeSelector = (day: DayKey, meal: MealType) => {
    setSelectedMealSlot(`${day}-${meal}`)
    setShowRecipeSelector(true)
    setRecipeSearchQuery('')
    setRecipeCategoryFilter('all')
  }

  const handleMealCellClick = (dayKey: DayKey, mealKey: MealType) => {
    if (lockDishesMode) {
      const k = slotKey(dayKey, mealKey)
      setSlotLocks((prev) => ({ ...prev, [k]: !prev[k] }))
      return
    }
    openRecipeSelector(dayKey, mealKey)
  }

  const plannerMealToggles = useMemo(() => {
    const src = familyProfile.adultsProfiles[0]
    const set = new Set(src?.mealsPerDay || ['dinner'])
    return {
      breakfast: set.has('breakfast'),
      lunch: set.has('lunch'),
      dinner: true,
    }
  }, [familyProfile.adultsProfiles])

  const setPlannerMealIncluded = (meal: 'breakfast' | 'lunch', checked: boolean) => {
    setFamilyProfile((prev) => ({
      ...prev,
      adultsProfiles: prev.adultsProfiles.map((p) => {
        const cur = new Set(p.mealsPerDay || ['dinner'])
        cur.add('dinner')
        if (checked) cur.add(meal)
        else cur.delete(meal)
        return { ...p, mealsPerDay: Array.from(cur) }
      }),
    }))
  }

  const openRecipeDetail = (recipe: any) => {
    setSelectedRecipe(recipe)
    setShowRecipeDetail(true)
  }

  const recipeCategories = Array.from(
    new Set(availableRecipes.map(recipe => recipe.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'da'))

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
              variationLevel,
              weeklyBudgetKr: familyProfile.weeklyBudgetKr
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
    if (familyProfile.adultsProfiles.length !== familyProfile.adults) return false
    return familyProfile.adultsProfiles.every(
      (p) => p.isComplete || adultProfileHasRequiredFieldsForMealPlan(p)
    )
  }

  // Validate dietary approaches - voksne skal have samme kostretning eller en på familiemad
  const validateDietaryApproaches = () => {
    if (familyProfile.adults === 0) return true
    
    const approaches = familyProfile.adultsProfiles
      .filter(
        (p) =>
          (p.isComplete || adultProfileHasRequiredFieldsForMealPlan(p)) && p.dietaryApproach
      )
      .map((p) => p.dietaryApproach)
    
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
      alert('Voksne skal have samme kostretning, eller mindst én skal være på kalorietælling (familiemad) hvis der er børn')
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
            weightGoal: p.weightGoal,
            excludedFoods: []
          })),
          excludedIngredients: familyProfile.excludedIngredients,
          selectedStores: familyProfile.selectedStores,
          prioritizeOrganic: familyProfile.prioritizeOrganic,
          weeklyBudgetKr: familyProfile.weeklyBudgetKr
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
              slug: meal.recipe.slug || '',
              title: meal.recipe.title,
              image: meal.recipe.images?.[0] || '',
              ingredients: (meal.recipe.ingredients ?? []).map((ing: any) => ({
                name: ing.name || ing.ingredientName,
                amount: ing.amount,
                unit: ing.unit
              })),
              servings: meal.servings,
              prepTime: meal.recipe.prepTime ? `${meal.recipe.prepTime} min` : '30 min',
              category: meal.recipe.categories?.[0] || 'Dinner',
              dietaryTags: meal.recipe.dietaryApproaches || [],
              // Ernæring pr. ret (fra generator)
              calories: meal.adjustedCalories,
              protein: meal.adjustedProtein,
              carbs: meal.adjustedCarbs,
              fat: meal.adjustedFat,
              fiber: meal.adjustedFiber,
              vitamins: meal.adjustedVitamins
            }
          }
        })
      })

      // Bevar låste retter fra nuværende plan
      const mergedMealPlan: Record<DayKey, Record<MealType, any | null>> = { ...newMealPlan }
      for (const dayKey of dayNames) {
        for (const mt of ['breakfast', 'lunch', 'dinner'] as MealType[]) {
          const lockKey = `${dayKey}_${mt}`
          if (slotLocks[lockKey] && mealPlan[dayKey]?.[mt]) {
            mergedMealPlan[dayKey] = { ...mergedMealPlan[dayKey], [mt]: mealPlan[dayKey][mt] }
          }
        }
      }

      setMealPlan(mergedMealPlan)
      
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
                adultsProfiles: familyProfile.adultsProfiles,
                selectedStores: familyProfile.selectedStores,
                weeklyBudgetKr: familyProfile.weeklyBudgetKr
              },
              mealPlanData: wrapMealPlanForSave(mergedMealPlan, slotLocks), // grid + låse
              shoppingList: weekPlan.shoppingList,
              totalCost: null, // Will be calculated later with prices
              totalSavings: null, // Will be calculated later
              estimatedCaloriesPerDay: null // Will be calculated later
            })
          })
          
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              setActivePlanRef(result.data)
              setSavedMealPlans(prev => {
                const existing = prev.find((p: any) => p.week_number === result.data.week_number)
                if (existing) {
                  return prev.map((p: any) => p.week_number === result.data.week_number ? result.data : p)
                }
                return [result.data, ...prev]
              })
            }
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
      const hint = error instanceof Error && error.message ? `\n\nTeknisk: ${error.message}` : ''
      alert(`Der opstod en fejl ved generering af madplan. Prøv igen.${hint}`)
    }
  }

  const _calculateSavings = () => {
    // Calculate total savings logic will go here
    return { totalSavings: 156.80, percentageSavings: 18.5 }
  }
  void _calculateSavings

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

  /**
   * @param perPersonSharedMeals Når true: hvert måltids tal i grid er for hele husstanden (samme ret);
   *   divider med antal voksne der spiser det slot, så gennemsnit matcher personlige mål.
   */
  const getDayNutrition = (dayKey: DayKey, mealsFilter?: MealType[], perPersonSharedMeals = false) => {
    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0
    const vitamins: Record<string, number> = {}
    const mealKeys = (mealsFilter && mealsFilter.length > 0) ? mealsFilter : (['breakfast', 'lunch', 'dinner'] as MealType[])
    ;(mealKeys as MealType[]).forEach(mealKey => {
      const m = mealPlan[dayKey][mealKey]
      if (m) {
        const div = perPersonSharedMeals ? Math.max(1, peoplePerMealForNutrition[mealKey]) : 1
        if (typeof m.calories === 'number') calories += m.calories / div
        if (typeof m.protein === 'number') protein += m.protein / div
        if (typeof m.carbs === 'number') carbs += m.carbs / div
        if (typeof m.fat === 'number') fat += m.fat / div
        if (typeof m.fiber === 'number') fiber += m.fiber / div
        if (m.vitamins && typeof m.vitamins === 'object') {
          for (const [k, v] of Object.entries(m.vitamins)) {
            vitamins[k] = (vitamins[k] || 0) + (typeof v === 'number' ? v / div : 0)
          }
        }
      }
    })
    return { calories, protein, carbs, fat, fiber, vitamins }
  }

  const getWeekAverageNutrition = (mealsFilter?: MealType[], perPersonSharedMeals = false) => {
    let totalCal = 0, totalP = 0, totalK = 0, totalF = 0, totalFiber = 0
    const totalVitamins: Record<string, number> = {}
    let daysWithData = 0
    ;(days as DayKey[]).forEach(dayKey => {
      const nut = getDayNutrition(dayKey, mealsFilter, perPersonSharedMeals)
      if (nut.calories > 0 || nut.protein > 0 || nut.carbs > 0 || nut.fat > 0) {
        daysWithData++
        totalCal += nut.calories
        totalP += nut.protein
        totalK += nut.carbs
        totalF += nut.fat
        totalFiber += nut.fiber
        for (const [k, v] of Object.entries(nut.vitamins || {})) {
          totalVitamins[k] = (totalVitamins[k] || 0) + v
        }
      }
    })
    const n = daysWithData || 7
    const avgVitamins: Record<string, number> = {}
    for (const [k, v] of Object.entries(totalVitamins)) {
      avgVitamins[k] = Math.round((v / n) * 10) / 10
    }
    return {
      calories: Math.round(totalCal / n),
      protein: Math.round((totalP / n) * 10) / 10,
      carbs: Math.round((totalK / n) * 10) / 10,
      fat: Math.round((totalF / n) * 10) / 10,
      fiber: Math.round((totalFiber / n) * 10) / 10,
      vitamins: avgVitamins,
      daysWithData
    }
  }

  const getMealsIncludedStatus = (mealsFilter?: MealType[]) => {
    let hasBreakfast = false, hasLunch = false, hasDinner = false
    const checkMeals = (mealsFilter && mealsFilter.length > 0) ? mealsFilter : (['breakfast', 'lunch', 'dinner'] as MealType[])
    ;(days as DayKey[]).forEach(dayKey => {
      if (checkMeals.includes('breakfast') && mealPlan[dayKey].breakfast) hasBreakfast = true
      if (checkMeals.includes('lunch') && mealPlan[dayKey].lunch) hasLunch = true
      if (checkMeals.includes('dinner') && mealPlan[dayKey].dinner) hasDinner = true
    })
    const count = [hasBreakfast, hasLunch, hasDinner].filter(Boolean).length
    const onlyDinner = hasDinner && !hasBreakfast && !hasLunch
    return { hasBreakfast, hasLunch, hasDinner, isPartial: count < 2, onlyDinner }
  }

  const getMealPlanInsights = () => {
    const { adults, children, adultsProfiles } = familyProfile
    const avg = getWeekAverageNutrition(undefined, true)
    const mealsStatus = getMealsIncludedStatus()
    const hasData = avg.calories > 0 || avg.protein > 0

    const recipeTitles: string[] = []
    ;(days as DayKey[]).forEach(dayKey => {
      ;(['breakfast', 'lunch', 'dinner'] as MealType[]).forEach(mealKey => {
        const m = mealPlan[dayKey][mealKey]
        if (m?.title) recipeTitles.push(m.title.toLowerCase())
      })
    })

    const countMatches = (terms: string[]) => {
      return recipeTitles.filter(t => terms.some(term => t.includes(term))).length
    }
    const kyllingCount = countMatches(['kylling', 'chicken'])
    const fiskCount = countMatches(['laks', 'torsk', 'fisk', 'salmon', 'fish', 'rødspætte', 'rejer'])
    const kødCount = countMatches(['oksekød', 'svinekød', 'hakkebøf', 'frikadelle', 'boller', 'kød', 'beef', 'pork'])
    const vegetarCount = countMatches(['salat', 'grønt', 'vegetar', 'bønner', 'linser', 'kikærter'])
    const pastaCount = countMatches(['pasta', 'ris', 'kartofler'])

    const hasWeightLoss = adultsProfiles.some(p => (p.weightGoal as string | undefined) === 'weight-loss')
    const hasFamiliemad = adultsProfiles.some(p => p.dietaryApproach === 'familiemad')
    const isKetoOrLowCarb = adultsProfiles.some(p => ['keto', 'lchf-paleo', 'glp-1'].includes(p.dietaryApproach || ''))

    let intro = ''
    if (adults > 0 || children > 0) {
      const parts: string[] = []
      if (adults > 0) parts.push(`${adults} voksne`)
      if (children > 0) parts.push(`${children} børn`)
      intro = `I er ${parts.join(' og ')}, `
      if (hasWeightLoss) intro += 'så planen har fokus på vægttab'
      if (hasFamiliemad && children > 0) intro += (intro.endsWith('vægttab') ? ' og ' : '') + 'kalorietælling'
      if (intro.endsWith(', ')) intro = intro.slice(0, -2)
      intro += '.'
    } else {
      intro = 'Din madplan er tilpasset dine valgte indstillinger.'
    }

    const bullets: string[] = []

    if (kyllingCount >= 2) bullets.push(`${kyllingCount} retter med kylling denne uge`)
    if (fiskCount >= 2) bullets.push(`${fiskCount} retter med fisk – god variation`)
    if (kødCount >= 2 && fiskCount >= 1) bullets.push('Variation mellem kød og fisk')
    else if (kødCount >= 2) bullets.push(`${kødCount} retter med kød`)
    if (vegetarCount >= 2) bullets.push('Flere grøntsagsrige retter inkluderet')
    if (pastaCount >= 2 && !isKetoOrLowCarb) bullets.push('Kartofler, ris eller pasta som tilbehør')

    if (hasData) {
      if (avg.protein >= 60) bullets.push(`God proteinbalance (ca. ${Math.round(avg.protein)}g om dagen)`)
      if (avg.fiber >= 18) bullets.push(`God kostfibre-indtag (ca. ${Math.round(avg.fiber)}g om dagen)`)
      if (hasWeightLoss && avg.calories > 0 && avg.calories < 2500) {
        bullets.push(`Kalorier tilpasset vægttabsmål (ca. ${avg.calories} kcal/dag)`)
      }
    }

    if (children > 0 && recipeTitles.length > 0) {
      bullets.push('Retter der passer til hele familien')
    }

    if (mealsStatus.onlyDinner) {
      bullets.unshift('Kun aftensmad er planlagt – overvej at tilføje morgenmad og frokost')
    } else if (mealsStatus.isPartial) {
      const inkl = [mealsStatus.hasBreakfast && 'morgenmad', mealsStatus.hasLunch && 'frokost', mealsStatus.hasDinner && 'aftensmad'].filter(Boolean).join(' og ')
      bullets.unshift(`Planen inkluderer ${inkl}`)
    }

    if (recipeTitles.length === 0) {
      intro = 'Din madplan er tom.'
      bullets.length = 0
      bullets.push('Generer en madplan eller tilføj retter for at få en vurdering.')
    }

    return { intro, bullets }
  }

  // Week dates (Mon–Sun) for day view calendar
  const getWeekDates = () => {
    const now = new Date()
    const dayNum = now.getDay()
    const mondayOffset = dayNum === 0 ? -6 : 1 - dayNum
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    return (days as DayKey[]).map((dayKey, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return { dayKey, date: d }
    })
  }
  const weekDates = getWeekDates()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Madbudget</h1>
              <p className="text-gray-600 text-sm sm:text-base">Din ugentlige madplan. Din personlige madplan — lav ny madplan med ét klik. Ernæringsberegnet og personlig.</p>
            </div>
            <div className="flex w-full min-w-0 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-full flex-nowrap items-center justify-between gap-3">
                <div className="flex flex-shrink-0 flex-nowrap items-center gap-2">
                <button
                  onClick={() => setViewMode(v => v === 'week' ? 'day' : 'week')}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                  title={viewMode === 'week' ? 'Skift til dagvisning' : 'Skift til ugevisning'}
                >
                  {viewMode === 'week' ? <LayoutGrid size={18} /> : <Calendar size={18} />}
                  <span className="hidden sm:inline">Skift visning</span>
                </button>
                <button
                  onClick={() => { setBasisTab('ingredient'); setShowBasisvarerModal(true) }}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  <ShoppingCart size={18} />
                  <span className="hidden sm:inline">Basisvarer</span>
                </button>
                <button
                  onClick={() => setShowFamilySettings(true)}
                  className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Users size={18} />
                  <span>Familieindstillinger</span>
                </button>
                </div>
                <div className="flex flex-shrink-0 flex-nowrap items-center gap-2">
                {activePlanRef?.id && !isGeneratingMealPlan && (
                  <button
                    onClick={handleSharePlan}
                    disabled={shareLoading}
                    className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
                    title="Del madplan"
                  >
                    <Share2 size={18} />
                    <span className="hidden sm:inline">{shareCopied ? 'Kopieret!' : 'Del'}</span>
                  </button>
                )}
                <Link
                  href="/vaegt-tracker"
                  className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                  title="Vægt tracker"
                  aria-label="Vægt tracker"
                >
                  <Scale size={18} className="shrink-0" aria-hidden />
                  <span className="hidden sm:inline">Vægt tracker</span>
                </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Full-width Meal Planner (side boxes removed; open via header: Basisvarer modal, Familieindstillinger modal) */}
        <div className="w-full max-w-none">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Calendar size={20} className="mr-2" />
                    Ugeplanlægger
                  </h2>
                </div>
                <div className="flex flex-col gap-4 w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
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
                              const weekNum =
                                p.week_number ||
                                (() => {
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
                  </div>

                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/90 p-4">
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-5 gap-y-2 text-sm">
                      <span className="font-medium text-gray-800 shrink-0">Måltider i planen</span>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={plannerMealToggles.breakfast}
                          onChange={(e) => setPlannerMealIncluded('breakfast', e.target.checked)}
                        />
                        <span>Morgenmad</span>
                        <button
                          type="button"
                          onClick={() => setMealInfoKind('breakfast')}
                          className="rounded-full p-0.5 text-gray-400 hover:bg-white hover:text-blue-700"
                          aria-label="Info om morgenmad i madplanen"
                        >
                          <HelpCircle size={16} />
                        </button>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={plannerMealToggles.lunch}
                          onChange={(e) => setPlannerMealIncluded('lunch', e.target.checked)}
                        />
                        <span>Frokost</span>
                        <button
                          type="button"
                          onClick={() => setMealInfoKind('lunch')}
                          className="rounded-full p-0.5 text-gray-400 hover:bg-white hover:text-blue-700"
                          aria-label="Info om frokost i madplanen"
                        >
                          <HelpCircle size={16} />
                        </button>
                      </label>
                      <label className="inline-flex items-center gap-2 select-none text-gray-500">
                        <input type="checkbox" className="rounded border-gray-300" checked disabled readOnly />
                        <span>Aftensmad</span>
                        <span className="text-xs">(altid)</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setLockDishesMode((v) => !v)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          lockDishesMode
                            ? 'border-amber-600 bg-amber-600 text-white shadow'
                            : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <Lock size={16} aria-hidden />
                        {lockDishesMode ? 'Afslut låsning' : 'Lås retter'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLockDishesMode(false)
                          void generateMealPlan()
                        }}
                        disabled={isGeneratingMealPlan}
                        className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                      >
                        Generer ny madplan
                      </button>
                    </div>
                  </div>
                  {lockDishesMode && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Klik på en ret eller et tomt felt for at låse eller låse op. Låste felter beholdes, når du
                      genererer en ny madplan — der kommer kun nye retter på de pladser, der ikke er låst.
                    </p>
                  )}
                </div>
              </div>

              {viewMode === 'week' && (
              <>
              {/* Desktop: 7 Days Grid */}
              <div className="hidden lg:grid lg:grid-cols-7 gap-4">
                {days.map((day, index) => {
                  const dayKey = day as DayKey
                  const dayNut = getDayNutrition(dayKey, undefined, true)
                  const hasDayNut = dayNut.calories > 0 || dayNut.protein > 0 || dayNut.carbs > 0 || dayNut.fat > 0
                  return (
                  <div key={day} className="text-center">
                    <div className="font-medium text-gray-900 mb-3">{dayLabels[index]}</div>
                    <div className="space-y-2">
                      {mealTypes.map(mealType => {
                        const dayKey = day as DayKey
                        const mealKey = mealType.key as MealType
                        const currentMeal = mealPlan[dayKey][mealKey]
                        const sk = slotKey(dayKey, mealKey)
                        const isLocked = Boolean(slotLocks[sk])

                        return (
                              <div
                                key={`${day}-${mealType.key}`}
                                className={`relative p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                                  lockDishesMode ? 'ring-2 ring-amber-300 ring-offset-1' : ''
                                } ${
                                  currentMeal
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                                } ${isLocked ? 'border-amber-500/90' : ''}`}
                                onClick={() => {
                                  const dayKey = day as DayKey
                                  const mealKey = mealType.key as MealType
                                  handleMealCellClick(dayKey, mealKey)
                                }}
                                title={currentMeal ? `${currentMeal.title} - ${currentMeal.store}${currentMeal.savings !== undefined && currentMeal.savings > 0 ? ` (Sparer ${currentMeal.savings.toFixed(0)} kr)` : ''}` : `Vælg ${mealType.label.toLowerCase()}`}
                              >
                                {isLocked && (
                                  <span className="absolute bottom-1.5 right-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white shadow" title="Låst ved næste generering">
                                    <Lock size={12} aria-hidden />
                                  </span>
                                )}
                                {currentMeal ? (
                                  <div className="flex flex-col text-left overflow-hidden -mx-3 -mt-3 rounded-t-lg">
                                    <div className="aspect-square w-full overflow-hidden bg-gray-100 rounded-t-lg relative">
                                      <span className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm z-10 ${mealType.color}`}>
                                        <mealType.icon size={12} />
                                        {mealType.label}
                                      </span>
                                      {(currentMeal.image || currentMeal.imageUrl) ? (
                                        <img src={currentMeal.image || currentMeal.imageUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                          <mealType.icon size={28} />
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const slugOrId = (currentMeal as { slug?: string }).slug || currentMeal.id
                                          if (slugOrId) {
                                            setRecipeViewSlugOrId(String(slugOrId))
                                            setRecipeViewSlot({ dayKey, mealKey })
                                          }
                                        }}
                                        className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/20 shadow"
                                        aria-label="Se opskrift"
                                      >
                                        <Eye size={18} />
                                      </button>
                                    </div>
                                    <div className="px-3 pt-1.5 pb-0 flex flex-col gap-0.5 min-w-0 h-[5.75rem] flex-shrink-0">
                                      <div className="text-[11px] sm:text-xs font-medium text-gray-900 line-clamp-3 leading-tight">
                                        {currentMeal.title}
                                      </div>
                                      <div className="text-[10px] text-gray-500 truncate">{currentMeal.store}</div>
                                      {(typeof currentMeal.calories === 'number' || typeof currentMeal.protein === 'number' || typeof currentMeal.carbs === 'number' || typeof currentMeal.fat === 'number') && (
                                        <div className="grid grid-cols-4 gap-px rounded-md overflow-hidden bg-gray-200 mt-1">
                                          <div className="bg-gray-50 py-1 px-0.5 text-center">
                                            <div className="text-[10px] sm:text-xs text-gray-700 tabular-nums leading-tight">{typeof currentMeal.calories === 'number' ? Math.round(currentMeal.calories) : '–'}</div>
                                            <div className="text-[8px] text-gray-500 leading-tight">kcal</div>
                                          </div>
                                          <div className="bg-gray-50 py-1 px-0.5 text-center">
                                            <div className="text-[10px] sm:text-xs text-gray-700 tabular-nums leading-tight">{typeof currentMeal.protein === 'number' ? `${Math.round(currentMeal.protein)}g` : '–'}</div>
                                            <div className="text-[8px] text-gray-500 leading-tight">P</div>
                                          </div>
                                          <div className="bg-gray-50 py-1 px-0.5 text-center">
                                            <div className="text-[10px] sm:text-xs text-gray-700 tabular-nums leading-tight">{typeof currentMeal.carbs === 'number' ? `${Math.round(currentMeal.carbs)}g` : '–'}</div>
                                            <div className="text-[8px] text-gray-500 leading-tight">K</div>
                                          </div>
                                          <div className="bg-gray-50 py-1 px-0.5 text-center">
                                            <div className="text-[10px] sm:text-xs text-gray-700 tabular-nums leading-tight">{typeof currentMeal.fat === 'number' ? `${Math.round(currentMeal.fat)}g` : '–'}</div>
                                            <div className="text-[8px] text-gray-500 leading-tight">F</div>
                                          </div>
                                        </div>
                                      )}
                                      {currentMeal.savings !== undefined && currentMeal.savings > 0 && (
                                        <div className="text-[10px] text-green-600 font-medium">Sparer {currentMeal.savings.toFixed(0)} kr</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-1">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${mealType.color}`}>
                                      <mealType.icon size={12} />
                                      {mealType.label}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                      })}
                    </div>
                    {hasDayNut && (
                      <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-gray-600 tabular-nums">
                        <span className="font-medium text-gray-700">Dag:</span>{' '}
                        {Math.round(dayNut.calories)} kcal · {Math.round(dayNut.protein)}g P · {Math.round(dayNut.carbs)}g K · {Math.round(dayNut.fat)}g F
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>

              {/* Mobile: 3-Day Slider — arrows overlay content to save horizontal space */}
              <div className="lg:hidden relative">
                {/* Navigation Arrows: overlay on content, minimal footprint */}
                <button
                  onClick={prevDays}
                  disabled={currentDayOffset === 0}
                  className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full shadow-md border transition-colors ${
                    currentDayOffset === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white/95 hover:bg-white text-gray-700 border-gray-200 hover:border-yellow-300'
                  }`}
                  aria-label="Forrige dage"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={nextDays}
                  disabled={currentDayOffset >= 4}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full shadow-md border transition-colors ${
                    currentDayOffset >= 4
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-white/95 hover:bg-white text-gray-700 border-gray-200 hover:border-yellow-300'
                  }`}
                  aria-label="Næste dage"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Days Grid: full width, only small horizontal padding */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 px-1">
                  {getVisibleDays().map((day, index) => {
                    const actualIndex = currentDayOffset + index
                    const dayKey = day as DayKey
                    const dayNut = getDayNutrition(dayKey, undefined, true)
                    const hasDayNut = dayNut.calories > 0 || dayNut.protein > 0 || dayNut.carbs > 0 || dayNut.fat > 0
                    return (
                      <div key={day} className="text-center">
                        <div className="font-medium text-gray-900 mb-3">{dayLabels[actualIndex]}</div>
                        <div className="space-y-2">
                          {mealTypes.map(mealType => {
                            const dayKey = day as DayKey
                            const mealKey = mealType.key as MealType
                            const currentMeal = mealPlan[dayKey][mealKey]
                            const sk = slotKey(dayKey, mealKey)
                            const isLocked = Boolean(slotLocks[sk])

                            return (
                              <div
                                key={`${day}-${mealType.key}`}
                                className={`relative p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                                  lockDishesMode ? 'ring-2 ring-amber-300 ring-offset-1' : ''
                                } ${
                                  currentMeal
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                                } ${isLocked ? 'border-amber-500/90' : ''}`}
                                onClick={() => {
                                  const dayKey = day as DayKey
                                  const mealKey = mealType.key as MealType
                                  handleMealCellClick(dayKey, mealKey)
                                }}
                                title={currentMeal ? `${currentMeal.title} - ${currentMeal.store}${currentMeal.savings !== undefined && currentMeal.savings > 0 ? ` (Sparer ${currentMeal.savings.toFixed(0)} kr)` : ''}` : `Vælg ${mealType.label.toLowerCase()}`}
                              >
                                {isLocked && (
                                  <span className="absolute bottom-1 right-1 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-white shadow sm:bottom-1.5 sm:right-1.5 sm:h-6 sm:w-6" title="Låst ved næste generering">
                                    <Lock size={10} className="sm:w-3 sm:h-3" aria-hidden />
                                  </span>
                                )}
                                {currentMeal ? (
                                  <div className="flex flex-col text-left overflow-hidden -mx-3 -mt-3 rounded-t-lg">
                                    <div className="aspect-square w-full overflow-hidden bg-gray-100 rounded-t-lg relative">
                                      <span className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium shadow-sm z-10 ${mealType.color}`}>
                                        <mealType.icon size={10} className="sm:w-3 sm:h-3" />
                                        {mealType.label}
                                      </span>
                                      {(currentMeal.image || currentMeal.imageUrl) ? (
                                        <img src={currentMeal.image || currentMeal.imageUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                          <mealType.icon size={22} className="sm:w-6 sm:h-6" />
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const slugOrId = (currentMeal as { slug?: string }).slug || currentMeal.id
                                          if (slugOrId) {
                                            setRecipeViewSlugOrId(String(slugOrId))
                                            setRecipeViewSlot({ dayKey, mealKey })
                                          }
                                        }}
                                        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1.5 sm:p-2 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/20 shadow"
                                        aria-label="Se opskrift"
                                      >
                                        <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                                      </button>
                                    </div>
                                    <div className="px-2 sm:px-3 pt-1 sm:pt-1.5 pb-0 flex flex-col gap-0.5 min-w-0 h-[5.5rem] sm:h-[5.75rem] flex-shrink-0">
                                      <div className="text-[10px] sm:text-xs font-medium text-gray-900 line-clamp-3 leading-tight">
                                        {currentMeal.title}
                                      </div>
                                      <div className="text-[9px] sm:text-[10px] text-gray-500 truncate">{currentMeal.store}</div>
                                      {(typeof currentMeal.calories === 'number' || typeof currentMeal.protein === 'number' || typeof currentMeal.carbs === 'number' || typeof currentMeal.fat === 'number') && (
                                        <div className="grid grid-cols-4 gap-px rounded overflow-hidden bg-gray-200 mt-0.5 sm:mt-1">
                                          <div className="bg-gray-50 py-0.5 sm:py-1 px-0.5 text-center">
                                            <div className="text-[9px] sm:text-[10px] text-gray-700 tabular-nums leading-tight">{typeof currentMeal.calories === 'number' ? Math.round(currentMeal.calories) : '–'}</div>
                                            <div className="text-[7px] sm:text-[8px] text-gray-500 leading-tight">kcal</div>
                                          </div>
                                          <div className="bg-gray-50 py-0.5 sm:py-1 px-0.5 text-center">
                                            <div className="text-[9px] sm:text-[10px] text-gray-700 tabular-nums leading-tight">{typeof currentMeal.protein === 'number' ? `${Math.round(currentMeal.protein)}g` : '–'}</div>
                                            <div className="text-[7px] sm:text-[8px] text-gray-500 leading-tight">P</div>
                                          </div>
                                          <div className="bg-gray-50 py-0.5 sm:py-1 px-0.5 text-center">
                                            <div className="text-[9px] sm:text-[10px] text-gray-700 tabular-nums leading-tight">{typeof currentMeal.carbs === 'number' ? `${Math.round(currentMeal.carbs)}g` : '–'}</div>
                                            <div className="text-[7px] sm:text-[8px] text-gray-500 leading-tight">K</div>
                                          </div>
                                          <div className="bg-gray-50 py-0.5 sm:py-1 px-0.5 text-center">
                                            <div className="text-[9px] sm:text-[10px] text-gray-700 tabular-nums leading-tight">{typeof currentMeal.fat === 'number' ? `${Math.round(currentMeal.fat)}g` : '–'}</div>
                                            <div className="text-[7px] sm:text-[8px] text-gray-500 leading-tight">F</div>
                                          </div>
                                        </div>
                                      )}
                                      {currentMeal.savings !== undefined && currentMeal.savings > 0 && (
                                        <div className="text-[9px] sm:text-[10px] text-green-600 font-medium">Sparer {currentMeal.savings.toFixed(0)} kr</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-1">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-1 ${mealType.color}`}>
                                      <mealType.icon size={12} />
                                      {mealType.label}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {hasDayNut && (
                          <div className="mt-1.5 pt-1.5 border-t border-gray-100 text-[9px] sm:text-[10px] text-gray-600 tabular-nums">
                            <span className="font-medium text-gray-700">Dag:</span>{' '}
                            {Math.round(dayNut.calories)} kcal · {Math.round(dayNut.protein)}g P · {Math.round(dayNut.carbs)}g K · {Math.round(dayNut.fat)}g F
                          </div>
                        )}
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
              </>
              )}

              {viewMode === 'day' && (
              <div className="space-y-6">
                {/* Kalender: ugens dage med dato — fylder hele bredden; på mobil kan man slide */}
                <div className="w-full grid grid-cols-7 gap-2 max-sm:flex max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:overflow-y-hidden max-sm:snap-x max-sm:snap-mandatory max-sm:pb-2 max-sm:-mx-1 max-sm:px-1">
                  {weekDates.map(({ dayKey, date }, i) => {
                    const isSelected = i === selectedDayIndex
                    const dayShort = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'][i]
                    const dateNum = date.getDate()
                    const monthShort = date.toLocaleDateString('da-DK', { month: 'short' })
                    return (
                      <button
                        key={dayKey}
                        type="button"
                        onClick={() => setSelectedDayIndex(i)}
                        className={`min-w-0 px-2 py-2.5 rounded-lg text-sm font-medium transition-colors max-sm:flex-shrink-0 max-sm:min-w-[4.25rem] max-sm:snap-center ${
                          isSelected
                            ? 'bg-green-600 text-white shadow'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span className="block truncate">{dayShort}</span>
                        <span className="block text-xs opacity-90 truncate">{dateNum}. {monthShort}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Dagens ernæring — præcis kasse (vægttab) */}
                {(() => {
                  const dayKey = days[selectedDayIndex] as DayKey
                  const nut = getDayNutrition(dayKey, undefined, true)
                  const calFromP = nut.protein * 4
                  const calFromK = nut.carbs * 4
                  const calFromF = nut.fat * 9
                  const totalCalFromMacros = calFromP + calFromK + calFromF
                  const pctP = totalCalFromMacros > 0 ? Math.round((calFromP / totalCalFromMacros) * 100) : 0
                  const pctK = totalCalFromMacros > 0 ? Math.round((calFromK / totalCalFromMacros) * 100) : 0
                  const pctF = totalCalFromMacros > 0 ? Math.round((calFromF / totalCalFromMacros) * 100) : 0
                  const hasAny = nut.calories > 0 || nut.protein > 0 || nut.carbs > 0 || nut.fat > 0
                  return (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Dagens ernæring</h3>
                      {hasAny ? (
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex items-center justify-center sm:justify-start">
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white border-4 border-green-500 flex items-center justify-center">
                              <span className="text-lg sm:text-xl font-bold text-gray-900">{Math.round(nut.calories)}</span>
                              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-500">kcal</span>
                            </div>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 w-20">Protein</span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, pctP)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-900 tabular-nums w-14">{Math.round(nut.protein)}g</span>
                              <span className="text-xs text-gray-500 w-8">{pctP}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 w-20">Kulhydrat</span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, pctK)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-900 tabular-nums w-14">{Math.round(nut.carbs)}g</span>
                              <span className="text-xs text-gray-500 w-8">{pctK}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 w-20">Fedt</span>
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(100, pctF)}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-900 tabular-nums w-14">{Math.round(nut.fat)}g</span>
                              <span className="text-xs text-gray-500 w-8">{pctF}%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Ingen måltider planlagt denne dag. Generer en madplan eller tilføj retter.</p>
                      )}
                    </div>
                  )
                })()}

                {/* Måltider for valgt dag: Morgenmad, Frokost, Aftensmad */}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    {dayLabels[selectedDayIndex]} · {weekDates[selectedDayIndex].date.getDate()}. {weekDates[selectedDayIndex].date.toLocaleDateString('da-DK', { month: 'short' })}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {mealTypes.map(mealType => {
                      const dayKey = days[selectedDayIndex] as DayKey
                      const mealKey = mealType.key as MealType
                      const currentMeal = mealPlan[dayKey][mealKey]
                      const sk = slotKey(dayKey, mealKey)
                      const isLocked = Boolean(slotLocks[sk])
                      return (
                        <div
                          key={mealType.key}
                          onClick={() => handleMealCellClick(dayKey, mealKey)}
                          className={`relative rounded-xl border-2 cursor-pointer transition-colors overflow-hidden ${
                            lockDishesMode ? 'ring-2 ring-amber-300 ring-offset-1' : ''
                          } ${
                            currentMeal ? 'border-green-500 bg-green-50/50' : 'border-dashed border-gray-200 hover:border-green-300 hover:bg-gray-50'
                          } ${isLocked ? 'border-amber-500/90' : ''}`}
                        >
                          {isLocked && (
                            <span className="absolute bottom-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-white shadow" title="Låst ved næste generering">
                              <Lock size={14} aria-hidden />
                            </span>
                          )}
                          <div className="aspect-square w-full bg-gray-100 relative">
                            <span className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shadow-sm z-10 ${mealType.color}`}>
                              <mealType.icon size={14} />
                              {mealType.label}
                            </span>
                            {currentMeal && (currentMeal.image || currentMeal.imageUrl) ? (
                              <img src={currentMeal.image || currentMeal.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <mealType.icon size={40} />
                              </div>
                            )}
                            {currentMeal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const slugOrId = (currentMeal as { slug?: string }).slug || currentMeal.id
                                  if (slugOrId) {
                                    setRecipeViewSlugOrId(String(slugOrId))
                                    setRecipeViewSlot({ dayKey, mealKey })
                                  }
                                }}
                                className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 border border-white/20 shadow"
                                aria-label="Se opskrift"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <mealType.icon size={14} />
                              <span>{mealType.label}</span>
                            </div>
                            <div className="font-medium text-gray-900 text-sm min-h-[2.5rem]">
                              {currentMeal ? currentMeal.title : `Vælg ${mealType.label.toLowerCase()}`}
                            </div>
                            {currentMeal && (typeof currentMeal.calories === 'number' || typeof currentMeal.protein === 'number') && (
                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0 text-xs text-gray-600">
                                <span>{Math.round(currentMeal.calories ?? 0)} kcal</span>
                                <span>{Math.round(currentMeal.protein ?? 0)}g P</span>
                                <span>{Math.round(currentMeal.carbs ?? 0)}g K</span>
                                <span>{Math.round(currentMeal.fat ?? 0)}g F</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              )}

              {/* Info: Dynamisk vurdering af madplanen */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Om din madplan</h3>
                {(() => {
                  const { intro, bullets } = getMealPlanInsights()
                  return (
                    <>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">{intro}</p>
                      {bullets.length > 0 && (
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside mb-6">
                          {bullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )
                })()}

              {/* Vægttabsråd til din uge (dummy data) – ovenover divideren før ernæringsboksen */}
              <div className="mt-6 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Vægttabsråd til din uge</h3>
                <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                  <li>Husk, at når du spiser, så spis til du er mæt – Ikke mindre og IKKE mere.</li>
                  <li>Jo mere du bevæger dig, jo mere forbrænder du. En simpel gåtur i frokostpausen eller efter aftensmad GØR en forskel.</li>
                  <li>Hold øje med, om du snacker for meget rundt om dine måltider. Få hjælp til bedre vaner under <Link href="/blog/mentalt" className="text-green-600 hover:text-green-700 underline font-medium">Mentalt</Link>.</li>
                  <li>Periodisk faste hjælper på vægttab. Fx. ved at undgå snacking eller springe ét måltid over.</li>
                </ul>
              </div>

                {/* Gennemsnitlig daglig ernæring (ugevisning) */}
                {viewMode === 'week' && (() => {
                  const completeAdults = familyProfile.adultsProfiles
                    .map((p, i) => ({ ...p, index: i }))
                    .filter((p) => adultProfileHasRequiredFieldsForMealPlan(p))
                  const activeIndex = Math.min(selectedNutritionAdultIndex, Math.max(0, completeAdults.length - 1))
                  const selectedAdult = completeAdults[activeIndex] || completeAdults[0]
                  const mealsFilter = selectedAdult?.mealsPerDay?.length
                    ? (selectedAdult.mealsPerDay as MealType[])
                    : undefined
                  const avg = getWeekAverageNutrition(mealsFilter, true)
                  const mealsStatus = getMealsIncludedStatus(mealsFilter)
                  const hasAnyData = avg.calories > 0 || avg.protein > 0 || avg.carbs > 0 || avg.fat > 0

                  let targetCal = 0, targetP = 0, targetK = 0, targetF = 0
                  const primaryAdult = selectedAdult
                  if (primaryAdult) {
                    const userProfile: UserProfile = {
                      gender: primaryAdult.gender!,
                      age: primaryAdult.age!,
                      height: primaryAdult.height!,
                      weight: primaryAdult.weight!,
                      activityLevel: primaryAdult.activityLevel!,
                      goal: (primaryAdult.weightGoal as WeightGoal) || WeightGoal.WeightLoss
                    }
                    const energyNeeds = DietaryCalculator.calculateTargetCalories(userProfile)
                    targetCal = energyNeeds.targetCalories
                    const diet = dietaryFactory.getDiet(primaryAdult.dietaryApproach || 'sense')
                    if (diet) {
                      const macros = DietaryCalculator.calculateDietaryMacroTargets(userProfile, diet)
                      targetP = macros.protein
                      targetK = macros.carbohydrates
                      targetF = macros.fat
                    } else {
                      targetP = Math.round(targetCal * 0.3 / 4)
                      targetK = Math.round(targetCal * 0.4 / 4)
                      targetF = Math.round(targetCal * 0.3 / 9)
                    }
                  }

                  const targetFiber = 25

                  const mergedVitamins = mergeVitaminsAgainstRda(avg.vitamins)
                  const lowVitamins = mergedVitamins.filter((v) => v.pct < 50)

                  const weekHighlights: string[] = []
                  const nutritionWarnings: string[] = []

                  if (targetCal > 0) {
                    const pctCal = Math.round((avg.calories / targetCal) * 100)
                    if (pctCal >= 90 && pctCal <= 110) weekHighlights.push(`Kalorier passer godt til vægttabsmål (${avg.calories} af ${targetCal} kcal)`)
                    else if (pctCal < 70) nutritionWarnings.push(`Lavt kalorieindtag ift. mål — overvej at tilføje flere måltider i planen.`)
                    else if (pctCal > 130) nutritionWarnings.push(`Højere kalorieindtag end mål — kan bremse vægttab ift. dit mål.`)
                  }
                  if (targetP > 0 && avg.protein >= targetP * 0.9) {
                    weekHighlights.push(`Godt proteinindtag (${Math.round(avg.protein)} g) — understøtter muskler og mæthed.`)
                  } else if (targetP > 0 && avg.protein < targetP * 0.85) {
                    const da = primaryAdult?.dietaryApproach || ''
                    const lowCarb = ['keto', 'lchf-paleo', 'glp-1'].includes(da)
                    nutritionWarnings.push(
                      lowCarb
                        ? `Protein ligger under det vi anbefaler ud fra din profil (${Math.round(avg.protein)} g mod ca. ${Math.round(targetP)} g). Overvej en ekstra proteinrig kilde med lavt kulhydrat — fx magert kød, fisk, æg, skyr eller en proteinshake uden tilsat sukker.`
                        : `Protein ligger under det vi anbefaler ud fra din profil (${Math.round(avg.protein)} g mod ca. ${Math.round(targetP)} g). Overvej magert kød, fisk, æg, bælgfrugter eller skyr ved et måltid.`
                    )
                  }
                  if (avg.fiber >= 20) {
                    weekHighlights.push(`Godt kostfiberindtag (${Math.round(avg.fiber * 10) / 10} g).`)
                  } else if (avg.fiber > 0 && avg.fiber < 15) {
                    nutritionWarnings.push(`Kostfibre er lave (${Math.round(avg.fiber * 10) / 10} g mod vejledende ca. ${targetFiber} g). Tilføj grøntsager, bær eller fuldkorn ved et måltid.`)
                  }

                  if (lowVitamins.length > 0) {
                    nutritionWarnings.push(
                      `Disse vitaminer ligger tydeligt under den vejledende daglige reference (voksne): ${lowVitamins.map((v) => `${v.display} (~${v.pct}%)`).join(', ')}. Ved kun aftensmad i planen er det ofte — supplér med frugt og grønt i øvrige måltider.`
                    )
                  }

                  return (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center space-x-2">
                            <PieChart size={16} className="text-gray-500" />
                            <h4 className="text-sm font-medium text-gray-900">Gennemsnitlig daglig ernæring (uge)</h4>
                          </div>
                          {completeAdults.length > 1 && (
                            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-100">
                              {completeAdults.map((adult, i) => (
                                <button
                                  key={adult.id || i}
                                  onClick={() => setSelectedNutritionAdultIndex(i)}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                    i === activeIndex ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Voksen {i + 1}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      {mealsStatus.onlyDinner && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          <strong>Bemærk:</strong> Kun aftensmad er inkluderet. Beregningerne giver ikke et fuldt billede. Tilføj morgenmad og/eller frokost for at vurdere vægttab.
                        </div>
                      )}
                      {mealsStatus.isPartial && !mealsStatus.onlyDinner && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                          <strong>Delvis data:</strong> Kun {[mealsStatus.hasBreakfast && 'morgenmad', mealsStatus.hasLunch && 'frokost', mealsStatus.hasDinner && 'aftensmad'].filter(Boolean).join(' og ')} inkluderet.
                        </div>
                      )}
                      {!hasAnyData ? (
                        <p className="text-sm text-gray-500">Ingen næringsdata endnu. Generer en madplan eller tilføj retter.</p>
                      ) : (
                        <>
                          <div className="space-y-3 mb-4">
                            {[
                              { label: 'Kalorier', value: avg.calories, unit: 'kcal', target: targetCal },
                              { label: 'Protein', value: avg.protein, unit: 'g', target: targetP },
                              { label: 'Kulhydrater', value: avg.carbs, unit: 'g', target: targetK },
                              { label: 'Fedt', value: avg.fat, unit: 'g', target: targetF },
                              { label: 'Fiber', value: avg.fiber, unit: 'g', target: targetFiber }
                            ].map(({ label, value, unit, target }) => {
                              const num = typeof value === 'number' ? Math.round(value * 10) / 10 : 0
                              const pct = target > 0 ? Math.min(100, Math.round((num / target) * 100)) : 0
                              return (
                                <div key={label}>
                                  <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-gray-600">{label}</span>
                                    <span className="font-medium text-gray-900">
                                      {num} {unit}
                                      {target > 0 && (
                                        <span className="font-normal text-gray-500 ml-1">/ {target}</span>
                                      )}
                                    </span>
                                  </div>
                                  {target > 0 && (
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-green-500 rounded-full transition-all"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          <div className="border-t border-gray-200 pt-3">
                            <button
                              onClick={() => setShowNutritionDetails(!showNutritionDetails)}
                              className="flex items-center justify-between w-full text-left hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                            >
                              <span className="text-xs font-medium text-gray-700">Detaljeret næringsindhold</span>
                              {showNutritionDetails ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                            </button>
                            {showNutritionDetails && (
                              <div className="mt-3 space-y-4">
                                {nutritionWarnings.length > 0 && (
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <h4 className="text-xs font-medium text-amber-900 mb-2">Anbefalinger og opmærksomhedspunkter</h4>
                                    <ul className="space-y-2">
                                      {nutritionWarnings.map((h, i) => (
                                        <li key={i} className="text-xs text-amber-900 flex items-start leading-relaxed">
                                          <span className="text-amber-600 mr-1.5 shrink-0">•</span>
                                          <span>{h}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {weekHighlights.length > 0 && (
                                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                    <h4 className="text-xs font-medium text-green-800 mb-2">Næringshøjdepunkter for ugen</h4>
                                    <ul className="space-y-1">
                                      {weekHighlights.map((h, i) => (
                                        <li key={i} className="text-xs text-green-700 flex items-start">
                                          <span className="text-green-500 mr-1">•</span>
                                          {h}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {mergedVitamins.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-gray-900 mb-1">Vitaminer (gennemsnit pr. dag)</h4>
                                    <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                                      Sammenlignet med vejledende daglige referenceværdier for voksne (nordiske/nationale udgangspunkter). Tallene er vejledende — ikke individuelle medicinske mål. Kun ét måltid i planen giver ofte lavere dækning end 100%.
                                    </p>
                                    <div className="space-y-2">
                                      {mergedVitamins.map((row) => {
                                        const barPct = Math.min(100, row.pct)
                                        const low = row.pct < 50
                                        return (
                                          <div key={row.display}>
                                            <div className="flex justify-between text-[11px] mb-0.5">
                                              <span className="text-gray-600">Vitamin {row.display}</span>
                                              <span className={`font-medium tabular-nums ${low ? 'text-amber-800' : 'text-gray-900'}`}>
                                                {row.value} {row.unit} / {row.rda} {row.unit}
                                                <span className="font-normal text-gray-500 ml-1">({row.pct}%)</span>
                                              </span>
                                            </div>
                                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full transition-all ${low ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                style={{ width: `${barPct}%` }}
                                              />
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                                {mergedVitamins.length === 0 && Object.keys(avg.vitamins || {}).length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-gray-900 mb-2">Vitaminer (rå nøgler)</h4>
                                    <p className="text-[11px] text-gray-500 mb-2">
                                      Nogle vitaminnavne kunne ikke matches til standard reference — viser rå værdier.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(avg.vitamins).map(([k, v]) => (
                                        <span key={k} className="text-xs bg-white px-2 py-1 rounded border border-gray-100">
                                          {k}: {typeof v === 'number' ? Math.round(v * 100) / 100 : v}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {primaryAdult && targetCal > 0 && (
                            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                              Mål baseret på {primaryAdult.dietaryApproach || 'sense'}-profil for voksen {activeIndex + 1}.
                            </p>
                          )}
                        </>
                      )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Shopping List */}
            <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <ShoppingCart size={20} className="mr-2" />
                  Indkøbsliste
                </h2>
                {shoppingList && (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={shoppingMode}
                          onChange={(e) => setShoppingMode(e.target.checked)}
                        />
                        <ListChecks size={16} className="text-gray-600" />
                        Indkøbs-mode (kryds af i butikken)
                      </label>
                      <button
                        type="button"
                        onClick={() => void openSmartShoppingFlow()}
                        disabled={creatingSmartLink || !shoppingList}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Smartphone size={16} />
                        {creatingSmartLink ? 'Opretter link…' : 'Send til mobil (SMS)'}
                      </button>
                    </div>
                    {smartShareError && (
                      <p className="text-sm text-red-600 max-w-md">{smartShareError}</p>
                    )}
                  </div>
                )}
              </div>
              
              {!shoppingList ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Din indkøbsliste vil blive genereret når du har planlagt din madplan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Store Tabs */}
                  {familyProfile.selectedStores && familyProfile.selectedStores.length > 0 && (
                    <div className="border-b border-gray-200">
                      <div className="flex space-x-1 overflow-x-auto">
                        <button
                          onClick={() => setSelectedStoreTab('all')}
                          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            selectedStoreTab === 'all'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Alle butikker
                        </button>
                        {familyProfile.selectedStores.map((storeId: number) => {
                          const store = mockStores.find(s => s.id === storeId)
                          if (!store) return null
                          
                          const storeKey = storeId === 1 ? 'rema-1000' : 
                                          storeId === 2 ? 'netto' :
                                          storeId === 3 ? 'føtex' :
                                          storeId === 4 ? 'bilka' :
                                          storeId === 5 ? 'nemlig' :
                                          storeId === 6 ? 'meny' :
                                          storeId === 7 ? 'spar' :
                                          storeId === 8 ? 'løvbjerg' : ''
                          
                          if (!storeKey) {
                            console.warn('⚠️ Unknown store ID:', storeId)
                            return null
                          }
                          
                          // Calculate total for this store (using totalPrice which accounts for quantity needed)
                          // Exclude basis ingredients from total
                          let storeTotal = 0
                          if (storePrices[storeKey]) {
                            // Find which items are basis by checking shopping list
                            const basisItemNames = new Set<string>()
                            shoppingList.categories?.forEach((cat: any) => {
                              cat.items?.forEach((item: any) => {
                                if (item.isBasis) {
                                  basisItemNames.add(item.name?.toLowerCase().trim() || '')
                                }
                              })
                            })
                            
                            Object.entries(storePrices[storeKey]).forEach(([itemName, product]: [string, any]) => {
                              // Skip basis ingredients
                              if (basisItemNames.has(itemName.toLowerCase().trim())) {
                                return
                              }
                              
                              if (product.totalPrice) {
                                storeTotal += product.totalPrice
                              } else if (product.price) {
                                // Fallback for old format
                                storeTotal += product.price
                              }
                            })
                          }
                          
                          return (
                            <button
                              key={storeId}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedStoreTab(storeKey)
                              }}
                              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                                selectedStoreTab === storeKey
                                  ? 'border-blue-600 text-blue-600'
                                  : 'border-transparent text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              <div className={`w-3 h-3 rounded-full ${store.color}`}></div>
                              <span>{store.name}</span>
                              {storeTotal > 0 && (
                                <span className="text-xs font-normal">
                                  ({storeTotal.toFixed(2).replace('.', ',')} kr)
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Shopping list content */}
                  {loadingPrices ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Henter priser...</p>
                    </div>
                  ) : (
                    <>
                      {/* Shopping list categories */}
                      {(() => {
                        const mainCats = shoppingList.categories?.filter((c: any) => c.name !== 'Varer du måske allerede har') || []
                        return mainCats.map((category: any, catIndex: number) => (
                          <div key={catIndex} className={`border-b border-gray-200 pb-4 ${catIndex === mainCats.length - 1 ? 'border-b-0' : ''}`}>
                          <h4 className="font-semibold text-gray-900 mb-3">{category.name}</h4>
                          <ul className="space-y-2">
                            {category.items?.map((item: any, itemIndex: number) => {
                              const itemNameLower = item.name?.toLowerCase().trim() || ''
                              const rowKey = `m-${catIndex}-${itemIndex}-${category.name}`
                              const rowDone = shoppingMode && !!shoppingChecked[rowKey]
                              let productInfo: any = null
                              
                              // Get product info for selected store
                              if (selectedStoreTab !== 'all' && storePrices[selectedStoreTab]) {
                                productInfo = storePrices[selectedStoreTab][itemNameLower]
                                if (!productInfo) {
                                  // Try to find with different name variations
                                  const keys = Object.keys(storePrices[selectedStoreTab])
                                  const found = keys.find(key => 
                                    key.includes(itemNameLower) || itemNameLower.includes(key)
                                  )
                                  if (found) {
                                    productInfo = storePrices[selectedStoreTab][found]
                                  }
                                }
                              }
                              
                              return (
                                <li key={itemIndex} className={`flex items-center justify-between gap-2 text-sm ${rowDone ? 'opacity-65' : ''}`}>
                                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                                    {shoppingMode && (
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 shrink-0 rounded border-gray-300 mt-0.5"
                                        checked={!!shoppingChecked[rowKey]}
                                        onChange={() => toggleShoppingItem(rowKey)}
                                        aria-label={`Kryds af ${item.name}`}
                                      />
                                    )}
                                    {item.isOptional && (
                                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Kombi</span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      {productInfo ? (
                                        <div>
                                          <div className={`text-gray-700 font-medium ${rowDone ? 'line-through text-gray-500' : ''}`}>
                                            {productInfo.name}
                                            {productInfo.quantityNeeded && productInfo.quantityNeeded > 1 && (
                                              <span className="text-sm font-normal text-gray-600 ml-2">
                                                ({productInfo.quantityNeeded} stk)
                                              </span>
                                            )}
                                          </div>
                                          <div className={`text-xs text-gray-500 ${rowDone ? 'line-through' : ''}`}>
                                            {item.name}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className={`text-gray-700 ${rowDone ? 'line-through text-gray-500' : ''}`}>
                                          {item.name}
                                          {item.notes && (
                                            <span className="text-xs text-gray-500 ml-2">({item.notes})</span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-gray-900 font-medium">
                                      {formatQuantity(item.amount)} {item.unit}
                                    </div>
                                    {productInfo && (productInfo.totalPrice || productInfo.price) && (
                                      <div className="text-sm">
                                        {productInfo.isOnSale ? (
                                          <div>
                                            <span className="text-green-600 font-semibold">
                                              {(productInfo.totalPrice || productInfo.price).toFixed(2).replace('.', ',')} kr
                                            </span>
                                            {productInfo.totalNormalPrice && (
                                              <span className="text-gray-400 line-through ml-1 text-xs">
                                                {productInfo.totalNormalPrice.toFixed(2).replace('.', ',')} kr
                                              </span>
                                            )}
                                            {productInfo.quantityNeeded && productInfo.quantityNeeded > 1 && (
                                              <div className="text-xs text-gray-500 mt-0.5">
                                                ({productInfo.price.toFixed(2).replace('.', ',')} kr pr. stk)
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div>
                                            <span className="text-gray-700">
                                              {(productInfo.totalPrice || productInfo.price).toFixed(2).replace('.', ',')} kr
                                            </span>
                                            {productInfo.quantityNeeded && productInfo.quantityNeeded > 1 && (
                                              <div className="text-xs text-gray-500 mt-0.5">
                                                ({productInfo.price.toFixed(2).replace('.', ',')} kr pr. stk)
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                          </div>
                        ))
                      })()}
                      
                      {/* Basis ingredients section - shown separately */}
                      {shoppingList.categories?.find((cat: any) => cat.name === 'Varer du måske allerede har') && (
                        <div className="border-t border-gray-200 pt-4 mt-6">
                          <h4 className="font-semibold text-gray-900 mb-3 text-lg">Varer du måske allerede har</h4>
                          <ul className="space-y-2">
                            {shoppingList.categories
                              ?.find((cat: any) => cat.name === 'Varer du måske allerede har')
                              ?.items?.map((item: any, itemIndex: number) => {
                                const rowKey = `maybe-${itemIndex}-${item.name}`
                                const rowDone = shoppingMode && !!shoppingChecked[rowKey]
                                return (
                                <li key={itemIndex} className={`flex items-center justify-between gap-2 text-sm text-gray-600 ${rowDone ? 'opacity-65' : ''}`}>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {shoppingMode && (
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4 shrink-0 rounded border-gray-300"
                                        checked={!!shoppingChecked[rowKey]}
                                        onChange={() => toggleShoppingItem(rowKey)}
                                        aria-label={`Kryds af ${item.name}`}
                                      />
                                    )}
                                    <span className={rowDone ? 'line-through text-gray-500' : ''}>{item.name}</span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className={`text-gray-500 ${rowDone ? 'line-through' : ''}`}>
                                      {formatQuantity(item.amount)} {item.unit}
                                    </div>
                                  </div>
                                </li>
                              )})}
                          </ul>
                        </div>
                      )}
                      
                      {/* Store total for selected tab */}
                      {selectedStoreTab !== 'all' && storePrices[selectedStoreTab] && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <div className="flex items-center justify-between text-lg font-semibold">
                            <span>Total:</span>
                            <span className="text-blue-600">
                              {(() => {
                                const basisItemNames = new Set<string>()
                                shoppingList.categories?.forEach((cat: any) => {
                                  cat.items?.forEach((item: any) => {
                                    if (item.isBasis) {
                                      basisItemNames.add(item.name?.toLowerCase().trim() || '')
                                    }
                                  })
                                })

                                return Object.entries(storePrices[selectedStoreTab])
                                  .reduce((sum: number, [itemName, product]: [string, any]) => {
                                    if (basisItemNames.has(itemName.toLowerCase().trim())) {
                                      return sum
                                    }
                                    return sum + (product.totalPrice || product.price || 0)
                                  }, 0)
                              })()
                                .toFixed(2)
                                .replace('.', ',')} kr
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Basisvarer section */}
                      {basisvarer.length > 0 && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Basisvarer (tilføjes altid til indkøbslisten)</h4>
                          <ul className="space-y-2">
                            {basisvarer.map((item) => {
                              const rowKey = `basis-${item.id}`
                              const rowDone = shoppingMode && !!shoppingChecked[rowKey]
                              return (
                              <li key={item.id} className={`flex items-center justify-between gap-2 text-sm ${rowDone ? 'opacity-65' : ''}`}>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {shoppingMode && (
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 shrink-0 rounded border-gray-300"
                                      checked={!!shoppingChecked[rowKey]}
                                      onChange={() => toggleShoppingItem(rowKey)}
                                      aria-label={`Kryds af ${item.ingredient_name}`}
                                    />
                                  )}
                                  <span className={`text-gray-700 ${rowDone ? 'line-through text-gray-500' : ''}`}>{item.ingredient_name}</span>
                                </div>
                                <span className={`text-gray-900 font-medium shrink-0 ${rowDone ? 'line-through text-gray-500' : ''}`}>
                                  {formatQuantity(item.quantity)} {item.unit}
                                  {item.notes && (
                                    <span className="text-xs text-gray-500 ml-2">({item.notes})</span>
                                  )}
                                </span>
                              </li>
                            )})}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Info: morgenmad / frokost i madplanen */}
      {mealInfoKind && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setMealInfoKind(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="meal-info-title"
        >
          <div
            className="max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="meal-info-title" className="text-lg font-semibold text-gray-900 mb-3">
              {mealInfoKind === 'breakfast' ? 'Morgenmad i madplanen' : 'Frokost i madplanen'}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {mealInfoKind === 'breakfast' ? (
                <>
                  Når morgenmad er afkrydset, indgår morgenmad i dine beregninger og i den automatiske madplan - men
                  morgenmad er ofte meget individuelt. Klik på et frit morgenmadsfelt for at vælge ret manuelt.
                  <span className="mt-3 block text-gray-700">
                    <strong>Tip:</strong> Markér ofte brugte morgenmadsopskrifter som favoritter for hurtig adgang.
                  </span>
                </>
              ) : (
                <>
                  Når frokost er afkrydset, indgår frokost i dine beregninger og i den automatiske madplan - men
                  frokost er ofte meget individuelt. Klik på et frit frokostfelt for at vælge ret manuelt, præcis som ved
                  morgenmad.
                  <span className="mt-3 block text-gray-700">
                    <strong>Tip:</strong> Markér ofte brugte frokostopskrifter som favoritter for hurtig adgang.
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              className="mt-5 w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
              onClick={() => setMealInfoKind(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

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
                    {recipeCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Recipe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loadingAvailableRecipes && (
                <div className="md:col-span-2 text-center py-10 text-gray-500">
                  Henter opskrifter...
                </div>
              )}
              {!loadingAvailableRecipes && availableRecipesError && (
                <div className="md:col-span-2 text-center py-10 text-red-600">
                  {availableRecipesError}
                </div>
              )}
              {getFilteredRecipes().map(recipe => (
                <div
                  key={recipe.id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-green-300 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => openRecipeDetail(recipe)}
                >
                  {/* Recipe Image */}
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    {(recipe.image || recipe.imageUrl) ? (
                      <img src={recipe.image || recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-400/20 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <ChefHat size={48} className="mx-auto mb-2" />
                          <span className="text-sm">Intet billede</span>
                        </div>
                      </div>
                    )}
                    {selectedMealSlot && recipe.mealTypeMatch === false && (
                      <div className="absolute top-3 left-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Ikke primært {selectedMealSlot.split('-')[1] === 'breakfast' ? 'morgenmad' : selectedMealSlot.split('-')[1] === 'lunch' ? 'frokost' : 'aftensmad'}
                      </div>
                    )}
                  </div>

                  {/* Recipe Info */}
                  <div className="p-4">
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-900 text-lg group-hover:text-green-600 transition-colors">
                        {recipe.title}
                      </h4>
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

                    {/* Actions */}
                    <div className="flex items-center justify-end">
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
              {!loadingAvailableRecipes && !availableRecipesError && getFilteredRecipes().length === 0 && (
                <div className="md:col-span-2 text-center py-10 text-gray-500">
                  Ingen opskrifter matcher dit filter.
                </div>
              )}
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
                {(selectedRecipe.image || selectedRecipe.imageUrl) ? (
                  <img src={selectedRecipe.image || selectedRecipe.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-blue-400/20 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <ChefHat size={64} className="mx-auto mb-3" />
                      <span className="text-lg">Intet billede</span>
                    </div>
                  </div>
                )}
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

            {/* Ingredients */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Ingredienser</h4>
              <div className="space-y-2">
                {selectedRecipe.ingredients.map((ingredient: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">{ingredient.name}</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      {ingredient.amount} {ingredient.unit}
                    </span>
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

      {/* Recipe view modal (from meal plan card eye icon) */}
      {recipeViewSlugOrId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setRecipeViewSlugOrId(null); setRecipeViewSlot(null) }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Opskrift</h3>
              <button
                type="button"
                onClick={() => { setRecipeViewSlugOrId(null); setRecipeViewSlot(null) }}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                aria-label="Luk"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {recipeViewLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse text-gray-500">Henter opskrift...</div>
                </div>
              )}
              {!recipeViewLoading && !recipeViewData && (
                <div className="py-12 text-center text-gray-500">Kunne ikke hente opskriften.</div>
              )}
              {!recipeViewLoading && recipeViewData && (
                <>
                  <div className="aspect-video sm:aspect-[2/1] w-full rounded-lg overflow-hidden bg-gray-100 mb-4">
                    {(recipeViewData.imageUrl || recipeViewData.image_url) ? (
                      <img
                        src={recipeViewData.imageUrl || recipeViewData.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ChefHat size={48} />
                      </div>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{recipeViewData.title}</h2>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                    {(recipeViewData.preparationTime ?? recipeViewData.preparation_time) != null && (
                      <span>Forberedelse: {recipeViewData.preparationTime ?? recipeViewData.preparation_time} min</span>
                    )}
                    {(recipeViewData.cookingTime ?? recipeViewData.cooking_time) != null && (
                      <span>Tilberedning: {recipeViewData.cookingTime ?? recipeViewData.cooking_time} min</span>
                    )}
                    {recipeViewData.servings != null && <span>{recipeViewData.servings} portioner</span>}
                  </div>
                  {(recipeViewData.nutritionalInfo || (recipeViewData.calories != null || recipeViewData.protein != null)) && (
                    <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-900">{Math.round(recipeViewData.nutritionalInfo?.calories ?? recipeViewData.calories ?? 0)}</div>
                        <div className="text-xs text-gray-500">kcal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-900">{Math.round(recipeViewData.nutritionalInfo?.protein ?? recipeViewData.protein ?? 0)}g</div>
                        <div className="text-xs text-gray-500">P</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-900">{Math.round(recipeViewData.nutritionalInfo?.carbs ?? recipeViewData.carbs ?? 0)}g</div>
                        <div className="text-xs text-gray-500">K</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-900">{Math.round(recipeViewData.nutritionalInfo?.fat ?? recipeViewData.fat ?? 0)}g</div>
                        <div className="text-xs text-gray-500">F</div>
                      </div>
                    </div>
                  )}
                  {recipeViewData.ingredients && recipeViewData.ingredients.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Ingredienser</h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {recipeViewData.ingredients.map((ing: any, i: number) => (
                          <li key={i}>
                            {ing.amount} {ing.unit} {ing.name || ing.ingredient_name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recipeViewData.instructions && recipeViewData.instructions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Fremgangsmåde</h4>
                      <ol className="space-y-2 list-decimal list-inside text-sm text-gray-700">
                        {recipeViewData.instructions.map((step: any, i: number) => (
                          <li key={i}>{step.instruction ?? step.step ?? step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )}
            </div>
            {recipeViewSlot && (
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const { dayKey, mealKey } = recipeViewSlot
                    const lk = slotKey(dayKey, mealKey)
                    setMealPlan((prev) => {
                      const next = { ...prev }
                      next[dayKey] = { ...prev[dayKey], [mealKey]: null }
                      return next
                    })
                    setSlotLocks((prev) => {
                      const n = { ...prev }
                      delete n[lk]
                      return n
                    })
                    setRecipeViewSlugOrId(null)
                    setRecipeViewSlot(null)
                  }}
                  className="w-full py-2.5 px-4 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Fjerne opskrift
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Smart shopping SMS modal */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div
            className="absolute inset-0"
            aria-hidden
            onClick={() => {
              if (!smsSending) {
                setShowSmsModal(false)
                setPendingSmartToken(null)
                setPendingSmartUrl(null)
                setSmsError('')
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Send indkøbsliste til mobil</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                disabled={smsSending}
                onClick={() => {
                  setShowSmsModal(false)
                  setPendingSmartToken(null)
                  setPendingSmartUrl(null)
                  setSmsError('')
                }}
              >
                <X size={22} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Vi sender et kort link til din telefon via SMS.
            </p>
            {pendingSmartUrl && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="mb-2 text-xs text-emerald-900">
                  Tryk &quot;Send SMS&quot;, eller kopier linket her og tilgå den mobil-optimerede indkøbsliste – linket
                  kopieres automatisk til udklipsholder.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                  <input
                    readOnly
                    value={pendingSmartUrl}
                    className="min-w-0 flex-1 rounded-md border border-emerald-200 bg-white px-2 py-1.5 font-mono text-xs text-gray-800"
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    onClick={() => void copyPendingSmartLink()}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    {smartLinkCopied ? <Check size={16} /> : <Copy size={16} />}
                    {smartLinkCopied ? 'Kopieret' : 'Kopier link'}
                  </button>
                </div>
              </div>
            )}
            <label className="mb-2 block text-sm font-medium text-gray-700">Mobilnummer</label>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
              <span className="text-gray-600 select-none">+45</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="12 34 56 78"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-gray-900 outline-none"
                value={smsPhoneDigits.replace(/\D/g, '').slice(0, 8)}
                onChange={(e) => setSmsPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 8))}
                disabled={smsSending}
              />
            </div>
            {smsError && <p className="mb-3 text-sm text-red-600">{smsError}</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={smsSending}
                onClick={() => {
                  setShowSmsModal(false)
                  setPendingSmartToken(null)
                  setPendingSmartUrl(null)
                  setSmsError('')
                }}
              >
                Annuller
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={smsSending || smsPhoneDigits.replace(/\D/g, '').length !== 8}
                onClick={() => void sendSmartSms()}
              >
                {smsSending ? 'Sender…' : 'Send SMS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family Settings Modal */}
      {showFamilySettings && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setShowFamilySettings(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[min(92vh,900px)] w-full max-w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-2xl sm:rounded-2xl lg:max-w-3xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-settings-title"
          >
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
              <h3 id="family-settings-title" className="pr-2 text-lg font-semibold text-gray-900">
                Familieindstillinger
              </h3>
              <button
                type="button"
                aria-label="Luk"
                onClick={() => setShowFamilySettings(false)}
                className="touch-manipulation -m-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:space-y-6 sm:px-6 sm:py-5">
              {/* 1. Madprofiler */}
              <section className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 sm:p-5">
                <div className="mb-4 flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
                    aria-hidden
                  >
                    1
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-base font-semibold text-gray-900">Madprofiler</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Tilføj det antal der spiser med hos jer til dagligt.
                    </p>
                  </div>
                </div>
                <div className="space-y-4 sm:pl-12">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Antal voksne i familien
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={familyProfile.adults}
                      onChange={(e) =>
                        setFamilyProfile((prev) => ({ ...prev, adults: parseInt(e.target.value, 10) || 1 }))
                      }
                      className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Antal børn</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={familyProfile.children}
                      onChange={(e) =>
                        setFamilyProfile((prev) => ({ ...prev, children: parseInt(e.target.value, 10) || 0 }))
                      }
                      className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {familyProfile.children > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Børnenes aldre</label>
                      <p className="mb-3 text-xs text-gray-500">
                        Vi spørger om dit barns alder for at optimere madplanen efter det.
                      </p>
                      <div className="space-y-2">
                        {Array.from({ length: familyProfile.children }, (_, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="w-16 shrink-0 text-sm text-gray-600">Barn {index + 1}:</span>
                            <select
                              value={familyProfile.childrenAges?.[index] || '0-3'}
                              onChange={(e) => {
                                const newAges = [...(familyProfile.childrenAges || [])]
                                newAges[index] = e.target.value
                                setFamilyProfile((prev) => ({ ...prev, childrenAges: newAges }))
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                  {familyProfile.adults > 0 && (
                    <div>
                      <label className="mb-3 block text-sm font-medium text-gray-700">
                        Vægttabsprofiler for voksne
                      </label>
                      <div className="space-y-2">
                        {Array.from({ length: familyProfile.adults }, (_, index) => {
                          const profile = familyProfile.adultsProfiles[index]
                          const isComplete =
                            Boolean(profile?.isComplete) ||
                            adultProfileHasRequiredFieldsForMealPlan(profile ?? {})
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white p-3"
                            >
                              <div className="flex min-w-0 items-center space-x-3">
                                <span className="text-sm font-medium text-gray-700">Voksen {index + 1}</span>
                                {isComplete && <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />}
                              </div>
                              <button
                                type="button"
                                onClick={() => openWeightLossProfile(index)}
                                className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                {isComplete ? 'Rediger profil' : 'Udfyld profil'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Indkøbsindstillinger */}
              <section className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 sm:p-5">
                <div className="mb-4 flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
                    aria-hidden
                  >
                    2
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-base font-semibold text-gray-900">Indkøbsindstillinger</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Vælg bl.a. de indkøbscentre du har i nærheden og bruger.
                    </p>
                  </div>
                </div>
                <div className="space-y-4 sm:pl-12">
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      Vælg butikker tæt på dig
                    </label>
                    <div className="max-h-40 space-y-2 overflow-y-auto sm:max-h-48">
                      {mockStores.map((store) => (
                        <label key={store.id} className="flex cursor-pointer items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={familyProfile.selectedStores.includes(store.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFamilyProfile((prev) => ({
                                  ...prev,
                                  selectedStores: [...prev.selectedStores, store.id],
                                }))
                              } else {
                                setFamilyProfile((prev) => ({
                                  ...prev,
                                  selectedStores: prev.selectedStores.filter((id) => id !== store.id),
                                }))
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <div className={`h-4 w-4 shrink-0 rounded-full ${store.color}`} />
                          <span className="text-sm text-gray-700">{store.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Disse butikker bruges til at beregne besparelser og generere madplaner.
                    </p>
                  </div>

                  <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={familyProfile.prioritizeOrganic}
                        onChange={(e) =>
                          setFamilyProfile((prev) => ({ ...prev, prioritizeOrganic: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-blue-600"
                      />
                      <span>
                        <span className="text-sm font-medium text-gray-800">Prioriter økologi</span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          Gemmes på profilen og bruges til at favorisere økologiske retter i madplanen, hvor det er
                          understøttet.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 border-t border-gray-100 pt-3">
                      <input
                        type="checkbox"
                        checked={familyProfile.prioritizeAnimalOrganic}
                        onChange={(e) =>
                          setFamilyProfile((prev) => ({ ...prev, prioritizeAnimalOrganic: e.target.checked }))
                        }
                        className="mt-0.5 rounded text-blue-600"
                      />
                      <span>
                        <span className="text-sm font-medium text-gray-800">Prioriter animalsk økologi</span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          Gemmes på profilen (kød, fisk, mælk m.m.); udvidet brug i planlægning kan tilføjes løbende.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Budgetloft pr. uge (valgfrit)
                    </label>
                    <p className="mb-2 text-xs text-gray-500">
                      Vi prøver at lægge planen, så den rammer dit loft, ved at prioritere tilbud. Ved meget lave beløb
                      er det ikke altid muligt at få det til at hænge sammen.
                    </p>
                    <div className="flex max-w-xs items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        placeholder="Fx 1200"
                        value={familyProfile.weeklyBudgetKr === null ? '' : familyProfile.weeklyBudgetKr}
                        onChange={(e) => {
                          const raw = e.target.value.trim()
                          if (raw === '') {
                            setFamilyProfile((prev) => ({ ...prev, weeklyBudgetKr: null }))
                            return
                          }
                          const n = parseInt(raw, 10)
                          if (!Number.isFinite(n) || n < 0) return
                          setFamilyProfile((prev) => ({ ...prev, weeklyBudgetKr: Math.min(500_000, n) }))
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="shrink-0 text-sm text-gray-600">kr</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Madplans forbehold */}
              <section className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 sm:p-5">
                <div className="mb-4 flex gap-3 sm:gap-4">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
                    aria-hidden
                  >
                    3
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-base font-semibold text-gray-900">Madplans forbehold</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      Styr hvad der ikke skal med, og hvor meget I vil variere retterne.
                    </p>
                  </div>
                </div>
                <div className="space-y-5 sm:pl-12">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Madvarer vi ikke kan lide (ekskluder fra madplan)
                    </label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                        { id: 'soy', label: 'Soja' },
                      ].map((food) => (
                        <label
                          key={food.id}
                          className="flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white p-2.5 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={familyProfile.excludedIngredients.includes(food.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFamilyProfile((prev) => ({
                                  ...prev,
                                  excludedIngredients: [...prev.excludedIngredients, food.id],
                                }))
                              } else {
                                setFamilyProfile((prev) => ({
                                  ...prev,
                                  excludedIngredients: prev.excludedIngredients.filter((id) => id !== food.id),
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

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Variation i madplanen</label>
                    <div className="mb-2 flex items-center space-x-3">
                      <span className="shrink-0 text-xs text-gray-500">Ensartet</span>
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="1"
                        value={variationLevel}
                        onChange={(e) => setVariationLevel(parseInt(e.target.value, 10))}
                        className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200"
                      />
                      <span className="shrink-0 text-xs text-gray-500">Varieret</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {variationLevel === 0 && 'Samme retter flere dage i træk'}
                      {variationLevel === 1 && 'Lidt gentagelse, primært nye retter'}
                      {variationLevel === 2 && 'God balance mellem nyt og kendt'}
                      {variationLevel === 3 && 'Maksimal variation, undgår gentagelse'}
                    </p>
                  </div>
                </div>
              </section>
            </div>
            <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:bg-white sm:px-6">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) { setShowFamilySettings(false); return }
                    const response = await fetch('/api/madbudget/family-profile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                      body: JSON.stringify({
                        familyProfile: {
                          adults: familyProfile.adults,
                          children: familyProfile.children,
                          childrenAges: familyProfile.childrenAges,
                          prioritizeOrganic: familyProfile.prioritizeOrganic,
                          prioritizeAnimalOrganic: familyProfile.prioritizeAnimalOrganic,
                          excludedIngredients: familyProfile.excludedIngredients,
                          selectedStores: familyProfile.selectedStores,
                          variationLevel,
                          weeklyBudgetKr: familyProfile.weeklyBudgetKr
                        },
                        adultProfiles: familyProfile.adultsProfiles
                      })
                    })
                    if (response.ok) setShowFamilySettings(false)
                    else alert('Der opstod en fejl ved gemning. Prøv igen.')
                  } catch (e) {
                    console.error(e)
                    alert('Der opstod en fejl ved gemning. Prøv igen.')
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
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

      {/* Vægttabsprofil Modal — z over Familieindstillinger (z-[60]) når den åbnes derfra */}
      {showWeightLossProfileModal && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center"
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
                    Trin {weightLossProfileStep + 1} af 4
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#1B365D] to-[#87A96B]"
                    initial={{ width: 0 }}
                    animate={{ width: `${((weightLossProfileStep + 1) / 4) * 100}%` }}
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
                        { id: 'familiemad', name: 'Kalorietælling', desc: 'Almindelig familiemad med planlagte kalorier og fuld næring — hele familien kan spise med' }
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

                {/* Step 4: Mål (måltider vælges på madplan-siden) */}
                {weightLossProfileStep === 3 && (
                  <motion.div
                    key="step4goals"
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
                  Trin {weightLossProfileStep + 1} af 4
                </span>
              </div>

              <button
                onClick={() => {
                  if (weightLossProfileStep < 3) {
                    setWeightLossProfileStep(prev => prev + 1)
                  } else {
                    saveWeightLossProfile()
                  }
                }}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-[#1B365D] to-[#87A96B] text-white rounded-lg hover:shadow-lg transition-all"
              >
                <span>{weightLossProfileStep === 3 ? 'Gem' : 'Næste'}</span>
                {weightLossProfileStep < 3 && <ChevronRight size={20} />}
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

      {/* Del-loading modal – viser mens madplan forberedes til deling */}
      {shareLoading && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <motion.div
              className="text-5xl mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              📤
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Deler din madplan</h3>
            <p className="text-sm text-gray-600 mb-4">
              Vi forbereder linket med madplan, opskrifter, tilbud og priser. Det tager et øjeblik.
            </p>
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-green-600 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Del-link modal (når clipboard er blokeret) */}
      {shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShareUrl(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">Del din madplan</h3>
            <p className="text-sm text-gray-600 mb-3">Kopier linket og del det. Modtageren kan se madplanen uden at logge ind.</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  id="share-url-input"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('share-url-input') as HTMLInputElement
                    if (input) {
                      input.select()
                      document.execCommand('copy')
                      setShareCopied(true)
                      setTimeout(() => setShareCopied(false), 2000)
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 whitespace-nowrap"
                >
                  {shareCopied ? 'Kopieret!' : 'Kopier'}
                </button>
              </div>
              <button
                onClick={() => setShareUrl(null)}
                className="self-end px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      )}

      <MadbudgetShopSurveyModal
        open={shopSurveyOpen}
        storeOptions={shopSurveyStores}
        accessToken={shopSurveyToken}
        onSubmitted={() => {
          router.replace('/madbudget', { scroll: false })
        }}
        onClose={() => {
          setShopSurveyOpen(false)
          router.replace('/madbudget', { scroll: false })
        }}
      />
    </div>
  )
}
