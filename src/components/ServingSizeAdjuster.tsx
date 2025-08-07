'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface ServingSizeAdjusterProps {
  initialServings: number
  onServingsChange: (servings: number) => void
}

export default function ServingSizeAdjuster({
  initialServings,
  onServingsChange
}: ServingSizeAdjusterProps) {
  const [servings, setServings] = useState(initialServings)

  const handleDecrease = () => {
    if (servings > 1) {
      const newServings = servings - 1
      setServings(newServings)
      onServingsChange(newServings)
    }
  }

  const handleIncrease = () => {
    const newServings = servings + 1
    setServings(newServings)
    onServingsChange(newServings)
  }

  return (
    <div className="flex items-center justify-start space-x-4 bg-white rounded-lg p-4 shadow-sm">
      <button
        onClick={handleDecrease}
        disabled={servings <= 1}
        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
      >
        <Minus size={16} className="text-gray-700" />
      </button>
      
      <div className="text-center">
        <div className="text-lg font-medium text-gray-900">{servings} personer</div>
        <div className="text-sm text-gray-500">Antal portioner</div>
      </div>
      
      <button
        onClick={handleIncrease}
        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
      >
        <Plus size={16} className="text-gray-700" />
      </button>
    </div>
  )
} 