import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Star, MessageCircle } from 'lucide-react'
import { databaseService } from '@/lib/database-service'
import { generateRecipeStructuredData, generateBreadcrumbStructuredData } from '@/lib/structured-data'
import Script from 'next/script'
import RecipePageClient from '@/components/RecipePageClient'
import RecipeHeaderActions from '@/components/RecipeHeaderActions'
import NutritionFactsBox from '@/components/NutritionFactsBox'
import RecipeNutritionRecalculator from '@/components/RecipeNutritionRecalculator'

interface RecipePageProps {
  params: {
    slug: string
  }
}

export default async function RecipePage({ params }: RecipePageProps) {
  const allRecipes = await databaseService.getRecipes()
  const recipe = allRecipes.find(r => r.slug === params.slug)

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
    if (minutes < 60) return `${minutes} MIN`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}T ${mins} MIN` : `${hours}T`
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
        {/* Header with Search */}
        <section className="bg-white border-b border-gray-200">
          <div className="container py-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Søg efter flere opskrifter"
                className="w-full px-4 py-3 pl-12 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Breadcrumbs */}
        <section className="bg-white border-b border-gray-200">
          <div className="container py-2">
            <nav className="text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-900">Functional Foods</Link>
              <span className="mx-2">›</span>
              <Link href="/opskriftsoversigt" className="hover:text-gray-900">Opskrifter</Link>
              <span className="mx-2">›</span>
              <span className="text-gray-900">{recipe.title}</span>
            </nav>
          </div>
        </section>

        {/* Recipe Header */}
        <section className="bg-white">
          <div className="container py-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">
              {recipe.title}
            </h1>
          </div>
        </section>

        {/* Main Recipe Image and Description */}
        <section className="bg-white">
          <div className="container py-4">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Recipe Image */}
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                {recipe.imageUrl ? (
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.imageAlt || recipe.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={true}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    quality={85}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Intet billede</span>
                  </div>
                )}
              </div>
              
              {/* Recipe Description and Actions */}
              <div className="space-y-6">
                <div>
                  <p className="text-gray-700 leading-relaxed text-lg">
                    En skål fuld af smag, farver og skønne råvarer. Nem og hurtig aftensmad - og du kan skifte ud, 
                    så du både får brugt rester og undgår madspild. Denne {recipe.dietaryCategories?.[0] || 'sunde'} opskrift er 
                    perfekt til at holde dig mæt og tilfreds, samtidig med at du følger en sund livsstil.
                  </p>
                </div>
                
                {/* Recipe Meta Information */}
                <RecipeHeaderActions recipe={recipe} />
                
                {/* Recipe Tags */}
                {recipe.dietaryCategories && recipe.dietaryCategories.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">Denne opskrift egner sig til: </span>
                    <div className="inline-flex flex-wrap gap-2 ml-2">
                      {recipe.dietaryCategories.map((category) => (
                        <span
                          key={category}
                          className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Nutrition Facts Box - Using nutritionalInfo from Frida DTU */}
                <div className="mt-6">
                  <NutritionFactsBox
                    calories={recipe.nutritionalInfo?.calories || recipe.calories || 0}
                    protein={recipe.nutritionalInfo?.protein || recipe.protein || 0}
                    carbs={recipe.nutritionalInfo?.carbs || recipe.carbs || 0}
                    fat={recipe.nutritionalInfo?.fat || recipe.fat || 0}
                    fiber={recipe.nutritionalInfo?.fiber || recipe.fiber || 0}
                    servings={recipe.servings || 4}
                    vitamins={recipe.nutritionalInfo?.vitamins || {}}
                    minerals={recipe.nutritionalInfo?.minerals || {}}
                  />
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Client-side interactive components */}
        <RecipePageClient 
          recipe={recipe} 
          allRecipes={allRecipes} 
        />
      </main>
    </>
  )
} 