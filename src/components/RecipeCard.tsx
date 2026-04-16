import Link from 'next/link'
import { Clock, Users } from 'lucide-react'
import { Recipe } from '@/types/recipe'

interface RecipeCardProps {
  recipe: Recipe;
  showRating?: boolean;
  priority?: boolean; // For above-the-fold images
}

export default function RecipeCard({ recipe, showRating: _showRating = true, priority = false }: RecipeCardProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}t ${mins}min` : `${hours}t`
  }

  const formatCategory = (category: string | null | undefined) => {
    // Remove brackets and clean up the category name
    if (!category) return ''
    return category.replace(/[\[\]]/g, '').trim()
  }

  return (
    <article className="recipe-card h-full flex flex-col rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <Link
        href={`/opskrift/${recipe.slug}`}
        className="group flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {/* Recipe Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.imageAlt || recipe.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading={priority ? 'eager' : 'lazy'}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-sm">Intet billede</span>
            </div>
          )}
        </div>

        {/* Recipe Content */}
        <div className="p-5 sm:p-6 flex-grow flex flex-col gap-3 min-h-0">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors">
            {recipe.title}
          </h3>

          {recipe.shortDescription && (
            <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
              {recipe.shortDescription}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Clock size={15} className="shrink-0 text-gray-400" aria-hidden />
                <span className="whitespace-nowrap">{formatTime(recipe.totalTime || 0)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={15} className="shrink-0 text-gray-400" aria-hidden />
                <span className="whitespace-nowrap">{recipe.servings || 1} pers</span>
              </div>
            </div>

            {(() => {
              const validCategories = recipe.dietaryCategories?.filter(
                (cat): cat is string => cat != null && typeof cat === 'string' && cat.trim() !== ''
              ) || []

              if (validCategories.length === 0) return null

              return (
                <div className="flex flex-wrap gap-1.5">
                  {validCategories.slice(0, 2).map((category, index) => (
                    <span
                      key={`${category}-${index}`}
                      className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-700"
                    >
                      {formatCategory(category)}
                    </span>
                  ))}
                  {validCategories.length > 2 && (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-600">
                      +{validCategories.length - 2}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </Link>
    </article>
  )
} 