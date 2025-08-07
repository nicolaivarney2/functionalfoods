'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Heart, Trash2, Clock, Star } from 'lucide-react'
import Link from 'next/link'

interface FavoriteRecipe {
  id: string
  title: string
  slug: string
  image: string
  description: string
  savedAt: string
}

export default function FavoritesPage() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      const savedRecipes = JSON.parse(localStorage.getItem('favorite_recipes') || '[]')
      setFavorites(savedRecipes)
      setLoading(false)
    }
  }, [user])

  const removeFavorite = (recipeId: string) => {
    const updatedFavorites = favorites.filter(fav => fav.id !== recipeId)
    setFavorites(updatedFavorites)
    localStorage.setItem('favorite_recipes', JSON.stringify(updatedFavorites))
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <Heart size={48} className="mx-auto text-gray-400 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Log ind for at se dine favoritter</h1>
                <p className="text-gray-600">Du skal være logget ind for at få adgang til dine gemte opskrifter.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Indlæser dine favoritter...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Heart size={32} className="text-red-500" />
              <h1 className="text-3xl font-bold text-gray-900">Mine favoritter</h1>
            </div>
            <p className="text-gray-600">
              {favorites.length === 0 
                ? 'Du har endnu ikke gemt nogen opskrifter' 
                : `${favorites.length} gemt${favorites.length === 1 ? '' : 'e'} opskrift${favorites.length === 1 ? '' : 'er'}`
              }
            </p>
          </div>

          {favorites.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <Heart size={64} className="mx-auto text-gray-300 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Ingen favoritter endnu</h2>
                <p className="text-gray-600 mb-6">
                  Gem dine yndlingsopskrifter ved at klikke på hjertet på en opskrift
                </p>
                <Link
                  href="/opskrifter"
                  className="inline-flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <span>Udforsk opskrifter</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((recipe) => (
                <div key={recipe.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => removeFavorite(recipe.id)}
                      className="absolute top-3 right-3 p-2 bg-white bg-opacity-90 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                  
                  <div className="p-4">
                    <Link href={`/opskrift/${recipe.slug}`}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-green-600 transition-colors">
                        {recipe.title}
                      </h3>
                    </Link>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock size={14} />
                        <span>Gemt {new Date(recipe.savedAt).toLocaleDateString('da-DK')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <Link
                        href={`/opskrift/${recipe.slug}`}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Se opskrift →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 