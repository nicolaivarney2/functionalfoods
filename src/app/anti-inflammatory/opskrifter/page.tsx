import Link from 'next/link'
import { ArrowLeft, Utensils, Search, Filter } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'

export default function AntiInflammatoryRecipesPage() {
  // Dummy data for recipes - replace with actual data fetching and filtering
  const antiInflammatoryRecipes = [
    {
      id: '1',
      title: 'Anti-inflammatorisk Laks med Grøntsager',
      slug: 'anti-inflammatorisk-laks-med-groentsager',
      description: 'En nem og sund anti-inflammatorisk ret med laks og masser af grøntsager.',
      shortDescription: 'Perfekt til en hurtig hverdagsmiddag.',
      imageUrl: 'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/anti-inflammatory-laks-groentsager.webp',
      imageAlt: 'Anti-inflammatorisk Laks med Grøntsager',
      preparationTime: 10,
      cookingTime: 20,
      totalTime: 30,
      servings: 4,
      difficulty: 'Nem',
      calories: 350,
      protein: 25,
      carbs: 20,
      fat: 15,
      fiber: 8,
      dietaryCategories: ['Anti-inflammatorisk'],
      mainCategory: 'Hovedretter',
      subCategories: ['Fisk', 'Grøntsager'],
      ingredients: [],
      instructions: [],
      publishedAt: new Date(),
      updatedAt: new Date(),
      metaTitle: 'Anti-inflammatorisk Laks med Grøntsager Opskrift',
      metaDescription: 'Lækker og nem anti-inflammatorisk laks med grøntsager.',
      keywords: ['anti-inflammatorisk', 'laks', 'grøntsager', 'opskrift'],
      author: 'Functional Foods'
    }
  ];

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/anti-inflammatory" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Anti-inflammatorisk
          </Link>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Utensils className="w-4 h-4" />
            Anti-inflammatoriske Opskrifter
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Lækre <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">anti-inflammatoriske opskrifter</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Find inspiration til dine anti-inflammatoriske måltider med vores store udvalg af gratis opskrifter, der er nemme at lave og fulde af smag.
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
                placeholder="Søg i anti-inflammatoriske opskrifter"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
              />
            </div>
            {/* Filter/Sort (Placeholder) */}
            <button className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:border-emerald-500 hover:text-emerald-600 transition-all duration-200">
              <Filter className="w-5 h-5" />
              Filter & Sortér
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {antiInflammatoryRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {antiInflammatoryRecipes.length === 0 && (
            <p className="text-center text-gray-600 text-lg mt-8">Ingen anti-inflammatoriske opskrifter fundet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
