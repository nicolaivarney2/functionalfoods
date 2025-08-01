'use client'

import { useState } from 'react'
import { Recipe } from '@/types/recipe'
import ServingSizeAdjuster from './ServingSizeAdjuster'

interface DynamicIngredientsListProps {
  recipe: Recipe
  servings: number
  onServingsChange: (servings: number) => void
}

export default function DynamicIngredientsList({ recipe, servings, onServingsChange }: DynamicIngredientsListProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())

  // Calculate the multiplier based on current servings vs original servings
  const multiplier = servings / recipe.servings

  const calculateIngredientAmount = (amount: number, unit: string) => {
    const adjustedAmount = amount * multiplier
    
    // Handle common unit conversions
    if (unit === 'dl' && adjustedAmount >= 1) {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else if (unit === 'g' && adjustedAmount >= 1) {
      return `${Math.round(adjustedAmount)} ${unit}`
    } else if (unit === 'kg' && adjustedAmount >= 0.1) {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else if (unit === 'l' && adjustedAmount >= 0.1) {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else if (unit === 'stk' || unit === 'stykker') {
      if (adjustedAmount < 1 && adjustedAmount > 0) {
        return `${adjustedAmount.toFixed(1)} ${unit}`
      } else {
        return `${Math.round(adjustedAmount)} ${unit}`
      }
    } else if (unit === 'tsk' || unit === 'spsk') {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    } else {
      return `${adjustedAmount.toFixed(1)} ${unit}`
    }
  }

  const toggleIngredient = (ingredientId: string) => {
    const newChecked = new Set(checkedIngredients)
    if (newChecked.has(ingredientId)) {
      newChecked.delete(ingredientId)
    } else {
      newChecked.add(ingredientId)
    }
    setCheckedIngredients(newChecked)
  }

  return (
    <div id="ingredients" className="md:col-span-1">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Ingredienser</h2>
      
      {/* Serving Size Adjustment */}
      <div className="mb-6">
        <ServingSizeAdjuster
          initialServings={recipe.servings}
          onServingsChange={onServingsChange}
        />
      </div>
      
      <div className="space-y-6">
        {/* Render ingredient groups if they exist, otherwise render individual ingredients */}
        {recipe.ingredientGroups && recipe.ingredientGroups.length > 0 ? (
          recipe.ingredientGroups.map((group) => (
            <div key={group.id} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                {group.name}
              </h3>
              <div className="space-y-3 pl-4">
                {group.ingredients.map((ingredient) => {
                  const isChecked = checkedIngredients.has(ingredient.id)
                  return (
                    <div 
                      key={ingredient.id} 
                      className={`flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleIngredient(ingredient.id)}
                    >
                      <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center transition-colors ${
                        isChecked 
                          ? 'border-green-500 bg-green-500' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        {isChecked && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <span className={`text-gray-900 ${isChecked ? 'line-through text-gray-500' : ''}`}>
                        {calculateIngredientAmount(ingredient.amount, ingredient.unit)} {ingredient.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        ) : (
          recipe.ingredients.map((ingredient) => {
            const isChecked = checkedIngredients.has(ingredient.id)
            return (
              <div 
                key={ingredient.id} 
                className={`flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg cursor-pointer transition-colors ${
                  isChecked ? 'bg-green-50 border-green-300' : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleIngredient(ingredient.id)}
              >
                <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center transition-colors ${
                  isChecked 
                    ? 'border-green-500 bg-green-500' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  {isChecked && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <span className={`text-gray-900 ${isChecked ? 'line-through text-gray-500' : ''}`}>
                  {calculateIngredientAmount(ingredient.amount, ingredient.unit)} {ingredient.name}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
} 