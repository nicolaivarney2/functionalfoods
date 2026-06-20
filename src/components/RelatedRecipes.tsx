'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Recipe } from '@/types/recipe'
import {
  isRecipeSaved,
  saveRecipe,
  unsaveRecipe,
  migrateLegacyFavoritesToDb,
} from '@/lib/saved-recipes'

interface RelatedRecipesProps {
  recipes: Recipe[]
  currentRecipeId: string
}

export default function RelatedRecipes({ recipes, currentRecipeId }: RelatedRecipesProps) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const relatedRecipes = recipes
    .filter((recipe) => recipe.id !== currentRecipeId)
    .slice(0, 6)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      await migrateLegacyFavoritesToDb()
      const checks = await Promise.all(
        relatedRecipes.map(async (r) => ({
          id: r.id,
          saved: await isRecipeSaved(r.id).catch(() => false),
        })),
      )
      setFavorites(new Set(checks.filter((c) => c.saved).map((c) => c.id)))
    }
    load()
  }, [user, currentRecipeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFavorite = async (e: React.MouseEvent, recipeId: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      alert('Du skal være logget ind for at gemme opskrifter')
      return
    }

    try {
      if (favorites.has(recipeId)) {
        await unsaveRecipe(recipeId)
        setFavorites((prev) => {
          const next = new Set(prev)
          next.delete(recipeId)
          return next
        })
      } else {
        await saveRecipe(recipeId)
        setFavorites((prev) => new Set(Array.from(prev).concat([recipeId])))
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Noget gik galt')
    }
  }

  if (relatedRecipes.length === 0) return null

  return (
    <section className="py-12 bg-gray-50">
      <div className="container">
        <h2 className="text-2xl font-bold mb-8 text-gray-900">Andre gode forslag</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedRecipes.map((recipe) => (
            <Link key={recipe.id} href={`/opskrift/${recipe.slug}`} className="block">
              <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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

                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => handleFavorite(e, recipe.id)}
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
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      {((recipe.preparationTime || 0) + (recipe.cookingTime || 0))} MIN
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{recipe.title}</h3>

                  {recipe.shortDescription && (
                    <p className="text-sm text-gray-600 line-clamp-2">{recipe.shortDescription}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

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
