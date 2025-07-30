import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Users, Share2, Printer } from 'lucide-react'
import { sampleRecipes } from '@/lib/sample-data'

interface RecipePageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const recipe = sampleRecipes.find(r => r.slug === params.slug)
  
  if (!recipe) {
    return {
      title: 'Opskrift ikke fundet | Functional Foods',
    }
  }

  return {
    title: recipe.metaTitle,
    description: recipe.metaDescription,
    keywords: recipe.keywords.join(', '),
    openGraph: {
      title: recipe.metaTitle,
      description: recipe.metaDescription,
      images: [recipe.imageUrl],
    },
    other: {
      'recipe:prepTime': recipe.prepTimeISO,
      'recipe:cookTime': recipe.cookTimeISO,
      'recipe:totalTime': recipe.totalTimeISO,
      'recipe:servings': recipe.servings.toString(),
      'recipe:difficulty': recipe.difficulty,
    }
  }
}

export default function RecipePage({ params }: RecipePageProps) {
  const recipe = sampleRecipes.find(r => r.slug === params.slug)

  if (!recipe) {
    return (
      <div className="container py-16">
        <h1 className="text-2xl font-bold mb-4">Opskrift ikke fundet</h1>
        <Link href="/opskriftsoversigt" className="text-gray-600 hover:text-gray-900">
          ← Tilbage til opskriftsoversigt
        </Link>
      </div>
    )
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutter`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours} timer ${mins} minutter` : `${hours} timer`
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Recipe Header */}
      <section className="border-b border-gray-200">
        <div className="container py-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Recipe Image */}
            <div className="relative aspect-[4/3]">
              <Image
                src={recipe.imageUrl}
                alt={recipe.imageAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Recipe Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                  {recipe.title}
                </h1>
                <p className="text-lg text-gray-600 mb-6">
                  {recipe.description}
                </p>
              </div>

              {/* Recipe Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock size={20} className="text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">Tilberedningstid</div>
                    <div className="font-medium">{formatTime(recipe.preparationTime)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock size={20} className="text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">Kogetid</div>
                    <div className="font-medium">{formatTime(recipe.cookingTime)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users size={20} className="text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500">Antal personer</div>
                    <div className="font-medium">{recipe.servings} pers</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5"></div>
                  <div>
                    <div className="text-sm text-gray-500">Sværhedsgrad</div>
                    <div className="font-medium">{recipe.difficulty}</div>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {recipe.dietaryCategories.map((category) => (
                  <span
                    key={category}
                    className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700"
                  >
                    {category}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <Share2 size={20} />
                  <span>Del</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                  <Printer size={20} />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recipe Content */}
      <section className="py-12">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Ingredients */}
            <div className="md:col-span-1">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Ingredienser</h2>
              <div className="space-y-4">
                {recipe.ingredients.map((ingredient) => (
                  <div key={ingredient.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-900">{ingredient.name}</span>
                    <span className="text-gray-600 font-medium">
                      {ingredient.amount} {ingredient.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Nutrition Info */}
              {recipe.calories && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Næringsværdier</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kalorier</span>
                      <span className="font-medium">{recipe.calories}</span>
                    </div>
                    {recipe.protein && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Protein</span>
                        <span className="font-medium">{recipe.protein}g</span>
                      </div>
                    )}
                    {recipe.carbs && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kulhydrater</span>
                        <span className="font-medium">{recipe.carbs}g</span>
                      </div>
                    )}
                    {recipe.fat && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fedt</span>
                        <span className="font-medium">{recipe.fat}g</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Fremgangsmåde</h2>
              <div className="space-y-6">
                {recipe.instructions.map((step) => (
                  <div key={step.id} className="flex space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 leading-relaxed">{step.instruction}</p>
                      {step.tips && (
                        <p className="text-sm text-gray-600 mt-2 italic">💡 {step.tips}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Recipes */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">Lignende opskrifter</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {sampleRecipes
              .filter(r => r.id !== recipe.id)
              .slice(0, 3)
              .map((relatedRecipe) => (
                <div key={relatedRecipe.id} className="recipe-card">
                  <Link href={`/opskrift/${relatedRecipe.slug}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={relatedRecipe.imageUrl}
                        alt={relatedRecipe.imageAlt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {relatedRecipe.title}
                      </h3>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock size={16} />
                          <span>{formatTime(relatedRecipe.totalTime)}</span>
                        </div>
                        <span className="text-xs font-medium bg-gray-100 px-2 py-1">
                          {relatedRecipe.difficulty}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </section>
    </main>
  )
} 