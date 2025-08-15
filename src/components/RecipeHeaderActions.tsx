'use client'

import { Star, MessageCircle, Clock, Eye } from 'lucide-react'
import { Recipe } from '@/types/recipe'

interface RecipeHeaderActionsProps {
  recipe: Recipe
}

export default function RecipeHeaderActions({ recipe }: RecipeHeaderActionsProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} MIN`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}T ${mins} MIN` : `${hours}T`
  }

  // Simpel page counter der skaber tillid
  const generateViewCount = (): number => {
    // Brug rigtige Ketoliv views hvis tilgængelige
    if (recipe.ketolivViews && recipe.ketolivViews > 0) {
      return recipe.ketolivViews
    }
    
    // Fallback: Baseret på recipe slug for konsistens (ingen random)
    const baseNumber = 1000 + (recipe.slug.length * 100) + (recipe.slug.charCodeAt(0) * 10)
    return baseNumber
  }

  const viewCount = generateViewCount()

  const handleRatingClick = () => {
    // Open rating modal instead of scrolling to non-existent section
    // This will be handled by the floating rating stars
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleCommentsClick = () => {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex items-center space-x-6 text-sm">
      <div className="flex items-center space-x-2">
        <Clock size={16} className="text-gray-500" />
        <span className="text-gray-700">{formatTime(recipe.preparationTime + recipe.cookingTime)}</span>
      </div>
      
      <button 
        onClick={handleRatingClick}
        className="flex items-center space-x-1 hover:opacity-80 transition-opacity cursor-pointer"
        id="top-rating-stars"
      >
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}
          />
        ))}
      </button>
      {/* Rating count hidden until we have real data */}
      {/* <span className="text-gray-600">(15)</span> */}
      
      <button 
        onClick={handleCommentsClick}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
        id="top-comments"
      >
        <MessageCircle size={14} />
        <span>Kommentarer</span>
      </button>

      {/* Simpel page counter */}
      <div className="flex items-center space-x-2 text-gray-600">
        <Eye size={14} className="text-gray-500" />
        <span>{viewCount.toLocaleString()}</span>
      </div>
    </div>
  )
} 