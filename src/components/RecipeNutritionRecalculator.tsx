'use client'

import { useState } from 'react'

interface Props {
  recipeId: string | number
  recipeName: string
  onNutritionUpdated?: (nutrition: any) => void
}

export default function RecipeNutritionRecalculator({ recipeId, recipeName, onNutritionUpdated }: Props) {
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
        const message = `✅ ${data.message}\n\nMatched: ${data.matchedIngredients}/${data.totalIngredients} ingredients\n\nCalories: ${Math.round(data.nutrition.calories)} kcal\nProtein: ${Math.round(data.nutrition.protein * 10) / 10}g\nCarbs: ${Math.round(data.nutrition.carbs * 10) / 10}g\nFat: ${Math.round(data.nutrition.fat * 10) / 10}g`
        
        alert(message)
        
        // Call callback if provided to update parent component
        if (onNutritionUpdated && data.nutrition) {
          onNutritionUpdated(data.nutrition)
        }
        
        // No page reload - just show success message
        console.log('✅ Nutrition updated successfully, no page reload needed')
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
    <div className="inline-block">
      <button
        onClick={handleRecalculate}
        disabled={isRecalculating}
        className={`px-2 py-1 text-xs rounded transition-colors ${
          isRecalculating
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
        title="Recalculate nutrition based on ingredient matches"
      >
        {isRecalculating ? '⏳' : '🔄'}
      </button>
    </div>
  )
}