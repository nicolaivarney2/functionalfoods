import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Users, Share2, Printer, Star, Heart } from 'lucide-react'
import { getRecipeBySlugServer, getAllRecipesServer } from '@/lib/recipe-storage-server'
import { generateRecipeStructuredData, generateBreadcrumbStructuredData } from '@/lib/structured-data'
import Script from 'next/script'
import JumpToRecipeButton from '@/components/JumpToRecipeButton'

interface RecipePageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: RecipePageProps): Promise<Metadata> {
  const recipe = getRecipeBySlugServer(params.slug)
  
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
      ...(recipe.prepTimeISO && { 'recipe:prepTime': recipe.prepTimeISO }),
      ...(recipe.cookTimeISO && { 'recipe:cookTime': recipe.cookTimeISO }),
      ...(recipe.totalTimeISO && { 'recipe:totalTime': recipe.totalTimeISO }),
      'recipe:servings': recipe.servings.toString(),
      'recipe:difficulty': recipe.difficulty,
    }
  }
}

export default function RecipePage({ params }: RecipePageProps) {
  const recipe = getRecipeBySlugServer(params.slug)
  const allRecipes = getAllRecipesServer()

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

  // Generate structured data for SEO
  const recipeStructuredData = generateRecipeStructuredData(recipe)
  const breadcrumbStructuredData = generateBreadcrumbStructuredData(recipe)

  return (
    <>
      {/* Structured Data for Google Rich Snippets */}
      <Script
        id="recipe-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(recipeStructuredData)
        }}
      />
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData)
        }}
      />
      
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
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
                  priority={true}
                  placeholder="blur"
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                  quality={85}
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
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                    <Heart size={20} />
                    <span>Gem</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rich Content Section for SEO */}
        <section className="py-12 bg-gray-50">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="prose prose-gray max-w-none">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">
                  Om denne {recipe.dietaryCategories[0]} opskrift
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">Fordele ved denne ret</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li>• {recipe.dietaryCategories[0]} venlig og egnet til vægttab</li>
                      <li>• Rig på protein og sunde fedtstoffer</li>
                      <li>• Nem at tilberede på under {formatTime(recipe.totalTime)}</li>
                      <li>• Perfekt til {recipe.servings} personer</li>
                      <li>• Indeholder kun {recipe.carbs}g kulhydrater per portion</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-900">Næringsværdi per portion</h3>
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Kalorier:</span>
                          <span className="ml-2 font-medium">{recipe.calories} kcal</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Protein:</span>
                          <span className="ml-2 font-medium">{recipe.protein}g</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Kulhydrater:</span>
                          <span className="ml-2 font-medium">{recipe.carbs}g</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Fedt:</span>
                          <span className="ml-2 font-medium">{recipe.fat}g</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Fiber:</span>
                          <span className="ml-2 font-medium">{recipe.fiber}g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">Hvorfor vælge {recipe.dietaryCategories[0]}?</h3>
                  <p className="text-gray-700 mb-4">
                    {recipe.dietaryCategories[0]} diæten fokuserer på at reducere kulhydrater og øge indtaget af sunde fedtstoffer. 
                    Dette hjælper kroppen med at brænde fedt i stedet for kulhydrater som primær energikilde.
                  </p>
                  <p className="text-gray-700">
                    Denne {recipe.dietaryCategories[0]} opskrift er perfekt til at holde dig mæt og tilfreds, 
                    samtidig med at du følger en sund livsstil. Den er nem at tilberede og smager fantastisk!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Jump to Recipe Button */}
        <section className="py-8 bg-white border-b border-gray-200">
          <div className="container">
            <div className="text-center">
              <JumpToRecipeButton />
            </div>
          </div>
        </section>

        {/* Recipe Content */}
        <section id="recipe-content" className="py-12">
          <div className="container">
            <div className="grid md:grid-cols-3 gap-12">
              {/* Ingredients */}
              <div className="md:col-span-1">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Ingredienser</h2>
                <div className="space-y-4">
                  {recipe.ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-900">
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="md:col-span-2">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Fremgangsmåde</h2>
                <div className="space-y-6">
                  {recipe.instructions.map((step) => (
                    <div key={step.id} className="flex space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 leading-relaxed">{step.instruction}</p>
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
              {allRecipes
                .filter(r => r.id !== recipe.id && r.dietaryCategories.some(cat => recipe.dietaryCategories.includes(cat)))
                .slice(0, 3)
                .map((relatedRecipe) => (
                  <Link key={relatedRecipe.id} href={`/opskrift/${relatedRecipe.slug}`} className="block">
                    <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={relatedRecipe.imageUrl}
                          alt={relatedRecipe.imageAlt}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{relatedRecipe.title}</h3>
                        <p className="text-sm text-gray-600">{relatedRecipe.shortDescription}</p>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
} 