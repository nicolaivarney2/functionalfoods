'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Recipe } from '@/types/recipe'

interface RelatedRecipesProps {
  recipes: Recipe[]
  currentRecipeId: string
}

export default function RelatedRecipes({ recipes, currentRecipeId }: RelatedRecipesProps) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  
  const relatedRecipes = recipes
    .filter(recipe => recipe.id !== currentRecipeId)
    .slice(0, 6) // Show 6 recipes (2 rows of 3)

  // Load favorites from localStorage
  useEffect(() => {
    if (user) {
      const savedRecipes = JSON.parse(localStorage.getItem('favorite_recipes') || '[]')
      const favoriteIds = new Set(savedRecipes.map((recipe: any) => recipe.id))
      setFavorites(favoriteIds)
    }
  }, [user])

  const handleFavorite = (e: React.MouseEvent, recipeId: string, recipe: Recipe) => {
    e.preventDefault() // Prevent navigation
    e.stopPropagation()
    
    if (!user) {
      alert('Du skal være logget ind for at gemme opskrifter')
      return
    }

    const savedRecipes = JSON.parse(localStorage.getItem('favorite_recipes') || '[]')
    
    if (favorites.has(recipeId)) {
      // Remove from favorites
      const updatedRecipes = savedRecipes.filter((recipe: any) => recipe.id !== recipeId)
      localStorage.setItem('favorite_recipes', JSON.stringify(updatedRecipes))
      setFavorites(prev => {
        const newFavorites = new Set(prev)
        newFavorites.delete(recipeId)
        return newFavorites
      })
    } else {
      // Add to favorites
      const newRecipe = {
        id: recipeId,
        title: recipe.title,
        slug: recipe.slug,
        image: recipe.imageUrl,
        description: recipe.shortDescription,
        savedAt: new Date().toISOString()
      }
      const updatedRecipes = [...savedRecipes, newRecipe]
      localStorage.setItem('favorite_recipes', JSON.stringify(updatedRecipes))
      setFavorites(prev => new Set([...prev, recipeId]))
    }
  }

  const handleShoppingList = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      alert('Du skal være logget ind for at bruge indkøbslisten')
      return
    }
    
    alert('Indkøbsliste funktionalitet kommer snart!')
  }

  if (relatedRecipes.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="container">
        <h2 className="text-2xl font-bold mb-8 text-gray-900">Andre gode forslag</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedRecipes.map((recipe) => (
            <Link key={recipe.id} href={`/opskrift/${recipe.slug}`} className="block">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Recipe Image */}
                <div className="relative aspect-[4/3]">
                  {recipe.imageUrl ? (
                    <Image
                      src={recipe.imageUrl}
                      alt={recipe.imageAlt || recipe.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">Intet billede</span>
                    </div>
                  )}
                  
                  {/* Action Icons Overlay */}
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <button 
                      onClick={(e) => handleFavorite(e, recipe.id, recipe)}
                      className={`w-8 h-8 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors ${
                        favorites.has(recipe.id)
                          ? 'bg-red-500/90 hover:bg-red-600/90'
                          : 'bg-white/80 hover:bg-white'
                      }`}
                    >
                      <Heart 
                        size={16} 
                        className={favorites.has(recipe.id) ? 'text-white fill-current' : 'text-gray-600'} 
                      />
                    </button>
                    <button 
                      onClick={handleShoppingList}
                      className="w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <ShoppingCart size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
                
                {/* Recipe Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {((recipe.preparationTime || 0) + (recipe.cookingTime || 0))} MIN
                    </span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">(12)</span>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {recipe.title}
                  </h3>
                  
                  {recipe.shortDescription && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {recipe.shortDescription}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* See More Button */}
        <div className="text-center mt-8">
          <Link
            href="/opskriftsoversigt"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Se flere opskrifter
          </Link>
        </div>
      </div>
    </section>
  )
} 