'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, Settings, Heart, ShoppingCart, TrendingUp, Share2, Plus, X, ChefHat, Coffee, Utensils } from 'lucide-react'

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

const mockRecipes = [
  {
    id: 1,
    title: 'Kylling med grøntsager',
    ingredients: ['kylling', 'broccoli', 'gulerødder', 'løg'],
    price: 45.50,
    savings: 15.30,
    store: 'REMA 1000',
    mealType: 'dinner'
  },
  {
    id: 2,
    title: 'Laks med spinat',
    ingredients: ['laks', 'spinat', 'citron', 'hvidløg'],
    price: 52.80,
    savings: 22.40,
    store: 'Netto',
    mealType: 'dinner'
  },
  {
    id: 3,
    title: 'Havregrød med bær',
    ingredients: ['havregryn', 'mælk', 'bær', 'honning'],
    price: 18.90,
    savings: 8.50,
    store: 'REMA 1000',
    mealType: 'breakfast'
  }
]

export default function MadbudgetPage() {
  const [familyProfile, setFamilyProfile] = useState({
    adults: 2,
    children: 2,
    childrenAge: 8,
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
  const [showFamilySettings, setShowFamilySettings] = useState(false)

  const toggleBasicItem = (itemId: number) => {
    setBasicItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, isOwned: !item.isOwned }
          : item
      )
    )
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

  const generateMealPlan = () => {
    // AI-generated meal plan logic will go here
    console.log('Generating AI meal plan...')
  }

  const calculateSavings = () => {
    // Calculate total savings logic will go here
    return { totalSavings: 156.80, percentageSavings: 18.5 }
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
                  <span className="font-medium">{familyProfile.children} ({familyProfile.childrenAge} år)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Økologi prioriteret:</span>
                  <span className="font-medium">{familyProfile.prioritizeOrganic ? 'Ja' : 'Nej'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Butikker:</span>
                  <span className="font-medium">{familyProfile.selectedStores.length} valgt</span>
                </div>
              </div>
            </div>

            {/* Basic Items */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basisvarer</h2>
              <p className="text-gray-600 text-sm mb-4">Kryds af hvad du allerede har</p>
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Calendar size={20} className="mr-2" />
                  Ugeplanlægger
                </h2>
                <button
                  onClick={generateMealPlan}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Generer AI madplan
                </button>
              </div>

              {/* Week Grid */}
              <div className="grid grid-cols-7 gap-4">
                {days.map((day, index) => (
                  <div key={day} className="text-center">
                    <div className="font-medium text-gray-900 mb-3">{dayLabels[index]}</div>
                    <div className="space-y-2">
                      {mealTypes.map(mealType => (
                        <div
                          key={`${day}-${mealType.key}`}
                          className={`p-3 rounded-lg border-2 border-dashed cursor-pointer hover:border-blue-300 transition-colors ${
                            mealPlan[day][mealType.key]
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300'
                          }`}
                          onClick={() => {
                            setSelectedMealSlot(`${day}-${mealType.key}`)
                            setShowRecipeSelector(true)
                          }}
                        >
                          {mealPlan[day][mealType.key] ? (
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {mealPlan[day][mealType.key]?.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {mealPlan[day][mealType.key]?.store}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <mealType.icon size={20} className="mx-auto text-gray-400 mb-1" />
                              <div className="text-xs text-gray-500">{mealType.label}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
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
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Vælg opskrift</h3>
              <button
                onClick={() => setShowRecipeSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              {mockRecipes.map(recipe => (
                <div
                  key={recipe.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => addRecipeToMeal(recipe)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{recipe.title}</h4>
                      <p className="text-sm text-gray-600">{recipe.ingredients.join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{recipe.price.toFixed(2)} kr</div>
                      <div className="text-sm text-green-600">Sparer {recipe.savings.toFixed(2)} kr</div>
                      <div className="text-xs text-gray-500">{recipe.store}</div>
                    </div>
                  </div>
                </div>
              ))}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Antal voksne</label>
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Børnenes alder</label>
                <input
                  type="number"
                  min="0"
                  max="18"
                  value={familyProfile.childrenAge}
                  onChange={(e) => setFamilyProfile(prev => ({ ...prev, childrenAge: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
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
    </div>
  )
}
