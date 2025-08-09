'use client'

import { useState } from 'react'

interface Props {
  recipeId: number
  recipeName: string
}

export default function RecipeNutritionRecalculator({ recipeId, recipeName }: Props) {
  const [isRecalculating, setIsRecalculating] = useState(false)

  const handleRecalculate = async () => {
    if (!confirm('Recalculate nutrition based on current ingredient matches?')) {
      return
    }

    setIsRecalculating(true)
    
    try {
      console.log(`🔄 Recalculating nutrition for recipe ID: ${recipeId}`)
      
      const response = await fetch('/api/recalculate-nutrition', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipeId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ ${data.message}\n\nMatched: ${data.matchedIngredients}/${data.totalIngredients} ingredients\n\nCalories: ${Math.round(data.nutrition.calories)} kcal\nProtein: ${Math.round(data.nutrition.protein * 10) / 10}g\nCarbs: ${Math.round(data.nutrition.carbs * 10) / 10}g\nFat: ${Math.round(data.nutrition.fat * 10) / 10}g`)
        
        // Reload page to show updated nutrition
        window.location.reload()
      } else {
        alert(`❌ Error: ${data.error}\n\nDetails: ${data.details || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error recalculating nutrition:', error)
      alert(`❌ Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRecalculating(false)
    }
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Admin Tools</h4>
      <button
        onClick={handleRecalculate}
        disabled={isRecalculating}
        className={`px-3 py-2 text-sm rounded transition-colors ${
          isRecalculating
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRecalculating ? '⏳ Recalculating...' : '🔄 Recalculate Nutrition'}
      </button>
      
      <p className="text-xs text-gray-500 mt-2">
        Use this after updating ingredient matches to refresh nutrition data without re-importing.
      </p>
    </div>
  )
}