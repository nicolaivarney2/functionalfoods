'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Settings, Heart, ShoppingCart, TrendingUp, Share2, Plus, X, ChefHat, Coffee, Utensils, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

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

const mockBasicItems = [
  { id: 1, name: 'Smør', category: 'Mejeri', isOwned: false },
  { id: 2, name: 'Olivenolie', category: 'Kolonial', isOwned: true },
  { id: 3, name: 'Salt', category: 'Kolonial', isOwned: true },
  { id: 4, name: 'Peber', category: 'Kolonial', isOwned: false },
  { id: 5, name: 'Hvidløg', category: 'Frugt og grønt', isOwned: false },
  { id: 6, name: 'Løg', category: 'Frugt og grønt', isOwned: true },
  { id: 7, name: 'Ris', category: 'Kolonial', isOwned: false },
  { id: 8, name: 'Pasta', category: 'Kolonial', isOwned: true }
]

// Mock data for basisvarer (family standard items)
const mockBasisvarer = [
  { id: 1, name: 'Bananer', category: 'Frugt og grønt' },
  { id: 2, name: 'Æbler', category: 'Frugt og grønt' },
  { id: 3, name: 'Havregryn', category: 'Morgenmad' },
  { id: 4, name: 'Skyr', category: 'Mejeri' },
  { id: 5, name: 'Brød', category: 'Bageri' },
  { id: 6, name: 'Mælk', category: 'Mejeri' }
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

export default function MadbudgetPage() {
  const [familyProfile, setFamilyProfile] = useState({
    adults: 2,
    children: 2,
    childrenAges: ['4-8', '4-8'],
    prioritizeOrganic: true,
    prioritizeAnimalOrganic: false,
    dislikedIngredients: ['oliven', 'fetaost'],
    selectedStores: [1, 2, 8] // REMA 1000, Netto, Løvbjerg
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
  
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [selectedMealSlot, setSelectedMealSlot] = useState('')
  const [basicItems, setBasicItems] = useState(mockBasicItems)
  const [basisvarer, setBasisvarer] = useState(mockBasisvarer)
  const [showFamilySettings, setShowFamilySettings] = useState(false)
  const [basicItemsOpen, setBasicItemsOpen] = useState(true)
  const [basisvarerOpen, setBasisvarerOpen] = useState(true)
  const [familyProfileOpen, setFamilyProfileOpen] = useState(true)
  const [savingsOpen, setSavingsOpen] = useState(true)
  const [basisvarerModalOpen, setBasisvarerModalOpen] = useState(false)
  const [currentDayOffset, setCurrentDayOffset] = useState(0)
  const [showMealSelectionModal, setShowMealSelectionModal] = useState(false)
  const [selectedMeals, setSelectedMeals] = useState({
    breakfast: true,
    lunch: true,
    dinner: true
  })
  const [showShoppingList, setShowShoppingList] = useState(false)
  const [shoppingList, setShoppingList] = useState<any[]>([])
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [realRecipes, setRealRecipes] = useState<any[]>([])
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  
  // Mock family ID for now - later this will come from auth
  const mockFamilyId = '550e8400-e29b-41d4-a716-446655440000'

    // Real recipes loaded from database
  const [showRecipeDetail, setShowRecipeDetail] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('')
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('all')
  const [showCostSavings, setShowCostSavings] = useState(true)
  
  // Load basisvarer on component mount
  useEffect(() => {
    fetchBasisvarer()
    fetchRealRecipes()
  }, [])

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
    let filtered = realRecipes

    // Filter by search query
    if (recipeSearchQuery) {
      filtered = filtered.filter(recipe => 
        recipe.title.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
        recipe.ingredients.some((ing: any) => ing.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()))
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

  const toggleBasicItem = (itemId: number) => {
    setBasicItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, isOwned: !item.isOwned }
          : item
      )
    )
  }

  // API functions for basisvarer
  const fetchBasisvarer = async () => {
    try {
      const response = await fetch(`/api/basisvarer?familyId=${mockFamilyId}`)
      const data = await response.json()
      
      if (data.success) {
        setBasisvarer(data.data.map((item: any) => ({
          id: item.id,
          name: item.item_name,
          category: item.category
        })))
      }
    } catch (error) {
      console.error('Error fetching basisvarer:', error)
    }
  }

  const addBasisvarer = async (item: any) => {
    try {
      const response = await fetch('/api/basisvarer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          familyId: mockFamilyId,
          itemName: item.name,
          category: categorizeIngredient(item.name)
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the list
        await fetchBasisvarer()
        setBasisvarerModalOpen(false)
      }
    } catch (error) {
      console.error('Error adding basisvare:', error)
    }
  }

  const removeBasisvarer = async (itemId: number) => {
    try {
      const response = await fetch(`/api/basisvarer?id=${itemId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the list
        await fetchBasisvarer()
      }
    } catch (error) {
      console.error('Error removing basisvare:', error)
    }
  }



  // Generate complete shopping list (basisvarer + meal plan)
  const generateCompleteShoppingList = () => {
    const mealPlanIngredients = generateShoppingListFromMealPlan()
    const combinedList = [...basisvarer, ...mealPlanIngredients]
    
    // Group by category and sort
    const categorizedList = groupIngredientsByCategory(combinedList)
    
    setShoppingList(categorizedList)
    setShowShoppingList(true)
  }

  // Generate shopping list from meal plan
  const generateShoppingListFromMealPlan = () => {
    const ingredients: any[] = []
    
    Object.values(mealPlan).forEach(day => {
      Object.values(day).forEach(meal => {
        if (meal && meal.ingredients) {
          meal.ingredients.forEach((ing: any) => {
            // Check if ingredient already exists
            const existingIndex = ingredients.findIndex(item => 
              item.name.toLowerCase() === ing.name.toLowerCase()
            )
            
            if (existingIndex >= 0) {
              // Combine amounts
              const existing = ingredients[existingIndex]
              const newAmount = parseFloat(existing.amount) + parseFloat(ing.amount)
              ingredients[existingIndex] = {
                ...existing,
                amount: newAmount.toString(),
                totalPrice: (existing.totalPrice || 0) + (ing.price || 0)
              }
            } else {
              ingredients.push({
                ...ing,
                totalPrice: ing.price || 0,
                category: categorizeIngredient(ing.name)
              })
            }
          })
        }
      })
    })
    
    return ingredients
  }

  // Categorize ingredient based on name
  const categorizeIngredient = (ingredientName: string): string => {
    const name = ingredientName.toLowerCase()
    
    if (name.includes('mælk') || name.includes('yoghurt') || name.includes('ost') || 
        name.includes('fløde') || name.includes('smør') || name.includes('skyr')) {
      return 'Mejeri'
    } else if (name.includes('banan') || name.includes('æble') || name.includes('bær') || 
               name.includes('tomat') || name.includes('agurk') || name.includes('salat') ||
               name.includes('broccoli') || name.includes('spinat')) {
      return 'Frugt & Grønt'
    } else if (name.includes('kød') || name.includes('kylling') || name.includes('laks') || 
               name.includes('fisk') || name.includes('bacon')) {
      return 'Kød & Fisk'
    } else if (name.includes('pasta') || name.includes('ris') || name.includes('quinoa') ||
               name.includes('havregryn') || name.includes('brød')) {
      return 'Kolonial'
    } else if (name.includes('æg') || name.includes('honning') || name.includes('nødder')) {
      return 'Diverse'
    } else {
      return 'Andet'
    }
  }

  // Group ingredients by category
  const groupIngredientsByCategory = (ingredients: any[]) => {
    const grouped: { [key: string]: any[] } = {}
    
    ingredients.forEach(ingredient => {
      const category = ingredient.category || 'Andet'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(ingredient)
    })
    
    // Sort categories and items within categories
    const sortedCategories = Object.keys(grouped).sort()
    const result: any[] = []
    
    sortedCategories.forEach(category => {
      const sortedItems = grouped[category].sort((a, b) => a.name.localeCompare(b.name))
      result.push({ category, items: sortedItems })
    })
    
    return result
  }

  // Toggle item checked status
  const toggleItemChecked = (itemId: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Calculate total savings from meal plan
  const calculateTotalSavings = () => {
    let total = 0
    Object.values(mealPlan).forEach(day => {
      Object.values(day).forEach(meal => {
        if (meal && meal.savings) {
          total += meal.savings
        }
      })
    })
    return total
  }

  // Get primary store from family profile
  const getPrimaryStore = () => {
    if (familyProfile.selectedStores.length > 0) {
      const storeId = familyProfile.selectedStores[0]
      const store = mockStores.find(s => s.id === storeId)
      return store?.name || 'Valgt butik'
    }
    return 'Valgt butik'
  }

  // Fetch real recipes from database
  const fetchRealRecipes = async () => {
    try {
      setIsLoadingRecipes(true)
      console.log('🔍 Fetching recipes from /api/recipes...')
      
      const response = await fetch('/api/recipes')
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Response data:', data)
      
      if (data.success && data.recipes) {
        // Transform recipes to match our expected format
        const transformedRecipes = data.recipes.map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          image: recipe.image_url || '/images/recipes/placeholder.jpg',
          ingredients: recipe.ingredients || [],
          totalPrice: 0, // Will be calculated from offers later
          savings: 0, // Will be calculated from offers later
          store: 'Database',
          mealType: 'dinner', // Default, will be categorized later
          prepTime: recipe.prep_time || 30,
          servings: recipe.servings || 4,
          category: recipe.category || 'Generelt',
          dietaryTags: recipe.dietary_tags || []
        }))
        
        setRealRecipes(transformedRecipes)
        console.log('✅ Loaded', transformedRecipes.length, 'real recipes')
        console.log('📋 Sample recipe:', transformedRecipes[0])
      } else {
        console.error('❌ Failed to fetch recipes:', data.error || 'Unknown error')
        console.error('❌ Response data:', data)
      }
    } catch (error) {
      console.error('❌ Error fetching recipes:', error)
      console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoadingRecipes(false)
    }
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

  const generateMealPlan = () => {
    // Show meal selection modal first
    setShowMealSelectionModal(true)
  }

  const generateAIMealPlan = async () => {
    try {
      console.log('🚀 Starting AI meal plan generation...')
      
      // Calculate family size based on age groups
      const familySize = calculateFamilySize()
      console.log('👨‍👩‍👧‍👦 Family size calculated:', familySize)
      
      // Get recipes that match family size
      const suitableRecipes = getRecipesForFamilySize(familySize)
      console.log('🍽️ Suitable recipes found:', suitableRecipes.length)
      
      // Generate meal plan based on selected meals
      const newMealPlan = generateMealPlanFromRecipes(suitableRecipes)
      
      // Update the meal plan state
      setMealPlan(newMealPlan)
      
      // Close modal
      setShowMealSelectionModal(false)
      
      // Show success message
      const message = `🎯 AI Madplan Genereret!\n\n` +
        `👨‍👩‍👧‍👦 Familie størrelse: ${familySize} personer\n` +
        `🍽️ Måltider valgt: ${Object.values(selectedMeals).filter(Boolean).length}/3\n` +
        `📅 7-dages madplan klar!\n` +
        `✨ Alle dage udfyldt med passende opskrifter`
      
      alert(message)
      
      console.log('📋 Full meal plan updated:', newMealPlan)
      
    } catch (error) {
      console.error('Error generating AI meal plan:', error)
      alert(`❌ Fejl: ${error instanceof Error ? error.message : 'Ukendt fejl'}`)
    }
  }

  // Calculate family size based on age groups
  const calculateFamilySize = () => {
    let totalSize = familyProfile.adults
    
    if (familyProfile.childrenAges) {
      familyProfile.childrenAges.forEach(age => {
        if (age === '0-3' || age === '4-8') {
          totalSize += 0.5
        } else if (age === '8+') {
          totalSize += 1
        }
      })
    }
    
    return totalSize
  }

  // Get recipes suitable for family size
  const getRecipesForFamilySize = (familySize: number) => {
    return realRecipes.filter(recipe => {
      // Recipe should have enough servings for the family
      return recipe.servings >= familySize
    })
  }

  // Generate meal plan from recipes
  const generateMealPlanFromRecipes = (suitableRecipes: any[]) => {
    const newMealPlan = { ...mealPlan }
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayKey[]
    const mealTypes = ['breakfast', 'lunch', 'dinner'] as MealType[]
    
    // Shuffle recipes to get variety
    const shuffledRecipes = [...suitableRecipes].sort(() => Math.random() - 0.5)
    let recipeIndex = 0
    
    days.forEach(day => {
      mealTypes.forEach(mealType => {
        // Only add meals that are selected
        if (selectedMeals[mealType]) {
          if (recipeIndex < shuffledRecipes.length) {
            const recipe = shuffledRecipes[recipeIndex]
            
            newMealPlan[day][mealType] = {
              id: recipe.id,
              title: recipe.title,
              image: recipe.image,
              ingredients: recipe.ingredients,
              totalPrice: recipe.totalPrice,
              savings: recipe.savings,
              store: recipe.store,
              mealType: recipe.mealType,
              prepTime: recipe.prepTime,
              servings: recipe.servings,
              category: recipe.category,
              dietaryTags: recipe.dietaryTags
            }
            
            recipeIndex++
          }
        } else {
          // Clear meal if not selected
          newMealPlan[day][mealType] = null
        }
      })
    })
    
    return newMealPlan
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
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setFamilyProfileOpen(!familyProfileOpen)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Users size={20} className="mr-2" />
                  Familieprofil
                </h2>
                <ChevronDown 
                  size={20} 
                  className={`text-gray-500 transition-transform ${familyProfileOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {familyProfileOpen && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-3 pt-4">
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
              )}
            </div>

            {/* Basisvarer - Family Standard Items */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setBasisvarerOpen(!basisvarerOpen)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900">Basisvarer</h2>
                <ChevronDown 
                  size={20} 
                  className={`text-gray-500 transition-transform ${basisvarerOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {basisvarerOpen && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3 pt-4">
                    <p className="text-gray-600 text-sm">Standardvarer som altid købes til madplanen</p>
                    <button
                      onClick={() => setBasisvarerModalOpen(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                    >
                      <Plus size={16} className="mr-1" />
                      Tilføj vare
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {basisvarer.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {item.category}
                          </span>
                        </div>
                        <button
                          onClick={() => removeBasisvarer(item.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {basisvarer.length === 0 && (
                      <p className="text-gray-500 text-sm italic">Ingen basisvarer tilføjet endnu</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Basic Items */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setBasicItemsOpen(!basicItemsOpen)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900">Varer du måske har</h2>
                <ChevronDown 
                  size={20} 
                  className={`text-gray-500 transition-transform ${basicItemsOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {basicItemsOpen && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <p className="text-gray-600 text-sm mb-4 pt-4">Kryds af hvad du allerede har</p>
                  <div className="space-y-2">
                    {basicItems.map(item => (
                      <label key={item.id} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.isOwned}
                          onChange={() => toggleBasicItem(item.id)}
                          className="text-blue-600 rounded"
                        />
                        <span className={`text-sm ${item.isOwned ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {item.name}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {item.category}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Savings Summary */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <button
                onClick={() => setSavingsOpen(!savingsOpen)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <TrendingUp size={20} className="mr-2" />
                  Besparelser
                </h2>
                <ChevronDown 
                  size={20} 
                  className={`text-gray-500 transition-transform ${savingsOpen ? 'rotate-180' : ''}`} 
                />
              </button>
              
              {savingsOpen && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="text-center pt-4">
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
              )}
            </div>
          </div>

          {/* Center Column - Meal Planner */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Calendar size={20} className="mr-2" />
                  Ugeplanlægger
                </h2>
                <div className="flex items-center space-x-4">
                  {isLoadingRecipes && (
                    <div className="text-sm text-gray-500 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Indlæser opskrifter...
                    </div>
                  )}
                  <button
                    onClick={generateMealPlan}
                    disabled={isLoadingRecipes || realRecipes.length === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    {isLoadingRecipes ? 'Indlæser...' : realRecipes.length === 0 ? 'Ingen opskrifter' : 'Generer AI madplan'}
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
                                title={currentMeal ? `${currentMeal.title} - ${currentMeal.store} (Sparer ${currentMeal.savings.toFixed(0)} kr)` : `Vælg ${mealType.label.toLowerCase()}`}
                              >
                                {currentMeal ? (
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {currentMeal.title}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">
                                      {currentMeal.store}
                                    </div>
                                    <div className="text-xs text-green-600 font-medium">
                                      Sparer {currentMeal.savings.toFixed(0)} kr
                                    </div>
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
                                title={currentMeal ? `${currentMeal.title} - ${currentMeal.store} (Sparer ${currentMeal.savings.toFixed(0)} kr)` : `Vælg ${mealType.label.toLowerCase()}`}
                              >
                                {currentMeal ? (
                                  <div className="text-center">
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      {currentMeal.title}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-1">
                                      {currentMeal.store}
                                    </div>
                                    <div className="text-xs text-green-600 font-medium">
                                      Sparer {currentMeal.savings.toFixed(0)} kr
                                    </div>
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
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Din indkøbsliste vil blive genereret når du har planlagt din madplan</p>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 mt-6">

              </div>

              {/* Debug info for opskrifter */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Info:</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Loading: {isLoadingRecipes ? 'Ja' : 'Nej'}</div>
                    <div>Recipes loaded: {realRecipes.length}</div>
                    <div>Family size: {calculateFamilySize()}</div>
                    <div>Suitable recipes: {getRecipesForFamilySize(calculateFamilySize()).length}</div>
                  </div>
                </div>
              )}

              {/* Indkøbsliste direkte på siden */}
              {shoppingList.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">📋 Indkøbsliste</h3>
                    <button
                      onClick={() => setShoppingList([])}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Ryd liste
                    </button>
                  </div>
                  
                  {/* Tilbudsinfo */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Indkøbslisten er designet til tilbud i <span className="font-medium">{getPrimaryStore()}</span>, 
                      hvor du sparer <span className="font-medium text-green-600">{calculateTotalSavings()} kr</span>
                    </p>
                  </div>

                  {/* Kategoriserede varer */}
                  <div className="space-y-4">
                    {shoppingList.map((categoryGroup, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2">
                          <h4 className="font-medium text-gray-900">{categoryGroup.category}</h4>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {categoryGroup.items.map((item: any, itemIndex: number) => {
                            const itemId = `${categoryGroup.category}-${itemIndex}`
                            const isChecked = checkedItems.has(itemId)
                            
                            return (
                              <div 
                                key={itemId}
                                className={`px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${
                                  isChecked ? 'bg-gray-50' : ''
                                }`}
                                onClick={() => toggleItemChecked(itemId)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleItemChecked(itemId)}
                                      className="text-blue-600 rounded h-4 w-4"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className={`${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                      {item.name}
                                    </span>
                                    {item.amount && item.unit && (
                                      <span className="text-sm text-gray-500">
                                        {item.amount} {item.unit}
                                      </span>
                                    )}
                                  </div>
                                  {item.totalPrice && (
                                    <span className="text-sm font-medium text-gray-700">
                                      {item.totalPrice} kr
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
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
                        <div className="font-bold text-gray-900 text-lg">{recipe.totalPrice.toFixed(2)} kr</div>
                        <div className="text-sm text-green-600">Sparer {recipe.savings.toFixed(2)} kr</div>
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
                        {recipe.ingredients.slice(0, 4).map((ingredient: any, index: number) => (
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
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{selectedRecipe.savings.toFixed(2)} kr</div>
                <div className="text-sm text-gray-600">Besparer</div>
              </div>
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
              
              <button
                onClick={() => setShowFamilySettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Gem indstillinger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basisvarer Modal */}
      {basisvarerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Tilføj til basisvarer</h2>
              <button
                onClick={() => setBasisvarerModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Vælg varer som altid skal købes til madplanen
            </p>

            {/* Mock grocery items - later this will come from actual grocery data */}
            <div className="space-y-3">
              {[
                { name: 'Bananer', category: 'Frugt og grønt', price: '12.50 kr/kg' },
                { name: 'Æbler', category: 'Frugt og grønt', price: '15.00 kr/kg' },
                { name: 'Havregryn', category: 'Morgenmad', price: '8.50 kr/kg' },
                { name: 'Skyr', category: 'Mejeri', price: '18.00 kr/l' },
                { name: 'Brød', category: 'Bageri', price: '22.00 kr/stk' },
                { name: 'Mælk', category: 'Mejeri', price: '12.50 kr/l' },
                { name: 'Yoghurt', category: 'Mejeri', price: '15.00 kr/l' },
                { name: 'Ost', category: 'Mejeri', price: '45.00 kr/kg' },
                { name: 'Kød', category: 'Kød og fisk', price: '85.00 kr/kg' },
                { name: 'Fisk', category: 'Kød og fisk', price: '120.00 kr/kg' }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.category} • {item.price}</div>
                  </div>
                  <button
                    onClick={() => addBasisvarer(item)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Tilføj
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Måltidsvalg Modal */}
      {showMealSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Vælg måltider</h2>
              <button
                onClick={() => setShowMealSelectionModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
              Vælg hvilke måltider AI skal udfylde i madplanen
            </p>

            {/* Meal Selection Checkboxes */}
            <div className="space-y-4 mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMeals.breakfast}
                  onChange={(e) => setSelectedMeals(prev => ({ ...prev, breakfast: e.target.checked }))}
                  className="text-blue-600 rounded h-5 w-5"
                />
                <div className="flex items-center space-x-2">
                  <Coffee size={20} className="text-yellow-600" />
                  <span className="font-medium text-gray-900">Morgenmad</span>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMeals.lunch}
                  onChange={(e) => setSelectedMeals(prev => ({ ...prev, lunch: e.target.checked }))}
                  className="text-blue-600 rounded h-5 w-5"
                />
                <div className="flex items-center space-x-2">
                  <ChefHat size={20} className="text-green-600" />
                  <span className="font-medium text-gray-900">Frokost</span>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMeals.dinner}
                  onChange={(e) => setSelectedMeals(prev => ({ ...prev, dinner: e.target.checked }))}
                  className="text-blue-600 rounded h-5 w-5"
                />
                <div className="flex items-center space-x-2">
                  <Utensils size={20} className="text-blue-600" />
                  <span className="font-medium text-gray-900">Aftensmad</span>
                </div>
              </label>
            </div>

            {/* Family Size Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">👨‍👩‍👧‍👦 Familie størrelse:</div>
                <div>• Voksen = 1 person</div>
                <div>• Barn 0-3 år = 0.5 person</div>
                <div>• Barn 4-8 år = 0.5 person</div>
                <div>• Barn 8+ år = 1 person</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMealSelectionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={generateAIMealPlan}
                disabled={!Object.values(selectedMeals).some(Boolean)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                Generer Madplan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indkøbsliste Modal */}
      {showShoppingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Indkøbsliste</h2>
              <button
                onClick={() => setShowShoppingList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Tilbudsinfo */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Indkøbslisten er designet til tilbud i <span className="font-medium">{getPrimaryStore()}</span>, 
                hvor du sparer <span className="font-medium text-green-600">{calculateTotalSavings()} kr</span>
              </p>
            </div>

            {/* Kategoriserede varer */}
            <div className="space-y-6">
              {shoppingList.map((categoryGroup, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-3">
                    <h3 className="font-semibold text-gray-900">{categoryGroup.category}</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {categoryGroup.items.map((item: any, itemIndex: number) => {
                      const itemId = `${categoryGroup.category}-${itemIndex}`
                      const isChecked = checkedItems.has(itemId)
                      
                      return (
                        <div 
                          key={itemId}
                          className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                            isChecked ? 'bg-gray-50' : ''
                          }`}
                          onClick={() => toggleItemChecked(itemId)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleItemChecked(itemId)}
                                className="text-blue-600 rounded h-4 w-4"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className={`${isChecked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {item.name}
                              </span>
                              {item.amount && item.unit && (
                                <span className="text-sm text-gray-500">
                                  {item.amount} {item.unit}
                                </span>
                              )}
                            </div>
                            {item.totalPrice && (
                              <span className="text-sm font-medium text-gray-700">
                                {item.totalPrice} kr
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowShoppingList(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Luk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
