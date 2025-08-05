'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, Filter, Tag, BarChart3 } from 'lucide-react'
import { IngredientTag, IngredientCategory, NutritionalInfo } from '@/lib/ingredient-system/types'
import { ingredientService } from '@/lib/ingredient-system'

export default function IngredientsAdminPage() {
  const [ingredients, setIngredients] = useState<IngredientTag[]>([])
  const [filteredIngredients, setFilteredIngredients] = useState<IngredientTag[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<IngredientTag | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIngredients()
  }, [])

  useEffect(() => {
    filterIngredients()
  }, [ingredients, searchTerm, selectedCategory])

  const loadIngredients = () => {
    setLoading(true)
    try {
      const allIngredients = ingredientService.getIngredients()
      setIngredients(allIngredients)
    } catch (error) {
      console.error('Error loading ingredients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterIngredients = () => {
    let filtered = ingredients

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.commonNames.some(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ingredient => ingredient.category === selectedCategory)
    }

    setFilteredIngredients(filtered)
  }

  const handleAddIngredient = (ingredientData: Partial<IngredientTag>) => {
    try {
      const newIngredient = ingredientService.createIngredientTag({
        name: ingredientData.name || '',
        category: ingredientData.category || IngredientCategory.Other,
        exclusions: ingredientData.exclusions || [],
        allergens: ingredientData.allergens || [],
        commonNames: ingredientData.commonNames || [],
        description: ingredientData.description || '',
        nutritionalInfo: ingredientData.nutritionalInfo,
        isActive: true
      })
      
      setIngredients(prev => [...prev, newIngredient])
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding ingredient:', error)
    }
  }

  const handleUpdateIngredient = (id: string, updates: Partial<IngredientTag>) => {
    try {
      const updated = ingredientService.updateIngredientTag(id, updates)
      if (updated) {
        setIngredients(prev => prev.map(ing => ing.id === id ? updated : ing))
        setEditingIngredient(null)
      }
    } catch (error) {
      console.error('Error updating ingredient:', error)
    }
  }

  const handleDeleteIngredient = (id: string) => {
    if (confirm('Are you sure you want to delete this ingredient?')) {
      try {
        const deleted = ingredientService.deleteIngredientTag(id)
        if (deleted) {
          setIngredients(prev => prev.filter(ing => ing.id !== id))
        }
      } catch (error) {
        console.error('Error deleting ingredient:', error)
      }
    }
  }

  const getCategoryColor = (category: IngredientCategory) => {
    const colors = {
      [IngredientCategory.Protein]: 'bg-red-100 text-red-800',
      [IngredientCategory.Vegetable]: 'bg-green-100 text-green-800',
      [IngredientCategory.Fruit]: 'bg-yellow-100 text-yellow-800',
      [IngredientCategory.Grain]: 'bg-orange-100 text-orange-800',
      [IngredientCategory.Dairy]: 'bg-blue-100 text-blue-800',
      [IngredientCategory.Fat]: 'bg-purple-100 text-purple-800',
      [IngredientCategory.Spice]: 'bg-pink-100 text-pink-800',
      [IngredientCategory.Herb]: 'bg-teal-100 text-teal-800',
      [IngredientCategory.Nut]: 'bg-brown-100 text-brown-800',
      [IngredientCategory.Seed]: 'bg-indigo-100 text-indigo-800',
      [IngredientCategory.Legume]: 'bg-lime-100 text-lime-800',
      [IngredientCategory.ProcessedFood]: 'bg-gray-100 text-gray-800',
      [IngredientCategory.Sweetener]: 'bg-pink-100 text-pink-800',
      [IngredientCategory.Beverage]: 'bg-cyan-100 text-cyan-800',
      [IngredientCategory.Other]: 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ingredient Management</h1>
              <p className="text-gray-600">Manage ingredient tags and nutritional data</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add Ingredient</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="container py-6">
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ingredients</p>
                <p className="text-2xl font-bold text-gray-900">{ingredients.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Tag className="text-blue-600" size={20} />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Ingredients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ingredients.filter(ing => ing.isActive).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <BarChart3 className="text-green-600" size={20} />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Nutritional Data</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ingredients.filter(ing => ing.nutritionalInfo).length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="text-purple-600" size={20} />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Allergen Ingredients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {ingredients.filter(ing => ing.allergens.length > 0).length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <BarChart3 className="text-red-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {Object.values(IngredientCategory).map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingredient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nutritional Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exclusions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allergens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{ingredient.name}</div>
                        <div className="text-sm text-gray-500">{ingredient.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(ingredient.category)}`}>
                        {ingredient.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ingredient.nutritionalInfo ? (
                        <div className="text-sm text-gray-900">
                          <div>{ingredient.nutritionalInfo.caloriesPer100g} cal/100g</div>
                          <div className="text-xs text-gray-500">
                            P: {ingredient.nutritionalInfo.proteinPer100g}g | 
                            C: {ingredient.nutritionalInfo.carbsPer100g}g | 
                            F: {ingredient.nutritionalInfo.fatPer100g}g
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {ingredient.exclusions.map((exclusion, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            {exclusion}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {ingredient.allergens.map((allergen, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        ingredient.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ingredient.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingIngredient(ingredient)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteIngredient(ingredient.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingIngredient) && (
        <IngredientModal
          ingredient={editingIngredient}
          onSave={editingIngredient ? handleUpdateIngredient : handleAddIngredient}
          onClose={() => {
            setShowAddModal(false)
            setEditingIngredient(null)
          }}
        />
      )}
    </div>
  )
}

// Modal component for adding/editing ingredients
function IngredientModal({ 
  ingredient, 
  onSave, 
  onClose 
}: { 
  ingredient?: IngredientTag | null
  onSave: (id: string, data: Partial<IngredientTag>) => void
  onClose: () => void 
}) {
  const [formData, setFormData] = useState({
    name: ingredient?.name || '',
    category: ingredient?.category || IngredientCategory.Other,
    description: ingredient?.description || '',
    exclusions: ingredient?.exclusions || [],
    allergens: ingredient?.allergens || [],
    commonNames: ingredient?.commonNames || [],
    nutritionalInfo: ingredient?.nutritionalInfo || {
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0
    },
    isActive: ingredient?.isActive ?? true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (ingredient) {
      onSave(ingredient.id, formData)
    } else {
      onSave('new', formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {ingredient ? 'Edit Ingredient' : 'Add New Ingredient'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as IngredientCategory }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(IngredientCategory).map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exclusions (comma-separated)
              </label>
              <input
                type="text"
                value={formData.exclusions.join(', ')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  exclusions: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="pork, dairy, nuts"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allergens (comma-separated)
              </label>
              <input
                type="text"
                value={formData.allergens.join(', ')}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  allergens: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="nuts, milk, eggs"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Common Names (comma-separated)
            </label>
            <input
              type="text"
              value={formData.commonNames.join(', ')}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                commonNames: e.target.value.split(',').map(s => s.trim()).filter(s => s)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="alternative names, synonyms"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-medium mb-3">Nutritional Information (per 100g)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calories
                </label>
                <input
                  type="number"
                  value={formData.nutritionalInfo.caloriesPer100g}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    nutritionalInfo: { ...prev.nutritionalInfo, caloriesPer100g: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={formData.nutritionalInfo.proteinPer100g}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    nutritionalInfo: { ...prev.nutritionalInfo, proteinPer100g: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={formData.nutritionalInfo.carbsPer100g}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    nutritionalInfo: { ...prev.nutritionalInfo, carbsPer100g: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={formData.nutritionalInfo.fatPer100g}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    nutritionalInfo: { ...prev.nutritionalInfo, fatPer100g: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {ingredient ? 'Update' : 'Add'} Ingredient
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 