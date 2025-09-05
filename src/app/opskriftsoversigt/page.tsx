'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { recipeCategories, dietaryCategories } from '@/lib/sample-data'
import RecipeCard from '@/components/RecipeCard'
import { useState, useEffect } from 'react'

interface Recipe {
  id: string
  title: string
  slug: string
  description: string
  shortDescription: string
  imageUrl: string
  imageAlt: string
  preparationTime: number
  cookingTime: number
  totalTime: number
  servings: number
  difficulty: 'Nem' | 'Mellem' | 'Svær'
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  dietaryCategories: string[]
  mainCategory: string
  subCategories: string[]
  ingredients: Array<{
    id: string
    name: string
    amount: number
    unit: string
    notes?: string
  }>
  instructions: Array<{
    id: string
    stepNumber: number
    instruction: string
    time?: number
    tips?: string
  }>
  publishedAt: Date
  updatedAt: Date
  metaTitle: string
  metaDescription: string
  keywords: string[]
  author: string
}

// Extended dietary categories with images and 8th option - REORGANIZED
const extendedDietaryCategories = [
  {
    id: '1',
    name: 'KETO',
    slug: 'keto',
    description: 'Ketogene opskrifter til vægttab og sundhed',
    color: 'bg-purple-500',
    recipeCount: 712,
    imageUrl: '/images/categories/keto.webp',
    imageAlt: 'Keto mad med bacon, æg og grønne grøntsager'
  },
  {
    id: '2',
    name: 'SENSE',
    slug: 'sense',
    description: 'Sunde opskrifter baseret på danske kostråd',
    color: 'bg-green-500',
    recipeCount: 445,
    imageUrl: '/images/categories/sense.webp',
    imageAlt: 'Sunde danske retter med rugbrød og grønne grøntsager'
  },
  {
    id: '3',
    name: 'LCHF/PALEO',
    slug: 'lchf-paleo',
    description: 'Lav-kulhydrat og paleo opskrifter',
    color: 'bg-orange-500',
    recipeCount: 389,
    imageUrl: '/images/categories/lchf-paleo.webp',
    imageAlt: 'LCHF og paleo mad med kød, nødder og frugt'
  },
  {
    id: '4',
    name: 'MEAL PREP',
    slug: 'meal-prep',
    description: 'Opskrifter til madplanlægning og forberedelse',
    color: 'bg-blue-500',
    recipeCount: 234,
    imageUrl: '/images/categories/meal-prep.webp',
    imageAlt: 'Forberedte måltider og madplanlægning'
  },
  {
    id: '5',
    name: 'ANTI-INFLAMMATORISK',
    slug: 'anti-inflammatory',
    description: 'Anti-inflammatoriske opskrifter til sundhed',
    color: 'bg-emerald-500',
    recipeCount: 156,
    imageUrl: '/images/categories/anti-inflammatory.webp',
    imageAlt: 'Anti-inflammatoriske retter med grønne grøntsager og omega-3'
  },
  {
    id: '10',
    name: 'FAMILIEMAD',
    slug: 'familie',
    description: 'Almindelige familiemad opskrifter',
    color: 'bg-blue-500',
    recipeCount: 450,
    imageUrl: '/images/categories/familie.webp',
    imageAlt: 'Familievenlige retter til hverdagen'
  },
  {
    id: '6',
    name: 'MIDDELHAVSDIÆTEN',
    slug: 'mediterranean',
    description: 'Middelhavs-inspirerede sunde opskrifter',
    color: 'bg-red-500',
    recipeCount: 267,
    imageUrl: '/images/categories/mediterranean.webp',
    imageAlt: 'Middelhavs mad med olivenolie, fisk og grønne grøntsager'
  },
  {
    id: '7',
    name: 'FLEKSITARISK',
    slug: 'flexitarian',
    description: 'Fleksitariske opskrifter med fokus på planter',
    color: 'bg-teal-500',
    recipeCount: 98,
    imageUrl: '/images/categories/flexitarian.webp',
    imageAlt: 'Fleksitariske retter med planter og lidt kød'
  },
  {
    id: '9',
    name: '5:2 DIÆT',
    slug: '5-2-diet',
    description: 'Opskrifter til 5:2 intermittent fasting',
    color: 'bg-amber-500',
    recipeCount: 123,
    imageUrl: '/images/categories/5-2-diet.webp',
    imageAlt: 'Sunde måltider til 5:2 diæt og intermittent fasting'
  }
]

export default function RecipeOverviewPage() {
  // State for recipes and filters
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [sortedRecipes, setSortedRecipes] = useState<Recipe[]>([])
  const [displayedRecipes, setDisplayedRecipes] = useState<Recipe[]>([])
  
  // State for filters and pagination
  const [selectedDietary, setSelectedDietary] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [displayCount, setDisplayCount] = useState(8)
  const [isLoading, setIsLoading] = useState(true)

  // Load recipes on component mount
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        console.log('🔄 Loading recipes from API...')
        const response = await fetch('/api/recipes')
        console.log('📡 Response status:', response.status)
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (response.ok) {
          const recipes = await response.json()
          console.log(`✅ Loaded ${recipes.length} recipes from API`)
          console.log('📋 First recipe:', recipes[0])
          setAllRecipes(recipes)
        } else {
          console.error('❌ Failed to load recipes:', response.status, response.statusText)
          const errorText = await response.text()
          console.error('❌ Error response:', errorText)
        }
      } catch (error) {
        console.error('❌ Error loading recipes:', error)
        console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipes()
  }, [])

  // Apply filters and sorting when dependencies change
  useEffect(() => {
    console.log('🔄 Applying filters and sorting...')
    console.log(`📊 Total recipes: ${allRecipes?.length || 0}`)
    console.log(`🔍 Search query: "${searchQuery}"`)
    console.log(`🥗 Selected dietary: "${selectedDietary}"`)
    console.log(`📂 Selected category: "${selectedCategory}"`)
    
    let filtered = allRecipes || []

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(recipe => {
        // Check title
        if (recipe.title.toLowerCase().includes(query)) {
          return true
        }
        // Check description
        if (recipe.description?.toLowerCase().includes(query)) {
          return true
        }
        // Check ingredients (ensure it's an array)
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          if (recipe.ingredients.some(ingredient =>
            ingredient.name.toLowerCase().includes(query)
          )) {
            return true
          }
        }
        return false
      })
      console.log(`🔍 After search filter: ${filtered.length} recipes`)
    }

    // Apply dietary filter
    if (selectedDietary !== 'all') {
      filtered = filtered.filter(recipe => {
        // Ensure dietaryCategories exists and is an array before filtering
        if (!recipe.dietaryCategories || !Array.isArray(recipe.dietaryCategories)) {
          return false
        }
        return recipe.dietaryCategories.some(cat => {
          // Normalize category names by removing brackets for comparison
          const normalizedCat = cat.replace(/[\[\]]/g, '').trim()
          const normalizedSelected = selectedDietary.replace(/[\[\]]/g, '').trim()
          return normalizedCat.toLowerCase() === normalizedSelected.toLowerCase()
        })
      })
      console.log(`🥗 After dietary filter: ${filtered.length} recipes`)
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => {
        // Normalize category names by removing brackets for comparison
        const normalizedRecipeCat = recipe.mainCategory?.replace(/[\[\]]/g, '').trim() || ''
        const normalizedSelected = selectedCategory.replace(/[\[\]]/g, '').trim()
        return normalizedRecipeCat.toLowerCase() === normalizedSelected.toLowerCase()
      })
      console.log(`📂 After category filter: ${filtered.length} recipes`)
    }

    setFilteredRecipes(filtered)

    // Apply sorting
    let sorted = [...filtered]
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
          return dateB - dateA
        })
        break
      case 'oldest':
        sorted.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
          return dateA - dateB
        })
        break
      case 'time-asc':
        sorted.sort((a, b) => (a.totalTime || 0) - (b.totalTime || 0))
        break
      case 'time-desc':
        sorted.sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0))
        break
      case 'rating':
        // For now, sort by newest since we don't have ratings
        sorted.sort((a, b) => {
          const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
          const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
          return dateB - dateA
        })
        break
    }

    setSortedRecipes(sorted)
    setDisplayedRecipes(sorted.slice(0, displayCount))
    console.log(`✅ Final result: ${sorted.length} sorted recipes, ${sorted.slice(0, displayCount).length} displayed`)
    console.log('📋 Displayed recipes:', sorted.slice(0, displayCount).map(r => r?.title || 'Unknown'))
  }, [allRecipes, searchQuery, selectedDietary, selectedCategory, sortBy, displayCount])

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 8)
  }

  const hasMoreRecipes = displayedRecipes && sortedRecipes ? displayedRecipes.length < sortedRecipes.length : false

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="container py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-8 h-8 mx-auto mb-4"></div>
            <p className="text-gray-600">Indlæser opskrifter...</p>
          </div>
        </div>
      </main>
    )
  }

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

      {/* Dietary Categories - Moved to top */}
      <section className="py-12 bg-white">
        <div className="container">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            Vælg mad ideologi
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Vælg din foretrukne mad ideologi og find opskrifter der passer til dig{' '}
            <span className="text-sm italic">
              ... Eller{' '}
              <button 
                onClick={() => document.getElementById('alle-opskrifter')?.scrollIntoView({ behavior: 'smooth' })}
                className="underline hover:text-gray-800 transition-colors"
              >
                spring direkte ned til alle opskrifter
              </button>
            </span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {extendedDietaryCategories && Array.isArray(extendedDietaryCategories) ? extendedDietaryCategories.map((category) => (
              <Link
                key={category.id}
                href={`/opskrifter/${category.slug}`}
                className="group block"
              >
                <div className="bg-gray-50 border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors w-full">
                  {/* Category Image */}
                  <div className="relative h-48 bg-gray-200">
                    <Image
                      src={category.imageUrl}
                      alt={category.imageAlt}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      priority={category.id === '1' || category.id === '2'} // Priority for first 2 images
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                    />
                    {/* Overlay with category name */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                      <h3 className="text-white text-2xl font-bold text-center px-4">
                        {category.name}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Category Info */}
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                    <div className="text-lg font-bold text-gray-900">{category.recipeCount} opskrifter</div>
                  </div>
                </div>
              </Link>
            )) : null}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-b border-gray-200"></div>

      {/* Alle vores opskrifter Section - Moved above search */}
      <section id="alle-opskrifter" className="py-8 bg-white">
        <div className="container">
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Alle vores opskrifter
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Bemærk, at du her søger i alle functionalfoods opskrifter med blandet mad ideologi. 
              Brug filteret eller vælg mad-ideologi sider ovenover, for at finde lækre opskrifter 
              inden for en specifik mad ideologi.
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filter Section - Moved below title/description */}
      <section className="bg-white py-4">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Søg i alle opskrifter her"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              />
            </div>

            {/* Mad ideologi select - Added after search */}
            <select
              value={selectedDietary}
              onChange={(e) => setSelectedDietary(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            >
              <option value="all">Alle mad ideologier</option>
              <option value="FAMILIEMAD">Familiemad</option>
              <option value="Keto">Keto</option>
              <option value="SENSE">SENSE</option>
              <option value="LCHF/PALEO">LCHF/Paleo</option>
              <option value="MEAL PREP">Meal Prep</option>
              <option value="ANTI-INFLAMMATORISK">Anti-Inflammatorisk</option>
              <option value="MIDDELHAVSDIÆTEN">Middelhavsdiæten</option>
              <option value="FLEKSITARISK">Fleksitarisk</option>
              <option value="5:2 DIÆT">5:2 Diæt</option>
            </select>

            {/* Filter Button */}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-3 transition-colors"
            >
              <Filter size={20} />
              <span>Filter</span>
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Advanced Filters Accordion */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sortering</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="newest">Nyeste først</option>
                    <option value="oldest">Ældste først</option>
                    <option value="time-asc">Kortest tid</option>
                    <option value="time-desc">Længste tid</option>
                    <option value="rating">Højeste rating</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  >
                    <option value="all">Alle kategorier</option>
                    <option value="Aftensmad">Aftensmad</option>
                    <option value="Frokost">Frokost</option>
                    <option value="Morgenmad">Morgenmad</option>
                    <option value="Salater">Salater</option>
                    <option value="Desserter">Desserter</option>
                    <option value="Snacks">Snacks</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {filteredRecipes.length} opskrifter fundet
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recipe Grid Section */}
      <section className="py-8 bg-white">
        <div className="container">
          {displayedRecipes && displayedRecipes.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayedRecipes && Array.isArray(displayedRecipes) ? displayedRecipes.map((recipe, index) => (
                  <RecipeCard 
                    key={recipe.id} 
                    recipe={recipe} 
                    priority={index < 6} // Priority loading for first 6 images
                  />
                )) : null}
              </div>
              
              {/* Load More Button */}
              {hasMoreRecipes && (
                <div className="text-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Vis flere opskrifter ({sortedRecipes.length - displayedRecipes.length} tilbage)
                  </button>
                </div>
              )}
            </>
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