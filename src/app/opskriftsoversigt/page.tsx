import Link from 'next/link'
import { Search, Filter, Clock, Users } from 'lucide-react'
import { recipeCategories, dietaryCategories } from '@/lib/sample-data'
import { getAllRecipesServer } from '@/lib/recipe-storage-server'
import RecipeCard from '@/components/RecipeCard'
import { searchRecipes, sortRecipes, SearchFilters } from '@/lib/search'

export default function RecipeOverviewPage() {
  // Get all recipes (sample + imported)
  const allRecipes = getAllRecipesServer()
  
  // Apply search and filters
  const filters: SearchFilters = {
    query: '', // Search query is handled by the server component
    category: 'all', // Default to all categories
    dietary: undefined, // Default to no dietary filters
  }

  const filteredRecipes = searchRecipes(allRecipes, filters)
  const sortedRecipes = sortRecipes(filteredRecipes, 'newest') // Default sort
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="container">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Opskrifter til en sund livsstil
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-600">
              Her finder du alle sunde opskrifter fra Functional Foods. 
              Det er opskrifter der egner sig til vægttab og en sund livsstil, 
              og kan være alt fra nem hverdagsmad, mad til én, familievenlig og sund mad.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <div className="bg-gray-100 px-6 py-2">
                <span className="text-2xl font-bold text-gray-900">+2.509</span>
                <span className="ml-2 text-gray-600">gratis opskrifter</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Søg i alle opskrifter her"
                defaultValue=""
                className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              defaultValue="newest"
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="newest">Nyeste først</option>
              <option value="oldest">Ældste først</option>
              <option value="time-asc">Kortest tid</option>
              <option value="time-desc">Længste tid</option>
              <option value="rating">Højeste rating</option>
            </select>

            {/* Filter Button */}
            <button 
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-3 transition-colors"
            >
              <Filter size={20} />
              <span>Filter</span>
            </button>
          </div>

          {/* Advanced Filters */}
          {/* This section is now server-side, so it will always show the default filters */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  defaultValue="all"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="all">Alle kategorier</option>
                  <option value="Aftensmad">Aftensmad</option>
                  <option value="Frokost">Frokost</option>
                  <option value="Morgenmad">Morgenmad</option>
                  <option value="Salater">Salater</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mad ideologi</label>
                <select
                  defaultValue="all"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="all">Alle mad ideologier</option>
                  <option value="Keto">Keto</option>
                  <option value="LCHF">LCHF</option>
                  <option value="Paleo">Paleo</option>
                  <option value="Vegetar">Vegetar</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resultater</label>
                <p className="text-sm text-gray-600">
                  {filteredRecipes.length} opskrifter fundet
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dietary Categories */}
      <section className="py-12 bg-white">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Vælg mad ideologi
          </h2>
          <p className="text-gray-600 text-center mb-8">
            ... Eller spring direkte ned til alle opskrifter
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dietaryCategories.map((category) => (
              <Link
                key={category.id}
                href={`/opskrifter/${category.slug}`}
                className="group block"
              >
                <div className="bg-gray-50 border border-gray-200 p-6 text-center hover:border-gray-300 transition-colors">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                  <div className="text-2xl font-bold text-gray-900">{category.recipeCount} opskrifter</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Recipe Categories */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Vægttab opskrifter med Functional Foods
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recipeCategories.map((category) => (
              <Link
                key={category.id}
                href={`/opskrifter/kategori/${category.slug}`}
                className="group block"
              >
                <div className="bg-white border border-gray-200 p-6 text-center hover:border-gray-300 transition-colors">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{category.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                  <div className="text-gray-900 font-bold">{category.recipeCount} opskrifter</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Search Results */}
      <section className="py-12 bg-white">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredRecipes.length > 0 
                ? `Søgeresultater (${filteredRecipes.length})` 
                : 'Alle opskrifter'
              }
            </h2>
            {/* No search query to display */}
          </div>
          
          {filteredRecipes.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredRecipes.map((recipe, index) => (
                <RecipeCard 
                  key={recipe.id} 
                  recipe={recipe} 
                  priority={index < 6} // Priority loading for first 6 images
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                Ingen opskrifter fundet. Prøv at ændre dine søgekriterier.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Information Sections */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Sund mad og mental coaching</h3>
              <p className="text-gray-600 mb-4">
                Det er kroppen der indtager maden, men sindet der styrer hånden. 
                Vi tror derfor på, at skab et samspil imellem sind og krop er vigtigt, 
                for at opnå en sund livsstil.
              </p>
              <Link href="/mental-sundhed" className="text-gray-900 hover:text-gray-700 font-medium">
                Læs om mental sundhed her →
              </Link>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Billig mad, der også er sundt</h3>
              <p className="text-gray-600 mb-4">
                Når vi spiser sunde retter, får vi mere overskud og sparer også ofte penge. 
                En sund livsstil med Functional Foods er derfor egnet til at spare penge.
              </p>
              <Link href="/mad-budget" className="text-gray-900 hover:text-gray-700 font-medium">
                Find billig mad her →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
} 