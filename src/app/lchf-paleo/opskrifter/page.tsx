import Link from 'next/link'
import { ArrowLeft, Utensils, Search, Filter } from 'lucide-react'
import RecipeCard from '@/components/RecipeCard'

export default function LchfPaleoRecipesPage() {
  // Dummy data for recipes - replace with actual data fetching and filtering
  const lchfPaleoRecipes = [
    {
      id: '1',
      title: 'LCHF Laks med Asparges',
      slug: 'lchf-laks-med-asparges',
      description: 'En nem og lækker LCHF-venlig ret med laks og friske asparges.',
      shortDescription: 'Perfekt til en hurtig hverdagsmiddag.',
      imageUrl: 'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/lchf-laks-asparges.webp',
      imageAlt: 'LCHF Laks med Asparges',
      preparationTime: 10,
      cookingTime: 20,
      totalTime: 30,
      servings: 2,
      difficulty: 'Nem' as const,
      calories: 450,
      protein: 35,
      carbs: 5,
      fat: 30,
      fiber: 3,
      dietaryCategories: ['LCHF/Paleo'],
      mainCategory: 'Hovedretter',
      subCategories: ['Fisk', 'Grøntsager'],
      ingredients: [],
      instructions: [],
      publishedAt: new Date(),
      updatedAt: new Date(),
      metaTitle: 'LCHF Laks med Asparges Opskrift',
      metaDescription: 'Lækker og nem LCHF laks med asparges.',
      keywords: ['lchf', 'laks', 'asparges', 'opskrift'],
      author: 'Functional Foods'
    },
    {
      id: '2',
      title: 'Paleo Kylling med Sød Kartoffel',
      slug: 'paleo-kylling-med-soed-kartoffel',
      description: 'Saftig kylling med sød kartoffel og grøntsager efter Paleo-principperne.',
      shortDescription: 'En mættende og velsmagende Paleo-ret.',
      imageUrl: 'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/paleo-kylling-kartoffel.webp',
      imageAlt: 'Paleo Kylling med Sød Kartoffel',
      preparationTime: 15,
      cookingTime: 25,
      totalTime: 40,
      servings: 4,
      difficulty: 'Mellem' as const,
      calories: 380,
      protein: 30,
      carbs: 25,
      fat: 20,
      fiber: 5,
      dietaryCategories: ['LCHF/Paleo'],
      mainCategory: 'Hovedretter',
      subCategories: ['Fjerkræ', 'Grøntsager'],
      ingredients: [],
      instructions: [],
      publishedAt: new Date(),
      updatedAt: new Date(),
      metaTitle: 'Paleo Kylling med Sød Kartoffel Opskrift',
      metaDescription: 'Cremet og lækker Paleo kylling med sød kartoffel.',
      keywords: ['paleo', 'kylling', 'kartoffel', 'opskrift'],
      author: 'Functional Foods'
    }
  ];

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-orange-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/lchf-paleo" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til LCHF/Paleo
          </Link>
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Utensils className="w-4 h-4" />
            LCHF/Paleo Opskrifter
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Lækre <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-green-600">LCHF/Paleo opskrifter</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Find inspiration til dine LCHF/Paleo-måltider med vores store udvalg af gratis opskrifter, der er nemme at lave og fulde af smag.
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
                placeholder="Søg i LCHF/Paleo opskrifter"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
              />
            </div>
            {/* Filter/Sort (Placeholder) */}
            <button className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 hover:border-orange-500 hover:text-orange-600 transition-all duration-200">
              <Filter className="w-5 h-5" />
              Filter & Sortér
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {lchfPaleoRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {lchfPaleoRecipes.length === 0 && (
            <p className="text-center text-gray-600 text-lg mt-8">Ingen LCHF/Paleo opskrifter fundet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
