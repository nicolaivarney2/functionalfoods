'use client'

import { useState } from 'react'
import { PieChart, ChevronDown, ChevronUp } from 'lucide-react'

interface NutritionFactsBoxProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  servings: number
}

export default function NutritionFactsBox({
  calories,
  protein,
  carbs,
  fat,
  fiber,
  servings
}: NutritionFactsBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Dummy data for vitaminer og mineraler (senere fra Frida database)
  const vitamins = {
    'Vitamin A': { amount: 850, unit: 'µg', dailyValue: 800, percentage: 106 },
    'Vitamin B1 (Thiamin)': { amount: 0.8, unit: 'mg', dailyValue: 1.1, percentage: 73 },
    'Vitamin B2 (Riboflavin)': { amount: 1.2, unit: 'mg', dailyValue: 1.4, percentage: 86 },
    'Vitamin B6': { amount: 1.8, unit: 'mg', dailyValue: 1.4, percentage: 129 },
    'Vitamin B12': { amount: 3.2, unit: 'µg', dailyValue: 2.4, percentage: 133 },
    'Vitamin C': { amount: 45, unit: 'mg', dailyValue: 80, percentage: 56 },
    'Vitamin D': { amount: 2.8, unit: 'µg', dailyValue: 5, percentage: 56 },
    'Vitamin E': { amount: 8.5, unit: 'mg', dailyValue: 12, percentage: 71 },
    'Vitamin K': { amount: 65, unit: 'µg', dailyValue: 75, percentage: 87 }
  }

  const minerals = {
    'Calcium': { amount: 280, unit: 'mg', dailyValue: 800, percentage: 35 },
    'Jern': { amount: 4.2, unit: 'mg', dailyValue: 14, percentage: 30 },
    'Magnesium': { amount: 85, unit: 'mg', dailyValue: 375, percentage: 23 },
    'Fosfor': { amount: 320, unit: 'mg', dailyValue: 700, percentage: 46 },
    'Kalium': { amount: 680, unit: 'mg', dailyValue: 2000, percentage: 34 },
    'Zink': { amount: 3.8, unit: 'mg', dailyValue: 10, percentage: 38 },
    'Selen': { amount: 25, unit: 'µg', dailyValue: 55, percentage: 45 }
  }

  // Højdepunkter baseret på indhold
  const highlights = [
    'Høj mængde B12 vitamin (133% af daglig anbefaling)',
    'God kilde til B6 vitamin (129% af daglig anbefaling)',
    'Indeholder betydelige mængder af Vitamin A (106% af daglig anbefaling)',
    'Rig på Selen - vigtig for immunforsvaret'
  ]

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <PieChart size={16} className="text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">NÆRINGSINDHOLD</h3>
      </div>

      {/* Basic Nutrition Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Kalorier:</span>
          <span className="font-medium">{calories} kcal</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Protein:</span>
          <span className="font-medium">{protein}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Kulhydrater:</span>
          <span className="font-medium">{carbs}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fedt:</span>
          <span className="font-medium">{fat}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fiber:</span>
          <span className="font-medium">{fiber}g</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Portioner:</span>
          <span className="font-medium">{servings} stk</span>
        </div>
      </div>

      {/* Expandable Detailed Nutrition */}
      <div className="border-t border-gray-200 pt-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left hover:bg-gray-100 rounded px-2 py-1 transition-colors"
        >
          <span className="text-xs font-medium text-gray-700">Detaljeret næringsindhold</span>
          {isExpanded ? (
            <ChevronUp size={14} className="text-gray-500" />
          ) : (
            <ChevronDown size={14} className="text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-4">
            {/* Highlights */}
            <div className="bg-green-50 rounded p-3">
              <h4 className="text-xs font-medium text-green-800 mb-2">Næringshøjdepunkter</h4>
              <ul className="space-y-1">
                {highlights.map((highlight, index) => (
                  <li key={index} className="text-xs text-green-700 flex items-start">
                    <span className="text-green-500 mr-1">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Vitamins */}
            <div>
              <h4 className="text-xs font-medium text-gray-900 mb-2">Vitaminer</h4>
              <div className="space-y-1">
                {Object.entries(vitamins).map(([vitamin, data]) => (
                  <div key={vitamin} className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">{vitamin}:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium text-xs">{data.amount} {data.unit}</span>
                      <span className="text-xs text-gray-500">({data.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Minerals */}
            <div>
              <h4 className="text-xs font-medium text-gray-900 mb-2">Mineraler</h4>
              <div className="space-y-1">
                {Object.entries(minerals).map(([mineral, data]) => (
                  <div key={mineral} className="flex justify-between items-center">
                    <span className="text-gray-600 text-xs">{mineral}:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium text-xs">{data.amount} {data.unit}</span>
                      <span className="text-xs text-gray-500">({data.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Keto Education */}
      <div className="pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>Forstå Keto:</strong> Læs om anbefalet næringsindhold på Keto til vægttab
        </p>
      </div>
    </div>
  )
} 