'use client'

import { useState } from 'react'
import { Heart, Share2, List, ShoppingCart } from 'lucide-react'

interface RecipeActionsProps {
  recipeId: string
  recipeTitle: string
}

export default function RecipeActions({ recipeId, recipeTitle }: RecipeActionsProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [isInShoppingList, setIsInShoppingList] = useState(false)

  const handleSave = () => {
    setIsSaved(!isSaved)
    // TODO: Implement save functionality
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipeTitle,
          text: `Tjek denne lækre ${recipeTitle} opskrift!`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      // TODO: Show toast notification
    }
  }

  const handleAddToShoppingList = () => {
    setIsInShoppingList(!isInShoppingList)
    // TODO: Implement shopping list functionality
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Save Recipe */}
      <button
        onClick={handleSave}
        className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
          isSaved
            ? 'text-red-500 bg-red-50'
            : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
        }`}
        title="Gem opskrift"
      >
        <Heart size={20} className={isSaved ? 'fill-current' : ''} />
        <span className="text-sm font-medium">Gem</span>
      </button>

      {/* Share Recipe */}
      <button
        onClick={handleShare}
        className="flex items-center space-x-2 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        title="Del opskrift"
      >
        <Share2 size={20} />
        <span className="text-sm font-medium">Del</span>
      </button>

      {/* Add to Shopping List */}
      <button
        onClick={handleAddToShoppingList}
        className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
          isInShoppingList
            ? 'text-green-600 bg-green-50'
            : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
        }`}
        title="Tilføj til indkøbsliste"
      >
        <ShoppingCart size={20} />
        <span className="text-sm font-medium">Indkøbsliste</span>
      </button>
    </div>
  )
} 