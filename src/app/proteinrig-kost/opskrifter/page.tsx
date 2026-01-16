import Link from 'next/link'
import { ArrowLeft, Utensils, Search, Filter } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'

export default function ProteinrigKostRecipesPage() {
  const proteinrigKostRecipes = [
    {
      id: '1',
      title: 'Proteinrig Kylling med Grøntsager',
      slug: 'proteinrig-kylling-med-groentsager',
      description: 'En nem og sund proteinrig ret med kylling og masser af grøntsager.',
      shortDescription: 'Perfekt til en hurtig hverdagsmiddag.',
      imageUrl: 'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/meal-prep-kylling-groentsager.webp',
      imageAlt: 'Proteinrig Kylling med Grøntsager',
      preparationTime: 10,
      cookingTime: 20,
      totalTime: 30,
      servings: 4,
      difficulty: 'Nem' as const,
      calories: 350,
      protein: 25,
      carbs: 20,
      fat: 15,
      fiber: 8,
      dietaryCategories: ['Proteinrig kost'],
      mainCategory: 'Hovedretter',
      subCategories: ['Fjerkræ', 'Grøntsager'],
      ingredients: [],
      instructions: [],
      publishedAt: new Date(),
      updatedAt: new Date(),
      metaTitle: 'Proteinrig Kylling med Grøntsager Opskrift',
      metaDescription: 'Lækker og nem proteinrig kylling med grøntsager.',
      keywords: ['proteinrig kost', 'kylling', 'grøntsager', 'opskrift'],
      author: 'Functional Foods'
    }
  ];

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-purple-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/proteinrig-kost" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Proteinrig kost
          </Link>
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Utensils className="w-4 h-4" />
            Proteinrig kost Opskrifter
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Lækre <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">proteinrige opskrifter</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Find inspiration til dine proteinrige måltider med vores store udvalg af gratis opskrifter, der er nemme at lave og fulde af smag.
          </p>
        </div>
      </section>

      {/* Recipe List Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 mb-12">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Søg i proteinrige opskrifter"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              />
            </div>
            {/* Filter/Sort (Placeholder) */}
            <button className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:border-purple-500 hover:text-purple-600 transition-all duration-200">
              <Filter className="w-5 h-5" />
              Filter & Sortér
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {proteinrigKostRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {proteinrigKostRecipes.length === 0 && (
            <p className="text-center text-gray-600 text-lg mt-8">Ingen proteinrige opskrifter fundet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
