'use client'

import { useState, useEffect } from 'react'
import { Heart, Share2, List, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface RecipeActionsProps {
  recipeId: string
  recipeTitle: string
  recipeSlug: string
  recipeImage?: string
  recipeDescription?: string
}

export default function RecipeActions({ 
  recipeId, 
  recipeTitle, 
  recipeSlug, 
  recipeImage, 
  recipeDescription 
}: RecipeActionsProps) {
  const { user } = useAuth()
  const [isSaved, setIsSaved] = useState(false)
  const [isInShoppingList, setIsInShoppingList] = useState(false)

  // Load saved state from localStorage
  useEffect(() => {
    if (user) {
      const savedRecipes = JSON.parse(localStorage.getItem('favorite_recipes') || '[]')
      setIsSaved(savedRecipes.some((recipe: any) => recipe.id === recipeId))
    }
  }, [user, recipeId])

  const handleSave = () => {
    if (!user) {
      // TODO: Show login modal
      alert('Du skal være logget ind for at gemme opskrifter')
      return
    }

    const savedRecipes = JSON.parse(localStorage.getItem('favorite_recipes') || '[]')
    
    if (isSaved) {
      // Remove from favorites
      const updatedRecipes = savedRecipes.filter((recipe: any) => recipe.id !== recipeId)
      localStorage.setItem('favorite_recipes', JSON.stringify(updatedRecipes))
      setIsSaved(false)
    } else {
      // Add to favorites
      const newRecipe = {
        id: recipeId,
        title: recipeTitle,
        slug: recipeSlug,
        image: recipeImage,
        description: recipeDescription,
        savedAt: new Date().toISOString()
      }
      const updatedRecipes = [...savedRecipes, newRecipe]
      localStorage.setItem('favorite_recipes', JSON.stringify(updatedRecipes))
      setIsSaved(true)
    }
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
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert('Link kopieret til udklipsholder!')
      } catch (error) {
        console.log('Error copying to clipboard:', error)
      }
    }
  }

  const handleAddToShoppingList = () => {
    if (!user) {
      alert('Du skal være logget ind for at bruge indkøbslisten')
      return
    }
    
    setIsInShoppingList(!isInShoppingList)
    // TODO: Implement shopping list functionality
    alert('Indkøbsliste funktionalitet kommer snart!')
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