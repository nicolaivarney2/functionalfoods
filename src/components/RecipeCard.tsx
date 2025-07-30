import Link from 'next/link'
import Image from 'next/image'
import { Clock, Users } from 'lucide-react'
import { Recipe } from '@/types/recipe'

interface RecipeCardProps {
  recipe: Recipe;
  showRating?: boolean;
}

export default function RecipeCard({ recipe, showRating = true }: RecipeCardProps) {
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}t ${mins}min` : `${hours}t`
  }

  return (
    <article className="recipe-card">
      <Link href={`/opskrift/${recipe.slug}`} className="block">
        {/* Recipe Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={recipe.imageUrl}
            alt={recipe.imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* Recipe Content */}
        <div className="p-6">
          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {recipe.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {recipe.shortDescription}
          </p>

          {/* Recipe Meta */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock size={16} />
                <span>{formatTime(recipe.totalTime)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users size={16} />
                <span>{recipe.servings} pers</span>
              </div>
            </div>

            {/* Difficulty */}
            <span className={`px-2 py-1 text-xs font-medium ${
              recipe.difficulty === 'Nem' ? 'bg-green-100 text-green-800' :
              recipe.difficulty === 'Mellem' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {recipe.difficulty}
            </span>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 mt-3">
            {recipe.dietaryCategories.slice(0, 2).map((category) => (
              <span
                key={category}
                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700"
              >
                {category}
              </span>
            ))}
            {recipe.dietaryCategories.length > 2 && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600">
                +{recipe.dietaryCategories.length - 2}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
} 