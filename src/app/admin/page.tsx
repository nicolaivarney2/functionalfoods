import Link from 'next/link'
import { Plus, Search, Filter, Upload, BarChart3, Settings } from 'lucide-react'
import { databaseService } from '@/lib/database-service'

export default async function AdminDashboard() {
  const allRecipes = await databaseService.getRecipes()
  
  const stats = {
    totalRecipes: allRecipes.length,
    ketoRecipes: allRecipes.filter(r => r.dietaryCategories?.includes('Keto')).length,
    senseRecipes: allRecipes.filter(r => r.dietaryCategories?.includes('SENSE')).length,
    publishedToday: allRecipes.filter(r => {
      const today = new Date()
      const recipeDate = r.publishedAt
      return recipeDate ? recipeDate.toDateString() === today.toDateString() : false
    }).length,
    importedRecipes: allRecipes.length // All recipes are now from database
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage your recipes and content</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="btn-primary flex items-center space-x-2">
                <Plus size={16} />
                <span>Add Recipe</span>
              </button>
              <Link href="/admin/import" className="btn-secondary flex items-center space-x-2">
                <Upload size={16} />
                <span>Bulk Import</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container">
          <nav className="flex space-x-8">
            <Link 
              href="/admin" 
              className="px-3 py-4 text-sm font-medium text-blue-600 border-b-2 border-blue-600"
            >
              Dashboard
            </Link>
            <Link 
              href="/admin/ingredients" 
              className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300"
            >
              Ingredients
            </Link>
            <Link 
              href="/admin/import" 
              className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300"
            >
              Import
            </Link>
            <Link 
              href="/admin/recipes" 
              className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300"
            >
              Recipes
            </Link>
            <Link 
              href="/admin/frida-mapping" 
              className="px-3 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300"
            >
              Frida Mapping
            </Link>
          </nav>
        </div>
      </div>

      {/* Stats */}
      <div className="container py-8">
        {/* Loading state removed as per new_code */}
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Recipes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalRecipes}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BarChart3 className="text-blue-600" size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Keto Recipes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ketoRecipes}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="text-purple-600" size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">SENSE Recipes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.senseRecipes}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <BarChart3 className="text-green-600" size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.publishedToday}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <BarChart3 className="text-yellow-600" size={20} />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Imported Recipes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.importedRecipes}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Upload className="text-orange-600" size={20} />
                </div>
              </div>
            </div>
          </div>
        {/* Loading state removed as per new_code */}
      </div>

      {/* Search and Filters */}
      <div className="container pb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value=""
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                />
              </div>
              
              <select
                value="all"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="Aftensmad">Aftensmad</option>
                <option value="Frokost">Frokost</option>
                <option value="Morgenmad">Morgenmad</option>
                <option value="Salater">Salater</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Filter size={16} />
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recipe List */}
      <div className="container pb-8">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recipes ({allRecipes.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            {/* Loading state removed as per new_code */}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dietary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allRecipes.map((recipe) => (
                  <tr key={recipe.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-lg object-cover"
                            src={recipe.imageUrl || '/images/recipe-placeholder.jpg'}
                            alt={recipe.title}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{recipe.title}</div>
                          <div className="text-sm text-gray-500">{recipe.shortDescription || recipe.description?.substring(0, 50) || 'Ingen beskrivelse'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {recipe.mainCategory || 'Hovedret'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {recipe.dietaryCategories && recipe.dietaryCategories.length > 0 ? (
                          recipe.dietaryCategories.map((category) => (
                            <span
                              key={category}
                              className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                            >
                              {category}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">Ingen kategorier</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {recipe.totalTime || 0} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recipe.publishedAt ? new Date(recipe.publishedAt).toLocaleDateString('da-DK') : 'Ikke publiceret'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/recipes/${recipe.id}/edit`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </Link>
                        <button className="text-red-600 hover:text-red-900">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Loading state removed as per new_code */}
          </div>
        </div>
      </div>
    </div>
  )
} 