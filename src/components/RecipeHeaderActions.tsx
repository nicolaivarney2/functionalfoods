'use client'

import { useState, useEffect } from 'react'
import { Star, MessageCircle, Clock, Eye } from 'lucide-react'
import { Recipe } from '@/types/recipe'
import {
  getDisplayedRecipeViews,
  getRecipeViewBaseline,
  getRecipeViewRawTotal,
} from '@/lib/recipe-view-display'
import { useRecipeEngagementOptional } from '@/contexts/RecipeEngagementContext'

interface RecipeHeaderActionsProps {
  recipe: Recipe
}

export default function RecipeHeaderActions({ recipe }: RecipeHeaderActionsProps) {
  const [displayedViews, setDisplayedViews] = useState(() =>
    getDisplayedRecipeViews(getRecipeViewRawTotal(recipe))
  )

  useEffect(() => {
    setDisplayedViews(getDisplayedRecipeViews(getRecipeViewRawTotal(recipe)))
    let cancelled = false
    const slug = recipe.slug
    if (!slug) return () => { cancelled = true }

    void (async () => {
      try {
        const res = await fetch(`/api/recipes/${encodeURIComponent(slug)}/view`, {
          method: 'POST',
          cache: 'no-store',
        })
        if (!res.ok || cancelled) {
          if (process.env.NODE_ENV === 'development') {
            const errBody = await res.clone().text().catch(() => '')
            console.warn('[recipe view]', res.status, errBody.slice(0, 200))
          }
          return
        }
        const data = (await res.json()) as {
          pageViews?: number | string
          page_views?: number | string
          error?: string
        }
        const rawPv = data.pageViews ?? data.page_views
        const pv =
          typeof rawPv === 'number' && Number.isFinite(rawPv)
            ? Math.floor(rawPv)
            : typeof rawPv === 'string' && rawPv.trim() !== ''
              ? Math.floor(Number(rawPv))
              : NaN
        if (cancelled || !Number.isFinite(pv) || pv < 0) return
        setDisplayedViews(getDisplayedRecipeViews(getRecipeViewBaseline(recipe) + pv))
      } catch {
        /* ignorer netværksfejl — visning forbliver SSR-værdi */
      }
    })()

    return () => {
      cancelled = true
    }
  }, [recipe.slug, recipe.pageViews, recipe.ketolivViews])

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} MIN`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}T ${mins} MIN` : `${hours}T`
  }

  const viewCount = displayedViews
  const engagement = useRecipeEngagementOptional()
  const commentCount = engagement?.commentCount ?? 0

  const handleRatingClick = () => {
    // Trigger click on floating rating stars to open rating modal
    const floatingRatingStars = document.getElementById('rating-stars')
    if (floatingRatingStars) {
      const firstStar = floatingRatingStars.querySelector('button')
      if (firstStar) {
        firstStar.click()
      }
    }
  }

  const handleCommentsClick = () => {
    document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  const currentRating = Number(recipe.rating) || 0
  const reviewCount = recipe.reviewCount || 0

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
        title="Klik for at bedømme opskriften"
      >
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < currentRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
          />
        ))}
        {reviewCount > 0 ? (
          <span className="text-gray-600 ml-1">({reviewCount})</span>
        ) : currentRating <= 0 ? (
          <span className="text-gray-400 ml-1 text-xs font-normal">Bedøm</span>
        ) : null}
      </button>
      
      <button 
        onClick={handleCommentsClick}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
        id="top-comments"
      >
        <MessageCircle size={14} />
        <span>Kommentarer ({commentCount})</span>
      </button>

      {/* Simpel page counter */}
      <div className="flex items-center space-x-2 text-gray-600">
        <Eye size={14} className="text-gray-500" />
        <span>{viewCount.toLocaleString()}</span>
      </div>
    </div>
  )
} 