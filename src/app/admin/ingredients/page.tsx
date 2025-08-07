'use client'

import React, { useState, useEffect } from 'react'
import { IngredientCategory, IngredientTag } from '@/lib/ingredient-system/types'
import { databaseService } from '@/lib/database-service'

interface IngredientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (ingredient: Partial<IngredientTag>) => void
  ingredient?: IngredientTag
}

function IngredientModal({ isOpen, onClose, onSave, ingredient }: IngredientModalProps) {
  const [formData, setFormData] = useState({
    name: ingredient?.name || '',
    description: ingredient?.description || '',
    category: ingredient?.category || IngredientCategory.Andre,
    exclusions: ingredient?.exclusions?.join(', ') || '',
    allergens: ingredient?.allergens?.join(', ') || ''
  })

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name,
        description: ingredient.description || '',
        category: ingredient.category,
        exclusions: ingredient.exclusions?.join(', ') || '',
        allergens: ingredient.allergens?.join(', ') || ''
      })
    }
  }, [ingredient])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name: formData.name,
      description: formData.description,
      category: formData.category,
      exclusions: formData.exclusions.split(',').map(s => s.trim()).filter(Boolean),
      allergens: formData.allergens.split(',').map(s => s.trim()).filter(Boolean)
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {ingredient ? 'Rediger ingrediens' : 'Tilføj ingrediens'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Navn</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Beskrivelse</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as IngredientCategory })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {Object.values(IngredientCategory).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Eksklusioner (kommasepareret)</label>
              <input
                type="text"
                value={formData.exclusions}
                onChange={(e) => setFormData({ ...formData, exclusions: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Allergener (kommasepareret)</label>
              <input
                type="text"
                value={formData.allergens}
                onChange={(e) => setFormData({ ...formData, allergens: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuller
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Gem
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<IngredientTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<IngredientTag | null>(null)
  const [showNutritionalDetails, setShowNutritionalDetails] = useState<Set<string>>(new Set())

  const loadIngredients = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/ingredients')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const allIngredients = await response.json()
      console.log('Loaded ingredients from API:', allIngredients.length)
      setIngredients(allIngredients)
    } catch (err) {
      console.error('Error loading ingredients:', err)
      setError('Failed to load ingredients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIngredients()
  }, [])

  const handleAddIngredient = async (ingredientData: Partial<IngredientTag>) => {
    try {
      // For now, we'll just reload the ingredients after adding
      // In a full implementation, you'd want to add a saveIngredient method to databaseService
      console.log('Adding ingredient:', ingredientData)
      // TODO: Implement saveIngredient in databaseService
      setShowModal(false)
      // Reload ingredients to show the new one
      await loadIngredients()
    } catch (error) {
      console.error('Error adding ingredient:', error)
    }
  }

  const handleUpdateIngredient = async (id: string, updates: Partial<IngredientTag>) => {
    try {
      // For now, we'll just reload the ingredients after updating
      // In a full implementation, you'd want to add an updateIngredient method to databaseService
      console.log('Updating ingredient:', id, updates)
      // TODO: Implement updateIngredient in databaseService
      setShowModal(false)
      setEditingIngredient(null)
      // Reload ingredients to show the updated one
      await loadIngredients()
    } catch (error) {
      console.error('Error updating ingredient:', error)
    }
  }

  const handleSaveIngredient = (ingredientData: Partial<IngredientTag>) => {
    if (editingIngredient) {
      handleUpdateIngredient(editingIngredient.id, ingredientData)
    } else {
      handleAddIngredient(ingredientData)
    }
  }

  const handleViewNutritionalDetails = (ingredientId: string) => {
    setShowNutritionalDetails(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId)
      } else {
        newSet.add(ingredientId)
      }
      return newSet
    })
  }

  const renderNutritionalDetails = (ingredient: IngredientTag) => {
    if (!ingredient.nutritionalInfo) return null

    const { nutritionalInfo } = ingredient

    return (
      <div className="bg-gray-50 p-4 rounded-lg mt-2">
        <h4 className="font-semibold mb-2">Næringsindhold (per 100g)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Kalorier:</span> {nutritionalInfo.caloriesPer100g} kcal
          </div>
          <div>
            <span className="font-medium">Protein:</span> {nutritionalInfo.proteinPer100g}g
          </div>
          <div>
            <span className="font-medium">Fedt:</span> {nutritionalInfo.fatPer100g}g
          </div>
          <div>
            <span className="font-medium">Kulhydrater:</span> {nutritionalInfo.carbsPer100g}g
          </div>
          <div>
            <span className="font-medium">Fiber:</span> {nutritionalInfo.fiberPer100g}g
          </div>
          <div>
            <span className="font-medium">Sukker:</span> {nutritionalInfo.sugarPer100g}g
          </div>
          <div>
            <span className="font-medium">Natrium:</span> {nutritionalInfo.sodiumPer100g}mg
          </div>
        </div>
        
        {nutritionalInfo.vitamins && nutritionalInfo.vitamins.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium mb-2">Vitaminer:</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {nutritionalInfo.vitamins.map((vitamin, index) => (
                <div key={index}>
                  Vitamin {vitamin.vitamin}: {vitamin.amountPer100g}{vitamin.unit}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {nutritionalInfo.minerals && nutritionalInfo.minerals.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium mb-2">Mineraler:</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {nutritionalInfo.minerals.map((mineral, index) => (
                <div key={index}>
                  {mineral.mineral}: {mineral.amountPer100g}{mineral.unit}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser ingredienser...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadIngredients}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Prøv igen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ingrediens Administration</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tilføj ingrediens
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Navn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Eksklusioner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allergener
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Næring
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Handlinger
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ingredients.map((ingredient) => (
                  <React.Fragment key={ingredient.id}>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{ingredient.name}</div>
                          {ingredient.description && (
                            <div className="text-sm text-gray-500">{ingredient.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ingredient.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ingredient.exclusions?.join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ingredient.allergens?.join(', ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewNutritionalDetails(ingredient.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {showNutritionalDetails.has(ingredient.id) ? 'Skjul' : 'Vis'} næring
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingIngredient(ingredient)
                            setShowModal(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Rediger
                        </button>
                      </td>
                    </tr>
                    {showNutritionalDetails.has(ingredient.id) && (
                      <tr>
                        <td colSpan={6} className="px-6 py-0">
                          {renderNutritionalDetails(ingredient)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <IngredientModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingIngredient(null)
          }}
          onSave={handleSaveIngredient}
          ingredient={editingIngredient || undefined}
        />
      </div>
    </div>
  )
} 