import { Metadata } from 'next'
import Link from 'next/link'
import { Search, Filter } from 'lucide-react'
import { sampleRecipes, dietaryCategories } from '@/lib/sample-data'
import RecipeCard from '@/components/RecipeCard'

interface CategoryPageProps {
  params: {
    category: string
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = dietaryCategories.find(c => c.slug === params.category)
  
  if (!category) {
    return {
      title: 'Kategori ikke fundet | Functional Foods',
    }
  }

  return {
    title: `${category.name} opskrifter - ${category.description} | Functional Foods`,
    description: `Find alle ${category.name} opskrifter fra Functional Foods. ${category.description}`,
    keywords: [category.name.toLowerCase(), 'opskrifter', 'vægttab', 'sunde opskrifter'],
  }
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const category = dietaryCategories.find(c => c.slug === params.category)
  
  if (!category) {
    return (
      <div className="container py-16">
        <h1 className="text-2xl font-bold mb-4">Kategori ikke fundet</h1>
        <Link href="/opskriftsoversigt" className="text-gray-600 hover:text-gray-900">
          ← Tilbage til opskriftsoversigt
        </Link>
      </div>
    )
  }

  // Filter recipes by this category
  const categoryRecipes = sampleRecipes.filter(recipe => 
    recipe.dietaryCategories.includes(category.name)
  )

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="container">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              {category.name} opskrifter
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-gray-600">
              {category.description}
            </p>
            <div className="flex items-center justify-center space-x-4">
              <div className="bg-gray-100 px-6 py-2">
                <span className="text-2xl font-bold text-gray-900">{category.recipeCount}</span>
                <span className="ml-2 text-gray-600">opskrifter</span>
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
                placeholder={`Søg i ${category.name} opskrifter`}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            {/* Filter Button */}
            <button className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-3 transition-colors">
              <Filter size={20} />
              <span>Filter</span>
            </button>
          </div>
        </div>
      </section>

      {/* Recipe Categories */}
      <section className="py-12 bg-white">
        <div className="container">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">
            {category.name} opskrifter
          </h2>
          
          {categoryRecipes.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {categoryRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Ingen {category.name} opskrifter fundet endnu.
              </p>
              <Link 
                href="/opskriftsoversigt" 
                className="text-gray-900 hover:text-gray-700 font-medium"
              >
                Se alle opskrifter →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Information Section */}
      <section className="py-12 bg-gray-50">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Om {category.name}
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 mb-4">
                {category.description}
              </p>
              <p className="text-gray-600 mb-4">
                Alle vores {category.name} opskrifter er sunde og egner sig til vægttab og en sund livsstil. 
                Vi fokuserer på at lave opskrifter, der er nemme at lave og smager godt.
              </p>
              <p className="text-gray-600">
                Find inspiration til din daglige kost og opdag nye måder at spise sundt på.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other Categories */}
      <section className="py-12 bg-white">
        <div className="container">
          <h2 className="text-2xl font-bold mb-8 text-gray-900">
            Andre kategorier
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dietaryCategories
              .filter(c => c.slug !== params.category)
              .map((otherCategory) => (
                <Link
                  key={otherCategory.id}
                  href={`/opskrifter/${otherCategory.slug}`}
                  className="group block"
                >
                  <div className="bg-gray-50 border border-gray-200 p-6 text-center hover:border-gray-300 transition-colors">
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{otherCategory.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{otherCategory.description}</p>
                    <div className="text-2xl font-bold text-gray-900">{otherCategory.recipeCount} opskrifter</div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>
    </main>
  )
} 